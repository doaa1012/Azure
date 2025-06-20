from django.http import JsonResponse, Http404
import logging
from .utils.utils import load_lsvs  # Adjust the import path based on your project
from django.views.decorators.csrf import csrf_exempt
import zipfile
import tempfile  
import shutil 
import uuid 
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from .models import Objectinfo, Typeinfo, Rubricinfo, Aspnetusers, Tenant, Objectlinkobject, Composition, Sample,Propertyfloat
from django.utils import timezone
from django.db.models import Max
from django.http import JsonResponse
from django.conf import settings
import os
import json
import jwt
from datetime import datetime
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
import logging

logger = logging.getLogger(__name__)

BASE_FILE_PATH = settings.BASE_FILE_PATH 
EXTRACTION_SAVE_PATH = r'C:\Users\doaam\Downloads\PhD\extracted'

def extract_zip_twice(zip_path):
    logger.info(f"🔧 Attempting to extract: {zip_path}")

    if not zipfile.is_zipfile(zip_path):
        logger.error("File is not a valid zip.")
        return None

    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            with tempfile.TemporaryDirectory() as temp_dir:
                zip_ref.extractall(temp_dir)
                logger.info(f" Extracted to temporary folder: {temp_dir}")

                extracted_dirs = [os.path.join(temp_dir, d) for d in os.listdir(temp_dir) 
                                  if os.path.isdir(os.path.join(temp_dir, d)) and d != "__MACOSX"]

                logger.info(f" Top-level extracted dirs: {extracted_dirs}")

                if len(extracted_dirs) == 1:
                    second_level_dir = extracted_dirs[0]
                    subdirs = [os.path.join(second_level_dir, d) for d in os.listdir(second_level_dir) 
                               if os.path.isdir(os.path.join(second_level_dir, d)) and d != "__MACOSX"]

                    logger.info(f"Subdirectories found: {subdirs}")

                    if subdirs:
                        final_extract_dir = subdirs[0]
                        save_path = os.path.join(EXTRACTION_SAVE_PATH, os.path.basename(final_extract_dir))

                        if os.path.exists(save_path):
                            save_path = f"{save_path}_{uuid.uuid4().hex}"

                        shutil.move(final_extract_dir, save_path)
                        logger.info(f"Moved extracted directory to: {save_path}")
                        return save_path

                if extracted_dirs:
                    final_extract_dir = extracted_dirs[0]
                    save_path = os.path.join(EXTRACTION_SAVE_PATH, os.path.basename(final_extract_dir))

                    if os.path.exists(save_path):
                        save_path = f"{save_path}_{uuid.uuid4().hex}"

                    shutil.move(final_extract_dir, save_path)
                    logger.info(f"Moved extracted directory to: {save_path}")
                    return save_path

    except Exception as e:
        logger.exception(f"Exception during zip extraction: {e}")
        return None
def safe_float(value, default):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default

