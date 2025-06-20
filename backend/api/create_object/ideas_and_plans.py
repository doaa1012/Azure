
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import json
import jwt
from django.db.models import Max, Q
from datetime import datetime
from django.utils import timezone
from rest_framework import status
from ..models import (
    Objectinfo, Typeinfo, Rubricinfo, Aspnetusers, Tenant, Propertyint
)
import logging
import hashlib
import os

logger = logging.getLogger(__name__)

BASE_FILE_PATH = settings.BASE_FILE_PATH
ACCESS_CONTROL_MAP = {
    'public': 0,
    'protected': 1,
    'protectednda': 2,
    'private': 3
}

@csrf_exempt
def create_ideas_and_plans(request):
    if request.method != 'POST':
        logger.warning("Invalid request method: Expected POST.")
        return JsonResponse(
            {'error': 'Only POST method is allowed'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    try:
        # Extract and validate Authorization token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            logger.error("Authorization header missing or malformed.")
            return JsonResponse(
                {'error': 'Authorization header missing or malformed'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        token = auth_header.split(' ')[1]
        try:
            decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = decoded_token.get('user_id')
            if not user_id:
                logger.error("Token is invalid: User ID missing.")
                return JsonResponse(
                    {'error': 'Invalid token: User ID missing'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        except jwt.ExpiredSignatureError:
            logger.error("Token has expired.")
            return JsonResponse({'error': 'Token has expired'}, status=status.HTTP_401_UNAUTHORIZED)
        except jwt.InvalidTokenError:
            logger.error("Token is invalid.")
            return JsonResponse({'error': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)

        logger.debug(f"User ID from token: {user_id}")
        created_by = Aspnetusers.objects.get(id=user_id)

        # Parse request data
        data = request.POST
        logger.debug(f"Request data: {data}")

        # Extract required fields
        type_name = data.get('type')
        tenant_id = data.get('tenantId', 4)
        rubric_id = data.get('rubricId')
        object_name = data.get('name')
        description = data.get('description', '')
        access_control_value = data.get('accessControl', 'protected').lower()
        access_control = ACCESS_CONTROL_MAP.get(access_control_value, 1)
        measurements = json.loads(data.get('measurements', '{}'))

        # Validate required fields
        if not type_name or not object_name:
            logger.error("Missing required fields: 'type' or 'name'")
            return JsonResponse({'error': 'Type and Name are required fields'}, status=400)
        
        # Check for duplicates
        if Objectinfo.objects.filter(
            Q(tenantid=tenant_id) & Q(typeid__typename=type_name) & Q(objectname=object_name)
        ).exists():
            return JsonResponse(
                {'error': f"Object with name '{object_name}' already exists for this type and tenant."},
                status=400
            )
        
        # Initialize variables early to avoid UnboundLocalError
        type_info, tenant, rubric = None, None, None

        # Validate and retrieve related objects BEFORE using them
        try:
            type_info = Typeinfo.objects.get(typename=type_name)
        except Typeinfo.DoesNotExist:
            logger.error(f"Type '{type_name}' does not exist.")
            return JsonResponse({'error': f"Type '{type_name}' does not exist"}, status=400)

        try:
            tenant = Tenant.objects.get(tenantid=tenant_id)
        except Tenant.DoesNotExist:
            logger.error(f"Tenant ID '{tenant_id}' does not exist.")
            return JsonResponse({'error': f"Tenant ID '{tenant_id}' does not exist"}, status=400)

        if rubric_id:
            try:
                rubric = Rubricinfo.objects.get(rubricid=rubric_id)
            except Rubricinfo.DoesNotExist:
                logger.error(f"Rubric ID '{rubric_id}' does not exist.")
                return JsonResponse({'error': f"Rubric ID '{rubric_id}' does not exist"}, status=400)

        # Ensure 'type_info' is assigned before using it
        if not type_info or not tenant:
            return JsonResponse({'error': 'Invalid type or tenant data'}, status=400)
      
        
          # Generate new Object ID
        max_id = Objectinfo.objects.aggregate(Max('objectid'))['objectid__max']
        next_id = (max_id or 0) + 1
        object_url = f"{object_name}_{next_id}"
      # Handle file upload with structured directory
        file = request.FILES.get('filePath')
        file_path = None
        file_hash = None

        if file:
            file_hash = hashlib.md5(file.read()).hexdigest()
            file.seek(0)

            # Check for file duplicates
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

            # Define structured file path
            sample_folder = os.path.join(BASE_FILE_PATH, f"tenant{tenant_id}", f"type{type_info.typeid}", f"object{next_id}", "file")
            os.makedirs(sample_folder, exist_ok=True)  # Create directories if they don’t exist

            file_path = os.path.join(sample_folder, file.name)

            # Save the file
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
            sortcode=data.get('sortCode', 0),
            accesscontrol=access_control,
            ispublished=False,
            objectname=object_name,
            objectnameurl=object_url,
            objectfilepath=file_path,
            objectfilehash=file_hash,
            objectdescription=description
        )

        # Save object in the database
        new_object.save()
        # Update Objectinfo with file path and hash
        new_object.objectfilepath = file_path
        new_object.objectfilehash = file_hash
        new_object.save(update_fields=['objectfilepath', 'objectfilehash'])
        logger.info(f"New Objectinfo created with ID {next_id}")

        # Process and save measurements
        for key, data in measurements.items():
            try:
                logger.debug(f"Processing measurement: {key} -> {data}")
                value = data.get('value', 0)
                comment = data.get('comment', '')

                Propertyint.objects.create(
                    objectid=new_object,
                    propertyname=f"Measurements Report => {key}",
                    value=int(value),
                    comment=comment,
                    sortcode=0,
                    field_created=timezone.now(),
                    field_createdby=created_by,
                    field_updated=timezone.now(),
                    field_updatedby=created_by,
                )
            except Exception as e:
                logger.error(f"Failed to save measurement '{key}': {str(e)}")
                return JsonResponse(
                    {'error': f"Failed to save measurement '{key}': {str(e)}"},
                    status=400
                )

        logger.info(f"Ideas and Plans object created successfully with ID {new_object.objectid}")
        return JsonResponse({'message': 'Ideas and Plans object created successfully!', 'objectId': new_object.objectid}, status=201)

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return JsonResponse({'error': f"Internal Server Error: {str(e)}"}, status=500)
