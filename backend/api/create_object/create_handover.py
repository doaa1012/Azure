import logging
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.utils import timezone
from ..models import Handover, Objectinfo, Typeinfo, Tenant, Aspnetusers, Rubricinfo
from rest_framework import status
import hashlib
import os
from datetime import datetime
import jwt
from django.conf import settings
from django.db.models import Max
import json
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import send_mail
# Set up logger
logger = logging.getLogger(__name__)

@csrf_exempt
def submit_object_and_handover(request):
    if request.method != 'POST':
        logger.error("Invalid request method.")
        return JsonResponse(
            {'error': 'Only POST method is allowed'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    try:
        # Extract and validate Authorization token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            logger.warning("Authorization header missing or malformed.")
            return JsonResponse(
                {'error': 'Authorization header missing or malformed.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        token = auth_header.split(' ')[1]
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        user_id = decoded_token.get('user_id')
        if not user_id:
            logger.warning("User ID missing in token.")
            return JsonResponse(
                {'error': 'Invalid token: User ID missing'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Retrieve fields for Objectinfo
        type_name = request.POST.get('typeId')
        tenant_id = request.POST.get('tenantId')
        rubric_id = request.POST.get('rubricId', None)
        handover_name = request.POST.get('name')
        amount = request.POST.get('amount')
        measurement_unit = request.POST.get('measurementUnit')
        recipient_id = request.POST.get('recipient')
        sampleobjectid = request.POST.get('sampleobjectid')  # Link to existing sample object

        # Validate and retrieve related models
        type_info = Typeinfo.objects.get(typename=type_name)
        tenant = Tenant.objects.get(tenantid=tenant_id)
        created_by = Aspnetusers.objects.get(id=user_id)
        rubric = Rubricinfo.objects.get(rubricid=rubric_id) if rubric_id else None
        recipient_user = get_object_or_404(Aspnetusers, pk=recipient_id)

        # Validate existence of sample object
        sample_object = get_object_or_404(Objectinfo, objectid=sampleobjectid)

        # Prepare object name and file path
        current_time = datetime.now().strftime("%Y%m%d%H%M%S")
        object_id_placeholder = 'new'
        objectname = f"{handover_name}-{amount}-{measurement_unit}-handover-to-{recipient_user.username}-{current_time}-{object_id_placeholder}"
        object_url = request.POST.get('url', f"default-url-{current_time}")
        BASE_FILE_PATH = settings.BASE_FILE_PATH  # Use base file path from settings

        # Process file if provided
        file = request.FILES.get('filePath')
        file_path, file_hash = None, None
        if file:
            file_hash = hashlib.md5(file.read()).hexdigest()
            file.seek(0)
            duplicate_object = Objectinfo.objects.filter(objectfilehash=file_hash).first()
            if duplicate_object:
                return JsonResponse(
                    {
                        'error': 'File already exists with the same content.',
                        'existing_object': {
                            'objectId': duplicate_object.objectid,
                            'objectName': duplicate_object.objectname,
                            'createdDate': duplicate_object.field_created,
                            'description': duplicate_object.objectdescription,
                            'url': duplicate_object.objectnameurl,
                        }
                    },
                    status=status.HTTP_409_CONFLICT
                )
            file_path = os.path.join(BASE_FILE_PATH, file.name)
            with open(file_path, 'wb') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)

        # Retrieve rubric and name from sample object
        sample_rubric_id = sample_object.rubricid_id
        sample_name = sample_object.objectname

        # Prepare new Objectinfo entry for handover, inheriting rubric ID and using sample name
        max_id = Objectinfo.objects.aggregate(Max('objectid'))['objectid__max']
        next_id = (max_id or 0) + 1
        objectname = objectname.replace(object_id_placeholder, str(next_id))
        handover_object = Objectinfo(
            objectid=next_id,
            tenantid=tenant,
            field_created=timezone.now(),
            field_createdby=created_by,
            field_updated=timezone.now(),
            field_updatedby=created_by,
            typeid=type_info,
            rubricid_id=sample_rubric_id,
            sortcode=int(request.POST.get('sortCode', 0)),
            accesscontrol=1,
            ispublished=False,
            externalid=request.POST.get('externalId'),
            objectname=f"{sample_name}-{amount}-{measurement_unit}-handover-to-{recipient_user.username}-{current_time}",
            objectnameurl=f"{sample_name}-{amount}-{measurement_unit}-handover-to-{recipient_user.username}-{current_time}-{next_id}",
            objectfilepath=file_path,
            objectfilehash=file_hash,
            objectdescription=request.POST.get('comments', '')  # Save comments here
        )
        handover_object.save()
        # Print saved Objectinfo data
        print("Saved Objectinfo:", handover_object.__dict__)

        # Create Handover instance with an empty initial json comment
        handover = Handover(
            handoverid=handover_object,
            sampleobjectid=sample_object,
            destinationuserid=recipient_user,
            amount=amount,
            measurementunit=measurement_unit,
            json='',  # Empty, as comments are saved in Objectinfo's description
            destinationcomments=''  # Set empty, recipient will confirm
        )
        handover.save()
        # Print saved Handover data
        print("Saved Handover:", handover.__dict__)
        

        # Email notification to recipient (handover received)
                # Email notification to recipient (handover received)
        try:
            subject = f"[RDMS] New Handover Request from {created_by.username}"
            message = (
                f"Dear {recipient_user.username},\n\n"
                f"You have received a new handover request.\n\n"
                f"Sample: {sample_object.objectname}\n"
                f"Amount: {amount} {measurement_unit}\n"
                f"Comments: {handover_object.objectdescription}\n"
                f"From: {created_by.username}\n"
                f"Time: {handover_object.field_created.strftime('%Y-%m-%d %H:%M:%S')}\n\n"
                f"Please log in to confirm the handover.\n\n"
                f"Regards,\nRDMS System"
            )

            email_sent = send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [recipient_user.email],
                fail_silently=False
            )
            if email_sent:
                logger.info(f"Email successfully sent to recipient: {recipient_user.email}")
            else:
                logger.error(f"Email sending failed to: {recipient_user.email}")

        except Exception as email_error:
            logger.error(f"Failed to send email to recipient: {email_error}")


        return JsonResponse(
            {
                'message': 'Object and Handover successfully created.',
                'objectId': handover_object.objectid,
                'handoverId': handover.handoverid.objectid
            },
            status=status.HTTP_201_CREATED
        )

    except Exception as e:
        logger.error(f"An error occurred: {e}")
        print("Exception:", str(e))
        return JsonResponse({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
def confirm_handover(request, handover_id):
    if request.method == "POST":
        try:
            handover = Handover.objects.get(pk=handover_id)
            data = json.loads(request.body)  # Parse JSON body
            comments = data.get("comments", "")

            handover.destinationconfirmed = timezone.now()  # Set confirmation time
            handover.destinationcomments = comments  # Set recipient comments
            handover.save()
            # Notify sender that the handover was confirmed
            try:
                sender_user = handover.handoverid.field_createdby  # Creator of the handover object

                subject = f"[RDMS] Handover Confirmed by {handover.destinationuserid.username}"
                message = (
                    f"Dear {sender_user.username},\n\n"
                    f"Your handover request for sample '{handover.sampleobjectid.objectname}' "
                    f"has been confirmed by {handover.destinationuserid.username}.\n\n"
                    f"Comments: {handover.destinationcomments}\n"
                    f"Confirmed at: {handover.destinationconfirmed.strftime('%Y-%m-%d %H:%M:%S')}\n\n"
                    f"Regards,\nRDMS System"
                )

                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [sender_user.email],
                    fail_silently=False
                )
                print("Email sent to sender:", sender_user.email)

            except Exception as e:
                logger.error(f"Failed to send confirmation email to sender: {e}")

            # Print statements for debugging
            print("Handover Confirmation Time:", handover.destinationconfirmed)
            print("Handover Recipient Comments:", handover.destinationcomments)

            return JsonResponse({
                "message": "Handover confirmed successfully",
                "destinationconfirmed": handover.destinationconfirmed,
                "destinationcomments": handover.destinationcomments
            })

        except Handover.DoesNotExist:
            print("Handover not found for ID:", handover_id)
            return JsonResponse({"error": "Handover not found"}, status=404)
        except Exception as e:
            print("Error during handover confirmation:", str(e))
            return JsonResponse({"error": str(e)}, status=500)
    
    print("Invalid request method for confirm_handover")
    return JsonResponse({"error": "Invalid request method"}, status=405)