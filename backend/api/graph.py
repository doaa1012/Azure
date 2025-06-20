from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from collections import defaultdict
from .models import Objectinfo, Objectlinkobject
import json
@csrf_exempt
def object_graph_view(request, objectnameurl):
    try:
        # Get the main object by its ObjectNameUrl
        main_object = Objectinfo.objects.filter(objectnameurl=objectnameurl).first()
        if not main_object:
            return JsonResponse({"error": "Object not found"}, status=404)

        # Get linked objects (forward links)
        linked_objects = Objectlinkobject.objects.filter(objectid=main_object).select_related("linkedobjectid__rubricid")

        # Get reverse-linked objects (reference case)
        reverse_linked_objects = Objectlinkobject.objects.filter(linkedobjectid=main_object).select_related("objectid__rubricid")

        other_objects = []  # List for non-measurement objects
        measurements_by_rubric = defaultdict(list)  # Store measurement objects by rubric

        # Process forward-linked objects
        for obj in linked_objects:
            rubric_name = obj.linkedobjectid.rubricid.rubricname if obj.linkedobjectid.rubricid else None

            # Group measurement areas using rubric name
            if rubric_name and "measurement" in rubric_name.lower():
                measurements_by_rubric[rubric_name].append({
                    "objectid": obj.linkedobjectid.objectid,
                    "name": obj.linkedobjectid.objectname
                })
                continue  # Skip adding individual nodes for measurements

            # Keep all other objects separate
            other_objects.append({
                "objectid": obj.linkedobjectid.objectid,
                "name": obj.linkedobjectid.objectname,
                "rubric_name": rubric_name,
                "direction": "forward"
            })

        # Process reverse-linked objects
        for obj in reverse_linked_objects:
            rubric_name = obj.objectid.rubricid.rubricname if obj.objectid.rubricid else None

            if rubric_name and "measurement" in rubric_name.lower():
                measurements_by_rubric[rubric_name].append({
                    "objectid": obj.objectid.objectid,
                    "name": obj.objectid.objectname
                })
                continue

            other_objects.append({
                "objectid": obj.objectid.objectid,
                "name": obj.objectid.objectname,
                "rubric_name": rubric_name,
                "direction": "reverse"
            })

        # Convert measurement rubric groups into a list of grouped nodes
        grouped_measurements = [
            {"rubric_name": rubric, "count": len(objects), "objects": objects}
            for rubric, objects in measurements_by_rubric.items()
        ]

        return JsonResponse({
            "main_object": {
                "objectid": main_object.objectid,
                "name": main_object.objectname
            },
            "other_objects": other_objects,  # ✅ Non-measurement objects (forward and reverse)
            "grouped_measurements": grouped_measurements  # ✅ One node per measurement rubric
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)




def object_expand_view(request, objectid):
    try:
        parent = Objectinfo.objects.filter(objectid=objectid).first()
        if not parent:
            return JsonResponse({"error": "Object not found"}, status=404)

        linked = Objectlinkobject.objects.filter(objectid=parent).select_related("linkedobjectid__rubricid")
        reverse = Objectlinkobject.objects.filter(linkedobjectid=parent).select_related("objectid__rubricid")

        expanded_nodes = []
        expanded_edges = []
        measurement_groups = defaultdict(list)

        for obj in linked:
            target = obj.linkedobjectid
            rubric_name = target.rubricid.rubricname if target.rubricid else None
            node_id = f"object-{target.objectid}"

            if rubric_name and "measurement" in rubric_name.lower():
                measurement_groups[rubric_name].append({
                    "objectid": target.objectid,
                    "name": target.objectname
                })
                continue

            expanded_nodes.append({
                "id": node_id,
                "name": target.objectname,
                "direction": "forward"
            })

            expanded_edges.append({
                "from": f"object-{parent.objectid}",
                "to": node_id
            })

        for obj in reverse:
            target = obj.objectid
            rubric_name = target.rubricid.rubricname if target.rubricid else None
            node_id = f"object-{target.objectid}"

            if rubric_name and "measurement" in rubric_name.lower():
                measurement_groups[rubric_name].append({
                    "objectid": target.objectid,
                    "name": target.objectname
                })
                continue

            expanded_nodes.append({
                "id": node_id,
                "name": target.objectname,
                "direction": "reverse"
            })

            expanded_edges.append({
                "from": node_id,
                "to": f"object-{parent.objectid}"
            })

        grouped_measurements = [
            {"rubric_name": rubric, "count": len(objs), "objects": objs}
            for rubric, objs in measurement_groups.items()
        ]

        return JsonResponse({
            "expanded_nodes": expanded_nodes,
            "expanded_edges": expanded_edges,
            "grouped_measurements": grouped_measurements
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def download_object_graph_json(request, objectnameurl):
    try:
        main_object = Objectinfo.objects.select_related("typeid").filter(objectnameurl=objectnameurl).first()
        if not main_object:
            return JsonResponse({"error": "Object not found"}, status=404)

        main_data = {
            "objectid": main_object.objectid,
            "name": main_object.objectname,
            "type": main_object.typeid.typename if main_object.typeid else None,
            "description": main_object.objectdescription,
            "filepath": main_object.objectfilepath,
            "filehash": main_object.objectfilehash,
            "created": main_object.field_created.isoformat(),
            "updated": main_object.field_updated.isoformat(),
        }

        associated_objects = []

        forward_links = Objectlinkobject.objects.filter(objectid=main_object).select_related("linkedobjectid__typeid")
        reverse_links = Objectlinkobject.objects.filter(linkedobjectid=main_object).select_related("objectid__typeid")

        for link in forward_links:
            obj = link.linkedobjectid
            associated_objects.append({
                "objectid": obj.objectid,
                "name": obj.objectname,
                "type": obj.typeid.typename if obj.typeid else None,
                "description": obj.objectdescription,
                "filepath": obj.objectfilepath,
                "filehash": obj.objectfilehash,
                "direction": "forward"
            })

        for link in reverse_links:
            obj = link.objectid
            associated_objects.append({
                "objectid": obj.objectid,
                "name": obj.objectname,
                "type": obj.typeid.typename if obj.typeid else None,
                "description": obj.objectdescription,
                "filepath": obj.objectfilepath,
                "filehash": obj.objectfilehash,
                "direction": "reverse"
            })

        export_data = {
            "main_object": main_data,
            "associated_objects": associated_objects
        }

        json_output = json.dumps(export_data, indent=2)
        response = HttpResponse(json_output, content_type='application/json')
        response['Content-Disposition'] = f'attachment; filename="{main_object.objectnameurl}_graph.json"'
        return response

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
