from django.shortcuts import render
from django.db.models import Q
from django.http import JsonResponse, HttpResponse, Http404,FileResponse
from .models import Objectinfo, Rubricinfo, Sample, Objectlinkrubric, Objectlinkobject,Composition, Propertybigstring, Propertyfloat, Propertyint, Propertystring, Handover, Typeinfo, Aspnetusers, Reference
from django.db.models import Q
import logging
from django.utils.dateparse import parse_date
from django.views.decorators.csrf import csrf_exempt
import json
from zipfile import ZipFile
from io import BytesIO, StringIO
import os
import csv
from zipfile import ZipFile, ZIP_DEFLATED
import pandas as pd  
from django.core.paginator import Paginator
from django.db.models import Count
from django.db.models.functions import TruncMonth
from django.db.models import Count, F
from .models import Objectinfo, Typeinfo, Aspnetusers
from django.utils.html import format_html
from django.utils import timezone
from datetime import datetime
from django.http import JsonResponse
from django.db.models import Q
from .models import Objectinfo, Sample, Objectlinkrubric, Objectlinkobject
from .utils.full_file_path import get_full_file_path, download_file_response
from django.shortcuts import get_object_or_404
from django.conf import settings
logger = logging.getLogger(__name__)
BASE_FILE_PATH = settings.BASE_FILE_PATH  

ACCESS_CONTROL_MAP = {
    'public': 0,
    'protected': 1,
    'protectednda': 2,
    'private': 3
}


    
@csrf_exempt
def get_rubricinfo_by_path(request):
    if request.method == "POST":
        try:
            # Parse the rubricpath and user_id from the request body
            request_data = json.loads(request.body)
            rubricpath = request_data.get('rubricpath')
            user_id = request_data.get('user_id')  # User ID passed from the frontend
            
            if not rubricpath:
                return JsonResponse({'error': 'RubricPath is required'}, status=400)
            if not user_id:
                return JsonResponse({'error': 'User ID is required'}, status=400)

            # Query the Rubricinfo model for the specified RubricPath
            rubric_info = Rubricinfo.objects.filter(rubricpath=rubricpath).first()
            if not rubric_info:
                return JsonResponse({'error': 'No RubricInfo found for the specified RubricPath'}, status=404)

            # Fetch related Objectinfo records with access control logic
            related_objects = Objectinfo.objects.filter(
                rubricid=rubric_info.rubricid
            ).filter(
                Q(accesscontrol=0) |  # Public objects
                Q(accesscontrol=1) |  # Protected objects
                Q(accesscontrol=2) |  # Protected NDA objects
                Q(accesscontrol=3, field_createdby_id=user_id)  # Private objects visible only to the creator
            ).select_related('typeid')

            # Fetch all matching Rubricinfo records
            rubric_infos = Rubricinfo.objects.filter(rubricpath__icontains=rubricpath)

            # Prepare the rubric data
            rubric_data = [
                {
                    'RubricID': rubric.rubricid,
                    'RubricName': rubric.rubricname,
                    'RubricNameUrl': rubric.rubricnameurl,
                    'RubricPath': rubric.rubricpath,
                    'CreatedBy': rubric.field_createdby_id,
                    'AccessControl': rubric.accesscontrol  # Include access control in response
                }
                for rubric in rubric_infos
            ]

            # Prepare the object data with type info and access control
            object_data = [
                {
                    'ObjectID': obj.objectid,
                    'ObjectName': obj.objectname,
                    'ObjectNameUrl': obj.objectnameurl,
                    'RubricID': obj.rubricid_id,
                    'CreatedBy': obj.field_createdby_id,
                    'TypeID': obj.typeid.typeid,
                    'TypeName': obj.typeid.typename,
                    'AccessControl': obj.accesscontrol  # Include access control in response
                }
                for obj in related_objects
            ]

            return JsonResponse({'rubric_data': rubric_data, 'object_data': object_data}, safe=False, status=200)

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=405)



from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
import jwt
from .models import Objectinfo, Sample, Objectlinkrubric, Objectlinkobject

