from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
from .models import Objectinfo, Objectlinkobject, Sample
from django.utils.timezone import make_aware
from datetime import datetime
import cohere
import os
import json
import logging



logger = logging.getLogger(__name__)

# ✅ Replace with your actual Cohere API key
COHERE_API_KEY = "3OyQhXRGIywQSpRodeRjky2Gg3XShavSJR4IbX61"

@csrf_exempt
def chatbot_info_view(request):
    try:
        data = json.loads(request.body)
        user_message = data.get("message", "").lower()

        responses = {
            "site_info": (
                "CRC 1625 at Ruhr University Bochum is focused on Materials Research for the Energy Transition, exploring novel materials for sustainable energy solutions. "
                "It supports collaborative data management, materials characterization, and research workflows. Visit the official [CRC 1625 website](https://www.ruhr-uni-bochum.de/crc1625/index.html.en) for more details."
            ),
            "how_it_works": (
                "Navigate using the sidebar to access project areas (e.g., A01, B02). Create containers for material characterization, select object types from 'Create Object', and upload data using drag-and-drop in 'Upload Files'. "
                "Each project area allows creating objects for different measurements and materials, and managing workflows for project progress."
            ),
            "faq": (
                "**FAQs:**\n- *How do I upload files?* → Use 'Create Object' then 'Upload Files'.\n"
                "- *What is a sample characterizations?* → A dataset linked to materials and experiments.\n- *How do I search?* → Use the 'Search' tab and enter keywords.\n"
                "- *What is a container?* → A container holds characterizations and ideas for compositions of noble materials."
            ),
            "upload_file": "Go to 'Create Object' and click 'Upload Files' or add data it via drag-and-drop.",
            "create_object": "Choose an object type from 'Create Object' (e.g., Bandgap, SECCM) to create a new object. Object types cover various measurements and can be edited or created from the list.",
            "sample_info": "Samples store material data, characterization details, and are managed within project areas like A01, B02.",
            "workflows_info": "'Workflows' helps manage project stages, tasks, and research progress efficiently, ensuring seamless project execution.",
            "search": "To initiate a search, provide the types and elements you are looking for. I will use the system's search API to find and display matching samples with navigation links."
        }

        if user_message == "search":
            return JsonResponse({"response": "🔍 Let's start your search! Please provide the type names (or 'none' if not specified)."})

        response_text = "🤖 I didn't understand. Type 'faq' for help or visit the [CRC 1625 website](https://www.ruhr-uni-bochum.de/crc1625/index.html.en)."
        for keyword, answer in responses.items():
            if keyword in user_message:
                response_text = answer
                break

        return JsonResponse({"response": response_text})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def chatbot_search_view(request):
    try:
        data = json.loads(request.body)

        if not data.get("step"):
            return JsonResponse({"response": "🔍 Please provide type names."})

        step = data.get("step")

        if step == 1:
            return JsonResponse({"response": "Please provide elements (or 'none' if not specified)."})
        elif step == 2:
            return JsonResponse({"response": "Please provide the date range in format YYYY-MM-DD (or 'none')."})
        elif step == 3:
            # Perform the search with collected inputs
            search_typenames = set(data.get("typenames", []))
            elements = data.get("elements", [])
            created_from = data.get("createdFrom", None)
            created_to = data.get("createdTo", None)
            strict = data.get("strict", False)

            samples = Objectinfo.objects.filter(typeid__typename="Sample")

            if created_from:
                created_from = make_aware(datetime.strptime(created_from, "%Y-%m-%d"))
                samples = samples.filter(field_created__gte=created_from)

            if created_to:
                created_to = make_aware(datetime.strptime(created_to, "%Y-%m-%d"))
                samples = samples.filter(field_created__lte=created_to)

            matching_samples = {}

            for sample in samples:
                associated_objects = Objectlinkobject.objects.filter(Q(objectid=sample.objectid) | Q(linkedobjectid=sample.objectid)).select_related("linkedobjectid")
                associated_typenames = {link.linkedobjectid.typeid.typename for link in associated_objects if link.linkedobjectid}

                if strict and not search_typenames.issubset(associated_typenames):
                    continue
                if not strict and not associated_typenames.intersection(search_typenames):
                    continue

                sample_entry = Sample.objects.filter(sampleid=sample.objectid).first()
                if sample_entry:
                    sample_elements = sample_entry.elements.strip("-").split("-")
                    if elements and not all(elem in sample_elements for elem in elements):
                        continue

                    matching_samples[str(sample.objectid)] = {
                        "objectId": str(sample.objectid),
                        "associatedTypes": list(associated_typenames),
                        "elements": sample_elements,
                        "created": sample.field_created.strftime("%Y-%m-%d %H:%M:%S"),
                        "navigationUrl": f"/search/results?type={','.join(search_typenames)}&elements={','.join(elements)}"
                    }

            response_message = (
                f"🔍 Search Completed!\n- Found {len(matching_samples)} samples.\n"
                f"- [View results](http://localhost:5173/search/results?type={','.join(search_typenames)}&elements={','.join(elements)})"
                if matching_samples else "⚠️ No results found. Please refine your search."
            )

            return JsonResponse({"samples": matching_samples, "response": response_message}, safe=False)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    

#3OyQhXRGIywQSpRodeRjky2Gg3XShavSJR4IbX61 # For Cohere
#"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" For gpt


@csrf_exempt
def chatbot_cohere_view(request):
    try:
        data = json.loads(request.body)
        user_message = data.get("message", "").strip()
        chat_mode = data.get("mode", "faq")  # Default to FAQ

        # **1️⃣ Search Mode (Database Query)**
        if chat_mode == "search":
            logger.info(f"🔍 Searching Database for: {user_message}")

            # **Perform Database Search**
            search_results = Objectinfo.objects.filter(
                Q(objectname__iexact=user_message) |  # Exact match
                Q(objectname__icontains=user_message) |  # Partial match
                Q(objectdescription__icontains=user_message) |
                Q(typeid__typename__icontains=user_message)
            )[:10]  # Limit results to 10

            # **Format Search Results**
            results = [
                {
                    "objectid": obj.objectid,
                    "objectname": obj.objectname,
                    "description": obj.objectdescription,
                    "created": obj.field_created.strftime("%Y-%m-%d"),
                    "navigationUrl": f"/object/{obj.objectid}"  # ✅ Frontend Route
                }
                for obj in search_results
            ]

            # **Return Search Response**
            if results:
                return JsonResponse({
                    "response": f"🔍 Found {len(results)} matching records.",
                    "results": results
                })
            else:
                return JsonResponse({
                    "response": " No matching records found. Please refine your search.",
                    "results": []
                })

        # **2️⃣ Scientific AI Mode (Using Cohere)**
        elif chat_mode == "scientific":
            if not COHERE_API_KEY:
                return JsonResponse({"error": "Cohere API key is missing"}, status=500)

            co = cohere.Client(COHERE_API_KEY)

            logger.info(f"🤖 Querying Cohere AI for: {user_message}")

            # **Define Research Assistant Preamble**
            preamble = (
                "You are a research assistant specializing in materials science, chemical analysis, "
                "experimental methods, and data processing. Provide structured and detailed scientific explanations."
            )

            # **Send Query to Cohere**
            response = co.chat(
                model="command-r",
                message=user_message,
                chat_history=[],
                preamble=preamble
            )

            return JsonResponse({"response": response.text})

        # **3️⃣ Default Response (FAQ)**
        return JsonResponse({"response": "🔹 This mode requires an AI response, but search is now database-driven."})

    except Exception as e:
        logger.error(f" Error: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)
