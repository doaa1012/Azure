from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import os
import jwt
import hashlib
import csv
from django.db import transaction
from django.db.models import Max
from datetime import datetime
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from ..models import Objectinfo, Typeinfo, Rubricinfo, Aspnetusers, Tenant, Composition, Elementinfo, Objectlinkobject, Sample, Propertyint
from django.utils import timezone
from rest_framework import status
import traceback

BASE_FILE_PATH = settings.BASE_FILE_PATH
ACCESS_CONTROL_MAP = {
    'public': 0,
    'protected': 1,
    'protectednda': 2,
    'private': 3
}

@csrf_exempt
def get_objectid_from_objectnameurl(request):
    """
    Retrieve the objectId based on the given objectnameurl.
    """
    if request.method != 'GET':
        return JsonResponse({'error': 'Only GET method is allowed'}, status=405)

    objectnameurl = request.GET.get('objectnameurl', None)

    if not objectnameurl:
        return JsonResponse({'error': 'Missing objectnameurl parameter'}, status=400)

    try:
        object_info = Objectinfo.objects.get(objectnameurl=objectnameurl)
        return JsonResponse({'objectId': object_info.objectid}, status=200)
    
    except Objectinfo.DoesNotExist:
        return JsonResponse({'error': f"Object with name URL '{objectnameurl}' not found"}, status=404)

    except Exception as e:
        return JsonResponse({'error': f"Internal Server Error: {str(e)}"}, status=500)