@csrf_exempt
def objectinfo_list(request, rubricnameurl):
    if request.method == "GET":
        try:
            # Retrieve the user_id from the token or request headers
            token = request.headers.get('Authorization', '').split('Bearer ')[-1]
            user_id = None
            if token:
                try:
                    decoded = jwt.decode(token, options={"verify_signature": False})
                    user_id = decoded.get('user_id')
                except Exception as e:
                    return JsonResponse({'error': f'Invalid token: {str(e)}'}, status=401)

            # Ensure user_id is available
            if not user_id:
                return JsonResponse({'error': 'User ID is required for private object access'}, status=400)

            # Filter Objectinfo based on rubricnameurl
            object_info = Objectinfo.objects.select_related('rubricid', 'field_createdby') \
                                            .filter(rubricid__rubricnameurl__icontains=rubricnameurl) \
                                            .filter(
                                                Q(accesscontrol=0) |  # Public objects
                                                Q(accesscontrol=1) |  # Protected objects
                                                Q(accesscontrol=2) |  # Protected NDA objects
                                                Q(accesscontrol=3, field_createdby_id=user_id)  # Private objects visible only to the creator
                                            )
            seen_rubricids = {}

            # Prepare the main data structure for the response
            for obj in object_info:
                rubric_id = obj.rubricid_id
                object_id = obj.objectid

                if rubric_id not in seen_rubricids:
                    seen_rubricids[rubric_id] = {
                        'Rubric ID': rubric_id,
                        'Rubric Name': obj.rubricid.rubricname if obj.rubricid else None,
                        'Rubric Name URL': obj.rubricid.rubricnameurl if obj.rubricid else None,
                        'Rubric Path': obj.rubricid.rubricpath if obj.rubricid else None,
                        'Objects': [],
                        'Linked Objects': [],
                        'Parent Objects': []
                    }

                # Try to get the corresponding Sample for this Objectinfo
                try:
                    sample = Sample.objects.get(sampleid=obj)
                    sample_data = {
                        'Sample ID': sample.sampleid_id,
                        'Element Number': sample.elemnumber,
                        'Elements': sample.elements
                    }
                except Sample.DoesNotExist:
                    sample_data = {
                        'Sample ID': None,
                        'Element Number': None,
                        'Elements': None
                    }

                # Append object details, including created_by
                seen_rubricids[rubric_id]['Objects'].append({
                    'Object ID': object_id,
                    'Object Name': obj.objectname,
                    'Type Info': {
                        'Type ID': obj.typeid.typeid if obj.typeid else None,
                        'Type Name': obj.typeid.typename if obj.typeid else None,
                    },
                    'Sample': sample_data,
                    'created_by': obj.field_createdby_id  # Include the creator's user ID
                })

            # Fetch and associate Linked Objects based on rubric_ids
            rubric_ids = list(seen_rubricids.keys())
            linked_objects = Objectlinkrubric.objects.select_related('objectid', 'objectid__typeid', 'rubricid', 'objectid__field_createdby') \
                                                    .filter(rubricid_id__in=rubric_ids)

            for link in linked_objects:
                rubric_id = link.rubricid_id
                linked_object_id = link.objectid.objectid

                # Try to get the corresponding Sample for this linked Objectinfo
                try:
                    sample = Sample.objects.get(sampleid=link.objectid)
                    sample_data = {
                        'Sample ID': sample.sampleid_id,
                        'Element Number': sample.elemnumber,
                        'Elements': sample.elements
                    }
                except Sample.DoesNotExist:
                    sample_data = {
                        'Sample ID': None,
                        'Element Number': None,
                        'Elements': None
                    }

                # Populate the 'Linked Objects' list with actual data, including created_by
                linked_object_data = {
                    'Object ID': linked_object_id,
                    'Object Name': link.objectid.objectname,
                    'Type Info': {
                        'Type ID': link.objectid.typeid.typeid if link.objectid.typeid else None,
                        'Type Name': link.objectid.typeid.typename if link.objectid.typeid else None,
                    },
                    'Sample': sample_data,
                    'created_by': link.objectid.field_createdby_id  # Include the creator's user ID
                }

                seen_rubricids[rubric_id]['Linked Objects'].append(linked_object_data)

                # Fetch parent objects (those that have the current linked object as their child)
                parent_links = Objectlinkobject.objects.select_related('objectid', 'objectid__typeid') \
                                                      .filter(linkedobjectid=link.objectid)

                for parent_link in parent_links:
                    parent_object_id = parent_link.objectid.objectid

                    parent_object_data = {
                        'Object ID': parent_object_id,
                        'Object Name': parent_link.objectid.objectname,
                        'Type Info': {
                            'Type ID': parent_link.objectid.typeid.typeid if parent_link.objectid.typeid else None,
                            'Type Name': parent_link.objectid.typeid.typename if parent_link.objectid.typeid else None,
                        },
                        'Sample': None  # If needed, you can fetch the sample data as well
                    }

                    # Avoid adding duplicate parent objects
                    if parent_object_data not in seen_rubricids[rubric_id]['Parent Objects']:
                        seen_rubricids[rubric_id]['Parent Objects'].append(parent_object_data)

            # Return only the filtered and relevant data for the specified `rubricnameurl`
            filtered_data = list(seen_rubricids.values())
            return JsonResponse(filtered_data, safe=False)

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=405)



def object_detail(request, object_id):
    try:
        # Retrieve the object with related type and rubric
        obj = Objectinfo.objects.select_related('typeid', 'rubricid', 'field_createdby', 'field_updatedby').get(objectid=object_id)

        # Get RubricNameUrl from Rubricinfo
        rubric_name_url = None
        if obj.rubricid:
            rubric_name_url = obj.rubricid.rubricnameurl

        # Retrieve associated and reverse-referenced objects
        associated_objects = Objectlinkobject.objects.filter(objectid=object_id).values(
            'linkedobjectid__objectname',
            'linkedobjectid__typeid__typename',
            'linkedobjectid__objectid',
            'linkedobjectid__rubricid__rubricname'
        )
        referenced_objects = Objectlinkobject.objects.filter(linkedobjectid=object_id).values(
            'objectid__objectname',
            'objectid__typeid__typename',
            'objectid__objectid',
            'objectid__rubricid__rubricname'
        )

        # Retrieve sample and composition data
        sample_data, composition_data = {}, []
        try:
            sample = Sample.objects.get(sampleid=obj)
            sample_data = {
                'SampleID': sample.sampleid_id,
                'ElementNumber': sample.elemnumber,
                'Elements': sample.elements
            }
            if obj.typeid and obj.typeid.typename.lower() in ['composition', 'calculation/computational composition']:
                composition_data = list(Composition.objects.filter(sampleid=sample).values(
                    'elementname', 'valueabsolute', 'valuepercent', 'compoundindex'
                ))
        except Sample.DoesNotExist:
            logger.info(f"No sample data found for object ID {object_id}")

        # Collect property data
        properties_data = []
        for model, prop_type, pk_field in [
            (Propertybigstring, 'Big String', 'propertybigstringid'),
            (Propertyfloat, 'Float', 'propertyfloatid'),
            (Propertyint, 'Int', 'propertyintid'),
            (Propertystring, 'String', 'propertystringid')
        ]:
            props = model.objects.filter(objectid=object_id).values(pk_field, 'propertyname', 'value', 'comment')
            for prop in props:
                properties_data.append({
                    'id': prop[pk_field],
                    'type': prop_type,
                    'propertyname': prop['propertyname'],
                    'value': prop['value'],
                    'comment': prop.get('comment', 'No comments')
                })
        properties_data.sort(key=lambda x: x['propertyname'])

        # Check for associated handovers
        has_handover = Handover.objects.filter(sampleobjectid=object_id).exists()

        # Generate file details
        file_url = f"/download-file/{obj.objectid}/" if obj.objectfilepath else None
        file_name = obj.objectnameurl or 'Unnamed File'

        # Retrieve reference details
        reference_data = {}
        try:
            reference = Reference.objects.get(referenceid=obj)
            reference_data = {
                'Authors': reference.authors,
                'Title': reference.title,
                'Journal': reference.journal,
                'Year': reference.year,
                'Volume': reference.volume,
                'Number': reference.number,
                'StartPage': reference.startpage,
                'EndPage': reference.endpage,
                'DOI': reference.doi,
                'URL': reference.url,
                'BibTeX': reference.bibtex,
            }
        except Reference.DoesNotExist:
            logger.info(f"No reference data found for object ID {object_id}")

        # Prepare response data
        data = {
            'ObjectId': obj.objectid,
            'RubricId': obj.rubricid_id if obj.rubricid else None,
            'RubricNameUrl': rubric_name_url,
            'ObjectName': obj.objectname,
            'Type': {
                'TypeId': obj.typeid.typeid if obj.typeid else None,
                'TypeName': obj.typeid.typename if obj.typeid else 'Unknown',
            },
            'Created': obj.field_created,
            'CreatedBy': {
                'UserId': obj.field_createdby.id,
                'UserName': obj.field_createdby.username,
            },
            'Updated': obj.field_updated,
            'UpdatedBy': {
                'UserId': obj.field_updatedby.id if obj.field_updatedby else None,
                'UserName': obj.field_updatedby.username if obj.field_updatedby else 'Unknown',
            },
            'Access': obj.accesscontrol,
            'Name': obj.objectname,
            'Description': obj.objectdescription or 'No description available',
            'FileUrl': file_url,
            'FileName': file_name,
            'ObjectNameUrl': obj.objectnameurl,
            'AssociatedObjects': list(associated_objects),
            'ReferencedObjects': list(referenced_objects),
            'Sample': sample_data,
            'Composition': composition_data,
            'Properties': properties_data,
            'HasHandover': has_handover,
            'Reference': reference_data,
        }

        return JsonResponse(data)

    except Objectinfo.DoesNotExist:
        return JsonResponse({'error': 'Object not found'}, status=404)

    except Exception as e:
        logger.error(f"Error in object_detail view: {e}")
        return JsonResponse({'error': str(e)}, status=500)






