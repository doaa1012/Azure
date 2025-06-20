import json
import requests
from django.shortcuts import redirect
from django.http import JsonResponse
from django.contrib.auth import login
from ..models import Aspnetusers, Aspnetuserlogins

# Function to verify Google Token
def verify_google_token(id_token):
    google_oauth_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
    response = requests.get(google_oauth_url)
    if response.status_code == 200:
        return response.json()  # Return token details if valid
    return None

# Django view for handling Google login
def google_login(request):
    id_token = request.POST.get('id_token')  # Get the ID token sent from the client
    token_info = verify_google_token(id_token)

    if not token_info:
        return JsonResponse({'status': 'fail', 'message': 'Invalid Google token'}, status=400)

    # Check if the user exists in the ASP.NET system using email and Google login provider
    try:
        email = token_info['email']
        google_id = token_info['sub']  # Google user ID

        # Check Aspnetuserlogins for a matching provider and key
        user_login = Aspnetuserlogins.objects.filter(loginprovider='Google', providerkey=google_id).first()

        if user_login:
            # Fetch the associated Aspnetuser
            user = user_login.userid
            login(request, user)  # Authenticate the user in Django

            return JsonResponse({'status': 'success', 'message': 'Logged in successfully'})
        else:
            return JsonResponse({'status': 'fail', 'message': 'User not found in Google logins'}, status=404)

    except Exception as e:
        return JsonResponse({'status': 'fail', 'message': str(e)}, status=500)
