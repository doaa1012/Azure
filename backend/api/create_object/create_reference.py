from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from ..models import Reference, Objectinfo, Aspnetusers, Rubricinfo, Typeinfo, Objectlinkobject, Tenant
from rest_framework import status
import json
import jwt
import hashlib
from django.conf import settings
from django.db.models import Max
import os
from datetime import datetime

BASE_FILE_PATH = settings.BASE_FILE_PATH
ACCESS_CONTROL_MAP = {
    'public': 0,
    'protected': 1,
    'protectednda': 2,
    'private': 3
}

@csrf_exempt
def create_reference(request):
    if request.method != 'POST':
        return JsonResponse(
            {'error': 'Only POST method is allowed'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    try:
        # Validate Authorization token
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

        # Retrieve and validate fields from the request
        type_name = request.POST.get('typeId')
        tenant_id = request.POST.get('tenantId')
        rubric_id = request.POST.get('rubricId')
        object_name = request.POST.get('name')
        object_url = request.POST.get('url', f"default-url-{datetime.now().strftime('%Y%m%d%H%M%S')}")
        linked_object_id = request.POST.get('objectId')
        sort_code = request.POST.get('sortCode', 0)
        description = request.POST.get('description', '')

        # Literature-specific fields
        authors = request.POST.get('authors')
        title = request.POST.get('title')
        journal = request.POST.get('journal')
        year = request.POST.get('year')
        volume = request.POST.get('volume')
        issue = request.POST.get('issue')
        start_page = request.POST.get('startPage')
        end_page = request.POST.get('endPage')
        doi = request.POST.get('doi')
        reference_url = request.POST.get('url')
        bibtex = request.POST.get('bibtex')

        access_control_value = request.POST.get('accessControl', 'public')
        access_control = ACCESS_CONTROL_MAP.get(access_control_value.lower(), 1)

        # Validate required fields
        if not type_name or not tenant_id or not object_name:
            return JsonResponse(
                {'error': 'Missing required fields: typeId, tenantId, or name'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Fetch related objects
        type_info = Typeinfo.objects.get(typename=type_name)
        tenant = Tenant.objects.get(tenantid=tenant_id)
        created_by = Aspnetusers.objects.get(id=user_id)
        rubric = Rubricinfo.objects.get(rubricid=rubric_id) if rubric_id else None
        
        # Generate a new Object ID
        max_id = Objectinfo.objects.aggregate(Max('objectid'))['objectid__max']
        next_id = (max_id or 0) + 1
        # Construct the directory path: `/tenantX/typeY/objectZ/`
        object_folder_path = os.path.join(BASE_FILE_PATH, f"tenant{tenant_id}", f"type{type_info.typeid}", f"object{next_id}")
        os.makedirs(object_folder_path, exist_ok=True) 
        # Handle file upload
        file = request.FILES.get('filePath')
        file_path = None
        file_hash = None
        if file:
            file_hash = hashlib.md5(file.read()).hexdigest()
            file.seek(0)  # Reset file pointer after reading for hash
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

            file_path = os.path.join(BASE_FILE_PATH, file.name)
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
            objectname=object_name,
            objectnameurl=object_url,
            objectfilepath=file_path,
            objectfilehash=file_hash,
            objectdescription=description
        )
        new_object.save()
        print(f"Saved Objectinfo: {new_object.__dict__}")

        # Create Reference if literature-specific fields are provided
        if authors and title and year:
            new_reference = Reference(
                referenceid=new_object,
                authors=authors,
                title=title,
                journal=journal,
                year=int(year),
                volume=volume,
                number=issue,
                startpage=start_page,
                endpage=end_page,
                doi=doi,
                url=reference_url,
                bibtex=bibtex
            )
            new_reference.save()
            print(f"Saved Reference: {new_reference.__dict__}")

        # Create object link if linked_object_id is provided
        if linked_object_id:
            existing_object = Objectinfo.objects.get(objectid=linked_object_id)
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
            print(f"Saved Objectlinkobject: {link_object.__dict__}")

        return JsonResponse(
            {'message': 'Object and Reference created successfully!', 'objectId': new_object.objectid},
            status=201
        )

    except Exception as e:
        return JsonResponse({'error': f"Internal Server Error: {str(e)}"}, status=500)
