import os
import pandas as pd
import base64
from io import BytesIO
from django.http import JsonResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from .models import Objectinfo
from .utils.full_file_path import get_full_file_path
import matplotlib
matplotlib.use("Agg")  
import matplotlib.pyplot as plt

@csrf_exempt
def get_csv_data(request, object_id):
    try:
        print(f"🔍 Fetching Object: {object_id}") 

        #  Get object info
        obj = Objectinfo.objects.select_related('typeid').get(objectid=object_id)
        object_type = obj.typeid.typename if obj.typeid and obj.typeid.typename else "Unknown"
        print(f" Object Type: {object_type}")

        #  Get file path
        file_path = get_full_file_path(obj.objectfilepath)
        print(f"📂 File Path: {file_path}")

        if not file_path or not os.path.exists(file_path):
            raise Http404("File not found")

        #  Read CSV and ensure column names are lowercase
        df = pd.read_csv(file_path)
        df.columns = df.columns.str.lower()  #  Normalize column names to lowercase
        df = df.loc[:, ~df.columns.str.contains("^unnamed")]

        response_data = {
            "fileName": os.path.basename(file_path).replace('.csv', ''),
            "columns": list(df.columns),
            "data": df.to_dict(orient="records"),
            "objectType": object_type,  #  Ensure objectType is included
            "plots": {}
        }

        # Ensure X, Y exist for visualization
        if "x" in df.columns and "y" in df.columns:
            print(" X, Y found – generating EDX scatter plots.")
            excluded_elements = request.GET.getlist("exclude")
            response_data["plots"]["edx_plot"] = generate_wafer_heatmap(df, excluded_elements)
        else:
            print(f"⚠️ No 'x' and 'y' columns found in CSV: {list(df.columns)}")
            response_data["error"] = "No X, Y coordinates found for visualization."

        return JsonResponse(response_data)

    except Objectinfo.DoesNotExist:
        return JsonResponse({"error": "Object not found"}, status=404)
    except pd.errors.EmptyDataError:
        return JsonResponse({"error": "CSV file is empty"}, status=400)
    except Exception as e:
        print(f" ERROR: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)

def generate_wafer_heatmap(df, excluded_elements):
    """
    Creates a multi-row grid layout for the wafer heatmap and displays min/max values above plots.
    """
    try:
        #  Remove excluded elements
        filtered_elements = [col for col in df.columns if col not in ["x", "y"] and col.lower() not in excluded_elements]

        if not filtered_elements:
            print("⚠️ No elements left to visualize after exclusion.")
            return None  #  Skip visualization if no valid elements exist

        num_elements = len(filtered_elements)
        num_cols = min(num_elements, 3)  #  Max 3 per row
        num_rows = (num_elements + 2) // 3  #  Calculate rows dynamically

        fig, axes = plt.subplots(num_rows, num_cols, figsize=(6 * num_cols, 6 * num_rows))  #  Scale plot
        axes = axes.flatten()  #  Ensure 1D list

        for ax, element in zip(axes, filtered_elements):
            vmin, vmax = df[element].min(), df[element].max()
            
            #  Plot scatter
            scatter = ax.scatter(df["x"], df["y"], c=df[element], cmap="plasma", s=180, vmin=vmin, vmax=vmax)
            fig.colorbar(scatter, ax=ax, label=f"{element} at.% ({vmin:.2f} - {vmax:.2f})")
            
            #  Display min/max value on top of each subplot
            ax.set_title(f"{element} Distribution\nMin: {vmin:.2f}% | Max: {vmax:.2f}%", fontsize=12, pad=15)
            ax.set_xticks([])
            ax.set_yticks([])

        #  Remove empty subplots if fewer elements
        for i in range(len(filtered_elements), len(axes)):
            fig.delaxes(axes[i])

        plt.tight_layout()

        # Convert to base64
        img_buf = BytesIO()
        plt.savefig(img_buf, format="png", bbox_inches="tight", dpi=150)
        plt.close()
        img_base64 = base64.b64encode(img_buf.getvalue()).decode("utf-8")

        return img_base64

    except Exception as e:
        print(f" ERROR generating heatmap: {str(e)}")
        return None
