from django.http import JsonResponse
from django.contrib.auth import logout
from django.views.decorators.csrf import csrf_exempt
ALLOWED_ORIGIN = 'https://purple-bay-04543970f.2.azurestaticapps.net'
@csrf_exempt
def logout_user(request):
    if request.method == 'OPTIONS':
        response = JsonResponse({'status': 'ok'})
        response['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Allow-Headers'] = 'Content-Type'
        return response
    
    if request.method == 'POST':
        logout(request)
        # Clear cookies that store session id if using session-based auth
        response = JsonResponse({'status': 'success', 'message': 'Logged out successfully'})
        response.delete_cookie('sessionid')  # Delete session ID if stored in cookies
        response['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN
        response['Access-Control-Allow-Credentials'] = 'true'
        return response
    
    return JsonResponse({'status': 'fail', 'message': 'Invalid request method'}, status=400)

