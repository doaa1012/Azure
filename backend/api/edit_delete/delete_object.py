import json
import jwt
import shutil
from django.http import JsonResponse
from django.conf import settings
from django.db import transaction, IntegrityError
from rest_framework import status
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from django.views.decorators.csrf import csrf_exempt
from ..models import Objectinfo, Objectlinkobject, Propertyfloat, Propertystring, Propertyint, Rubricinfo, Composition, Sample
import os
BASE_FILE_PATH = settings.BASE_FILE_PATH

@csrf_exempt
def delete_object(request, object_id):
    if request.method != 'DELETE':
        return JsonResponse({'error': 'Only DELETE method is allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    # Authorization
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return JsonResponse({'error': 'Authorization header missing or malformed'}, status=status.HTTP_401_UNAUTHORIZED)

    token = auth_header.split(' ')[1]
    try:
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        user_id = decoded_token.get('user_id')
        if not user_id:
            return JsonResponse({'error': 'Invalid token: User ID missing'}, status=status.HTTP_401_UNAUTHORIZED)
    except ExpiredSignatureError:
        return JsonResponse({'error': 'Token has expired'}, status=status.HTTP_401_UNAUTHORIZED)
    except InvalidTokenError:
        return JsonResponse({'error': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        obj = Objectinfo.objects.get(objectid=object_id)
        typename = obj.typeid.typename

        associated_links = Objectlinkobject.objects.filter(objectid=obj.objectid)
        referenced_links = Objectlinkobject.objects.filter(linkedobjectid=obj.objectid)

        # Block deletion of Composition if referenced by Sample or EDX CSV
        if typename == "Composition":
            for ref_link in referenced_links:
                ref_type = ref_link.objectid.typeid.typename
                if ref_type in ["Sample", "EDX CSV"]:
                    return JsonResponse({
                        'error': (
                            'This Composition object cannot be deleted because it is referenced by a Sample or an EDX CSV object. '
                            'To delete this Composition, you must first delete the associated EDX CSV file.'
                        )
                    }, status=status.HTTP_400_BAD_REQUEST)

        #  Block other objects if they reference other objects (forward direction only)
        if typename != "EDX CSV":
            if associated_links.exists():
                return JsonResponse({
                    'error': 'Object cannot be deleted: it has associated objects.'
                }, status=status.HTTP_400_BAD_REQUEST)

        # Handle special case for EDX CSV
        deletable_children = []
        if typename == "EDX CSV":
            for link in associated_links:
                linked = link.linkedobjectid
                rubric = linked.rubricid

                if (
                    linked.typeid.typename == "Composition" and
                    "measurement area" in linked.objectname.lower() and
                    rubric and rubric.rubricname.lower().endswith("measurement areas")
                ):
                    deletable_children.append(linked)

            if len(deletable_children) != associated_links.count():
                return JsonResponse({
                    'error': 'Object cannot be deleted: associated objects must be Composition type, named like "Measurement Area", and belong to a rubric named "Measurement Areas".'
                }, status=status.HTTP_400_BAD_REQUEST)

        # Start deletion
        with transaction.atomic():
            if typename == "EDX CSV":
                for child in deletable_children:
                    Composition.objects.filter(sampleid=child.objectid).delete()
                    Sample.objects.filter(sampleid=child.objectid).delete()
                    Propertyint.objects.filter(objectid=child.objectid).delete()
                    Objectlinkobject.objects.filter(linkedobjectid=child.objectid).delete()
                    child.delete()

                # Delete related rubrics with specific naming under parent rubric
                Rubricinfo.objects.filter(rubricname__endswith="Measurement Areas", parentid=obj.rubricid).delete()

            # Delete reverse links (it's okay to be referenced)
            referenced_links.delete()

            # Delete properties
            Propertyint.objects.filter(objectid=obj.objectid).delete()
            Propertystring.objects.filter(objectid=obj.objectid).delete()
            Propertyfloat.objects.filter(objectid=obj.objectid).delete()

            # Delete from Sample/Composition if needed
            if typename == "Sample":
                Sample.objects.filter(sampleid=obj.objectid).delete()
            elif typename == "Composition":
                Composition.objects.filter(sampleid=obj.objectid).delete()

            # Delete the object
            obj.delete()

            # Delete storage folder
            tenant_id = obj.tenantid.tenantid
            type_id = obj.typeid.typeid
            object_folder_path = os.path.join(BASE_FILE_PATH, f"tenant{tenant_id}", f"type{type_id}", f"object{object_id}")
            type_folder_path = os.path.join(BASE_FILE_PATH, f"tenant{tenant_id}", f"type{type_id}")

            if os.path.exists(object_folder_path):
                shutil.rmtree(object_folder_path)
            if os.path.exists(type_folder_path) and not os.listdir(type_folder_path):
                shutil.rmtree(type_folder_path)

        return JsonResponse({'message': 'Object and associated data deleted successfully'}, status=status.HTTP_200_OK)

    except Objectinfo.DoesNotExist:
        return JsonResponse({'error': 'Object not found'}, status=status.HTTP_404_NOT_FOUND)
    except IntegrityError as e:
        return JsonResponse({'error': f'Database integrity error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        return JsonResponse({'error': f'Unexpected error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
