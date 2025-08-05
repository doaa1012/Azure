from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import logging
from django.conf import settings
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from django.utils.decorators import method_decorator
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
import requests
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from ..models import Aspnetusers, Aspnetuserlogins, Aspnetusertokens, Aspnetuserroles, Aspnetroles, Objectinfo

def verify_password(plain_password, hashed_password):
    api_url = 'http://localhost:5046/api/passwordhash/verify'
    payload = {
        'HashedPassword': hashed_password,
        'Password': plain_password
    }
    headers = {
        'Content-Type': 'application/json'
    }

    try:
        response = requests.post(api_url, json=payload, headers=headers)
        response.raise_for_status()
        print("API Response:", response.json())  # Log the response for debugging
        return response.json()  # Ensure this returns True or False
    except requests.RequestException as e:
        print(f"Error verifying password: {e}")
        return False

@csrf_exempt
def user_profile(request):
    if request.method == 'GET':
        # Extract and validate the Authorization token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse(
                {'error': 'Authorization header missing or malformed'},
                status=401
            )

        token = auth_header.split(' ')[1]
        try:
            decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        except ExpiredSignatureError:
            return JsonResponse({'error': 'Token has expired'}, status=401)
        except InvalidTokenError:
            return JsonResponse({'error': 'Invalid token'}, status=401)

        user_id = decoded_token.get('user_id')
        if not user_id:
            return JsonResponse({'error': 'Invalid token: User ID missing'}, status=401)

        # Retrieve the user from the database
        try:
            user = Aspnetusers.objects.get(id=user_id)
        except Aspnetusers.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)

        # Return user details
        return JsonResponse({
            'id': user.id,
            'username': user.username,
            'phonenumber': user.phonenumber,
        })

    elif request.method == 'PUT':
        # Extract and validate the Authorization token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse(
                {'error': 'Authorization header missing or malformed'},
                status=401
            )

        token = auth_header.split(' ')[1]
        try:
            decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        except ExpiredSignatureError:
            return JsonResponse({'error': 'Token has expired'}, status=401)
        except InvalidTokenError:
            return JsonResponse({'error': 'Invalid token'}, status=401)

        user_id = decoded_token.get('user_id')
        if not user_id:
            return JsonResponse({'error': 'Invalid token: User ID missing'}, status=401)

        # Retrieve the user from the database
        try:
            user = Aspnetusers.objects.get(id=user_id)
        except Aspnetusers.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)

        # Update phone number
        try:
            data = json.loads(request.body)
            phone_number = data.get('phone_number', '').strip()
            if not phone_number:
                return JsonResponse({'error': 'Phone number is required'}, status=400)

            user.phonenumber = phone_number
            user.save()

            return JsonResponse({
                'message': 'User profile updated successfully',
                'id': user.id,
                'username': user.username,
                'phonenumber': user.phonenumber,
            })
        except Exception as e:
            return JsonResponse({'error': 'Invalid data or request'}, status=400)

    return JsonResponse({'error': 'Method not allowed'}, status=405)

logger = logging.getLogger(__name__)
def get_current_user(request):
    try:
        # Extract and validate the Authorization token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse(
                {'error': 'Authorization header missing or malformed'},
                status=401
            )

        token = auth_header.split(' ')[1]
        try:
            decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        except ExpiredSignatureError:
            return JsonResponse({'error': 'Token has expired'}, status=401)
        except InvalidTokenError:
            return JsonResponse({'error': 'Invalid token'}, status=401)

        user_id = decoded_token.get('user_id')
        if not user_id:
            return JsonResponse({'error': 'Invalid token: User ID missing'}, status=401)

        # Retrieve the user from the database
        try:
            user = Aspnetusers.objects.get(id=user_id)
        except Aspnetusers.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)

        # Return user details
        return JsonResponse({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'phone_number': user.phonenumber,
        })

    except Exception as e:
        print(f"Unexpected error in get_current_user: {e}")
        return JsonResponse({'error': 'An unexpected error occurred'}, status=500)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    try:
        data = request.data
        phone_number = data.get('phone_number')

        if not phone_number:
            return Response({'error': 'Phone number is required'}, status=400)

        user = Aspnetusers.objects.get(id=request.user.id)
        user.phonenumber = phone_number
        user.save()

        return Response({'message': 'Profile updated successfully!'})
    except Aspnetusers.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@csrf_exempt
def update_email(request):
    if request.method == 'PUT':
        try:
            # Extract the token from the Authorization header
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return JsonResponse({'error': 'Authentication token missing or invalid'}, status=401)

            token = auth_header.split(' ')[1]
            try:
                decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            except ExpiredSignatureError:
                return JsonResponse({'error': 'Token has expired'}, status=401)
            except InvalidTokenError:
                return JsonResponse({'error': 'Invalid token'}, status=401)

            # Get the user ID from the token
            user_id = decoded_token.get('user_id')
            if not user_id:
                return JsonResponse({'error': 'Invalid token: User ID missing'}, status=401)

            # Update the user's email
            data = json.loads(request.body)
            email = data.get('email')
            if not email:
                return JsonResponse({'error': 'Email is required'}, status=400)

            user = Aspnetusers.objects.get(id=user_id)
            user.email = email
            user.normalizedemail = email.upper()
            user.save()

            return JsonResponse({'message': 'Email updated successfully!'}, status=200)

        except Aspnetusers.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=400)



