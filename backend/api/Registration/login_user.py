import json
import requests
import jwt
from datetime import datetime, timedelta
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from ..models import Aspnetusers, Aspnetuserlogins, Aspnetusertokens, Aspnetuserroles, Aspnetroles
from django.conf import settings

# JWT settings
JWT_SECRET = settings.SECRET_KEY
JWT_ALGORITHM = 'HS256'
JWT_EXP_DELTA_SECONDS = 3600*30  # Token valid for 30 hour

# Function to verify password with ASP.NET API
def verify_password(plain_password, hashed_password):
    api_url = 'http://localhost:5046/api/passwordhash/verify'
    payload = {
        'HashedPassword': hashed_password,
        'Password': plain_password
    }
    headers = {
        'Content-Type': 'application/json'
    }
    
    # Send POST request to the ASP.NET API to verify the password
    response = requests.post(api_url, json=payload, headers=headers)
    
    # Return True if the password is correct
    if response.status_code == 200:
        return response.json()  # Returns True or False
    else:
        return False

# Function to verify Google Token
def verify_google_token(id_token):
    google_oauth_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
    response = requests.get(google_oauth_url)
    if response.status_code == 200:
        return response.json()  # Return token details if valid
    return None

# Function to generate JWT token
# Updated function to generate JWT token with role
def generate_token(user_id, role):
    payload = {
        'user_id': user_id,
        'role': role,  # Add the role here in the payload
        'exp': datetime.utcnow() + timedelta(seconds=JWT_EXP_DELTA_SECONDS),
        'iat': datetime.utcnow()
    }
    token = jwt.encode(payload, JWT_SECRET, JWT_ALGORITHM)
    return token


# Function to get the role of the user
def get_user_role(user_id):
    try:
        user_role = Aspnetuserroles.objects.filter(userid=user_id).first()
        if user_role:
            role = Aspnetroles.objects.get(id=user_role.roleid_id)
            return role.name  # Return the role name
    except Exception as e:
        return None
    return None

@csrf_exempt
def login_user(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
            google_token = data.get('google_token')  # Google token if logging in with Google

            # Log the parsed data
            print("Parsed data:", data)

        except (json.JSONDecodeError, KeyError) as e:
            return JsonResponse({'status': 'fail', 'message': 'Invalid input format'}, status=400)

        # Check if both email and password or Google token is provided
        if not email or (not password and not google_token):
            return JsonResponse({'status': 'fail', 'message': 'Email and password or Google token are required'}, status=400)

        # Handle Google Login
        if google_token:
            token_info = verify_google_token(google_token)

            if not token_info:
                return JsonResponse({'status': 'fail', 'message': 'Invalid Google token'}, status=400)

            # Check if the user exists with the Google login provider
            google_id = token_info['sub']  # Google user ID
            try:
                user_login = Aspnetuserlogins.objects.filter(loginprovider='Google', providerkey=google_id).first()
                if user_login:
                    user = user_login.userid
                    # Retrieve user's role
                    role = get_user_role(user.id)
                    # Generate token with user ID and role
                    token = generate_token(user.id, role)

                    # Store token in AspNetUserTokens
                    Aspnetusertokens.objects.update_or_create(
                        userid=user,
                        loginprovider='JWT',
                        name='access_token',
                        defaults={'value': token}
                    )

                    return JsonResponse({'status': 'success', 'message': 'Logged in successfully with Google', 'token': token, 'userId': user.id, 'role': role})
                else:
                    return JsonResponse({'status': 'fail', 'message': 'User not found with Google login'}, status=404)

            except Exception as e:
                return JsonResponse({'status': 'fail', 'message': str(e)}, status=500)

        # Handle Email and Password Login
        try:
            # Fetch the user from the Django database
            user = Aspnetusers.objects.get(email=email)

            # Verify password using the ASP.NET API
            if verify_password(password, user.passwordhash):
                # Retrieve user's role
                role = get_user_role(user.id)
                
                # Generate token with user ID and role
                token = generate_token(user.id, role)

                # Store token in AspNetUserTokens
                Aspnetusertokens.objects.update_or_create(
                    userid=user,
                    loginprovider='JWT',
                    name='access_token',
                    defaults={'value': token}
                )

                # Return the token, userId, and role to the frontend
                return JsonResponse({'status': 'success', 'message': 'Logged in successfully', 'token': token, 'userId': user.id, 'role': role})
            else:
                return JsonResponse({'status': 'fail', 'message': 'Invalid password'}, status=400)

        except Aspnetusers.DoesNotExist:
            return JsonResponse({'status': 'fail', 'message': 'User not found'}, status=404)

