import json
from django.http import JsonResponse
from django.conf import settings
from django.utils import timezone
from django.db import transaction, IntegrityError
from django.db.models import Max, Q
from django.views.decorators.csrf import csrf_exempt
from django.template.defaultfilters import slugify
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from rest_framework import status
from ..models import Rubricinfo

# Access control mapping
ACCESS_CONTROL_MAP = {
    'public': 0,
    'protected': 1,
    "protectednda": 2,
    'private': 3
}

@csrf_exempt
def create_rubric(request):
    print(f"Authorization Header: {request.headers.get('Authorization')}")

    try:
        # Allow only POST requests
        if request.method != 'POST':
            return JsonResponse(
                {'error': 'Only POST method is allowed'},
                status=status.HTTP_405_METHOD_NOT_ALLOWED
            )

        # Extract and validate the Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse(
                {'error': 'Authorization header missing or malformed'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        token = auth_header.split(' ')[1]
        try:
            decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = decoded_token.get('user_id')
            user_role = decoded_token.get('role', 'User')

            # Role-based permission check
            if user_role != "PowerUser":
                return JsonResponse(
                    {'error': 'User does not have permission to create rubric'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except (ExpiredSignatureError, InvalidTokenError) as e:
            return JsonResponse({'error': f'Token error: {str(e)}'}, status=status.HTTP_401_UNAUTHORIZED)

        # Parse the JSON body
        try:
            request_data = json.loads(request.body)
            print(f"Request Data: {request_data}")
        except json.JSONDecodeError:
            return JsonResponse(
                {'error': 'Invalid JSON format'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Extract required fields from the request
        name = request_data.get('name')
        parent_id = request_data.get('parent_id')
        rubric_name = request_data.get('rubric_name')
        sort_code = request_data.get('sort_code', 0)
        tenant_id = request_data.get('tenant_id')

        if not name or not tenant_id:
            return JsonResponse(
                {'error': 'Name and Tenant ID are required fields.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Fetch parent rubric path if parent_id is provided
        parent_rubric_path = None
        if parent_id:
            try:
                parent_rubric = Rubricinfo.objects.get(rubricid=parent_id)
                parent_rubric_path = parent_rubric.rubricpath
                print(f"Parent Rubric Path: {parent_rubric_path}")
            except Rubricinfo.DoesNotExist:
                return JsonResponse(
                    {'error': f'Parent rubric with ID {parent_id} does not exist.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Generate rubricpath and rubricnameurl
        rubricpath = f"{parent_rubric_path}}}{name}" if parent_rubric_path else name
        print(f"Generated Rubric Path: {rubricpath}")
        if parent_rubric_path:
            rubricnameurl = f"{slugify(parent_rubric.rubricname)}_{slugify(name)}".lower()
        else:
            rubricnameurl = slugify(name).lower()

        print(f"Generated Rubric Name URL: {rubricnameurl}")
        level = rubricpath.count('}')
        print(f"Calculated Level: {level}")

        # Check for duplicates based on tenant_id and rubricnameurl
        if Rubricinfo.objects.filter(Q(tenantid=tenant_id) & Q(rubricnameurl=rubricnameurl)).exists():
            return JsonResponse(
                {'error': 'A rubric with this name already exists. Please use a different name.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Determine access control
        access_control_value = str(request_data.get('access_control', 'public')).lower()
        accesscontrol = ACCESS_CONTROL_MAP.get(access_control_value, 1)

        # Create the new rubric atomically
        with transaction.atomic():
            max_rubric = Rubricinfo.objects.select_for_update().aggregate(Max('rubricid'))
            new_id = (max_rubric['rubricid__max'] or 0) + 1

            new_rubric = Rubricinfo.objects.create(
                rubricid=new_id,
                rubricname=name,
                rubricnameurl=rubricnameurl,
                rubricpath=rubricpath,
                sortcode=sort_code,
                accesscontrol=accesscontrol,
                parentid_id=parent_id,
                tenantid_id=tenant_id,
                typeid_id=2,
                field_created=timezone.now(),
                field_createdby_id=user_id,
                field_updated=timezone.now(),
                field_updatedby_id=user_id,
                level=level,
                leafflag=True,
                flags=0,
                ispublished=False
            )

        # Debug log for created rubric
        print(f"Newly Created Rubric: {new_rubric}")
        return JsonResponse(
            {'id': new_rubric.rubricid, 'message': 'New rubric created successfully'},
            status=status.HTTP_201_CREATED
        )

    except IntegrityError as e:
        print(f"Integrity Error: {e}")
        return JsonResponse(
            {'error': 'A database integrity error occurred. Possibly a duplicate entry.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        print(f"Unhandled Error: {e}")
        return JsonResponse(
            {'error': 'An unexpected error occurred.', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