def get_handover_detail(request, sampleobjectid):
    try:
        # Retrieve all handover records associated with the given sampleobjectid
        handovers = Handover.objects.select_related(
            'handoverid', 'sampleobjectid', 'handoverid__field_createdby', 'destinationuserid'
        ).filter(sampleobjectid=sampleobjectid)

        # Prepare data for each handover record
        handover_data_list = []
        for handover in handovers:
            # Retrieve the object description as the sender's comments
            sender_comments = handover.handoverid.objectdescription

            handover_data = {
                'handoverid': handover.handoverid_id,
                'Sender': {
                    'Id': handover.handoverid.field_createdby.id,
                    'Username': handover.handoverid.field_createdby.username,
                    'Email': handover.handoverid.field_createdby.email
                },
                'Sent': handover.handoverid.field_created,
                'Amount': handover.amount,
                'MeasurementUnit': handover.measurementunit,
                'SenderComments': sender_comments,  # Use objectdescription for sender comments
                'Recipient': {
                    'Id': handover.destinationuserid.id,
                    'Username': handover.destinationuserid.username,
                    'Email': handover.destinationuserid.email
                },
                'destinationconfirmed': handover.destinationconfirmed,  # Destination confirmation time
                'destinationcomments': handover.destinationcomments  # Recipient comments
            }
            handover_data_list.append(handover_data)

        # Return all handover records as a JSON response
        return JsonResponse(handover_data_list, safe=False)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


    except Exception as e:
        logger.error(f"Error in get_handover_detail view: {e}")
        return JsonResponse({'error': str(e)}, status=500)


def get_rubric_path(request, object_id):
    try:
        obj = Objectinfo.objects.select_related('rubricid').get(objectid=object_id)
        rubricpath = obj.rubricid.rubricpath if obj.rubricid else None
        return JsonResponse({'rubricpath': rubricpath})
    except Objectinfo.DoesNotExist:
        return JsonResponse({'rubricpath': 'Unknown Path'}, status=404)