def safe_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default
@csrf_exempt
def load_lsvs_view(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method. Use POST.'}, status=405)

    try:
        logger.info("Starting LSV data processing...")
        data = json.loads(request.body)

        # Extract and validate Authorization token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'error': 'Authorization header missing or malformed.'}, status=401)

        token = auth_header.split(' ')[1]
        try:
            decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = decoded_token.get('user_id')
            if not user_id:
                return JsonResponse({'error': 'Invalid token: User ID missing.'}, status=401)

            # Fetch the authenticated user
            current_user = Aspnetusers.objects.filter(id=user_id).first()
            if not current_user:
                return JsonResponse({'error': 'Authenticated user not found.'}, status=401)

        except ExpiredSignatureError:
            return JsonResponse({'error': 'Token has expired.'}, status=401)
        except InvalidTokenError:
            return JsonResponse({'error': 'Invalid token.'}, status=401)
       
        # Validate object ID
        object_id = data.get('object_id')
        if not object_id:
            return JsonResponse({'success': False, 'error': 'Object ID is required.'}, status=400)

        # Fetch the object
        obj = Objectinfo.objects.filter(objectid=object_id).first()
        if not obj:
            return JsonResponse({'success': False, 'error': 'Object not found.'}, status=404)

        # Get and validate file path
        relative_path = obj.objectfilepath
        if not relative_path:
            
            return JsonResponse({'success': False, 'error': 'File path not found for this object.'}, status=404)

        # Fix: Use os.path.normpath for cross-platform safe join
        lsvs_path = os.path.normpath(os.path.join(BASE_FILE_PATH, relative_path.strip('/\\')))
        print(f"🔍 Checking path: {lsvs_path}")
        if not os.path.exists(lsvs_path):
            logger.warning(f" LSV path does not exist: {lsvs_path}")
            return JsonResponse({'success': False, 'error': f'LSV file not found at: {lsvs_path}'}, status=404)

        # Extract files
        extracted_dir = extract_zip_twice(lsvs_path)
        #extracted_dir =r'C:\Users\doaam\Downloads\PhD\SECCM_new\0010403_Ag-Au-Cu-Pd-Pt_LSVs_SECCM_HER_pH_1.0_tip_1150nm_meas_3\0010403_Ag-Au-Cu-Pd-Pt_LSVs_SECCM_HER_pH_1.0_tip_1150nm_meas_3'
        if not extracted_dir or not os.listdir(extracted_dir):
            return JsonResponse({'success': False, 'error': 'Extraction failed or no files found.'}, status=500)

        # Process LSV data
        st_pot = safe_float(data.get('st_pot'), 0.21)
        offset_pot = safe_float(data.get('offset_pot'), 0)
        ph = safe_float(data.get('ph'), 1)
        d_cap = safe_float(data.get('d_cap'), 1150)
        sweep = safe_int(data.get('sweep'), 7)
        try:
            logger.info("Starting LSV processing...")
            logger.info(f"Params: sweep={sweep}, ph={ph}, d_cap={d_cap}, offset_pot={offset_pot}, st_pot={st_pot}")
            lsvs = load_lsvs(extracted_dir, sweep, ph, d_cap, offset_pot, st_pot)
        except Exception as e:
            logger.exception(f" Failed during load_lsvs: {e}")
            return JsonResponse({'success': False, 'error': f'LSV loading failed: {str(e)}'}, status=500)

        if not lsvs or len(lsvs) == 0:
            return JsonResponse({'success': False, 'error': 'No valid LSV data was processed.'}, status=500)

        # Serialize processed data
        lsvs_json_serializable = {int(key): value.to_dict(orient='list') for key, value in lsvs.items()}
        # Define the structured path
        
        # Make sure to extract the integer tenant ID
        tenant_id_str = f"tenant{obj.tenantid.tenantid}"  # Instead of obj.tenantid directly
        tenant_folder = os.path.join(BASE_FILE_PATH, tenant_id_str)

        # Create new Objectinfo entry
        type_info = Typeinfo.objects.filter(typename='LSV (xlsx, csv, txt)').first()
        if not type_info:
            return JsonResponse({'success': False, 'error': 'Object type not found.'}, status=500)

        max_id = Objectinfo.objects.aggregate(Max('objectid'))['objectid__max'] or 0
        type_folder = os.path.join(tenant_folder, f"type{type_info.typeid}")
        object_folder = os.path.join(type_folder, f"object{max_id + 1}")
        os.makedirs(object_folder, exist_ok=True)
        # Create unique filename
        json_file_name = f"lsvs_data_{uuid.uuid4().hex}.json"
        json_file_path = os.path.join(object_folder, json_file_name)

        # Save the file
        with open(json_file_path, 'w') as json_file:
            json.dump(lsvs_json_serializable, json_file)


        # Construct the new object name
        new_object_name = f"Processed LSV Data for12323 {obj.objectname}"

        # Check for duplicate name for same tenant and type
        if Objectinfo.objects.filter(
            tenantid=obj.tenantid,
            typeid=type_info,
            objectname__iexact=new_object_name
        ).exists():
            return JsonResponse({
                'success': False,
                'error': 'An object with the same name already exists for this tenant and type. Please choose a different name or delete the existing one.'
            }, status=409)


        new_object = Objectinfo(
        objectid=max_id + 1,
        tenantid=obj.tenantid,
        field_created=timezone.now(),
        field_createdby=current_user,
        field_updated=timezone.now(),
        field_updatedby=current_user,
        typeid=type_info,
        rubricid=obj.rubricid,  
        objectname=f"Processed LSV Data for12323 {obj.objectname}",
        objectnameurl=f"processed-lsv-{uuid.uuid4().hex}",
        objectfilepath=json_file_path,
        objectdescription='Processed LSV data saved as JSON.',
        accesscontrol=obj.accesscontrol,
        sortcode=(Objectinfo.objects.aggregate(Max('sortcode'))['sortcode__max'] or 0) + 1,
        ispublished=False
    )

        new_object.save()
        # Link the new object to the parent object
        max_link_id = Objectlinkobject.objects.aggregate(Max('objectlinkobjectid'))['objectlinkobjectid__max'] or 0
        Objectlinkobject.objects.create(
            objectlinkobjectid=max_link_id + 1,
            objectid=obj,
            linkedobjectid=new_object,
            field_created=timezone.now(),
            field_createdby=current_user,  # Use current user
            field_updated=timezone.now(),
            field_updatedby=current_user,  # Use current user
            sortcode=(Objectlinkobject.objects.aggregate(Max('sortcode'))['sortcode__max'] or 0) + 1,
        )

        return JsonResponse({
            'success': True,
            'message': 'LSV data processed and saved.',
            'objectId': new_object.objectid,
            'data': lsvs_json_serializable
        }, status=201)

    except Exception as e:
        logger.exception(f"Unhandled exception: {e}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

