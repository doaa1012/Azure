from django.http import JsonResponse, QueryDict
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import os
import hashlib
from django.utils import timezone
from rest_framework import status
from ..models import Objectinfo, Typeinfo, Rubricinfo, Aspnetusers, Tenant, Sample, Composition
import jwt
from django.utils.text import slugify
import json
from django.http.multipartparser import MultiPartParser
from django.db import IntegrityError
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from django.db.models import Max
# Map access control levels to numeric values and back
ACCESS_CONTROL_MAP = {
    'public': 0,
    'protected': 1,
    "protectednda": 2, 
    'private': 3
}
BASE_FILE_PATH = settings.BASE_FILE_PATH

@csrf_exempt
def edit_object(request, object_id):
    if request.method != 'PUT':
        return JsonResponse(
            {'error': 'Only PUT method is allowed'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    try:
        # Extract and validate Authorization token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse(
                {'error': 'Authorization header missing or malformed'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        token = auth_header.split(' ')[1]
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        user_id = decoded_token.get('user_id')
        if not user_id:
            return JsonResponse(
                {'error': 'Invalid token: User ID missing'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Retrieve the object to be updated
        try:
            existing_object = Objectinfo.objects.get(objectid=object_id)
        except Objectinfo.DoesNotExist:
            return JsonResponse({'error': 'Object not found'}, status=404)

        # Parse multipart form data
        parser = MultiPartParser(request.META, request, request.upload_handlers)
        parsed_data, parsed_files = parser.parse()

        # Debug parsed data and files
        print("Parsed Data:", parsed_data)
        print("Parsed Files:", parsed_files)

        # Update fields from the request
        type_name = parsed_data.get('typeId', existing_object.typeid.typename)
        tenant_id = parsed_data.get('tenantId', existing_object.tenantid.tenantid)
        rubric_id = parsed_data.get('rubricId', existing_object.rubricid.rubricid if existing_object.rubricid else None)
        object_name = parsed_data.get('name', existing_object.objectname)
        object_url = f"{slugify(object_name)}-{object_id}"
        sort_code = parsed_data.get('sortCode', existing_object.sortcode)
        description = parsed_data.get('description', existing_object.objectdescription)
        # Validate and retrieve required objects
        type_info = Typeinfo.objects.get(typename=type_name)
        tenant = Tenant.objects.get(tenantid=tenant_id)
        updated_by = Aspnetusers.objects.get(id=user_id)
        rubric = Rubricinfo.objects.get(rubricid=rubric_id) if rubric_id else None

        access_control_value = parsed_data.get('accessControl', 'protected')
        access_control = ACCESS_CONTROL_MAP.get(access_control_value.lower(), 1)

        # Handle file update
        file = parsed_files.get('filePath')
        if file:
            file_hash = hashlib.md5(file.read()).hexdigest()
            file.seek(0)  # Reset file pointer after reading for hash

            duplicate_object = Objectinfo.objects.filter(objectfilehash=file_hash).exclude(objectid=object_id).first()
            if duplicate_object:
                return JsonResponse(
                    {'error': 'File already exists with the same content.', 'existing_object_id': duplicate_object.objectid},
                    status=status.HTTP_409_CONFLICT
                )

            file_path = os.path.join(BASE_FILE_PATH, file.name)
            with open(file_path, 'wb') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)
            existing_object.objectfilepath = file_path
            existing_object.objectfilehash = file_hash

        # Update object fields
        existing_object.typeid = type_info
        existing_object.tenantid = tenant
        existing_object.rubricid = rubric
        existing_object.objectname = object_name
        existing_object.objectnameurl = object_url
        existing_object.sortcode = int(sort_code)
        existing_object.accesscontrol = access_control
        existing_object.objectdescription = description
        existing_object.field_updated = timezone.now()
        existing_object.field_updatedby = updated_by

        # Check for uniqueness of the updated objectnameurl within the tenant
        if Objectinfo.objects.filter(
            objectnameurl=object_url,
            tenantid=tenant
        ).exclude(objectid=object_id).exists():
            return JsonResponse(
                {'error': f"An object with the URL '{object_url}' already exists for the tenant."},
                status=status.HTTP_409_CONFLICT
            )

        existing_object.save()

        print(f"Object {object_id} updated successfully.")

        # Handle Sample and Composition updates for applicable types
        applicable_types = ['Calculation/Computational Composition', 
                            'Calculation/Computational Sample', 'Composition Test', "Computational Composition Atom", 
                            'Composition']
        if type_name.lower() in [t.lower() for t in applicable_types]:
            print (type_name)
            elements_data = json.loads(parsed_data.get('elements', '[]'))  # Expecting a JSON array
            print(elements_data)
            if elements_data:
                try:
                    # Calculate the total percentage already assigned
                    total_percentage = sum(
                        float(element['percentage']) for element in elements_data if element.get('percentage') is not None
                    )

                    if total_percentage > 100:
                        return JsonResponse(
                            {'error': f'Total percentage exceeds 100% ({total_percentage}%)'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    # Identify elements with no percentage
                    elements_without_percentage = [
                        element for element in elements_data if element.get('percentage') is None
                    ]
                    num_elements_without_percentage = len(elements_without_percentage)

                    # Distribute remaining percentage among elements with no percentage
                    if num_elements_without_percentage > 0:
                        remaining_percentage = 100 - total_percentage
                        if remaining_percentage < 0:
                            raise ValueError("Total percentage exceeds 100%.")
                        even_percentage = remaining_percentage / num_elements_without_percentage
                        for element in elements_without_percentage:
                            element['percentage'] = round(even_percentage, 2)

                    # Update or create Sample
                    sample, created = Sample.objects.update_or_create(
                        sampleid=existing_object,
                        defaults={
                            'elemnumber': len(elements_data),
                            'elements': '-'.join([element['name'] for element in elements_data]),
                        }
                    )

                    # Update Composition entries
                    Composition.objects.filter(sampleid=sample).delete()  # Clear existing compositions
                    for idx, element in enumerate(elements_data):
                        Composition.objects.create(
                            compositionid=(Composition.objects.aggregate(Max('compositionid'))['compositionid__max'] or 0) + 1,
                            sampleid=sample,
                            compoundindex=idx + 1,
                            elementname=element['name'],
                            valueabsolute=float(element.get('absolute')) if element.get('absolute') else None,
                            valuepercent=float(element.get('percentage')),
                        )

                    print("Sample and Composition updated successfully.")

                except Exception as e:
                    print(f"Error updating Sample and Composition: {e}")
                    return JsonResponse({'error': f"Failed to update Sample and Composition: {str(e)}"}, status=500)

        return JsonResponse({'message': 'Object updated successfully!', 'objectId': existing_object.objectid}, status=200)

    except Exception as e:
        print(f"Unexpected error occurred: {e}")
        return JsonResponse({'error': f"Internal Server Error: {str(e)}"}, status=500)
