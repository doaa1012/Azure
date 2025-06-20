from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from collections import defaultdict
from .models import Objectinfo, Objectlinkobject
import json
from django.conf import settings
ZENODO_TOKEN = settings.ZENODO_API_TOKEN

@csrf_exempt
def generate_datacite_metadata(object_id):
    obj = Objectinfo.objects.get(objectid=object_id)
    creator_name = obj.field_createdby.username  # or another appropriate field
    type_name = obj.typeid.typename
    metadata = {
        "titles": [{"title": obj.objectname}],
        "creators": [{"name": creator_name}],
        "publisher": obj.tenantid.tenantname,
        "publicationYear": obj.field_created.year,
        "resourceType": {"resourceTypeGeneral": "Dataset", "resourceType": type_name},
        "descriptions": [{"description": obj.objectdescription or "", "descriptionType": "Abstract"}],
        "subjects": [{"subject": obj.sample.elements}] if hasattr(obj, 'sample') else [],
        "dates": [{"date": obj.field_created.isoformat(), "dateType": "Created"}],
        "formats": [obj.objectfilepath.split('.')[-1]] if obj.objectfilepath else [],
    }
    return metadata

import os
import requests
from datetime import datetime

ZENODO_TOKEN = 'your_zenodo_api_token_here'
ZENODO_URL = 'https://zenodo.org/api/deposit/depositions'

def upload_to_zenodo(objectinfo):
    headers = {
        "Authorization": f"Bearer {ZENODO_TOKEN}"
    }

    # Step 1: Create an empty deposit
    r = requests.post(ZENODO_URL, json={}, headers=headers)
    if r.status_code != 201:
        raise Exception(f"Failed to create deposit: {r.text}")
    deposition = r.json()
    deposition_id = deposition['id']

    # Step 2: Upload the file
    file_path = objectinfo.objectfilepath
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    with open(file_path, 'rb') as fp:
        files = {'file': (os.path.basename(file_path), fp)}
        file_url = f"{ZENODO_URL}/{deposition_id}/files"
        r = requests.post(file_url, files=files, headers=headers)
        if r.status_code != 201:
            raise Exception(f"Failed to upload file: {r.text}")

    # Step 3: Create metadata
    metadata = {
        'metadata': {
            'title': objectinfo.objectname,
            'upload_type': 'dataset',
            'description': objectinfo.objectdescription or 'Dataset from CRC 1625 database.',
            'creators': [{'name': objectinfo.field_createdby.username}],
            'publication_date': objectinfo.field_created.strftime('%Y-%m-%d'),
            'access_right': 'open',
        }
    }

    # Step 4: Update the metadata
    r = requests.put(f"{ZENODO_URL}/{deposition_id}", json=metadata, headers=headers)
    if r.status_code != 200:
        raise Exception(f"Failed to update metadata: {r.text}")

    # Step 5: Publish the deposition
    r = requests.post(f"{ZENODO_URL}/{deposition_id}/actions/publish", headers=headers)
    if r.status_code != 202:
        raise Exception(f"Failed to publish: {r.text}")

    doi = r.json()['doi']
    return doi
def save_doi_to_object(objectinfo, doi):
    if objectinfo.objectdescription:
        objectinfo.objectdescription += f"\nDOI: {doi}"
    else:
        objectinfo.objectdescription = f"DOI: {doi}"
    objectinfo.save()

def publish_objectinfo_to_zenodo(object_id):
    objectinfo = Objectinfo.objects.get(pk=object_id)
    doi = upload_to_zenodo(objectinfo)
    save_doi_to_object(objectinfo, doi)
    print(f"Successfully published. DOI: {doi}")