def download_file(request, object_id):
    try:
        # Retrieve the object to get the file path
        obj = Objectinfo.objects.get(objectid=object_id)

        # Generate the full file path
        file_path = get_full_file_path(obj.objectfilepath)
        
        if file_path:
            return download_file_response(file_path)
        else:
            raise Http404("File path not provided")

    except Objectinfo.DoesNotExist:
        return JsonResponse({'error': 'Object not found'}, status=404)

    except Exception as e:
        print(f"Error: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)







# element_composition_view

def element_composition_view(request):
    # Fetch all Objectinfo records where the typename is 'Composition'
    composition_type = Typeinfo.objects.get(typename='Composition')
    object_infos = Objectinfo.objects.filter(typeid=composition_type)

    # Prepare a dictionary to count occurrences of each element
    element_count = {}

    for obj_info in object_infos:
        try:
            sample = Sample.objects.get(sampleid=obj_info)
            element = sample.elements  # Assuming 'elements' contains the element name
        except Sample.DoesNotExist:
            continue

        if element in element_count:
            element_count[element] += 1
        else:
            element_count[element] = 1

    # Convert the dictionary to a list of {element, count} for easier consumption on the frontend
    data = [{'element': element, 'count': count} for element, count in element_count.items()]

    return JsonResponse(data, safe=False)



def get_typenames(request):
    try:
        types = Typeinfo.objects.all().values('typeid', 'typename')
        return JsonResponse(list(types), safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# monthly_object_increase_view

def monthly_object_increase_view(request):
    try:
        # Get the object type names from request parameters as a list
        type_names = request.GET.getlist('typename')

        # Log the type_names for debugging
        print("Received type names:", type_names)

        if not type_names:
            return JsonResponse({'error': 'Object type name(s) required'}, status=400)

        # Fetch Typeinfo objects for the selected type names
        types = Typeinfo.objects.filter(typename__in=type_names)
        
        if not types.exists():
            print("No matching types found for:", type_names)
            return JsonResponse({'error': 'Invalid Object Type Name(s)'}, status=404)

        # Get all Objectinfo records for the filtered types
        object_infos = Objectinfo.objects.filter(typeid__in=types)

        # Group by typename and month of creation, and count the occurrences
        monthly_data = object_infos.annotate(
            month=TruncMonth('field_created'),
            typename=F('typeid__typename')
        ).values('typename', 'month').annotate(count=Count('objectid')).order_by('typename', 'month')

        # Prepare data for the response
        data = {}
        for entry in monthly_data:
            typename = entry['typename']
            month = entry['month']
            count = entry['count']

            if typename not in data:
                data[typename] = []

            data[typename].append({
                'month': month,
                'count': count
            })

        print("Successfully retrieved and processed monthly data")
        return JsonResponse(data, safe=False)

    except Exception as e:
        print(f"Error occurred: {e}")
        return JsonResponse({'error': str(e)}, status=500)



# synthesis requests view

def synthesis_requests_view(request):
    # Get all synthesis requests by filtering Objectinfo records where typename is 'Request for Synthesis'
    synthesis_request_type = Typeinfo.objects.get(typename='Request for Synthesis')
    synthesis_requests = Objectinfo.objects.filter(typeid=synthesis_request_type)

    data = []
    for request_obj in synthesis_requests:
        # Check if this request is linked to any samples (in Objectlinkobject table)
        linked_samples = Objectlinkobject.objects.filter(objectid=request_obj).exists()

        data.append({
            'object_id': request_obj.objectid,
            'date_created': request_obj.field_created.strftime("%m/%d/%Y %I:%M:%S %p"),
            'description': request_obj.objectdescription,
            'object_name': request_obj.objectname,  # Add object name here
            'created_by': request_obj.field_createdby.username,  # Assuming username is available
            'is_linked': linked_samples,  # True if linked to a sample, else False
        })

    return JsonResponse(data, safe=False)


# ideas_and_experiments_view
def ideas_and_experiments_view(request):
    try:
        # Attempt to get the Typeinfo entry
        idea_experiment_type = Typeinfo.objects.get(typename='Ideas or experiment plans')
    except Typeinfo.DoesNotExist:
        # Return a JSON response indicating the Typeinfo entry does not exist
        return JsonResponse({'error': 'Typeinfo entry for Ideas for Experiment Plans does not exist.'}, status=404)

    # Filter Objectinfo records for ideas/experiments
    ideas_and_experiments = Objectinfo.objects.filter(typeid=idea_experiment_type)

    data = []
    for idea_obj in ideas_and_experiments:
        # Get all samples linked to this idea/experiment
        linked_samples = Objectlinkobject.objects.filter(objectid=idea_obj)
        sample_count = linked_samples.count()

        # Handle hyperlink in description if any
        description = idea_obj.objectdescription
        if "http" in description:
            description_parts = description.split(" ")
            description_with_links = " ".join([
                f'<a href="{part}" target="_blank">{part}</a>' if part.startswith("http") else part 
                for part in description_parts
            ])
            description = format_html(description_with_links)

        data.append({
            'object_id': idea_obj.objectid,
            'date_created': idea_obj.field_created.strftime("%m/%d/%Y %I:%M:%S %p"),
            'description': description,
            'object_name': idea_obj.objectname,
            'created_by': idea_obj.field_createdby.username,
            'is_linked': sample_count > 0,
            'sample_count': sample_count,
        })

    return JsonResponse(data, safe=False)


# object_statistics_view
def object_statistics_view(request):
    # Get the user ID from the request parameters (optional)
    user_id = request.GET.get('user_id')

    if user_id:
        # Filter by user if user_id is provided
        try:
            selected_user = Aspnetusers.objects.get(id=user_id)
            objects = Objectinfo.objects.filter(field_createdby=selected_user)
        except Aspnetusers.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)
    else:
        # If no user is selected, get all objects
        objects = Objectinfo.objects.all()

    # Prepare statistics based on object types
    statistics = objects.values('typeid__typeid', 'typeid__typename', 'typeid__typecomment').annotate(
        object_count=Count('objectid')
    ).order_by('-object_count')

    # Prepare data to return
    data = [
        {
            'object_count': stat['object_count'],
            'typeid': stat['typeid__typeid'],
            'typename': stat['typeid__typename'],
            'typecomment': stat['typeid__typecomment'],
        }
        for stat in statistics
    ]

    return JsonResponse(data, safe=False)

# user_list_view
def user_list_view(request):
    # Retrieve all users to populate the dropdown in the frontend
    users = Aspnetusers.objects.all().values('id', 'username', "email")
    return JsonResponse(list(users), safe=False)


def user_detail_view(request, user_id):
    try:
        user = Aspnetusers.objects.get(id=user_id)
        user_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
        }
        return JsonResponse(user_data)
    except Aspnetusers.DoesNotExist:
        raise Http404("User does not exist")


# sample per elements
def get_samples_per_element_data(request):
    # Dictionary to hold sets of unique sample IDs for each element
    element_samples = defaultdict(set)

    # Get the `Typeinfo` where typename is 'Sample'
    sample_type = Typeinfo.objects.get(typename='Sample')

    # Get all Objectinfo instances where the typeid matches the sample typeid
    objectinfo_samples = Objectinfo.objects.filter(typeid=sample_type.typeid)

    # Iterate over all Objectinfo instances that are samples
    for obj_info in objectinfo_samples:
        # Get the corresponding Sample instance
        try:
            sample = Sample.objects.get(sampleid=obj_info.objectid)
        except Sample.DoesNotExist:
            continue  # Skip if no Sample is found

        # Split the 'elements' field (assuming it's a hyphen-separated string, e.g., "-Ag-Au-Pd-")
        sample_elements = sample.elements.split('-')

        # Clean up and iterate through the elements
        for element in sample_elements:
            element = element.strip()  # Clean up any extra spaces
            if element:  # Ensure we skip empty strings
                element_samples[element].add(sample.sampleid)  # Add sample ID to the set

    # Convert sets to counts
    element_counts = {element: len(sample_ids) for element, sample_ids in element_samples.items()}

    # Prepare the data for the API response
    data = {
        'elementnames': list(element_counts.keys()),
        'counts': list(element_counts.values()),
        'typename': sample_type.typename
    }

    return JsonResponse(data)


