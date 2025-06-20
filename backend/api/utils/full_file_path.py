import os
from django.conf import settings
from django.http import FileResponse, JsonResponse, Http404
from ..models import Objectinfo

def get_full_file_path(object_filepath):
    """
    Generates the full file path based on BASE_FILE_PATH and the object's file path.
    """
    if object_filepath:
        # Strip leading/trailing spaces and any leading slashes
        relative_path_corrected = object_filepath.strip().lstrip('/')
        return os.path.join(settings.BASE_FILE_PATH, relative_path_corrected)
    return None


def download_file_response(file_path):
    """
    Generates a FileResponse if the file exists, or raises Http404.
    """
    if os.path.exists(file_path):
        return FileResponse(open(file_path, 'rb'), content_type='application/octet-stream',
                            as_attachment=True, filename=os.path.basename(file_path))
    else:
        raise Http404("File not found")
