from django.core.paginator import Paginator
from django.http import JsonResponse
from django.db.models import Count, Q
from .models import Objectinfo, Typeinfo, Sample, Objectlinkobject

def empty_samples_view(request):
    sample_type = Typeinfo.objects.filter(typename__iexact='Sample').first()
    substrate_type = Typeinfo.objects.filter(typename__iexact='Substrate').first()
    if not sample_type or not substrate_type:
        return JsonResponse({'error': 'Sample or Substrate type not found'}, status=404)

    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('limit', 30))
    user_id = request.GET.get('user_id')
    char_zero_only = request.GET.get('char_zero_only') == 'true'

    # Base queryset with optional user filtering
    samples_qs = Objectinfo.objects.filter(typeid=sample_type)
    if user_id:
        samples_qs = samples_qs.filter(field_createdby_id=user_id)

    # Annotate characterization count excluding substrate
    samples_qs = samples_qs.annotate(
        char_count=Count(
            'objectlinkobject',
            filter=~Q(objectlinkobject__linkedobjectid__typeid=substrate_type),
            distinct=True
        )
    )

    # Filter out samples with non-zero characterization if requested
    if char_zero_only:
        samples_qs = samples_qs.filter(char_count=0)

    samples_qs = samples_qs.order_by('-field_created')

    # Paginate
    paginator = Paginator(samples_qs, per_page)
    page_obj = paginator.get_page(page)

    result = []
    for sample in page_obj:
        try:
            sample_data = Sample.objects.get(sampleid=sample.objectid)
            chemical_elements = sample_data.elements.split(",")
            chemical_system = "-".join(e.strip() for e in chemical_elements if e.strip())
            elemnumber = sample_data.elemnumber
        except Sample.DoesNotExist:
            chemical_system = ""
            elemnumber = 0

        # Get substrate name (still via Python)
        substrate_link = Objectlinkobject.objects.filter(
            objectid=sample,
            linkedobjectid__typeid=substrate_type
        ).first()
        substrate_name = substrate_link.linkedobjectid.objectname if substrate_link else ""

        result.append({
            "Id": sample.objectid,
            "Created": sample.field_created.strftime('%Y-%m-%d'),
            "Project Name": sample.objectname,
            "Person": sample.field_createdby.username,
            "N": elemnumber,
            "Sample Material": chemical_system,
            "Substrate": substrate_name,
            "Chamber": "K2",  # Placeholder
            "Depositions": 1,  # Placeholder
            "Characterizations": sample.char_count,
        })

    return JsonResponse({
        'results': result,
        'total_pages': paginator.num_pages,
        'current_page': page,
        'has_next': page_obj.has_next(),
        'has_previous': page_obj.has_previous(),
    })
