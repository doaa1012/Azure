from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.utils import timezone
import json
import jwt
from rest_framework import status
from ..models import Objectinfo, Typeinfo, Rubricinfo, Aspnetusers, Tenant, Sample, Elementinfo, Objectlinkobject, Propertyint, Propertyfloat

ACCESS_CONTROL_MAP = {
    'public': 0,
    'protected': 1,
    'protectednda': 2,
    'private': 3
}
@csrf_exempt
def recycle_object(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method is allowed'}, status=405)

    try:
        data = json.loads(request.body)
        object_id = data.get('objectId')
        if not object_id:
            return JsonResponse({'error': 'Object ID not provided'}, status=400)

        obj = Objectinfo.objects.get(objectid=object_id)

        obj.rubricid_id = 1138  # Recycle Bin ID
        obj.accesscontrol = 3  # Private
        obj.field_updated = timezone.now()
        obj.save()

        return JsonResponse({'message': 'Object moved to Recycle Bin successfully.'}, status=200)

    except Objectinfo.DoesNotExist:
        return JsonResponse({'error': 'Object not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
