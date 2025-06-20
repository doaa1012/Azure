from django.db.models import Q
from django.http import JsonResponse
from .models import Objectinfo, Objectlinkobject, Sample, Composition, Propertystring, Propertyint, Propertyfloat, Propertybigstring
from django.views.decorators.csrf import csrf_exempt
import json
from django.utils.timezone import make_aware, localtime
from datetime import datetime
from math import ceil

PROPERTY_TABLE_MAP = {
    "propertystring": Propertystring,
    "propertyint": Propertyint,
    "propertyfloat": Propertyfloat,
    "propertybigstring": Propertybigstring,
}


@csrf_exempt
def object_search_view(request):
    try:
        # Parse the request payload
        payload = json.loads(request.body)
        typename = payload.get('typename')
        associated_types = payload.get('associatedTypes', [])
        chemical_system = payload.get('chemicalSystem', '')
        created_from = payload.get('createdFrom')
        created_to = payload.get('createdTo')
        elements_with_percentage = payload.get('elements', [])
        properties_filter = payload.get('properties', [])
        page = payload.get('page', 1)
        page_size = payload.get('pageSize', 10)
        

        #print("\n Received Search Request:")
        #print(json.dumps(payload, indent=2))

        if not typename:
            return JsonResponse({'error': 'Typename is required.'}, status=400)

        # Base queryset filtered by typename
        objects = Objectinfo.objects.filter(typeid__typename=typename)
        if properties_filter:
            property_object_ids = set()
            for prop in properties_filter:
                table_key = prop.get("table")
                name = prop.get("name")
                value = prop.get("value")

                if not table_key or not name or value is None:
                    continue

                model = PROPERTY_TABLE_MAP.get(table_key.lower())
                if not model:
                    continue

                matches = model.objects.filter(
                    propertyname=name,
                    value__icontains=value if isinstance(value, str) else value
                ).values_list("objectid", flat=True)

                property_object_ids.update(matches)

            objects = objects.filter(objectid__in=property_object_ids)

        # Apply date filters
        if created_from:
            created_from = make_aware(datetime.strptime(created_from, "%Y-%m-%d"))
            objects = objects.filter(field_created__gte=created_from)

        if created_to:
            created_to = make_aware(datetime.strptime(created_to, "%Y-%m-%d"))
            objects = objects.filter(field_created__lte=created_to)

        # Filter by associated types
        if associated_types:
            objects = objects.filter(
                objectlinkobject__linkedobjectid__typeid__typename__in=associated_types
            ).distinct()

        # Filter by chemical system elements
        if chemical_system:
            chemical_elements = [e.strip() for e in chemical_system.split('-') if e.strip()]
            element_queries = Q()
            for element in chemical_elements:
                element_queries |= Q(sample__elements__icontains=f"-{element}-")
            objects = objects.filter(element_queries).distinct()

        # Get object IDs to apply pagination first
        object_ids = list(objects.values_list('objectid', flat=True))
        total_results = len(object_ids)
        total_pages = ceil(total_results / page_size)
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        paginated_ids = object_ids[start_index:end_index]
        
        # Only fetch paginated objects for processing
        paginated_objects = Objectinfo.objects.filter(objectid__in=paginated_ids).select_related('typeid')

        final_objects = []
        for obj in paginated_objects:
            composition_object = None

            if obj.typeid.typename == "Composition":
                composition_object = obj
            else:
                composition_links = Objectlinkobject.objects.filter(
                    Q(objectid=obj.objectid, linkedobjectid__typeid__typename="Composition") |
                    Q(linkedobjectid=obj.objectid, objectid__typeid__typename="Composition")
                ).select_related("linkedobjectid", "objectid")

                for link in composition_links:
                    if link.linkedobjectid and link.linkedobjectid.typeid.typename == "Composition":
                        composition_object = link.linkedobjectid
                        break
                    if link.objectid and link.objectid.typeid.typename == "Composition":
                        composition_object = link.objectid
                        break

            if not composition_object:
                final_objects.append(obj)
                continue

            compositions = Composition.objects.filter(sampleid=composition_object.objectid)
            element_percentages = {comp.elementname: comp.valuepercent for comp in compositions}

            element_matched = False
            for elem in elements_with_percentage:
                elem_name = elem.get("element")
                min_val = elem.get("min")
                max_val = elem.get("max")
                value = element_percentages.get(elem_name)
                if value is not None:
                    if min_val is None and max_val is None:
                        element_matched = True
                        break
                    elif min_val is not None and max_val is not None and min_val <= value <= max_val:
                        element_matched = True
                        break

            if element_matched or not elements_with_percentage:
                final_objects.append(obj)

        results = []
        for obj in final_objects:
            linked_types = obj.objectlinkobject_set.values(
                'linkedobjectid__objectid',
                'linkedobjectid__typeid__typename'
            )

            sample = Sample.objects.filter(sampleid=obj.objectid).first()
            compositions = Composition.objects.filter(sampleid=obj.objectid) if sample else []

            results.append({
                'objectid': obj.objectid,
                'objectname': obj.objectname,
                'typename': obj.typeid.typename,
                'associatedTypes': [link['linkedobjectid__typeid__typename'] for link in linked_types],
                'created': obj.field_created.strftime("%Y-%m-%d %H:%M:%S"),
                'elements': sample.elements if sample else '',
                'compositions': [
                    {'element': comp.elementname, 'percentage': comp.valuepercent}
                    for comp in compositions
                ],
            })

        return JsonResponse({
            'results': results,
            'totalPages': total_pages,
            'currentPage': page,
        }, safe=False)

    except Exception as e:
        import traceback
        print("Error in object_search_view:", traceback.format_exc())
        return JsonResponse({'error': 'An internal server error occurred.'}, status=500)

