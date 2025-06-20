from django.shortcuts import redirect
from django.http import JsonResponse
from django.conf import settings
from django.contrib.auth import login
from django.utils.crypto import get_random_string
from django.views.decorators.csrf import csrf_exempt
from urllib.parse import urlencode
from django.db.models import Max
import requests, uuid, jwt
from datetime import datetime, timedelta

from ..models import (
    Aspnetusers, Aspnetuserlogins,
    Aspnetusertokens, Aspnetuserroles,
    Aspnetroles
)

def google_login_redirect(request):
    base_url = "https://accounts.google.com/o/oauth2/v2/auth"
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent"
    }
    return redirect(f"{base_url}?{urlencode(params)}")


# JWT generator
def generate_token(user_id, role):
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.utcnow() + timedelta(hours=30),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


@csrf_exempt
def google_auth_callback(request):
    code = request.GET.get('code')
    if not code:
        return JsonResponse({'status': 'fail', 'message': 'Missing authorization code'}, status=400)

    # Step 1: Exchange code for access token
    token_response = requests.post(
        'https://oauth2.googleapis.com/token',
        data={
            'code': code,
            'client_id': settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
            'redirect_uri': settings.GOOGLE_REDIRECT_URI,
            'grant_type': 'authorization_code',
        }
    )
    if token_response.status_code != 200:
        return JsonResponse({'status': 'fail', 'message': 'Failed to exchange code'}, status=400)

    access_token = token_response.json().get('access_token')

    # Step 2: Get user info
    user_info_response = requests.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    if user_info_response.status_code != 200:
        return JsonResponse({'status': 'fail', 'message': 'Failed to get user info'}, status=400)

    user_info = user_info_response.json()
    email = user_info.get('email')
    google_id = user_info.get('id')
   

    is_new_user = False

    # Step 3: Check if user exists in login mapping
    existing_login = Aspnetuserlogins.objects.filter(loginprovider='Google', providerkey=google_id).first()

    if existing_login:
        user = existing_login.userid
        print("Existing user:", user.email)
    else:
        # Step 4: Register new user manually with max ID
        is_new_user = True
        max_id = Aspnetusers.objects.aggregate(Max('id'))['id__max'] or 0
        next_user_id = max_id + 1

        user = Aspnetusers.objects.create(
            id=next_user_id,
            email=email,
            username=email,
            normalizedemail=email.upper(),
            normalizedusername=email.upper(),
            emailconfirmed=True,
            phonenumber=None,
            phonenumberconfirmed=False,
            securitystamp=str(uuid.uuid4()),
            concurrencystamp=str(uuid.uuid4()),
            accessfailedcount=0,
            lockoutenabled=False,
            twofactorenabled=False
        )

        # Step 5: Save Google login mapping
        Aspnetuserlogins.objects.create(
            loginprovider='Google',
            providerkey=google_id,
            providerdisplayname='Google',
            userid=user
        )

        # Step 6: Assign default role (e.g. id=2)
        try:
            default_role = Aspnetroles.objects.get(id=2)
            Aspnetuserroles.objects.create(userid=user, roleid=default_role)
            print("Assigned default role:", default_role.name)
        except Aspnetroles.DoesNotExist:
            print("Role with ID 2 does not exist")

        print("✅ New user registered:", user.email)

    # Step 7: Get role
    user_role = Aspnetuserroles.objects.filter(userid=user).first()
    role = user_role.roleid.name if user_role and user_role.roleid else "User"

    # Step 8: Create JWT token
    token = generate_token(user.id, role)

    # Step 9: Save or update token
    Aspnetusertokens.objects.update_or_create(
        userid=user,
        loginprovider='JWT',
        name='access_token',
        defaults={'value': token}
    )

    # Step 10: Redirect to frontend with data
    query_string = urlencode({
        'email': email,
        'username': user.username,
        'userId': user.id,
        'role': role,
        'token': token,
        'success': 'true',
        'is_new_user': str(is_new_user).lower()
    })
    return redirect(f'http://localhost:5173/google-auth-success?{query_string}')
