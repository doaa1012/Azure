from django.http import JsonResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
import json
from .models import Objectinfo, Objectlinkobject, Sample,Composition
from django.utils.timezone import make_aware
from datetime import datetime
from django.conf import settings
from django.core.paginator import Paginator
import zipfile
import os
import re
import pandas as pd

BASE_FILE_PATH = settings.BASE_FILE_PATH 
@csrf_exempt
def sample_typename_element_association_view(request):
    try:
        data = json.loads(request.body)
        if isinstance(data, str):
            data = json.loads(data)

        print(f"\n✅ Received Request Data: {json.dumps(data, indent=2)}")

        search_typenames = set(data.get("typenames", []))
        elements = data.get("elements", [])
        created_from = data.get("createdFrom", None)
        created_to = data.get("createdTo", None)
        strict = data.get("strict", False)

        if not search_typenames:
            print("❌ Error: No typenames provided in the request")
            return JsonResponse({"error": "At least one typename is required."}, status=400)

        samples = Objectinfo.objects.filter(typeid__typename="Sample")

        if created_from:
            created_from = make_aware(datetime.strptime(created_from, "%Y-%m-%d"))
            samples = samples.filter(field_created__gte=created_from)

        if created_to:
            created_to = make_aware(datetime.strptime(created_to, "%Y-%m-%d"))
            samples = samples.filter(field_created__lte=created_to)

        matching_samples = {}

        for sample in samples:
            print(f"\n🔎 Checking Sample: {sample.objectid}")

            associated_objects = Objectlinkobject.objects.filter(
                Q(objectid=sample.objectid) | Q(linkedobjectid=sample.objectid)
            ).select_related("linkedobjectid", "linkedobjectid__typeid")

            associated_typenames = set(
                link.linkedobjectid.typeid.typename
                for link in associated_objects
                if link.linkedobjectid and link.linkedobjectid.typeid
            )
            print(f"🔗 Associated Typenames: {associated_typenames}")

            if strict:
                if not search_typenames.issubset(associated_typenames):
                    print(f" Skipping Sample {sample.objectid} - Strict match failed")
                    continue
            else:
                if not associated_typenames.intersection(search_typenames):
                    print(f" Skipping Sample {sample.objectid} - No matching typenames")
                    continue

            sample_entry = Sample.objects.filter(sampleid=sample.objectid).first()
            if not sample_entry:
                print(f" Skipping Sample {sample.objectid} - No Sample entry found")
                continue

            sample_elements = sample_entry.elements.strip("-").split("-")
            print(f" Sample Elements: {sample_elements}")

            # ✅ Find the associated Composition object
            composition_links = associated_objects.filter(linkedobjectid__typeid__typename="Composition")
            composition_object = composition_links.first().linkedobjectid if composition_links.exists() else None

            if not composition_object:
                print(f" Sample {sample.objectid} - No associated Composition object found (Including in results)")
                matching_samples[str(sample.objectid)] = {
                    "objectId": str(sample.objectid),
                    "associatedCompositionId": None,
                    "associatedTypes": list(associated_typenames),
                    "elements": sample_elements,
                    "elementPercentages": {},
                    "created": sample.field_created.strftime("%Y-%m-%d %H:%M:%S"),
                }
                continue

            # ✅ Fetch element percentages from the associated Composition object
            compositions = Composition.objects.filter(sampleid=composition_object.objectid)
            element_percentages = {comp.elementname: comp.valuepercent for comp in compositions}

            print(f"📊 Sample {sample.objectid} (Composition from {composition_object.objectid}) - Percentages: {element_percentages}")

            # ✅ Ensure at least ONE element is in the valid range or exists
            element_matched = False  
            for elem in elements:
                if isinstance(elem, dict):  
                    elem_name = elem.get("element")
                    min_val = elem.get("min", None)
                    max_val = elem.get("max", None)

                    comp = compositions.filter(elementname=elem_name).first()
                    if comp:
                        if min_val is None and max_val is None:
                            print(f"✅ {elem_name} found in Composition (No percentage check needed)")
                            element_matched = True
                            break
                        elif min_val is not None and max_val is not None:
                            print(f"🔎 Checking {elem_name}: Found {comp.valuepercent}% (Required: {min_val}-{max_val})")
                            if min_val <= comp.valuepercent <= max_val:
                                print(f"✅ {elem_name} matches the range {min_val}-{max_val}")
                                element_matched = True
                                break
                            else:
                                print(f"❌ {elem_name} value {comp.valuepercent} is out of range")
                        else:
                            print(f"⚠️ Skipping range check for {elem_name}, missing min/max values")

                elif isinstance(elem, str):  # Just checking presence, no percentage
                    if elem in sample_elements:
                        print(f"✅ Found {elem} in Sample Elements")
                        element_matched = True
                        break  # Stop checking once at least one matches

            if not element_matched:
                print(f"❌ Skipping Sample {sample.objectid} - No elements match the required percentage range")
                continue
            # ✅ Track count of samples per associated object type
            associated_counts = {}

            for typename in associated_typenames:
                if typename in search_typenames:  # ✅ Only consider relevant typenames
                    associated_counts[typename] = associated_counts.get(typename, 0) + 1


            # ✅ Store results
            matching_samples[str(sample.objectid)] = {
                "objectId": str(sample.objectid),
                "associatedCompositionId": str(composition_object.objectid),
                "associatedTypes": list(associated_typenames),
                "elements": sample_elements,
                "elementPercentages": element_percentages,
                "associatedCounts": associated_counts,
                "created": sample.field_created.strftime("%Y-%m-%d %H:%M:%S"),
            }

        print(f"\nFinal Matching Samples: {json.dumps(matching_samples, indent=2)}")
        return JsonResponse({"samples": matching_samples}, safe=False)

    except Exception as e:
        print(f"Error: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)



@csrf_exempt
def download_sample_files(request):
    try:
        data = json.loads(request.body)
        sample_id = data.get("sampleId")
        searched_typenames = data.get("typenames", [])  # Get the typenames from search

        if not sample_id:
            return JsonResponse({"error": "Sample ID is required."}, status=400)

        if not searched_typenames:
            return JsonResponse({"error": "No typenames provided."}, status=400)

        # Find the sample
        try:
            sample = Objectinfo.objects.get(objectid=sample_id)
        except Objectinfo.DoesNotExist:
            return JsonResponse({"error": f"Sample {sample_id} not found."}, status=404)

        # Get associated objects filtered by searched typenames
        associated_objects = Objectlinkobject.objects.filter(
            objectid=sample.objectid, 
            linkedobjectid__typeid__typename__in=searched_typenames  # Only include searched typenames
        ).select_related("linkedobjectid")

        file_paths = []
        for obj in associated_objects:
            linked_obj = obj.linkedobjectid
            if linked_obj and linked_obj.objectfilepath:
                full_path = os.path.join(BASE_FILE_PATH, linked_obj.objectfilepath.strip("/"))
                if os.path.exists(full_path):
                    file_paths.append(full_path)
                else:
                    print(f"⚠ File Not Found: {full_path}")  # Debugging missing files

        # If no valid files are found, return an error
        if not file_paths:
            return JsonResponse({"error": "No matching files found for this sample and selected typenames."}, status=404)

        # Create ZIP file
        zip_path = os.path.join(BASE_FILE_PATH, f"sample_{sample_id}_files.zip")

        # Remove existing ZIP if it exists
        if os.path.exists(zip_path):
            os.remove(zip_path)

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            for file_path in file_paths:
                zipf.write(file_path, os.path.basename(file_path))  # Add file to ZIP

        print(f"ZIP Created: {zip_path}")  # Debugging successful ZIP creation

        # Ensure the ZIP file is fully written before returning
        if os.path.exists(zip_path) and os.path.getsize(zip_path) > 0:
            return FileResponse(open(zip_path, "rb"), content_type="application/zip")
        else:
            return JsonResponse({"error": "ZIP file was not created correctly."}, status=500)

    except Exception as e:
        print(f"Error: {str(e)}")  # Debugging
        return JsonResponse({"error": f"Internal server error: {str(e)}"}, status=500)
    
@csrf_exempt
def download_all_samples(request):
    try:
        data = json.loads(request.body)
        sample_ids = data.get("sampleIds", [])
        searched_typenames = data.get("typenames", [])

        if not sample_ids:
            return JsonResponse({"error": "No sample IDs provided."}, status=400)

        if not searched_typenames:
            return JsonResponse({"error": "No typenames provided."}, status=400)

        zip_root_path = os.path.join(BASE_FILE_PATH, "all_samples.zip")

        # Remove old ZIP if it exists
        if os.path.exists(zip_root_path):
            os.remove(zip_root_path)

        file_added = False
        no_associated_objects = []
        missing_files_per_sample = {}

        with zipfile.ZipFile(zip_root_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            for sample_id in sample_ids:
                try:
                    sample = Objectinfo.objects.get(objectid=sample_id)
                    sample_folder = f"sample_{sample_id}"

                    associated_objects = Objectlinkobject.objects.filter(
                        objectid=sample.objectid,
                        linkedobjectid__typeid__typename__in=searched_typenames
                    ).select_related("linkedobjectid")

                    if not associated_objects.exists():
                        no_associated_objects.append(sample_id)
                        continue

                    sample_missing_files = []

                    for obj in associated_objects:
                        linked_obj = obj.linkedobjectid
                        if linked_obj and linked_obj.objectfilepath:
                            file_path = os.path.join(BASE_FILE_PATH, linked_obj.objectfilepath.strip("/"))
                            if os.path.exists(file_path):
                                zipf.write(file_path, os.path.join(sample_folder, os.path.basename(file_path)))
                                file_added = True
                            else:
                                print(f"⚠ File Not Found: {file_path}")
                                sample_missing_files.append(file_path)

                    if sample_missing_files:
                        missing_files_per_sample[str(sample_id)] = sample_missing_files

                except Objectinfo.DoesNotExist:
                    no_associated_objects.append(sample_id)
                    continue

        if not file_added:
            return JsonResponse({
                "error": "No matching files found for the selected samples and typenames.",
                "noAssociatedObjects": no_associated_objects,
                "missingFiles": missing_files_per_sample
            }, status=404)

        print(f"ZIP Created: {zip_root_path}")
        return FileResponse(open(zip_root_path, "rb"), content_type="application/zip")

    except Exception as e:
        print(f"Error: {str(e)}")
        return JsonResponse({"error": f"Internal server error: {str(e)}"}, status=500)


    
def process_edx_txt(file_path):
    processed_entries = []
    
    with open(file_path, "r", encoding="utf-8") as file:
        lines = file.readlines()

    if len(lines) < 3:
        print(f"⚠ Skipping empty file: {file_path}")
        return []

    # Detect the correct header row dynamically
    header_row_index = None
    for i, line in enumerate(lines):
        if "X (mm)" in line and "Y (mm)" in line:
            header_row_index = i
            break

    if header_row_index is None:
        print(f"Header row missing in {file_path}, skipping file!")
        return []

    # Extract headers properly (skip metadata lines)
    headers = re.split(r"\s{2,}|\t+", lines[header_row_index].strip())
    col_map = {name.strip(): index for index, name in enumerate(headers)}

    print(f"🔍 TXT Headers Extracted - {headers}")

    # Ensure required columns exist
    y_col_index = col_map.get("Y (mm)")
    x_col_index = col_map.get("X (mm)")
    spectrum_col_index = col_map.get("Spectrum")

    if y_col_index is None or x_col_index is None:
        print(f" Error: 'X (mm)' or 'Y (mm)' column missing in {file_path}, skipping!")
        return []

    # Identify chemical elements (columns after 'Y (mm)')
    element_columns = headers[y_col_index + 1:]
    print(f" Chemical Elements Found in TXT: {element_columns}")

    # Process each row AFTER the detected header row
    for line in lines[header_row_index + 1:]:
        row_data = re.split(r"\s{2,}|\t+", line.strip())

        # Skip invalid rows, empty lines, and metadata
        if len(row_data) < len(headers) or "Processing option" in line:
            #print(f"⚠ Skipping Invalid Row: {row_data}")
            continue  

        try:
            spectrum = row_data[spectrum_col_index] if spectrum_col_index is not None else "Unknown"
            spectrum = re.sub(r"[{}]", "", spectrum)  # Clean curly braces `{}` if present

            x_value = float(row_data[x_col_index])
            y_value = float(row_data[y_col_index])

        except ValueError:
            print(f"⚠ Skipping Row (Invalid X/Y Values): {row_data}")
            continue

        # Build structured data entry
        entry = {
            "file": os.path.basename(file_path),
            "spectrum": spectrum,
            "x": x_value,
            "y": y_value,
            "elements": {}
        }

        has_valid_elements = False
        for element in element_columns:
            try:
                element_value = float(row_data[col_map[element]]) if col_map.get(element) else None
                if element_value and element_value != 0:
                    has_valid_elements = True
                entry["elements"][element] = element_value
            except ValueError:
                entry["elements"][element] = None  

        if has_valid_elements:
            processed_entries.append(entry)

    return processed_entries



# Function to process EDX CSV (CSV format)
def process_edx_csv(file_path):
    try:
        df = pd.read_csv(file_path)
        if df.empty:
            print(f"⚠ Skipping empty CSV file: {file_path}")
            return []

        processed_entries = df.to_dict(orient="records")
        for entry in processed_entries:
            entry["file"] = os.path.basename(file_path)

        return processed_entries
    except Exception as e:
        print(f" Error processing CSV {file_path}: {str(e)}")
        return []



def process_edx_raw_txt(file_path):
    processed_entries = []
    
    with open(file_path, "r", encoding="utf-8") as file:
        lines = file.readlines()

    if len(lines) < 3:
        print(f"⚠ Skipping empty file: {file_path}")
        return []

    # Detect the header row dynamically
    header_row_index = None
    for i, line in enumerate(lines):
        if "Spectrum" in line and "X (mm)" in line and "Y (mm)" in line:
            header_row_index = i
            break

    if header_row_index is None:
        print(f" Header row missing in {file_path}, skipping file!")
        return []

    #  Extract headers dynamically
    headers = re.split(r"\s{2,}|\t+", lines[header_row_index].strip())
    col_map = {name.strip(): index for index, name in enumerate(headers)}

    print(f"🔍 TXT Headers Extracted - {headers}")

    y_col_index = col_map.get("Y (mm)")
    x_col_index = col_map.get("X (mm)")
    spectrum_col_index = col_map.get("Spectrum")

    if y_col_index is None or x_col_index is None:
        print(f" Error: 'X (mm)' or 'Y (mm)' column missing in {file_path}, skipping!")
        return []

    element_columns = headers[y_col_index + 1:]
   

    for line in lines[header_row_index + 1:]:
        row_data = re.split(r"\s{2,}|\t+", line.strip())

        if len(row_data) < len(headers):
            print(f"⚠ Skipping Invalid Row: {row_data}")
            continue  

        spectrum = row_data[spectrum_col_index] if spectrum_col_index is not None else "Unknown"
        spectrum = re.sub(r"[{}]", "", spectrum)

        try:
            x_value = float(row_data[x_col_index])
            y_value = float(row_data[y_col_index])
        except ValueError:
            print(f"⚠ Skipping Row (Invalid X/Y Values): {row_data}")
            continue

        entry = {
            "file": os.path.basename(file_path),
            "spectrum": spectrum,
            "x": x_value,
            "y": y_value,
            "elements": {}
        }

        has_valid_elements = False
        for element in element_columns:
            try:
                element_value = float(row_data[col_map[element]]) if col_map.get(element) else None
                if element_value and element_value != 0:
                    has_valid_elements = True
                entry["elements"][element] = element_value
            except ValueError:
                entry["elements"][element] = None  

        if has_valid_elements:
            processed_entries.append(entry)

    return processed_entries


def process_htts_resistance_csv(file_path):
    try:
        df = pd.read_csv(file_path)

        if df.empty:
            print(f"⚠ Skipping empty CSV file: {file_path}")
            return []

        # Drop unnamed column if it exists
        df = df.loc[:, ~df.columns.str.contains("^Unnamed")]

        # Ensure required columns exist
        required_columns = {"x", "y", "time", "R", "I", "V"}
        missing_columns = required_columns - set(df.columns)

        if missing_columns:
            print(f"⚠ Missing required columns {missing_columns} in {file_path}, skipping!")
            return []

        # Convert time column to string format if needed
        if "time" in df.columns:
            df["time"] = df["time"].astype(str)

        # Convert numeric values (R, I, V)
        for col in ["x", "y", "R", "I", "V"]:
            df[col] = pd.to_numeric(df[col], errors="coerce")

        # Build structured JSON entries
        processed_entries = df.to_dict(orient="records")

        # Add file reference to each entry
        for entry in processed_entries:
            entry["file"] = os.path.basename(file_path)

        return processed_entries

    except Exception as e:
        print(f"❌ Error processing CSV {file_path}: {str(e)}")
        return []



def process_edx_slow_csv(file_path):
    try:
        df = pd.read_csv(file_path)

        if df.empty:
            print(f"⚠ Skipping empty CSV file: {file_path}")
            return []

        # Drop unnamed first column if it exists
        if df.columns[0].startswith("Unnamed"):
            df = df.iloc[:, 1:]

        # Ensure 'Index' column exists
        if "Index" not in df.columns:
            print(f"❌ Missing required 'Index' column in {file_path}, skipping!")
            return []

        # Identify element columns dynamically (everything after 'Index')
        element_columns = df.columns[1:]  # Everything after the first column

        # Convert numeric values
        df["Index"] = pd.to_numeric(df["Index"], errors="coerce")
        for col in element_columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

        # Build structured JSON entries
        processed_entries = []
        for _, row in df.iterrows():
            entry = {
                "Index": row["Index"],
                "elements": {col: row[col] for col in element_columns if not pd.isna(row[col])},
                "file": os.path.basename(file_path)
            }
            processed_entries.append(entry)

        return processed_entries

    except Exception as e:
        print(f"❌ Error processing CSV {file_path}: {str(e)}")
        return []



TYPENAME_PROCESSORS = {
    "EDX CSV": [process_edx_txt, process_edx_csv],
    "EDX Raw (txt)": [process_edx_raw_txt],
    "HTTS Resistance CSV": [process_htts_resistance_csv],
    "EDX CSV (https=slow)": [process_edx_slow_csv],  
}

@csrf_exempt
def download_processed_data(request):
    try:
        data = json.loads(request.body)
        sample_id = data.get("sampleId")
        searched_typenames = data.get("typenames", [])

        if not sample_id:
            return JsonResponse({"error": "Sample ID is required."}, status=400)

        try:
            sample = Objectinfo.objects.get(objectid=sample_id)
        except Objectinfo.DoesNotExist:
            return JsonResponse({"error": f"Sample {sample_id} not found."}, status=404)

        processed_data = {
            "sampleId": sample_id,
            "typename_data": {}  # Store only matched typenames
        }

        matched_typenames = set()  # Track typenames that actually exist in the sample

        for typename in searched_typenames:
            associated_objects = Objectlinkobject.objects.filter(
                objectid=sample.objectid,
                linkedobjectid__typeid__typename=typename
            ).select_related("linkedobjectid")

            if not associated_objects.exists():
                continue  # Skip if no matches found for this typename

            matched_typenames.add(typename)
            processed_data["typename_data"][typename] = {"files_processed": [], "data": []}

            if typename not in TYPENAME_PROCESSORS:
                print(f"⚠ Skipping typename {typename} (No processor found)")
                processed_data["typename_data"][typename]["message"] = "No processor available for this typename."
                continue

            typename_results = []
            for obj in associated_objects:
                linked_obj = obj.linkedobjectid
                if not linked_obj or not linked_obj.objectfilepath:
                    continue

                file_path = os.path.join(BASE_FILE_PATH, linked_obj.objectfilepath.strip("/"))

                if not os.path.exists(file_path):
                    print(f"⚠ File not found: {file_path}")
                    continue

                # Apply processing functions based on typename
                for processor in TYPENAME_PROCESSORS.get(typename, []):
                    result = processor(file_path)
                    if result:
                        typename_results.extend(result)

                processed_data["typename_data"][typename]["files_processed"].append(os.path.basename(file_path))

            if typename_results:
                processed_data["typename_data"][typename]["data"] = typename_results

        # Remove typenames that were searched but NOT found
        processed_data["typename_data"] = {
            key: value for key, value in processed_data["typename_data"].items() if key in matched_typenames
        }

        json_path = os.path.join(BASE_FILE_PATH, f"processed_sample_{sample_id}.json")
        with open(json_path, "w", encoding="utf-8") as json_file:
            json.dump(processed_data, json_file, indent=4)

        print(f"✅ JSON File Created: {json_path}")

        return FileResponse(open(json_path, "rb"), content_type="application/json")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return JsonResponse({"error": f"Internal server error: {str(e)}"}, status=500)

    
@csrf_exempt
def download_all_processed_data(request):
    try:
        data = json.loads(request.body)
        sample_ids = data.get("sampleIds", [])
        searched_typenames = data.get("typenames", [])

        if not sample_ids:
            return JsonResponse({"error": "No sample IDs provided."}, status=400)

        if not searched_typenames:
            return JsonResponse({"error": "No typenames provided."}, status=400)

        all_processed_data = {}

        for sample_id in sample_ids:
            try:
                sample = Objectinfo.objects.get(objectid=sample_id)
            except Objectinfo.DoesNotExist:
                print(f"⚠ Sample {sample_id} not found, skipping...")
                continue

            sample_data = {
                "sampleId": sample_id,
                "typename_data": {}  # Store only matched typenames
            }

            matched_typenames = set()

            for typename in searched_typenames:
                associated_objects = Objectlinkobject.objects.filter(
                    objectid=sample.objectid,
                    linkedobjectid__typeid__typename=typename
                ).select_related("linkedobjectid")

                if not associated_objects.exists():
                    continue

                matched_typenames.add(typename)
                sample_data["typename_data"][typename] = {"files_processed": [], "data": []}

                # Check if the typename has a processor
                if typename not in TYPENAME_PROCESSORS:
                    print(f"⚠ Skipping typename {typename} (No processor found)")
                    sample_data["typename_data"][typename]["message"] = "No processor available for this typename."
                    continue

                typename_results = []

                for obj in associated_objects:
                    linked_obj = obj.linkedobjectid
                    if not linked_obj or not linked_obj.objectfilepath:
                        continue

                    file_path = os.path.join(BASE_FILE_PATH, linked_obj.objectfilepath.strip("/"))

                    if not os.path.exists(file_path):
                        print(f"⚠ File not found: {file_path}")
                        continue

                    # Apply processing functions based on typename
                    for processor in TYPENAME_PROCESSORS.get(typename, []):
                        result = processor(file_path)
                        if result:
                            typename_results.extend(result)

                    sample_data["typename_data"][typename]["files_processed"].append(os.path.basename(file_path))

                if typename_results:
                    sample_data["typename_data"][typename]["data"] = typename_results

            # Remove typenames that were searched but NOT found
            sample_data["typename_data"] = {
                key: value for key, value in sample_data["typename_data"].items() if key in matched_typenames
            }

            all_processed_data[sample_id] = sample_data

        # Save all processed data as a JSON file
        json_path = os.path.join(BASE_FILE_PATH, "all_processed_samples.json")
        with open(json_path, "w", encoding="utf-8") as json_file:
            json.dump(all_processed_data, json_file, indent=4)

        print(f"✅ JSON File Created: {json_path}")

        return FileResponse(open(json_path, "rb"), content_type="application/json")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return JsonResponse({"error": f"Internal server error: {str(e)}"}, status=500)
