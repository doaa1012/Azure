from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.db.models import Max
from django.utils import timezone
import re
import os
import json
import jwt
import hashlib
from datetime import datetime
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from rest_framework import status
from ..models import Objectinfo, Typeinfo, Rubricinfo, Aspnetusers, Tenant, Sample, Elementinfo, Objectlinkobject, Propertyint, Propertyfloat

# File path and access control settings
BASE_FILE_PATH = settings.BASE_FILE_PATH  
ACCESS_CONTROL_MAP = {
    'public': 0,
    'protected': 1,
    'protectednda': 2,
    'private': 3
}

# Get substrate options by filtering Objectinfo based on type name
def get_substrate_options(request):
    objects = Objectinfo.objects.filter(typeid__typename='Substrate').values('objectid', 'objectname')
    results = [{'id': obj['objectid'], 'name': obj['objectname']} for obj in objects]
    return JsonResponse(results, safe=False)


@csrf_exempt
def create_sample(request):
    if request.method != 'POST':
        return JsonResponse(
            {'error': 'Only POST method is allowed'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    try:
        # Authorization and token validation
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

        # Parsing request 
        data = request.POST
        typename = data.get('typename')
        tenant_id = data.get('tenantId')
        rubric_name_url = data.get('RubricNameUrl')
        form_name = data.get('name')
        description = data.get('description', '')
        elements = data.get('chemicalSystem', '')
        elem_number = data.get('elemnumber', 0)
        substrate_id = data.get('substrate')
        access_control_value = data.get('accessControl', 'public')
        int_properties = json.loads(data.get('intProperties', '[]'))
        float_properties = json.loads(data.get('floatProperties', '[]'))

        # Fetch necessary models
        type_info = Typeinfo.objects.get(typename=typename)
        tenant = Tenant.objects.get(tenantid=tenant_id)
        created_by = Aspnetusers.objects.get(id=user_id)
        access_control_value = str(data.get('accessControl', 'public')).lower()
        access_control = ACCESS_CONTROL_MAP.get(access_control_value, 1)
       
         # Before saving the object
        if Objectinfo.objects.filter(
            tenantid=tenant, typeid=type_info, objectname=form_name
        ).exists():
            return JsonResponse(
                {'error': f"An object with the name '{form_name}' already exists for this tenant and type."},
                status=status.HTTP_409_CONFLICT
            )
        # Create Objectinfo
        max_object_id = Objectinfo.objects.aggregate(Max('objectid'))['objectid__max']
        next_object_id = (max_object_id or 0) + 1

        new_object = Objectinfo(
            objectid=next_object_id,
            tenantid=tenant,
            field_created=timezone.now(),
            field_createdby=created_by,
            field_updated=timezone.now(),
            field_updatedby=created_by,
            typeid=type_info,
            rubricid=Rubricinfo.objects.get(rubricnameurl=rubric_name_url) if rubric_name_url else None,
            sortcode=0,
            accesscontrol=access_control,
            ispublished=False,
            objectname=form_name,
            objectnameurl="placeholder-url",
            objectdescription=description
        )
        new_object.save()      
         # Ensure file storage directory
        sample_folder = os.path.join(BASE_FILE_PATH, f"tenant{tenant_id}", f"type{type_info.typeid}", f"object{next_object_id}")
        os.makedirs(sample_folder, exist_ok=True)

        # Handle file upload
        file = request.FILES.get('filePath')
        if file:
            file_hash = hashlib.md5(file.read()).hexdigest()
            file.seek(0)

            file_path = os.path.join(sample_folder, file.name)
            with open(file_path, 'wb') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)

            new_object.objectfilepath = file_path
            new_object.objectfilehash = file_hash
            new_object.save(update_fields=['objectfilepath', 'objectfilehash'])

        max_sample_id = Sample.objects.aggregate(Max('sampleid'))['sampleid__max']
        next_sample_id = (max_sample_id or 0) + 1
        
        # Create Sample with the next available sampleid
        Sample.objects.create(
            sampleid_id=next_sample_id ,  # Using max sampleid instead of new_object.objectid
            elemnumber=elem_number,
            elements=elements
        )
        # Update name and URL
        sanitized_form_name = re.sub(r"[()\s]+", "-", form_name)  

        # Update objectname and objectnameurl
        new_object.objectname = f"{next_sample_id} {form_name}"
        new_object.objectnameurl = f"{sanitized_form_name.lower()}-{new_object.objectid}"

        # Save only the updated fields
        new_object.save(update_fields=['objectname', 'objectnameurl'])

        # Handle integer properties
        for int_property in int_properties:
            property_name = int_property.get('propertyName')
            value = int_property.get('value')  # Ensure this is numeric
            row = int_property.get('row')
            comment = int_property.get('comment', '')

            # Validate integer value
            if not isinstance(value, int):
                return JsonResponse(
                    {'error': f"Invalid value for property '{property_name}': Must be an integer, got '{value}'."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            Propertyint.objects.create(
                objectid=new_object,
                sortcode=0,
                field_created=timezone.now(),
                field_createdby=created_by,
                field_updated=timezone.now(),
                field_updatedby=created_by,
                row=row,
                value=value,
                propertyname=property_name,
                comment=comment,
                sourceobjectid=None
            )

        # Handle float properties
        for float_property in float_properties:
            property_name = float_property.get('propertyName')
            value = float_property.get('value')  # Ensure this is numeric
            row = float_property.get('row')
            comment = float_property.get('comment', '')

            # Validate float value
            if not isinstance(value, (float, int)):  # Allow integers to be cast to floats
                return JsonResponse(
                    {'error': f"Invalid value for property '{property_name}': Must be a float, got '{value}'."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            Propertyfloat.objects.create(
                objectid=new_object,
                sortcode=0,
                field_created=timezone.now(),
                field_createdby=created_by,
                field_updated=timezone.now(),
                field_updatedby=created_by,
                row=row,
                value=float(value),  # Ensure value is a float
                valueepsilon=None,
                propertyname=property_name,
                comment=comment,
                sourceobjectid=None
            )

        # Link substrate to the new object if provided
        if substrate_id:
            max_objectlinkobjectid = Objectlinkobject.objects.aggregate(Max('objectlinkobjectid'))['objectlinkobjectid__max']
            new_objectlinkobjectid = (max_objectlinkobjectid or 0) + 1

            substrate_object = Objectinfo.objects.get(objectid=substrate_id)
            Objectlinkobject.objects.create(
                objectid=new_object,
                linkedobjectid=substrate_object,
                objectlinkobjectid=new_objectlinkobjectid,
                sortcode=0,
                field_created=timezone.now(),
                field_createdby=created_by,
                field_updated=timezone.now(),
                field_updatedby=created_by,
                linktypeobjectid=None
            )

        return JsonResponse(
            {'message': 'Sample, Object, Element, and Property links created successfully!', 'objectId': new_object.objectid},
            status=201
        )

    except Exception as e:
        print(f"Error: {e}")
        return JsonResponse({'error': f"Internal Server Error: {str(e)}"}, status=500)



@csrf_exempt
def add_processing_step_sample(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method is allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    try:
        # Authorization and token validation
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'error': 'Authorization header missing or malformed'}, status=status.HTTP_401_UNAUTHORIZED)

        token = auth_header.split(' ')[1]
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        user_id = decoded_token.get('user_id')
        if not user_id:
            return JsonResponse({'error': 'Invalid token: User ID missing'}, status=status.HTTP_401_UNAUTHORIZED)

        # Parse request body
        data = json.loads(request.body)
        description = data.get('description')
        parent_object_id = data.get('parentObjectId')

        if not description:
            return JsonResponse({'error': 'Description is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Fetch the parent sample
        parent_object = Objectinfo.objects.filter(objectid=parent_object_id).first()
        if not parent_object:
            return JsonResponse({'error': 'Parent object does not exist.'}, status=status.HTTP_404_NOT_FOUND)

        parent_sample = Sample.objects.filter(sampleid=parent_object).first()
        if not parent_sample:
            return JsonResponse({'error': 'Parent sample does not exist.'}, status=status.HTTP_404_NOT_FOUND)

        # Generate a new sample name with incremented suffix
        base_name = parent_object.objectname
        existing_names = Objectinfo.objects.filter(objectname__startswith=base_name).values_list('objectname', flat=True)
        suffix = 2
        new_name = f"{base_name}_{suffix}"
        while new_name in existing_names:
            suffix += 1
            new_name = f"{base_name}_{suffix}"

        # Create Objectinfo for the new sample
        max_object_id = Objectinfo.objects.aggregate(Max('objectid'))['objectid__max']
        next_object_id = (max_object_id or 0) + 1

        created_by = Aspnetusers.objects.get(id=user_id)
        new_object = Objectinfo(
            objectid=next_object_id,
            tenantid=parent_object.tenantid,
            field_created=timezone.now(),
            field_createdby=created_by,
            field_updated=timezone.now(),
            field_updatedby=created_by,
            typeid=parent_object.typeid,
            rubricid=parent_object.rubricid,
            sortcode=0,
            accesscontrol=parent_object.accesscontrol,
            ispublished=False,
            objectname=new_name,
            objectnameurl=f"{new_name.replace(' ', '-').lower()}",
            objectdescription=description,
        )
        new_object.save()

        # Create Sample and inherit elements from the parent
        max_sample_id = Sample.objects.aggregate(Max('sampleid'))['sampleid__max']
        next_sample_id = (max_sample_id or 0) + 1
        Sample.objects.create(
            sampleid_id= next_sample_id ,
            elemnumber=parent_sample.elemnumber,
            elements=parent_sample.elements
        )

        # Clone Integer Properties
        parent_int_properties = Propertyint.objects.filter(objectid=parent_object)
        for int_property in parent_int_properties:
            Propertyint.objects.create(
                objectid=new_object,
                sortcode=int_property.sortcode,
                field_created=timezone.now(),
                field_createdby=created_by,
                field_updated=timezone.now(),
                field_updatedby=created_by,
                row=int_property.row,
                value=int_property.value,
                propertyname=int_property.propertyname,
                comment=int_property.comment,
                sourceobjectid=int_property.sourceobjectid
            )

        # Clone Float Properties
        parent_float_properties = Propertyfloat.objects.filter(objectid=parent_object)
        for float_property in parent_float_properties:
            Propertyfloat.objects.create(
                objectid=new_object,
                sortcode=float_property.sortcode,
                field_created=timezone.now(),
                field_createdby=created_by,
                field_updated=timezone.now(),
                field_updatedby=created_by,
                row=float_property.row,
                value=float_property.value,
                valueepsilon=float_property.valueepsilon,
                propertyname=float_property.propertyname,
                comment=float_property.comment,
                sourceobjectid=float_property.sourceobjectid
            )

        # Link the new object back to the parent
        max_link_id = Objectlinkobject.objects.aggregate(Max('objectlinkobjectid'))['objectlinkobjectid__max']
        new_link_id = (max_link_id or 0) + 1
        Objectlinkobject.objects.create(
            objectlinkobjectid=new_link_id,
            objectid=parent_object,
            linkedobjectid=new_object,
            sortcode=0,
            field_created=timezone.now(),
            field_createdby=created_by,
            field_updated=timezone.now(),
            field_updatedby=created_by,
            linktypeobjectid=None
        )

        return JsonResponse(
            {'message': 'Sample, Object, Element, and Property links created successfully!', 'objectId': new_object.objectid},
            status=201
        )

    except Exception as e:
        return JsonResponse({'error': f"Internal Server Error: {str(e)}"}, status=500)


@csrf_exempt
def split_sample_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method is allowed'}, status=405)

    try:
        # Authorization and token validation
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'error': 'Authorization header missing or malformed'}, status=401)

        token = auth_header.split(' ')[1]
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        user_id = decoded_token.get('user_id')
        if not user_id:
            return JsonResponse({'error': 'Invalid token: User ID missing'}, status=401)

        # Parse request body
        data = json.loads(request.body)
        parent_object_id = data.get('parentObjectId')
        piece_count = data.get('pieceCount')
        piece_description = data.get('pieceDescription')

        # Validate inputs
        if not parent_object_id or not piece_count or not piece_description:
            return JsonResponse(
                {'error': 'Missing required fields: parentObjectId, pieceCount, pieceDescription'}, 
                status=400
            )

        try:
            piece_count = int(piece_count)
            if piece_count <= 0:
                return JsonResponse({'error': 'Piece count must be a positive integer.'}, status=400)
        except ValueError:
            return JsonResponse({'error': 'Piece count must be an integer.'}, status=400)

        # Fetch parent sample
        parent_object = Objectinfo.objects.filter(objectid=parent_object_id).first()
        if not parent_object:
            return JsonResponse({'error': 'Parent object does not exist.'}, status=404)

        parent_sample = Sample.objects.filter(sampleid=parent_object).first()
        if not parent_sample:
            return JsonResponse({'error': 'Parent sample does not exist.'}, status=404)

        # Initialize variables for child creation
        created_by = Aspnetusers.objects.get(id=user_id)
        created_samples = []

        # Create child samples
        for i in range(1, piece_count + 1):
            # Generate child sample name and description
            child_name = f"{parent_object.objectname} piece {i}"
            child_description = f"{piece_description} (piece {i})"

            # Get the next object ID
            max_object_id = Objectinfo.objects.aggregate(Max('objectid'))['objectid__max']
            next_object_id = (max_object_id or 0) + 1

            # Create Objectinfo for child
            child_object = Objectinfo(
                objectid=next_object_id,
                tenantid=parent_object.tenantid,
                field_created=timezone.now(),
                field_createdby=created_by,
                field_updated=timezone.now(),
                field_updatedby=created_by,
                typeid=parent_object.typeid,
                rubricid=parent_object.rubricid,
                sortcode=0,
                accesscontrol=parent_object.accesscontrol,
                ispublished=False,
                objectname=child_name,
                objectnameurl=f"{child_name.replace(' ', '-').lower()}-{parent_object_id}",
                objectdescription=child_description,
            )
            child_object.save()
              
            # Create Sample inheriting from parent
            max_sample_id = Sample.objects.aggregate(Max('sampleid'))['sampleid__max']
            next_sample_id = (max_sample_id or 0) + 1
            Sample.objects.create(
                sampleid_id=next_sample_id,
                elemnumber=parent_sample.elemnumber,
                elements=parent_sample.elements
            )

            # Clone Integer Properties
            parent_int_properties = Propertyint.objects.filter(objectid=parent_object)
            for int_property in parent_int_properties:
                Propertyint.objects.create(
                    objectid=child_object,
                    sortcode=int_property.sortcode,
                    field_created=timezone.now(),
                    field_createdby=created_by,
                    field_updated=timezone.now(),
                    field_updatedby=created_by,
                    row=int_property.row,
                    value=int_property.value,
                    propertyname=int_property.propertyname,
                    comment=int_property.comment,
                    sourceobjectid=int_property.sourceobjectid
                )

            # Clone Float Properties
            parent_float_properties = Propertyfloat.objects.filter(objectid=parent_object)
            for float_property in parent_float_properties:
                Propertyfloat.objects.create(
                    objectid=child_object,
                    sortcode=float_property.sortcode,
                    field_created=timezone.now(),
                    field_createdby=created_by,
                    field_updated=timezone.now(),
                    field_updatedby=created_by,
                    row=float_property.row,
                    value=float_property.value,
                    valueepsilon=float_property.valueepsilon,
                    propertyname=float_property.propertyname,
                    comment=float_property.comment,
                    sourceobjectid=float_property.sourceobjectid
                )

            # Link the new object back to the parent
            max_link_id = Objectlinkobject.objects.aggregate(Max('objectlinkobjectid'))['objectlinkobjectid__max']
            new_link_id = (max_link_id or 0) + 1
            Objectlinkobject.objects.create(
                objectlinkobjectid=new_link_id,
                objectid=parent_object,
                linkedobjectid=child_object,
                sortcode=0,
                field_created=timezone.now(),
                field_createdby=created_by,
                field_updated=timezone.now(),
                field_updatedby=created_by,
                linktypeobjectid=None
            )

            # Add new sample to response
            created_samples.append({
                'objectId': child_object.objectid,
                'name': child_name,
                'description': child_description
            })

        return JsonResponse({'message': 'Samples created successfully!', 'samples': created_samples}, status=201)

    except Exception as e:
        return JsonResponse({'error': f"Internal Server Error: {str(e)}"}, status=500)
