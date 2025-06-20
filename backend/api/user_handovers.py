from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Handover, Objectinfo
from django.db.models import Q
import jwt
from django.conf import settings

@csrf_exempt
def get_user_handovers(request):
    if request.method != 'GET':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    # Extract the token from the Authorization header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return JsonResponse({'error': 'Authorization header missing or malformed'}, status=401)

    token = auth_header.split(' ')[1]
    try:
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        user_id = decoded_token.get('user_id')
        if not user_id:
            return JsonResponse({'error': 'Invalid token: User ID missing'}, status=401)
    except Exception as e:
        return JsonResponse({'error': f'Invalid token: {str(e)}'}, status=401)

    try:
        # Fetch handovers where the user is either the sender or the recipient
        handovers = Handover.objects.filter(
            Q(handoverid__field_createdby_id=user_id) | Q(destinationuserid_id=user_id)
        ).select_related('sampleobjectid', 'destinationuserid')

        received_handovers = []
        sent_handovers = []

        for handover in handovers:
            handover_data = {
                'sample_id': handover.sampleobjectid.objectid,
                'sample_name': handover.sampleobjectid.objectname,
                'amount': handover.amount,
                'sender_email': handover.handoverid.field_createdby.email if handover.handoverid.field_createdby else 'Unknown',
                'sent_date': handover.handoverid.field_created.strftime('%Y-%m-%d %H:%M:%S'),
                'sender_comments': handover.handoverid.objectdescription,
                'recipient': handover.destinationuserid.username,
                'recipient_email': handover.destinationuserid.email,
                'received_date': handover.destinationconfirmed.strftime('%Y-%m-%d %H:%M:%S') if handover.destinationconfirmed else None,
                'recipient_comments': handover.destinationcomments,
            }

            # If the user is the recipient, add to received; otherwise, sent
            if handover.destinationuserid_id == user_id:
                received_handovers.append(handover_data)
            elif handover.handoverid.field_createdby_id == user_id:
                sent_handovers.append(handover_data)

        return JsonResponse({
            'received_handovers': received_handovers,
            'sent_handovers': sent_handovers
        }, status=200)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
