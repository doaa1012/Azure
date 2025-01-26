import json
import jwt
from django.http import JsonResponse
from django.conf import settings
from django.utils import timezone
from django.template.defaultfilters import slugify
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from rest_framework import status
from ..models import Rubricinfo, Aspnetusers, Objectinfo, Propertybigstring, Propertyfloat, Propertyint, Sample, Composition
from django.views.decorators.csrf import csrf_exempt

from django.db import transaction, IntegrityError  # Ensure transaction is imported
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from ..models import Objectinfo, Objectlinkobject, Propertyfloat, Propertystring, Propertyint
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from rest_framework import status

@csrf_exempt
def delete_object(request, object_id):
    """
    Deletes an Objectinfo instance only if it is referenced (LinkedObjectId) but not associated (ObjectId).
    Prevents deletion if the object is associated in the Objectlinkobject table.
    """
    if request.method != 'DELETE':
        return JsonResponse(
            {'error': 'Only DELETE method is allowed'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    # Token authentication
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return JsonResponse(
            {'error': 'Authorization header missing or malformed'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    token = auth_header.split(' ')[1]
    try:
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        user_id = decoded_token.get('user_id')
        if not user_id:
            return JsonResponse(
                {'error': 'Invalid token: User ID missing'},
                status=status.HTTP_401_UNAUTHORIZED
            )
    except ExpiredSignatureError:
        return JsonResponse({'error': 'Token has expired'}, status=status.HTTP_401_UNAUTHORIZED)
    except InvalidTokenError:
        return JsonResponse({'error': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        # Check if the object is associated (in ObjectId) or referenced (in LinkedObjectId)
        associated_objects = Objectlinkobject.objects.filter(objectid=object_id)
        referenced_objects = Objectlinkobject.objects.filter(linkedobjectid=object_id)

        if associated_objects.exists():
            return JsonResponse(
                {'error': 'Object cannot be deleted as it is associated with other objects'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # If it is only referenced, it can be deleted
        if referenced_objects.exists():
            referenced_objects.delete()  # Clean up references if necessary

        # Delete dependent properties and the object itself
        with transaction.atomic():
            Propertyfloat.objects.filter(objectid=object_id).delete()
            Propertystring.objects.filter(objectid=object_id).delete()
            Propertyint.objects.filter(objectid=object_id).delete()

            # Delete the Objectinfo instance
            obj = Objectinfo.objects.get(objectid=object_id)
            obj.delete()

        return JsonResponse({'message': 'Object deleted successfully'}, status=status.HTTP_200_OK)

    except Objectinfo.DoesNotExist:
        return JsonResponse({'error': 'Object not found'}, status=status.HTTP_404_NOT_FOUND)
    except IntegrityError as e:
        return JsonResponse({'error': f'Database integrity error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        return JsonResponse({'error': f'Unexpected error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