# search_table_view
@csrf_exempt
def search_table_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            # Extract parameters
            elements = data.get('elements', [])
            object_type = data.get('object_type', '')
            search_phrase = data.get('search_phrase', '')
            created_by_email = data.get('created_by', '')  # Email now
            start_date = data.get('start_date', '')
            end_date = data.get('end_date', '')
            object_id = data.get('object_id', '')  
            element_percentages = data.get('elementPercentages', {})  

            selected_measurements = data.get('selectedMeasurements', [])

            # Pagination
            page = int(data.get('page', 1))
            page_size = int(data.get('page_size', 10))

            # Initialize queryset
            objectinfos = Objectinfo.objects.all()

            # Filter by Object ID
            if object_id:
                objectinfos = objectinfos.filter(objectid=object_id)

            # Filter by elements and percentages through Composition model
            if elements:
                for element in elements:
                    min_percent = element_percentages.get(element, {}).get('min')
                    max_percent = element_percentages.get(element, {}).get('max')
                    composition_filter = Q(sample__composition__elementname=element)
                    if min_percent is not None:
                        composition_filter &= Q(sample__composition__valuepercent__gte=min_percent)
                    if max_percent is not None:
                        composition_filter &= Q(sample__composition__valuepercent__lte=max_percent)
                    objectinfos = objectinfos.filter(composition_filter)

            # Filter by object type
            if object_type:
                objectinfos = objectinfos.filter(typeid__typename__icontains=object_type)

            # Filter by search phrase
            if search_phrase:
                objectinfos = objectinfos.filter(
                    Q(objectname__icontains=search_phrase) |
                    Q(objectdescription__icontains=search_phrase)
                )

            # **New Logic**: Filter by creator's email using the ForeignKey relationship
            if created_by_email:
                objectinfos = objectinfos.filter(field_createdby__email__icontains=created_by_email)

            # Filter by date range
            if start_date and end_date:
                objectinfos = objectinfos.filter(field_created__range=(start_date, end_date))

            # Filter by selected measurements
            if selected_measurements:
                measurement_query = Q()
                for measurement in selected_measurements:
                    measurement_query |= Q(typeid__typename__icontains=measurement)
                objectinfos = objectinfos.filter(measurement_query)

            # Paginate the results
            paginator = Paginator(objectinfos, page_size)
            paginated_results = paginator.get_page(page)

            # Prepare the result data
            results_data = []
            for obj in paginated_results:
                type_name = obj.typeid.typename if obj.typeid else 'Unknown'
                results_data.append({
                    'objectid': obj.objectid,
                    'objectname': obj.objectname,
                    'typeid__typename': type_name,
                    'field_created': obj.field_created,
                    'field_createdby__username': obj.field_createdby.username,  # Username for display
                    'objectfilepath': obj.objectfilepath
                })

            # Return the paginated results with metadata
            response_data = {
                'results': results_data,
                'page': page,
                'total_pages': paginator.num_pages,
                'total_results': paginator.count,
            }
            return JsonResponse(response_data)

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=400)




