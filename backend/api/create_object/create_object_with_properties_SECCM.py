from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
import traceback
import json
import jwt
from ..models import Typeinfo,Tenant,Aspnetusers,Rubricinfo,Objectinfo,Objectlinkobject,Propertyint,Propertyfloat
from django.conf import settings
from django.db.models import Max
import os
import hashlib
from rest_framework import status


ACCESS_CONTROL_MAP = {
    'public': 0,
    'protected': 1,
    'protectednda': 2,
    'private': 3,
}
REFERENCE_ELECTRODE_MAP = {
    "Ag/AgCl": 1,
    "Hg/HgO": 2,
    "SHE": 3,
}
BASE_FILE_PATH = settings.BASE_FILE_PATH  

@csrf_exempt
def create_object_with_properties(request):
    if request.method != 'POST':
        return JsonResponse(
            {'error': 'Only POST method is allowed'},
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

        # Retrieve fields from the request
        type_name = request.POST.get('typeId')
        tenant_id = request.POST.get('tenantId')
        rubric_id = request.POST.get('rubricId', None)  # Optional
        object_name = request.POST.get('name')
        url = request.POST.get('url')
        sort_code = request.POST.get('sortCode', 0)
        description = request.POST.get('description', '')
        linked_object_id = request.POST.get('objectId', None)  # ID of an existing object to link the new object to
        properties = request.POST.get('properties')  # JSON string from the frontend
        
        # Parse and validate properties JSON
        if isinstance(properties, str):
            try:
                properties = json.loads(properties)
            except json.JSONDecodeError:
                return JsonResponse({'error': 'Invalid JSON format for properties'}, status=400)

        if not isinstance(properties, list):
            return JsonResponse({'error': 'Properties must be a list of objects'}, status=400)

        #print("Parsed properties:", properties)

        # Validate and retrieve required objects
        try:
            type_info = Typeinfo.objects.get(typename=type_name)
            tenant = Tenant.objects.get(tenantid=tenant_id)
            created_by = Aspnetusers.objects.get(id=user_id)
            rubric = Rubricinfo.objects.get(rubricid=rubric_id) if rubric_id else None
        except Typeinfo.DoesNotExist:
            return JsonResponse({'error': f"Type '{type_name}' does not exist"}, status=400)
        except Tenant.DoesNotExist:
            return JsonResponse({'error': f"Tenant ID '{tenant_id}' does not exist"}, status=400)
        except Aspnetusers.DoesNotExist:
            return JsonResponse({'error': 'User does not exist'}, status=400)
        except Rubricinfo.DoesNotExist:
            return JsonResponse({'error': f"Rubric ID '{rubric_id}' does not exist"}, status=400)

        access_control_value = request.POST.get('accessControl', 'public')
        access_control = ACCESS_CONTROL_MAP.get(access_control_value.lower(), 1)
         # Generate a new Object ID
        max_id = Objectinfo.objects.aggregate(Max('objectid'))['objectid__max']
        next_id = (max_id or 0) + 1
        object_url = f"{object_name}_{next_id}"

        # Handle file saving with structured directory
        file = request.FILES.get('filePath')
        file_path = None
        file_hash = None

        if file:
            # Compute file hash
            file_hash = hashlib.md5(file.read()).hexdigest()
            file.seek(0)  # Reset file pointer after reading for hash

            # Check if a file with the same hash already exists
            duplicate_object = Objectinfo.objects.filter(objectfilehash=file_hash).first()
            if duplicate_object:
                return JsonResponse(
                    {
                        'error': 'File already exists with the same content.',
                        'existing_object': {
                            'objectId': duplicate_object.objectid,
                            'objectName': duplicate_object.objectname,
                            'createdDate': duplicate_object.field_created,
                            'description': duplicate_object.objectdescription,
                            'url': duplicate_object.objectnameurl,
                        }
                    },
                    status=status.HTTP_409_CONFLICT
                )

            # Define structured file path: /BASE_FILE_PATH/tenantX/typeY/objectZ/filename
            object_folder = os.path.join(BASE_FILE_PATH, f"tenant{tenant_id}", f"type{type_info.typeid}", f"object{next_id}")
            os.makedirs(object_folder, exist_ok=True)  # Create directories if they do not exist

            file_path = os.path.join(object_folder, file.name)
            with open(file_path, 'wb') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)

        # Create Objectinfo instance
        new_object = Objectinfo(
            objectid=next_id,
            tenantid=tenant,
            field_created=timezone.now(),
            field_createdby=created_by,
            field_updated=timezone.now(),
            field_updatedby=created_by,
            typeid=type_info,
            rubricid=rubric,
            sortcode=int(sort_code),
            accesscontrol=access_control,
            ispublished=False,
            externalid=request.POST.get('externalId'),
            objectname=object_name,
            objectnameurl=object_url,
            objectfilepath=file_path,
            objectfilehash=file_hash,
            objectdescription=description
        )

        # Save object in the database
        new_object.save()

        # Link the new object to an existing object if linked_object_id is provided
        if linked_object_id:
            try:
                existing_object = Objectinfo.objects.get(objectid=linked_object_id)

                # Create a new Objectlinkobject for linking
                max_link_id = Objectlinkobject.objects.aggregate(Max('objectlinkobjectid'))['objectlinkobjectid__max']
                new_link_id = (max_link_id or 0) + 1

                link_object = Objectlinkobject(
                    objectlinkobjectid=new_link_id,
                    objectid=existing_object,
                    linkedobjectid=new_object,
                    sortcode=0,
                    field_created=timezone.now(),
                    field_createdby=created_by,
                    field_updated=timezone.now(),
                    field_updatedby=created_by,
                    linktypeobjectid=None
                )
                link_object.save()
            except Objectinfo.DoesNotExist:
                return JsonResponse(
                    {'error': 'Invalid objectId: Linked object does not exist'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Process properties
        for index, prop in enumerate(properties):
            try:
                name = prop.get('name')
                value = prop.get('value')
                comment = prop.get('comment', '')
                property_type = prop.get('type', '').lower()

                if property_type == 'int':
                    # Handle Reference Electrode special case
                    if name == 'Reference Electrode':
                        value = REFERENCE_ELECTRODE_MAP.get(value)
                        if value is None:
                            raise ValueError(f"Invalid value for 'Reference Electrode': {prop.get('value')}")
                    else:
                        value = int(value)

                    Propertyint.objects.create(
                        objectid=new_object,
                        propertyname=name,
                        value=value,
                        comment=comment,
                        sortcode=index,
                        field_created=timezone.now(),
                        field_createdby=created_by,
                        field_updated=timezone.now(),
                        field_updatedby=created_by,
                    )

                elif property_type == 'float':
                    value = float(value)
                    Propertyfloat.objects.create(
                        objectid=new_object,
                        propertyname=name,
                        value=value,
                        comment=comment,
                        sortcode=index,
                        field_created=timezone.now(),
                        field_createdby=created_by,
                        field_updated=timezone.now(),
                        field_updatedby=created_by,
                    )
                else:
                    raise ValueError(f"Unknown property type for '{name}'")

            except Exception as e:
                return JsonResponse({'error': f"Failed to create property '{prop.get('name')}': {str(e)}"}, status=400)

        return JsonResponse({'message': 'Object created successfully!', 'objectId': new_object.objectid}, status=201)

    except Exception as e:
        return JsonResponse({'error': f"Internal Server Error: {str(e)}"}, status=500)