@csrf_exempt
def create_main_and_child_objects(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method is allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    try:
            # Log received request data
        print("Received Form Data:", request.POST)
        print("Received Files:", request.FILES)
        # Token validation
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'error': 'Authorization header missing or malformed'}, status=status.HTTP_401_UNAUTHORIZED)

        token = auth_header.split(' ')[1]
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        user_id = decoded_token.get('user_id')
        if not user_id:
            return JsonResponse({'error': 'Invalid token: User ID missing'}, status=status.HTTP_401_UNAUTHORIZED)

        # Extract and validate data for the main object
        type_name = request.POST.get('typeId')
        tenant_id = request.POST.get('tenantId')
        rubric_id = request.POST.get('rubricId', None)
        object_name = request.POST.get('name')
        main_object_url = request.POST.get('url', f"default-url-{datetime.now().strftime('%Y%m%d%H%M%S')}")
        sort_code = request.POST.get('sortCode', 0)
        description = request.POST.get('description', '')
        access_control_value = request.POST.get('accessControl')
        access_control = ACCESS_CONTROL_MAP.get(access_control_value.lower(), 1)
        sampleid = request.POST.get('objectId', None)
        if not sampleid:
            return JsonResponse(
                {'error': 'Each EDX CSV upload must be linked to a Sample. Please return to the Sample and use "Create EDX" from there.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Fetch the Sample instance
        try:
            sample_instance = Sample.objects.get(sampleid=sampleid)
        except Sample.DoesNotExist:
            return JsonResponse({'error': 'Sample with provided ID does not exist'}, status=status.HTTP_400_BAD_REQUEST)
        # Format sampleid with leading zeros
        formatted_sampleid = f"00{sampleid}" if sampleid else "00UNKNOWN"
        main_object_name = f"{formatted_sampleid}_{object_name}_EDX"
        # Related model lookups
        type_info = Typeinfo.objects.get(typename=type_name)
        tenant = Tenant.objects.get(tenantid=tenant_id)
        created_by = Aspnetusers.objects.get(id=user_id)
        rubric = Rubricinfo.objects.get(rubricid=rubric_id) if rubric_id else None
        rubric_path = rubric.rubricpath
        rubric_nameurl = rubric.rubricnameurl
      # Handle file upload
        file = request.FILES.get('filePath')

        if not file:
            return JsonResponse({'error': 'File not provided'}, status=status.HTTP_400_BAD_REQUEST)
        # Generate Object ID
        max_id = Objectinfo.objects.aggregate(Max('objectid'))['objectid__max']
        main_object_id = (max_id or 0) + 1  # Ensure this is assigned
        # Define correct file storage path
        sample_folder = os.path.join(BASE_FILE_PATH, f"tenant{tenant_id}", f"type{type_info.typeid}", f"object{main_object_id}", "file")
        os.makedirs(sample_folder, exist_ok=True)  # Ensure directory exists

        file_path = os.path.join(sample_folder, file.name)

        # ✅ First, compute file hash after reading the file
        file_hash = hashlib.md5(file.read()).hexdigest()
        file.seek(0)  # Reset file pointer after reading

        # ✅ Now it's safe to use `file_hash`
        existing_file = Objectinfo.objects.filter(
            tenantid=tenant,
            objectfilehash=file_hash
        ).first()

        if existing_file:
            return JsonResponse({
                'error': 'A file with the same content already exists for this tenant.',
                'existing_object': {
                    'objectId': existing_file.objectid,
                    'objectName': existing_file.objectname,
                    'createdDate': existing_file.field_created.strftime('%Y-%m-%d %H:%M:%S'),
                    'description': existing_file.objectdescription,
                    'url': existing_file.objectnameurl  # Ensure the frontend gets this URL
                }
            }, status=status.HTTP_409_CONFLICT)  # HTTP 409 Conflict

        # ✅ Save file only if it doesn't exist
        with open(file_path, 'wb') as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        # Create main Objectinfo entry
        main_object_url = f"{main_object_name}-{main_object_id}".lower()
        main_object = Objectinfo(
            objectid=main_object_id,
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
            objectname=main_object_name,
            objectnameurl=main_object_url,
            objectfilepath=file_path,
            objectfilehash=file_hash,
            objectdescription=description
        )
        main_object.save()

        rubricname= f"{sampleid} Measurement Areas"
        rubricnameurl = f"{rubric_nameurl}_{sampleid}-measurement-areas"
        rubricpath = f"{rubric_path}}}{rubricname}" 
        parent_rubric = Rubricinfo.objects.get(rubricid=rubric_id) if rubric_id else None

        level = rubricpath .count('}') + 1
        print (rubricpath)

        # Assign RubricId by incrementing the current max RubricId
        with transaction.atomic():
            # Lock the table to prevent concurrent inserts
            max_rubric = Rubricinfo.objects.select_for_update().aggregate(Max('rubricid'))
            max_id = max_rubric['rubricid__max'] or 0
            new_id = max_id + 1
            print(f"Assigning RubricId: {new_id}")
            # Prepare the data to be saved
            rubric_data = {
                'rubricid': new_id,
                'rubricname': rubricname,
                'rubricnameurl': rubricnameurl,  
                'rubricpath': rubricpath,        
                'sortcode': sort_code,
                'accesscontrol': access_control,
                'parentid_id': parent_rubric.rubricid,        
                'tenantid_id': tenant_id,        
                'typeid_id': 2,                  
                'field_created': timezone.now(),
                'field_createdby_id': created_by.id,
                'field_updated': timezone.now(),
                'field_updatedby_id': created_by.id,
                'level': level ,                      
                'leafflag': 5,                
                'flags': 0,                      
                'ispublished': True           
            }
            
            # Print the data before saving
            print(f"Data to be saved: {rubric_data}")
                # Create the new rubric info in the database
            new_rubric = Rubricinfo.objects.create(**rubric_data)
        # Link the new object to the sample
        if sampleid:
            existing_object = Objectinfo.objects.get(objectid=sampleid)
            max_link_id = Objectlinkobject.objects.aggregate(Max('objectlinkobjectid'))['objectlinkobjectid__max']
            Objectlinkobject.objects.create(
                objectlinkobjectid=(max_link_id or 0) + 1,
                objectid=existing_object,  # Ensure this is an Objectinfo instance
                linkedobjectid=main_object,
                sortcode=0,
                field_created=timezone.now(),
                field_createdby=created_by,
                field_updated=timezone.now(),
                field_updatedby=created_by,
            )
        # Process the file for rows, compositions, and properties
        with open(file_path, 'r') as csv_file:
            reader = csv.DictReader(csv_file)
            rows = list(reader)

        valid_rows = [row for row in rows if any(value for key, value in row.items() if key != 'Index' and value)]
        processed_rows = 0
        area_counter = 1

        composition_type = Typeinfo.objects.get(typename="Composition")
        valid_elements = {element.elementname: element for element in Elementinfo.objects.all()}

        with transaction.atomic():
            for row in valid_rows:
                # Create child Objectinfo entry

                child_max_id = Objectinfo.objects.aggregate(Max('objectid'))['objectid__max']
                child_object_id = (child_max_id or 0) + 1

                # Construct the child object name and URL
                child_object_name = f"Measurement Area {area_counter:03} from {main_object_name}"
                child_object_url = f"{child_object_name}-{child_object_id}".lower()

                # Ensure rubric_id is converted to a Rubricinfo instance
                new_rubric = Rubricinfo.objects.get(rubricid=new_id)

                # Create child Objectinfo entry
                child_object = Objectinfo.objects.create(
                    objectid=child_object_id,
                    tenantid=tenant,
                    field_created=timezone.now(),
                    field_createdby=created_by,
                    field_updated=timezone.now(),
                    field_updatedby=created_by,
                    typeid=composition_type,
                    rubricid=new_rubric,  # Pass the Rubricinfo instance here
                    sortcode=int(sort_code),
                    accesscontrol=access_control,
                    ispublished=False,
                    objectname=child_object_name,
                    objectnameurl=child_object_url,
                    objectdescription=row.get('description', 'Child object')
                )

                   # Link main object to child object
                max_objectlinkobjectid = Objectlinkobject.objects.aggregate(Max('objectlinkobjectid'))['objectlinkobjectid__max']
                new_objectlinkobjectid = (max_objectlinkobjectid or 0) + 1

                link_object = Objectlinkobject(
                            objectid=main_object,
                            linkedobjectid=child_object,
                            objectlinkobjectid=new_objectlinkobjectid,
                            sortcode=0,
                            field_created=timezone.now(),
                            field_createdby=created_by,
                            field_updated=timezone.now(),
                            field_updatedby=created_by,
                            linktypeobjectid=None
                        )
                link_object.save()

                        # Link sample to child object
                max_objectlinkobjectid = Objectlinkobject.objects.aggregate(Max('objectlinkobjectid'))['objectlinkobjectid__max']
                new_objectlinkobjectid = (max_objectlinkobjectid or 0) + 1

                link_object = Objectlinkobject(
                            objectid=existing_object,
                            linkedobjectid=child_object,
                            objectlinkobjectid=new_objectlinkobjectid,
                            sortcode=0,
                            field_created=timezone.now(),
                            field_createdby=created_by,
                            field_updated=timezone.now(),
                            field_updatedby=created_by,
                            linktypeobjectid=None
                        )
                link_object.save()
                # Create Propertyint entry
                max_propertyint_id = Propertyint.objects.aggregate(Max('propertyintid'))['propertyintid__max']
                Propertyint.objects.create(
                    propertyintid=(max_propertyint_id or 0) + 1,
                    objectid=child_object,
                    sortcode=area_counter,
                    field_created=timezone.now(),
                    field_createdby=created_by,
                    field_updated=timezone.now(),
                    field_updatedby=created_by,
                    row=area_counter,
                    value=int(row.get('Index', 0)),
                    propertyname=f"Measurement Area",
                    comment=row.get('description'),
                    sourceobjectid=main_object
                )

                valid_elements = {element.elementname: element for element in Elementinfo.objects.all()}
                                # Create a Sample entry for the child object
                               # Create a Sample entry for the child object
                child_sample = Sample.objects.create(
                    sampleid=child_object,  # Use the child_object (Objectinfo instance) as the sampleid
                    elemnumber=len([key for key in row.keys() if key not in ['Index', 'description'] and row[key]]),
                    elements='-'.join(
                        [key for key in row.keys() if key not in ['Index', 'description'] and row[key]]
                    )
                )
                print(f"Created Sample: {child_sample}")

                for element_name, value_percent in row.items():
                    if element_name in ['Index', 'description'] or not value_percent:
                        continue  # Skip non-elements or empty values
                    if element_name not in valid_elements:
                        continue  # Skip invalid or unrecognized element names

                    try:
                        # Convert value to percentage and absolute value
                        value_percent = float(value_percent)
                        value_absolute = value_percent * 0.01

                        # Ensure sampleid is passed as a Sample instance
                        existing_composition = Composition.objects.filter(
                            sampleid=child_sample,  # Use the child_sample (Sample instance)
                            elementname=element_name
                        ).first()

                        if existing_composition:
                            # Update the existing Composition entry
                            print(f"Updating existing Composition for element '{element_name}'")
                            existing_composition.valueabsolute = value_absolute
                            existing_composition.valuepercent = value_percent
                            existing_composition.save()
                        else:
                            # Create a new Composition entry
                            max_composition_id = Composition.objects.aggregate(Max('compositionid'))['compositionid__max']
                            new_composition_id = (max_composition_id or 0) + 1

                            print(f"Creating new Composition for element '{element_name}' with value {value_percent}%")
                            new_composition = Composition.objects.create(
                                compositionid=new_composition_id,
                                sampleid=child_sample,  # Use the child_sample (Sample instance)
                                elementname=element_name,
                                compoundindex=sort_code,
                                valueabsolute=value_absolute,
                                valuepercent=value_percent
                            )
                            # Print the created Composition object details
                        print(f"Created Composition: {new_composition}")
                    except ValueError as e:
                        print(f"Skipping invalid value for '{element_name}': {e}")
                        continue


                processed_rows += 1
                area_counter += 1

        if processed_rows == len(valid_rows):
            return JsonResponse({'success': 'Data processed and saved successfully'}, status=200)
        else:
            return JsonResponse({'error': f"Processed {processed_rows}/{len(valid_rows)} rows successfully."}, status=500)

    except Exception as e:
        print("An unexpected error occurred:")
        print(traceback.format_exc())
        return JsonResponse({'error': f"Internal Server Error: {str(e)}"}, status=500)