# search_dataset_view
@csrf_exempt
def search_dataset_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Extract parameters from the request body
            elements = data.get('elements', [])
            object_type = data.get('object_type', '')
            search_phrase = data.get('search_phrase', '')
            created_by = data.get('created_by', '')
            start_date = data.get('start_date', '')
            end_date = data.get('end_date', '')
            object_id = data.get('object_id', '')  # Add Object ID here
            selected_measurements = data.get('selectedMeasurements', [])
            
            # Pagination parameters
            page = int(data.get('page', 1))  # Default to page 1
            page_size = int(data.get('page_size', 30))  # Default to 30 results per page

            # Initialize the base queryset
            objectinfos = Objectinfo.objects.all()

            # Filter by Object ID if provided
            if object_id:
                objectinfos = objectinfos.filter(objectid=object_id)

            # Filter by elements (if provided)
            if elements:
                objectinfos = objectinfos.filter(sample__composition__elementname__in=elements)

            # Filter by object type if provided
            if object_type:
                objectinfos = objectinfos.filter(typeid__typename__iexact=object_type)

            # Filter by search phrase (if provided)
            if search_phrase:
                objectinfos = objectinfos.filter(
                    Q(objectname__icontains=search_phrase) |
                    Q(objectdescription__icontains=search_phrase)
                )

            # Filter by creator (if provided)
            if created_by:
                objectinfos = objectinfos.filter(field_createdby__username__icontains=created_by)

            # Filter by date range (if provided) with timezone-aware conversion
            if start_date and end_date:
                start_date = timezone.make_aware(datetime.strptime(start_date, "%Y-%m-%d"), timezone.get_current_timezone())
                end_date = timezone.make_aware(datetime.strptime(end_date, "%Y-%m-%d"), timezone.get_current_timezone())
                objectinfos = objectinfos.filter(field_created__range=(start_date, end_date))

            # New filter: Filter by selected measurements (if provided)
            if selected_measurements:
                selected_measurement_queries = Q()
                for measurement in selected_measurements:
                    selected_measurement_queries |= Q(typeid__typename__icontains=measurement)
                objectinfos = objectinfos.filter(selected_measurement_queries)

            # Order the queryset by 'field_created' before pagination
            objectinfos = objectinfos.order_by('field_created')

            # Apply pagination to the queryset
            paginator = Paginator(objectinfos, page_size)
            paginated_results = paginator.get_page(page)

            # Prepare results with file check logic
            results_data = []
            for obj in paginated_results:
                has_files = False
                file_paths = []

                # Check for file path in the main object
                if obj.objectfilepath and obj.objectfilepath.lower() != 'null':
                    has_files = True
                    file_paths.append(obj.objectfilepath)

                # Get associated and reverse-referenced objects with valid file paths
                associated_objects = Objectlinkobject.objects.filter(objectid=obj.objectid).select_related('linkedobjectid')
                reverse_referenced_objects = Objectlinkobject.objects.filter(linkedobjectid=obj.objectid).select_related('objectid')

                all_objects = [obj] + [o.linkedobjectid for o in associated_objects] + [o.objectid for o in reverse_referenced_objects]

                # Prepare the description by combining object names
                description_parts = [obj.objectname]  # Main object name
                description_parts += [o.linkedobjectid.objectname for o in associated_objects if o.linkedobjectid]
                description_parts += [o.objectid.objectname for o in reverse_referenced_objects if o.objectid]
                description = " | ".join(description_parts)

                # Check for file paths in associated and reverse-referenced objects
                for o in all_objects:
                    if o.objectfilepath and o.objectfilepath.lower() != 'null':
                        has_files = True
                        file_paths.append(o.objectfilepath)

                # Unify the field names with the table search
                results_data.append({
                    'objectid': obj.objectid,
                    'objectname': obj.objectname,
                    'typeid__typename': obj.typeid.typename if obj.typeid else 'Unknown', 
                    'field_created': obj.field_created,
                    'field_createdby__username': obj.field_createdby.username if obj.field_createdby else 'Unknown',  # Unifying the field name
                    'has_files': has_files,  # Indicates if files are available for download
                    'filepath': obj.objectfilepath,
                    'objectdescription': description  # Use the generated description
                })

            # Return the paginated results with pagination info
            return JsonResponse({
                'results': results_data,
                'total_pages': paginator.num_pages,
                'total_results': paginator.count,
                'current_page': paginated_results.number,
            })

        except Exception as e:
            logger.error(f"Error occurred during dataset search: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
            
    return JsonResponse({'error': 'Invalid request method'}, status=400)




# download_dataset

@csrf_exempt
def download_dataset(request, object_id):
    try:
        # Retrieve the main object from the database
        obj = Objectinfo.objects.get(objectid=object_id)

        # Get the name and description from the main object
        dataset_name = obj.objectname or "Unnamed Dataset"
    
        # Get associated and reverse-referenced objects
        associated_objects = Objectlinkobject.objects.filter(objectid=obj.objectid).select_related('linkedobjectid')
        reverse_referenced_objects = Objectlinkobject.objects.filter(linkedobjectid=obj.objectid).select_related('objectid')

        # Combine all relevant objects
        all_objects = [obj] + [o.linkedobjectid for o in associated_objects] + [o.objectid for o in reverse_referenced_objects]

        # Collect all file paths and gather typename for JSON
        file_paths = []
        typename_file_mapping = {}
        
        for o in all_objects:
            if o.objectfilepath and o.objectfilepath.lower() != 'null':
                file_paths.append(o.objectfilepath)

                # Get the typename from Typeinfo based on typeid (fix here: ensure you're passing o.typeid_id)
                try:
                    # Access the typeid correctly with _id to get the integer
                    typeinfo = Typeinfo.objects.get(typeid=o.typeid_id)
                    typename = typeinfo.typename
                    filename = os.path.basename(o.objectfilepath)

                    # Add to typename_file_mapping
                    if typename in typename_file_mapping:
                        typename_file_mapping[typename].append(filename)
                    else:
                        typename_file_mapping[typename] = [filename]
                except Typeinfo.DoesNotExist:
                    continue

        # Debug: Print file paths and typename mapping
        print(f"File paths collected: {file_paths}")
        print(f"Typename to file mapping: {typename_file_mapping}")

        # Prepare ZIP file path
        zip_file_path = os.path.join(BASE_FILE_PATH, f'dataset_{object_id}.zip')

        # Initialize merged_csv_name with a default value
        merged_csv_name = None

        with ZipFile(zip_file_path, 'w', ZIP_DEFLATED) as zip_file:
            file_count = 0  # Count how many files are successfully added
            merged_files_list = []  # Track merged files

            # List of DataFrames for column-wise merging
            dataframes = []

            # Iterate through file paths and process CSVs
            for relative_path in file_paths:
                # Ensure correct relative path construction
                relative_path_corrected = relative_path.strip().lstrip('/')

                # Construct full file path with BASE_FILE_PATH
                full_file_path = os.path.join(BASE_FILE_PATH, relative_path_corrected)

                # Debugging: Print full file path to log
                print(f"Checking file at path: {full_file_path}")

                if os.path.exists(full_file_path):
                    # If the file is a CSV, merge its contents by columns
                    if full_file_path.endswith('.csv'):
                        df = pd.read_csv(full_file_path)  # Read CSV into a DataFrame
                        dataframes.append(df)  # Append DataFrame to the list for later merging

                        # Track the file name for the description
                        merged_files_list.append(os.path.basename(full_file_path))

                    # Add the original file to the ZIP archive
                    zip_file.write(full_file_path, os.path.basename(full_file_path))
                    file_count += 1
                else:
                    print(f"File not found at path: {full_file_path}")

            # Check if any files were added to the zip
            if file_count == 0:
                return JsonResponse({'error': 'No valid files were found to include in the dataset.', 'checked_paths': file_paths}, status=404)

            # Merge all DataFrames column-wise
            if dataframes:
                merged_df = pd.concat(dataframes, axis=1)  # Merge by columns

                # Save the merged CSV
                merged_csv_name = f'merged_dataset_{object_id}.csv'
                merged_csv_path = os.path.join(BASE_FILE_PATH, merged_csv_name)
                merged_df.to_csv(merged_csv_path, index=False)

                # Add the merged CSV to the ZIP archive
                zip_file.write(merged_csv_path, merged_csv_name)

            # Add the description as a text file to the ZIP archive
            description_file_name = f'description_{object_id}.txt'
            description_file_path = os.path.join(BASE_FILE_PATH, description_file_name)

            # Prepare description content
            description_content = (
                f"Files in the folder:\n"
            )

            # List original files
            for full_file_path in file_paths:
                description_content += f"- {os.path.basename(full_file_path)}\n"

            # List merged files
            if merged_files_list:
                description_content += "\nMerged CSV files:\n"
                for file in merged_files_list:
                    description_content += f"- {file}\n"

            # Add the merged CSV to the description if it exists
            if merged_csv_name:
                description_content += f"\nMerged CSV file: {merged_csv_name}\n"

            # Write the description content to the text file
            with open(description_file_path, 'w') as description_file:
                description_file.write(description_content)

            # Add the description text file to the ZIP
            zip_file.write(description_file_path, description_file_name)

            # Create the JSON file with typename to file mapping
            json_file_name = f'typename_mapping_{object_id}.json'
            json_file_path = os.path.join(BASE_FILE_PATH, json_file_name)

            with open(json_file_path, 'w') as json_file:
                json.dump(typename_file_mapping, json_file, indent=4)

            # Add the JSON file to the ZIP archive
            zip_file.write(json_file_path, json_file_name)

        # Send the created zip file as a response
        response = FileResponse(open(zip_file_path, 'rb'), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="dataset_{object_id}.zip"'

        return response

    except Objectinfo.DoesNotExist:
        return JsonResponse({'error': 'Object not found'}, status=404)

    except Exception as e:
        print(f"Error: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)



# Define the workflow stages and their associated object types
WORKFLOW_STAGES = {
    "Initial Selection": {
        "Selecting Promising Compositional Complex Solid Solutions (CCSS)": [
            "Compositional solutions", "Simulation Database", "Bandgap Reference Spectra (csv)",  "Synthesis", "Sample"
        ],
        "Composition Analysis": [
            "EDX Image", "EDX CSV", "XPS", "Raman (txt)", "Electrochemical data (csv, txt)", "Magnetic properties", "EDX Image",  "EDX Raw (txt)"
        ]
    },
    "Refinement and Surface Preparation": {
        "Refining Samples": [
            "Substrate", "Composition Test", "Thickness Image", "Sputter Chamber", "Nanoindentation", "Topography", "TEM image"
        ],
        "Compositional and Structural Defects Analysis": [
            "APT", "Computational Composition Atom", "Topography", "TEM image", "Thickness Excel"
        ]
    },
    "Surface Modification and Electrochemical Testing": {
        "Electrochemical Dealloying & Underpotential Deposition (UPD)": [
            "Electrochemical data", "Bandgap Sample Spectra (csv)", "CV Measurement (xlsx, csv, txt)", "Open Circuit Potential (csv, txt, dat)", "PEIS (xlsx, csv, txt)"
        ],
        "Testing and Characterization": [
            "CV Measurement (nox)", "PEIS (xlsx, csv, txt)", "DACV Raw (csv)", "DACA Raw (csv)", "DACV Image (jpg)", "DACA Image (jpg)"
        ]
    },
    "Microscopy, Spectroscopy, and Advanced Analysis": {
        "Surface and Structural Analysis": [
            "SEM (image)", "EELS data", "Scanning Probe Microscopy", "XRD Integ. Raw ZIP (xy)", "SECCM Long-range Processed (csv)", "SECCM Long-range Raw (zip)",  "EDX Raw (txt, ipj))"
        ]
    },
    "Simulation, Modelling, and Feedback Loops": {
        "High-Throughput Simulations": [
            "Simulation Database", "Computational Composition Sample", "Calculation/Computational Composition", "Python Script (py, zip)"
        ],
        "Refining Processes Based on Results": [
            "Compositional solutions", "Electrochemical data", "Microscopy data", "Stress Measurement (DHM)",
        ]
    }
}
def determine_workflow_stage(object_type_name):
    """
    This function checks the object type against the defined workflow stages
    and returns the stage and step where this type belongs.
    """
    for stage, steps in WORKFLOW_STAGES.items():
        for step_name, object_types in steps.items():
            if object_type_name in object_types:
                return {"stage": stage, "step": step_name}
    return {"stage": "Unknown", "step": "Unknown"}


def get_workflow_stage(request, object_id):
    try:
        # Retrieve the main object
        obj = Objectinfo.objects.select_related('typeid', 'rubricid').get(objectid=object_id)

        # Get the stage and step for the main object
        main_object_stage = determine_workflow_stage(obj.typeid.typename if obj.typeid else 'Unknown')

        # Retrieve associated and reverse-associated objects
        associated_objects = Objectlinkobject.objects.filter(objectid=object_id).values(
            'linkedobjectid__objectname', 'linkedobjectid__typeid__typename', 'linkedobjectid__objectid')
        
        reverse_associated_objects = Objectlinkobject.objects.filter(linkedobjectid=object_id).values(
            'objectid__objectname', 'objectid__typeid__typename', 'objectid__objectid')

        # Process associated objects
        associated_object_stages = []
        for assoc_obj in associated_objects:
            assoc_stage = determine_workflow_stage(assoc_obj['linkedobjectid__typeid__typename'])
            associated_object_stages.append({
                "object": assoc_obj,
                "stage": assoc_stage["stage"],
                "step": assoc_stage["step"]
            })

        # Process reverse-associated objects
        reverse_associated_object_stages = []
        for rev_assoc_obj in reverse_associated_objects:
            rev_assoc_stage = determine_workflow_stage(rev_assoc_obj['objectid__typeid__typename'])
            reverse_associated_object_stages.append({
                "object": rev_assoc_obj,
                "stage": rev_assoc_stage["stage"],
                "step": rev_assoc_stage["step"]
            })

        # Prepare the final response data
        data = {
            'Object ID': obj.objectid,
            'Object Name': obj.objectname,
            'Main Object': {
                'Type': {
                    'TypeId': obj.typeid.typeid if obj.typeid else None,
                    'TypeName': obj.typeid.typename if obj.typeid else 'Unknown',
                },
                'Workflow Stage': main_object_stage["stage"],
                'Workflow Step': main_object_stage["step"],
            },
            'Associated Objects': associated_object_stages,
            'Reverse Associated Objects': reverse_associated_object_stages,
        }

        return JsonResponse(data)

    except Objectinfo.DoesNotExist:
        return JsonResponse({'error': 'Object not found'}, status=404)






def get_sample_associated_data(request):
    column_mapping = {
        'initial_selection': [
            "Compositional solutions",
            "Simulation Database",
            "Bandgap Reference Spectra (csv)",
            "Stress Measurement (DHM)",
            "Synthesis",
            "EDX CSV",
            "XPS",
            "Raman (txt)",
            "Electrochemical data (csv, txt)",
            "Magnetic properties",
            "EDX Image",
            "Composition", 
            "EDX Raw (txt)", 
        ],
        'refinement': [
            "Substrate",
            "Composition Test",
            "Thickness Image",
            "Sputter Chamber",
            "Nanoindentation",
            "Topography",
            "TEM image",
            "APT",
            "Computational Composition Atom",
            "Thickness Excel"
        ],
        'surface_modification': [
            "Electrochemical data (csv, txt)",
            "CV Measurement (xlsx, csv, txt)",
            "Open Circuit Potential (csv, txt, dat)",
            "PEIS (xlsx, csv, txt)",
            "CV Measurement (nox)",
            "DACV Raw (csv)"
        ],
        'microscopy_analysis': [
            "SEM (image)",
            "EELS data",
            "XRD Integ. Raw ZIP (xy)",
            "SECCM Long-range Processed (csv)",
            "SECCM Long-range Raw (zip)",
            "EDX Raw (txt, ipj)"
        ],
        'simulation_feedback': [
            "Stress Measurement (DHM)",
            "Simulation Database"
        ]
    }

    # Fetch the samples
    samples = Objectinfo.objects.filter(typeid__typename="Sample")

    table_data = []
    for sample in samples:
        row = {
            'sampleid': sample.objectid,
            'sample_objectid': sample.objectid,  # Linking to object details
            'sample_objectname': sample.objectname or 'Unknown Name',  # Adding the sample name here
            'initial_selection': [{'value': False, 'objectids': []} for _ in column_mapping['initial_selection']],
            'refinement': [{'value': False, 'objectids': []} for _ in column_mapping['refinement']],
            'surface_modification': [{'value': False, 'objectids': []} for _ in column_mapping['surface_modification']],
            'microscopy_analysis': [{'value': False, 'objectids': []} for _ in column_mapping['microscopy_analysis']],
            'simulation_feedback': [{'value': False, 'objectids': []} for _ in column_mapping['simulation_feedback']],
            'true_count': 0  # To count the number of true matches
        }

        # Linking logic (same as you have)
        linked_objects = Objectlinkobject.objects.filter(objectid=sample.objectid)
        reverse_linked_objects = Objectlinkobject.objects.filter(linkedobjectid=sample.objectid)

        linked_object_ids = linked_objects.values_list('linkedobjectid', flat=True)
        reverse_linked_object_ids = reverse_linked_objects.values_list('objectid', flat=True)

        all_object_ids = set(linked_object_ids).union(set(reverse_linked_object_ids))
        related_objects = Objectinfo.objects.filter(objectid__in=all_object_ids).distinct()

        for obj in related_objects:
            object_type = obj.typeid.typename
            if object_type in column_mapping['initial_selection']:
                index = column_mapping['initial_selection'].index(object_type)
                row['initial_selection'][index]['value'] = True
                row['initial_selection'][index]['objectids'].append(obj.objectid)
                row['true_count'] += 1  # Increment the true count

            if object_type in column_mapping['refinement']:
                index = column_mapping['refinement'].index(object_type)
                row['refinement'][index]['value'] = True
                row['refinement'][index]['objectids'].append(obj.objectid)
                row['true_count'] += 1  # Increment the true count

            if object_type in column_mapping['surface_modification']:
                index = column_mapping['surface_modification'].index(object_type)
                row['surface_modification'][index]['value'] = True
                row['surface_modification'][index]['objectids'].append(obj.objectid)
                row['true_count'] += 1  # Increment the true count

            if object_type in column_mapping['microscopy_analysis']:
                index = column_mapping['microscopy_analysis'].index(object_type)
                row['microscopy_analysis'][index]['value'] = True
                row['microscopy_analysis'][index]['objectids'].append(obj.objectid)
                row['true_count'] += 1  # Increment the true count

            if object_type in column_mapping['simulation_feedback']:
                index = column_mapping['simulation_feedback'].index(object_type)
                row['simulation_feedback'][index]['value'] = True
                row['simulation_feedback'][index]['objectids'].append(obj.objectid)
                row['true_count'] += 1  # Increment the true count

        table_data.append(row)

    # Sort the table data by the number of true matches (true_count), in descending order
    table_data = sorted(table_data, key=lambda x: x['true_count'], reverse=True)

    # Pagination logic
    paginator = Paginator(table_data, 10)  # 10 samples per page
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    return JsonResponse({
        'data': page_obj.object_list,
        'page_number': page_obj.number,
        'total_pages': paginator.num_pages
    })



@csrf_exempt
def download_multiple_datasets(request):
    try:
        # Ensure this is a POST request and contains the required 'objectids' data
        if request.method != 'POST':
            return JsonResponse({'error': 'Invalid request method. POST required.'}, status=400)

        # Parse the JSON body from the request
        data = json.loads(request.body)
        object_ids_list = data.get('objectids', [])

        if not object_ids_list:
            return JsonResponse({'error': 'No object IDs provided.'}, status=400)

        print(f"Received object IDs: {object_ids_list}")

        file_paths = set()  # Use a set to ensure each file is added only once
        all_objects = []

        # Retrieve files for each object ID
        for object_id in object_ids_list:
            try:
                obj = Objectinfo.objects.get(objectid=object_id)
                print(f"Processing object: {obj.objectname}")

                associated_objects = Objectlinkobject.objects.filter(objectid=obj.objectid).select_related('linkedobjectid')
                reverse_referenced_objects = Objectlinkobject.objects.filter(linkedobjectid=obj.objectid).select_related('objectid')

                # Combine all relevant objects (main object + associated objects)
                all_objects.extend([obj] + [o.linkedobjectid for o in associated_objects] + [o.objectid for o in reverse_referenced_objects])

            except Objectinfo.DoesNotExist:
                return JsonResponse({'error': f'Object with ID {object_id} not found.'}, status=404)

        # Collect file paths from all relevant objects
        for o in all_objects:
            if o.objectfilepath and o.objectfilepath.lower() != 'null':
                file_paths.add(o.objectfilepath.strip().lstrip('/'))  # Add to set, ensuring uniqueness

        print(f"Unique file paths collected: {file_paths}")

        # If no files were found, return a response indicating no files available for download
        if not file_paths:
            return JsonResponse({'message': 'No files available for download for the selected object IDs.'}, status=200)

        # Prepare ZIP file path
        zip_file_path = os.path.join(BASE_FILE_PATH, 'selected_datasets.zip')

        with ZipFile(zip_file_path, 'w', ZIP_DEFLATED) as zip_file:
            file_count = 0  # Count how many files were added

            for relative_path in file_paths:
                full_file_path = os.path.join(BASE_FILE_PATH, relative_path)

                print(f"Checking file at path: {full_file_path}")

                if os.path.exists(full_file_path):
                    zip_file.write(full_file_path, os.path.basename(full_file_path))
                    file_count += 1
                else:
                    print(f"File not found at path: {full_file_path}")

            if file_count == 0:
                return JsonResponse({'error': 'No valid files were found to include in the dataset.'}, status=404)

        print(f"ZIP file created: {zip_file_path}")

        # Send the created ZIP file as a response
        response = FileResponse(open(zip_file_path, 'rb'), content_type='application/zip')
        response['Content-Disposition'] = 'attachment; filename="selected_datasets.zip"'

        return response

    except Exception as e:
        print(f"Error: {str(e)}")  
        return JsonResponse({'error': str(e)}, status=500)
    
