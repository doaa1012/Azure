from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.utils import timezone
import json
import jwt
from django.conf import settings
from .models import Objectinfo, Rubricinfo, Objectlinkrubric, Aspnetusers
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.utils import timezone
import json, jwt
from django.conf import settings
from .models import Objectinfo, Rubricinfo, Objectlinkrubric, Aspnetusers

@csrf_exempt
def link_object_to_rubric(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method.'}, status=405)

    try:
        # Validate authorization
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'error': 'Authorization header missing or invalid.'}, status=401)

        token = auth_header.split(' ')[1]
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        user_id = decoded.get('user_id')
        if not user_id:
            return JsonResponse({'error': 'User ID missing in token.'}, status=401)

        # Parse input
        data = json.loads(request.body)
        object_id = data.get('object_id')
        rubric_id = data.get('rubric_id')

        if not object_id or not rubric_id:
            return JsonResponse({'error': 'Both object_id and rubric_id are required.'}, status=400)

        # Ensure values are integers
        try:
            object_id = int(object_id)
            rubric_id = int(rubric_id)
        except ValueError:
            return JsonResponse({'error': 'Object ID and Rubric ID must be integers.'}, status=400)

        # Validate existence
        try:
            object_info = Objectinfo.objects.get(pk=object_id)
        except Objectinfo.DoesNotExist:
            return JsonResponse({'error': f'Object with ID {object_id} does not exist.'}, status=404)

        try:
            rubric_info = Rubricinfo.objects.get(pk=rubric_id)
        except Rubricinfo.DoesNotExist:
            return JsonResponse({'error': f'Rubric with ID {rubric_id} does not exist.'}, status=404)

        try:
            user = Aspnetusers.objects.get(pk=user_id)
        except Aspnetusers.DoesNotExist:
            return JsonResponse({'error': 'Authenticated user not found.'}, status=404)

        # ✅ Double check using raw IDs to avoid stale instance comparisons
        already_linked = Objectlinkrubric.objects.filter(objectid_id=object_id, rubricid_id=rubric_id).exists()
        if already_linked:
            return JsonResponse({'error': 'This object is already linked to the selected rubric.'}, status=400)

        # Create the link
        Objectlinkrubric.objects.create(
            objectid=object_info,
            rubricid=rubric_info,
            sortcode=0,
            field_created=timezone.now(),
            field_updated=timezone.now(),
            field_createdby=user,
            field_updatedby=user
        )

        return JsonResponse({'message': 'Object successfully linked to rubric!'}, status=201)

    except jwt.ExpiredSignatureError:
        return JsonResponse({'error': 'Your session has expired. Please log in again.'}, status=401)
    except jwt.InvalidTokenError:
        return JsonResponse({'error': 'Invalid authentication token.'}, status=401)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON format.'}, status=400)
    except Exception as e:
        print('Unexpected error:', str(e))
        return JsonResponse({'error': 'Something went wrong while linking. Please try again.'}, status=500)


from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json

@csrf_exempt
def update_link(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            print("Received data:", data)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        link_id = data.get("link_id")
        sortcode = data.get("sortcode")

        if link_id is None or sortcode is None:
            return JsonResponse({'error': 'Missing link_id or sortcode'}, status=400)

        from .models import Objectlinkrubric
        link = Objectlinkrubric.objects.filter(pk=link_id).first()

        if not link:
            return JsonResponse({'error': 'Link not found'}, status=404)

        try:
            link.sortcode = sortcode
            link.save()
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=405)

@csrf_exempt
def delete_link(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            print("Received data:", data)

            link_id = data.get("linkid")  # ← matches frontend key

            if not link_id:
                return JsonResponse({'error': 'Missing link ID'}, status=400)

            deleted_count, _ = Objectlinkrubric.objects.filter(objectlinkrubricid=link_id).delete()

            if deleted_count == 0:
                return JsonResponse({'error': 'No matching link found.'}, status=404)

            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'error': f'Unexpected error: {str(e)}'}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=405)