# Function to hash the password using the ASP.NET API
def hash_password(password):
    api_url = 'http://localhost:5046/api/passwordhash/hash'
    payload = {'Password': password}
    headers = {'Content-Type': 'application/json'}

    try:
        response = requests.post(api_url, json=payload, headers=headers)
        response.raise_for_status()  # Raise HTTPError for bad responses
        if response.status_code == 200:
            return response.text.strip()
    except requests.RequestException as e:
        print(f"Error hashing password: {e}")
    return None

@csrf_exempt
def update_password(request):
    if request.method == 'PUT':
        try:
            # Parse the request body
            data = json.loads(request.body)
            user_id = data.get('user_id')  # Pass user_id directly in the request
            current_password = data.get('currentPassword')
            new_password = data.get('newPassword')

            if not user_id or not current_password or not new_password:
                return JsonResponse({'error': 'Missing required fields.'}, status=400)

            # Retrieve the user from the database
            try:
                user = Aspnetusers.objects.get(id=user_id)
            except Aspnetusers.DoesNotExist:
                return JsonResponse({'error': 'User not found.'}, status=404)

            # Verify the current password using the external ASP.NET API
            if not verify_password(current_password, user.passwordhash):
                return JsonResponse({'error': 'Current password is incorrect.'}, status=400)

            # Hash the new password using the external ASP.NET API
            hashed_new_password = hash_password(new_password)
            if not hashed_new_password:
                return JsonResponse({'error': 'Failed to hash the new password.'}, status=500)

            # Update the user's password hash in the database
            user.passwordhash = hashed_new_password
            user.save()

            return JsonResponse({'message': 'Password updated successfully!'}, status=200)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data.'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid request method.'}, status=405)



@method_decorator(csrf_exempt, name='dispatch')
def update_two_factor_auth(request):
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            user_id = data.get('user_id')
            two_factor_enabled = data.get('two_factor_enabled')

            # Update two-factor authentication
            user = Aspnetusers.objects.get(id=user_id)
            if two_factor_enabled is not None:
                user.twofactorenabled = two_factor_enabled
                user.save()
            return JsonResponse({'message': 'Two-factor authentication updated successfully!'}, status=200)
        except Aspnetusers.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request method'}, status=400)

@csrf_exempt
def personal_data(request):
    if request.method == 'GET':
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'error': 'Authentication token missing or invalid.'}, status=401)

        token = auth_header.split(' ')[1]
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        user_id = decoded_token.get('user_id')

        try:
            user = Aspnetusers.objects.get(id=user_id)
            data = {
                "Id": user.id,
                "UserName": user.username,
                "Email": user.email,
                "EmailConfirmed": user.emailconfirmed,
                "PhoneNumber": user.phonenumber,
                "PhoneNumberConfirmed": user.phonenumberconfirmed,
                "TwoFactorEnabled": user.twofactorenabled,
            }
            return JsonResponse(data, status=200)
        except Aspnetusers.DoesNotExist:
            return JsonResponse({'error': 'User not found.'}, status=404)
    return JsonResponse({'error': 'Invalid request method.'}, status=405)

@csrf_exempt
def delete_account(request):
    if request.method == 'DELETE':
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'error': 'Authentication token missing or invalid.'}, status=401)

        token = auth_header.split(' ')[1]
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        user_id = decoded_token.get('user_id')

        try:
            user = Aspnetusers.objects.get(id=user_id)
            user.delete()
            return JsonResponse({'message': 'Account and personal data deleted successfully.'}, status=200)
        except Aspnetusers.DoesNotExist:
            return JsonResponse({'error': 'User not found.'}, status=404)
    return JsonResponse({'error': 'Invalid request method.'}, status=405)



@csrf_exempt
def objects_by_user(request, user_id):
    user = get_object_or_404(Aspnetusers, id=user_id)

    objects = Objectinfo.objects.filter(field_createdby_id=user_id).order_by('-field_created')

    data = [
        {
            "ObjectID": obj.objectid,
            "ObjectName": obj.objectname,
            "TypeName": obj.typeid.typename if obj.typeid else None,
            "Created": obj.field_created.strftime('%Y-%m-%d %H:%M:%S') if obj.field_created else None,
            "RubricID": obj.rubricid.rubricid if obj.rubricid else None,
            "RubricName": obj.rubricid.rubricname if obj.rubricid else None,  # <-- safe extraction
            "AccessControl": obj.accesscontrol,
            "ObjectFilePath": obj.objectfilepath,
            "ObjectURL": obj.objectnameurl,
        }
        for obj in objects
    ]

    return JsonResponse(data, safe=False)
