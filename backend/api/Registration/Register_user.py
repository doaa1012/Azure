import json
import uuid
import requests
import jwt
from datetime import datetime, timedelta
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import send_mail
from django.db.models import Max
from ..models import (
    Aspnetusers,
    Aspnetroles,
    Aspnetuserroles,
    Aspnetusertokens,
)

JWT_SECRET = settings.SECRET_KEY
JWT_ALGORITHM = 'HS256'
JWT_EXP_DELTA_SECONDS = 3600 * 30  # 30 hours

# Function to hash password using the ASP.NET API
def hash_password(password):
    api_url = 'http://localhost:5046/api/passwordhash/hash'
    payload = {
        'Password': password
    }
    headers = {
        'Content-Type': 'application/json'
    }
    
    # Send POST request to the ASP.NET API to hash the password
    try:
        response = requests.post(api_url, json=payload, headers=headers)
        response.raise_for_status()  # Raise exception for HTTP errors
    except requests.RequestException as e:
        print(f"Error communicating with ASP.NET API: {e}")
        return None

    # Return the hashed password if successful
    if response.status_code == 200:
        return response.text.strip()  # Strip extra whitespace if necessary
    else:
        return None


def generate_token(user_id, role):
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.utcnow() + timedelta(hours=30),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

@csrf_exempt
def register_user(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')

            print(f"Received registration request for: {email}")

            if not email or not password:
                print("Missing email or password.")
                return JsonResponse({'status': 'fail', 'message': 'Email and password are required'}, status=400)

            if Aspnetusers.objects.filter(normalizedemail=email.upper()).exists():
                print("User already exists.")
                return JsonResponse({'status': 'fail', 'message': 'User already exists'}, status=400)

            # Hash password
            hashed_password = hash_password(password)
            print(f"Hashed password: {hashed_password}")

            if not hashed_password:
                print("Password hashing failed.")
                return JsonResponse({'status': 'fail', 'message': 'Password hashing failed'}, status=500)

            # Generate new user ID
            max_id = Aspnetusers.objects.aggregate(Max('id'))['id__max'] or 0
            next_user_id = max_id + 1
            print(f"New user ID: {next_user_id}")

            # Create user
            security_stamp = str(uuid.uuid4())
            concurrency_stamp = str(uuid.uuid4())

            user = Aspnetusers(
                id=next_user_id,
                email=email,
                passwordhash=hashed_password,
                normalizedemail=email.upper(),
                emailconfirmed=False,
                phonenumber=None,
                phonenumberconfirmed=False,
                securitystamp=security_stamp,
                concurrencystamp=concurrency_stamp,
                accessfailedcount=0,
                lockoutenabled=False,
                twofactorenabled=False
            )
            user.save()
            print(f"User created: {user}")

            # Get default role
            try:
                default_role = Aspnetroles.objects.get(id=2)  # FIXED: use id, not roleid
                print(f"Role fetched: {default_role.name}")
            except Aspnetroles.DoesNotExist:
                print("Role with id=2 does not exist.")
                return JsonResponse({'status': 'fail', 'message': 'Default role does not exist'}, status=500)

            # Link user with role
            Aspnetuserroles.objects.create(userid=user, roleid=default_role)
            print("User-role association created.")

            # Send confirmation email
            try:
                subject = "Welcome to the RDM System"
                message = (
                    f"Dear user,\n\n"
                    f"Your account has been created with the email: {email}\n"
                    f"You can now log in and start using the system.\n\n"
                    f"Best regards,\nRDMS CRC 1625"
                )
                send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email], fail_silently=False)
                print("Confirmation email sent.")
            except Exception as email_error:
                print(f"Email sending failed: {email_error}")

            return JsonResponse({'status': 'success', 'message': 'User registered successfully'})

        except Exception as e:
            print(f"Error during registration: {e}")
            return JsonResponse({'status': 'fail', 'message': f"Error: {str(e)}"}, status=500)
