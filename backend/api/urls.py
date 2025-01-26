from django.urls import path
from . import views
from . import dynamic_workflow
from . import load_lsvs
from . import plot_lsvs
from .create_object import list_editor
from .create_object import create_object
from .Registration import login_user
from .Registration import Register_user
from .Registration import logout_user
from .Registration import get_current_user
from .create_object import get_rubric_by_url
from .create_object import Rubricinfo_container
from .create_object import get_typeinfo
from .create_object import update_object_url
from .create_object import create_sample
from .edit_delete import delete_rubric
from .edit_delete import edit_rubric
from .create_object import create_handover
from . import handover_view
from .create_object import process_and_upload_edx_file
from .create_object import recent_objects_view
from .create_object import create_reference
from .create_object import create_object_with_properties_SECCM, save_property
from .create_object import ideas_and_plans
from .edit_delete import edit_object
from .edit_delete import edit_sample
from .edit_delete import edit_edx,edit_property
from .edit_delete import update_associated_objects
from .edit_delete import edit_object_with_properties
from .edit_delete import delete_object,edit_ideas_and_plans, edit_reference, edit_property
from . import ideas_and_experiments_measurement
from . import download_properties
from django.urls import path, include
from . import object_search_view
urlpatterns = [
    
    path('api/objectinfo/<str:rubricnameurl>/', views.objectinfo_list, name='objectinfo_list'),

    path('api/get-rubricinfo-by-path/', views.get_rubricinfo_by_path, name='get_rubricinfo_by_path'),
    
    path('api/object/<int:object_id>/', views.object_detail, name='object_detail'),
    path('api/get_handover_detail/<int:sampleobjectid>/', views.get_handover_detail, name='get_handover_detail'),

    path('api/object/<int:object_id>/rubricpath/', views.get_rubric_path, name='get_rubric_path'),

    path('download-file/<int:object_id>/', views.download_file, name='download_file'), 
    path('api/search-table/', views.search_table_view, name='search_table_view'),
    path('api/search-dataset/', views.search_dataset_view, name='search_dataset_view'),
    path('api/download_dataset/<int:object_id>/', views.download_dataset, name='download_dataset'),
    path('api/workflow-stage/<int:object_id>/', views.get_workflow_stage, name='get_workflow_stage'),
    path('api/get_sample_associated_data/', views.get_sample_associated_data, name='get_sample_associated_data'),
    path('api/download_multiple_datasets/', views.download_multiple_datasets, name='download_multiple_datasets'),
    path('api/get_typenames/', views.get_typenames, name='get_typenames'),
    path('api/samples-per-element/', views.get_samples_per_element_data, name='samples_per_element_data'),
    path('api/monthly-object-increase/', views.monthly_object_increase_view, name='monthly_object_increase'),
    path('api/synthesis-requests/', views.synthesis_requests_view, name='synthesis-requests'),
    path('api/users/', views.user_list_view, name='user-list'),
    path('api/users/<int:user_id>/', views.user_detail_view, name='user-detail'),
    path('api/object-statistics/', views.object_statistics_view, name='object_statistics'),
    path('api/element-composition/', views.element_composition_view, name='element_composition_view'),
    path('api/ideas-experiments/', views.ideas_and_experiments_view, name='ideas_and_experiments'),
    path('api/typenames/', dynamic_workflow.get_typenames, name='get_typenames'),
    path('api/save-workflow/', dynamic_workflow.save_workflow, name='save_workflow'),
    path('api/get-workflows/', dynamic_workflow.get_workflows, name='get_workflows'),
    path('api/workflows/<int:id>/', dynamic_workflow.get_workflow_detail, name='get_workflow_detail'),
    path('api/get_sample_associated_data_workflow/<int:workflow_id>/', dynamic_workflow.get_sample_associated_data_workflow, name='get_sample_associated_data_workflow'),
     path('api/load_lsvs/', load_lsvs.load_lsvs_view, name='load_lsvs_view'),
    path('api/plot_lsvs/', plot_lsvs.plot_lsvs, name='plot_lsvs'),

    path('api/list_editor/', list_editor.list_editor_view, name='list_editor_view'),

    path('api/get_rubric_from_objectnameurl/<str:objectnameurl>/', list_editor.get_rubric_from_objectnameurl, name='get_rubric_from_objectnameurl'),
    path('api/create_object/', create_object.create_object, name='create_object'),

    path('api/rubrics/', create_object.rubric_list, name='rubric_list'),
    path('api/typeinfo/', get_typeinfo.get_typeinfo, name='get_typeinfo'),
    path('api/login/', login_user.login_user, name='login'),
    path('api/register/', Register_user.register_user, name='register'),
    path('api/logout/', logout_user.logout_user, name='logout_user'),
    path('api/rubric-id/<str:rubricnameurl>/', get_rubric_by_url.get_rubric_id_by_url, name='get_rubric_by_url'),
    path('api/update_object_url/<int:objectid>/', update_object_url.update_object_url, name='update_object_url'),
    path('api/substrate-options/', create_sample.get_substrate_options, name='substrate-options'),
    path('api/create_rubric/', Rubricinfo_container.create_rubric, name='create_rubric'),
    path('api/create_sample/', create_sample.create_sample, name='create_sample'),
    path('api/create_reference/', create_reference.create_reference, name='create_reference'),
    path('api/create_object_with_properties/', create_object_with_properties_SECCM.create_object_with_properties, name='create_object_with_properties'),
    path('api/create_main_and_child_objects/', process_and_upload_edx_file.create_main_and_child_objects, name='create_main_and_child_objects'),
    path('api/handover/', handover_view.handover_view, name='handover_view'),
    path('api/submit-handover/', create_handover.submit_object_and_handover, name='submit_object_and_handover'),
    path("api/confirm_handover/<int:handover_id>/", create_handover.confirm_handover, name="confirm_handover"),

    path('api/edit_rubric/<int:rubric_id>/', edit_rubric.edit_rubric, name='edit_rubric'),
    path('api/delete-rubric/<int:rubric_id>/',delete_rubric.delete_rubric, name='delete_rubric'),
    path('api/get_rubric_with_parent/<int:rubricid>/',edit_rubric.get_rubric_with_parent, name='get_rubric_with_parent'),
    path('api/edit_object/<int:object_id>/', edit_object.edit_object, name='edit_object'),
    path('api/edit_sample/<int:object_id>/', edit_sample.edit_sample, name='edit_samplet'),
    path('api/edit_edx/<int:object_id>/', edit_edx.edit_main_and_child_objects, name='edit_edx'),
    path('download-file/<int:object_id>/', views.download_file, name='download_file'),
    path('api/update_associated_objects/', update_associated_objects.update_associated_objects, name='update_associated_objects'),
    path('api/search-associated-objects/', update_associated_objects.search_associated_objects, name='search_associated_objects'),
    path('api/recent-objects/', recent_objects_view.recent_objects_view, name='recent_objects'),
    path('api/recent-activities/', recent_objects_view.recent_activities_view, name='recent_activities_view'),
    path('api/ideas_and_plans/',ideas_and_plans.create_ideas_and_plans, name='create_ideas_and_plans'),
    path('api/edit_object_with_properties/<int:object_id>/', edit_object_with_properties.edit_object_with_properties, name='edit_object_with_properties'),
    path('api/delete_object/<int:object_id>/', delete_object.delete_object, name='delete_object'),
    path('api/edit_ideas_and_plans/<int:object_id>/', edit_ideas_and_plans.edit_ideas_and_plans, name='edit_ideas_and_plans'),
    path('api/save-property-data/', save_property.save_property, name='save_property_data'),
    path('api/upload-properties/', download_properties.upload_object_properties_csv, name='upload_properties'),
    path('api/property/<int:property_id>/', edit_property.get_property, name='get_property'),
    path('api/edit_property/<int:property_id>/', edit_property.edit_property, name='edit_property'),
    path('api/delete_property/<int:property_id>/', edit_property.delete_property, name='delete_property'),
    path('api/edit_reference/<int:object_id>/', edit_reference.edit_reference, name='edit_reference'),
    path('api/export_properties/<int:object_id>/', download_properties.export_object_properties_csv, name='export_properties'),
    path('api/add_processing_step/', create_sample.add_processing_step_sample, name='add_processing_step_sample'),
    path('api/split_sample/', create_sample.split_sample_view, name='split_sample'),
    path('auth/', include('social_django.urls', namespace='social')),
    path('api/object_search/', object_search_view.object_search_view, name='object_search_view'),
    path('api/ideas_and_experiments_measurement/', ideas_and_experiments_measurement.ideas_and_experiments_measurement, name='ideas_and_experiments_measurement'),
    path('api/current_user/', get_current_user.get_current_user, name='current_user'),

    path('api/user-profile/', get_current_user.user_profile, name='user_profile'),
    path('api/update_profile/', get_current_user.update_profile, name='update_profile'),
    path('api/update-email/', get_current_user.update_email, name='update_email'),
    path('api/update-password/', get_current_user.update_password, name='update_password'),

    path('api/update-two-factor-auth/', get_current_user.update_two_factor_auth, name='update_two_factor_auth'),
    path('api/personal-data/', get_current_user.personal_data, name='personal_data'),
    path('api/delete-account/', get_current_user.delete_account, name='delete_account'),

]


