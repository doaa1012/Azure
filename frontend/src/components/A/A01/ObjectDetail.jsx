import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import CompositionDetails from './CompositionDetails';
import LsvsInputForm from './LsvsInputForm';
import AddPropertyForm from '../../Create_object/AddPropertyForm';
import AddAssociatedObjectForm from '../../Create_object/AddAssociatedObjectForm';
import AddHandoverForm from '../../Create_object/AddHandoverForm';
import HandoverDetails from './HandoverDetails';
import ChooseUploadOptionModal from '../../Create_object/ChooseUploadOptionModal';
import DeleteHandler from '../../edit_delete/DeleteHandler';
import DownloadPropertiesButton from './DownloadProperties';
import DeleteProperty from '../../edit_delete/DeleteProperty';
import AddPropertyModal from '../../Create_object/AddPropertyModal';
import AddProcessingStep from './AddProcessingStep';
import IdeasAndExperimentsMeasurement from './IdeasAndExperimentsMeasurement';
import LsvsViewer from './LsvsViewer';
import SplitSample from "./SplitSample";
import config from '../../../config_path';
import { FaEdit } from 'react-icons/fa';
import { FaTrash, FaPlus } from 'react-icons/fa';
import jwtDecode from 'jwt-decode';
function ObjectDetail() {
  const { objectId } = useParams();
  const [objectData, setObjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [isAssociatedOpen, setIsAssociatedOpen] = useState(false);
  const [isReferencedOpen, setIsReferencedOpen] = useState(false);
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [isLsvsOpen, setIsLsvsOpen] = useState(false);
  const [isSampleSectionOpen, setIsSampleSectionOpen] = useState(false);
  const [showAddPropertyForm, setShowAddPropertyForm] = useState(false);
  const [showChooseUploadOption, setShowChooseUploadOption] = useState(false);
  const [measurementOpen, setMeasurementOpen] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [lsvsData, setLsvsData] = useState({});
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);



  const isIdeasOrExperiment = objectData?.Type?.TypeName?.toLowerCase() === 'ideas or experiment plans';

  const navigate = useNavigate();
  useEffect(() => {
    fetchObjectData();
  }, [objectId]);

  const accessControlMapping = {
    0: "Public",
    1: "Protected",
    2: "Protected NDA",
    3: "Private",
  };

  const accessControlLabel = accessControlMapping[objectData?.Access] || "Unknown";

  const seccmTypes = [
    "SECCM (csv)",
    "SECCM Long-range Processed (csv)",
    "SECCM Long-range Raw (zip)",
    "SECCM/EBSD correlation (xlsx)"
  ];
  const fetchObjectData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${config.BASE_URL}api/object/${objectId}/`);
      const data = await response.json();
      setObjectData(data);
    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Decode token to get current user
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setCurrentUser(decoded); // Set the current user from the decoded token
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
  }, []);
  useEffect(() => {
    fetch(`${config.BASE_URL}api/object/${objectId}/`)
      .then(response => response.json())
      .then(data => setObjectData(data))
      .catch(error => setError(error))
      .finally(() => setLoading(false));


  }, [objectId]);
  const handleDeleteComplete = (deletedId) => {
    console.log(`Object with ID ${deletedId} deleted successfully.`);
    navigate('/'); // Redirect after deletion
  };
  const handleDeleteError = (errorMessage) => {
    setDeleteError(errorMessage); // Update delete error state
  };
  const handleLsvsSubmit = (params) => {
    // Add your LSV submission logic here
  };

  console.log('Properties:', objectData?.Properties);
  console.log("Fetched objectData:", objectData);
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error loading object details: {error.message}</p>;
  if (!objectData) return <p>No data available.</p>;

  const isSeccmType = seccmTypes.includes(objectData?.Type?.TypeName);

  const toggleSampleSection = () => {
    setIsSampleSectionOpen(!isSampleSectionOpen);
  };

  const goToWorkflowStatus = () => {
    navigate(`/workflow-stage/${objectId}`);
  };
  const handleAddProperty = () => {
    setShowAddPropertyModal(true);
  };

  const handleModalSelect = (option) => {
    setShowAddPropertyModal(false);
    if (option === 'manual') {
      navigate(`/add-property/${objectId}`);
    } else if (option === 'file') {
      navigate(`/upload-properties/${objectId}`);
    }
  };
  const goToUploadFiles = () => {
    navigate(`/create/upload_files`);
  };
  console.log('Current User:', objectData);

  const currentUserId = currentUser?.user_id; // Safely access user_id from currentUser
  const isOwner = objectData?.CreatedBy?.UserId === currentUserId; // Check ownership

  const handleAddProcessingStep = async () => {
    if (!processingDescription.trim()) {
      alert('Processing Description is required.');
      return;
    }

    try {
      const response = await fetch(`${config.BASE_URL}api/create_sample/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: processingDescription,
          parentObjectId: objectId, // Pass the current object ID if needed
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Processing step added successfully! New sample name: ${data.sampleName}`);
        setProcessingDescription(''); // Clear the input field
        console.log('New Sample Created:', data);
      } else {
        const errorData = await response.json();
        alert('Error adding processing step: ' + errorData.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while adding the processing step.');
    }
  };

  return (
    <div className="object-detail-container bg-blue-50 p-10 min-h-screen">
      <h1 className="object-detail-title text-center text-4xl font-bold text-gray-800 mb-10">
        {(objectData?.Name || 'Unknown Object').toUpperCase()}
      </h1>

      {/* MAIN CARD */}
      <div className="object-detail-info bg-white p-6 rounded-lg shadow-lg mb-6">
        {/* Card Content */}
        <div className="flex justify-between items-center">
          <div>
            {/* Text Content */}
            <p>
              <strong>Type:</strong> {objectData?.Type?.TypeName || 'Unknown'}
            </p>
            <p>
              <strong>Description:</strong> {objectData?.Description || 'No description available'}
            </p>
            {objectData?.Sample?.Elements && (
              <p>
                <strong>Chemical System:</strong>{' '}
                {objectData.Sample.Elements.replace(/^-+|-+$/g, '')}
              </p>
            )}
            {objectData?.FileUrl ? (
              <p>
                <strong>File:</strong>{' '}
                <a
                  href={`${config.BASE_URL}${objectData.FileUrl}`}
                  className="text-blue-600 underline hover:text-blue-800"
                  download
                >
                  {objectData.FileName || 'Download file'}
                </a>
              </p>
            ) : (
              <p>
                <strong>File:</strong> No file available
              </p>
            )}
          </div>
          {/* Button */}
          <button
            onClick={() => setShowAdditionalInfo(!showAdditionalInfo)}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-700 text-white font-semibold py-2 px-4 rounded-md shadow-md hover:from-green-600 hover:to-green-800 transition-all text-sm"
          >
            {showAdditionalInfo ? (
              <>
                <i className="fas fa-eye-slash"></i>
                Hide Additional Info
              </>
            ) : (
              <>
                <i className="fas fa-eye"></i>
                Show Additional Info
              </>
            )}
          </button>
        </div>

        {/* Additional Info (No border on top) */}
        {showAdditionalInfo && (
          <div className="mt-4">
            <p>
              <strong>ObjectId:</strong> {objectData?.ObjectId || 'Unknown'}
            </p>
            <p>
              <strong>Created:</strong>{' '}
              {objectData?.Created
                ? new Date(objectData.Created).toLocaleString('en-US', { hour12: true })
                : 'Unknown'}
            </p>
            {objectData?.Updated && objectData?.UpdatedBy && (
              <p>
                <strong>Updated:</strong>{' '}
                {objectData.Updated
                  ? `${new Date(objectData.Updated).toLocaleString('en-US', { hour12: true })} by ${objectData.UpdatedBy?.UserName || 'Unknown'
                  }`
                  : 'Unknown'}
              </p>
            )}
            <p>
              <strong>Access:</strong> {accessControlLabel}
            </p>
          </div>
        )}


        {(objectData?.Type?.TypeName?.toLowerCase() === 'literature reference' || objectData?.Type?.TypeName?.toLowerCase() === 'publication') && objectData?.Reference && (
          <>
            <p><strong>Title:</strong> {objectData.Reference.Title || 'Unknown'}</p>
            <p><strong>Authors:</strong> {objectData.Reference.Authors || 'Unknown'}</p>
            <p><strong>Year:</strong> {objectData.Reference.Year || 'Unknown'}</p>
            <p><strong>Journal:</strong> {objectData.Reference.Journal || 'Unknown'}</p>
            <p><strong>Volume:</strong> {objectData.Reference.Volume || 'Unknown'}</p>
            <p><strong>Start Page:</strong> {objectData.Reference.StartPage || 'Unknown'}</p>
            <p><strong>End Page:</strong> {objectData.Reference.EndPage || 'Unknown'}</p>
            <p><strong>DOI:</strong> {objectData.Reference.DOI || 'Unknown'}</p>
            <p><strong>BibTeX:</strong> {objectData.Reference.BibTeX || 'Unknown'}</p>
          </>
        )}

        {(objectData?.Type?.TypeName?.toLowerCase() === 'composition' ||
          objectData?.Type?.TypeName?.toLowerCase() === 'calculation/computational composition') &&
          objectData?.Composition?.length > 0 && (
            <CompositionDetails compositionData={objectData.Composition} />
          )}
        {/* Actions: Edit & Delete */}
        {isOwner && (
          <div className="flex gap-4 mt-4">
            {/* Edit Button */}
            <Link
              to={`/edit/object/${encodeURIComponent(objectData?.Type?.TypeName.toLowerCase())}/${objectData?.ObjectId}`}
              className="flex items-center gap-2 text-blue-500 font-medium hover:text-blue-700 transition-all duration-200"
            >
              <FaEdit className="text-lg" />
              <span>Edit</span>
            </Link>

            {/* Delete Button */}
            <DeleteHandler
              objectId={objectData?.ObjectId}
              apiEndpoint={`${config.BASE_URL}api/delete_object`}
              onDeleteComplete={handleDeleteComplete}
              onDeleteError={handleDeleteError}
            >
              {/* Show delete error message if any */}
              {deleteError && (
                <div className="text-red-500 mt-2">
                  <strong>Error:</strong> {deleteError}
                </div>
              )}
              <div className="flex items-center gap-2 text-red-500 font-medium hover:text-red-700 transition-all duration-200 cursor-pointer">
                <FaTrash className="text-lg" />
                <span>Delete</span>
              </div>
            </DeleteHandler>
          </div>
        )}

      </div>
      {objectData?.HasHandover && <HandoverDetails objectId={objectId} />}
      {objectData?.Properties?.length > 0 && (
        <div className="property-table-container">
          <h3 className="property-title text-2xl font-bold text-red-600 mb-4 border-b-2 border-blue-700">
            {objectData?.Type?.TypeName?.toLowerCase() === 'ideas or experiment plans'
              ? 'Measurements'
              : 'Properties'}
          </h3>
          <table className="property-table w-full border-collapse">
            <thead>
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Value</th>
                <th>Comment</th>
                <th>Actions</th> {/* Add a column for actions */}
              </tr>
            </thead>
            <tbody>
              {objectData?.Properties?.map((prop, index) => (
                <tr key={index}>
                  <td>{prop?.type || 'N/A'}</td>
                  <td>{prop?.propertyname || 'N/A'}</td>
                  <td>{prop?.value || 'N/A'}</td>
                  <td>{prop?.comment || 'No comments'}</td>
                  <td className="flex gap-2">
                    {/* Edit Button */}
                    <Link
                      to={`/edit-property/${prop?.id}`}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <FaEdit className="text-lg" />
                      <span>Edit</span>
                    </Link>

                    {/* Delete Button */}
                    <DeleteProperty
                      propertyId={prop?.id} // Pass the correct property ID
                      propertyType={prop?.type} // Pass the property type (e.g., 'Float', 'String', etc.)
                      apiEndpoint={`${config.BASE_URL}api/delete_property`}
                      onDeleteComplete={(deletedId) => {
                        const updatedProperties = objectData.Properties.filter(
                          (property) => property.id !== deletedId
                        );
                        setObjectData({ ...objectData, Properties: updatedProperties });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add Download Button Below the Table */}
          <div className="mt-4">
            <DownloadPropertiesButton objectId={objectId} />
          </div>
        </div>
      )}

      {objectData?.Type?.TypeName?.toLowerCase() === "sample" && (
        <div className="sample-section-container bg-white p-6 rounded-lg shadow-md mb-6">
          <h2
            className="sample-section-title text-xl font-bold text-blue-700 mb-4 cursor-pointer"
            onClick={toggleSampleSection}
          >
            {isSampleSectionOpen
              ? "Hide Processing Steps for the Sample"
              : "Show Processing Steps for the Sample"}
          </h2>
          {isSampleSectionOpen && (
            <div className="sample-section-content">
              {/* Create Processing Step for the Sample */}
              <div className="processing-step-section mb-6">
                <AddProcessingStep
                  objectId={objectId} // Pass the current object ID
                  onStepAdded={() => {
                    fetchObjectData();
                    console.log("Processing step added successfully!");
                  }}
                />
              </div>

              {/* Split the Sample into Parts/Pieces */}
              <div className="split-sample-section mb-6">
                <SplitSample
                  objectId={objectId} // Pass the current object ID
                  onSplitComplete={(newSamples) => {
                    console.log("Newly created samples:", newSamples);
                    fetchObjectData();
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Associated Objects */}
      {objectData?.AssociatedObjects?.length > 0 && (
        <div className="associated-section relative">
          <div className="associated-header flex justify-between items-center mb-4">
            <h2
              className="associated-title text-xl font-bold text-blue-700 cursor-pointer"
              onClick={() => setIsAssociatedOpen(!isAssociatedOpen)}
            >
              Associated Objects{' '}
              <span className="badge bg-blue-600 text-white py-1 px-3 rounded-full">
                {objectData?.AssociatedObjects?.length}
              </span>
            </h2>
            <button
              onClick={() =>
                navigate(`/edit-associated-objects/${objectId}`, {
                  state: {
                    mainObjectId: objectId,
                    associatedObjects: objectData.AssociatedObjects.map((obj) => ({
                      ObjectLinkObjectId: obj.objectlinkobjectid || null,
                      ObjectName: obj.linkedobjectid__objectname || 'Unknown Object',
                      ObjectId: obj.linkedobjectid__objectid || null,
                      TypeName: obj.linkedobjectid__typeid__typename || 'Unknown Type',
                      RubricId: obj.linkedobjectid__rubricid || null,
                      RubricName: obj.linkedobjectid__rubricid__rubricname || 'Unknown Area',
                    })),
                  },
                })
              }
              className="bg-gradient-to-r from-orange-400 to-orange-600 text-white font-bold py-2 px-4 rounded shadow-md hover:from-orange-500 hover:to-orange-700 transition-transform transform hover:scale-105"
            >
              Edit Associated Objects
            </button>
          </div>

          {isAssociatedOpen && (
            <div>
              {/* Separate Measurements by Rubric Name */}
              {Object.entries(
                objectData.AssociatedObjects.reduce((grouped, obj) => {
                  const typeName = obj?.linkedobjectid__typeid__typename || 'Unknown Type';
                  const rubricName = obj?.linkedobjectid__rubricid__rubricname || 'Unknown Area';

                  if (typeName.toLowerCase() === 'composition') {
                    if (!grouped.measurements) grouped.measurements = {};
                    if (!grouped.measurements[rubricName]) grouped.measurements[rubricName] = [];
                    grouped.measurements[rubricName].push(obj);
                  } else {
                    if (!grouped.others) grouped.others = [];
                    grouped.others.push(obj);
                  }

                  return grouped;
                }, {})
              ).map(([group, data]) => {
                if (group === 'measurements') {
                  return Object.entries(data).map(([rubricName, items]) => (
                    <div key={rubricName} className="mb-6">
                      <div
                        className="flex justify-between items-center bg-blue-100 p-4 rounded-md shadow-sm mb-4 cursor-pointer hover:bg-blue-200 transition-all duration-150"
                        onClick={() =>
                          setMeasurementOpen((prev) => ({
                            ...prev,
                            [rubricName]: !prev[rubricName],
                          }))
                        }
                      >
                        <h3 className="text-md font-medium text-blue-800">{rubricName}</h3>
                        <span className="bg-blue-600 text-white text-sm font-semibold py-1 px-3 rounded-full shadow">
                          {items.length}
                        </span>
                      </div>

                      {measurementOpen[rubricName] && (
                        <div className="associated-grid grid grid-cols-1 md:grid-cols-2 gap-6">
                          {items.map((obj, index) => (
                            <div
                              key={index}
                              className="object-card bg-white p-4 rounded-lg shadow-lg border-l-4 border-blue-500"
                            >
                              <h3 className="font-bold text-xl text-blue-600 truncate">
                                <Link
                                  to={`/object/${obj?.linkedobjectid__objectid}`}
                                  className="hover:underline"
                                >
                                  {obj?.linkedobjectid__objectname || 'Unknown Object'}
                                </Link>
                              </h3>
                              <p>
                                <strong>Type:</strong>{' '}
                                {obj?.linkedobjectid__typeid__typename || 'Unknown'}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ));
                } else {
                  return (
                    <div key="others" className="mb-6">
                      <div className="associated-grid grid grid-cols-1 md:grid-cols-2 gap-6">
                        {data.map((obj, index) => (
                          <div
                            key={index}
                            className="object-card bg-white p-4 rounded-lg shadow-lg border-l-4 border-blue-500"
                          >
                            <h3 className="font-bold text-xl text-blue-600 truncate">
                              <Link
                                to={`/object/${obj?.linkedobjectid__objectid}`}
                                className="hover:underline"
                              >
                                {obj?.linkedobjectid__objectname || 'Unknown Object'}
                              </Link>
                            </h3>
                            <p>
                              <strong>Type:</strong>{' '}
                              {obj?.linkedobjectid__typeid__typename || 'Unknown'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
      )}


      {/* Referenced Objects */}
      {objectData?.ReferencedObjects?.length > 0 && (
        <>
          <h2
            className="referenced-title text-xl font-bold text-green-700 mb-4 cursor-pointer"
            onClick={() => setIsReferencedOpen(!isReferencedOpen)}
          >
            Referenced Objects <span className="badge-referenced bg-green-600 text-white py-1 px-3 rounded-full">{objectData?.ReferencedObjects?.length}</span>
          </h2>

          {isReferencedOpen && (
            <div className="referenced-grid grid grid-cols-1 md:grid-cols-2 gap-6">
              {objectData?.ReferencedObjects?.map((obj, index) => (
                <div key={index} className="object-card-referenced bg-white p-4 rounded-lg shadow-lg border-l-4 border-green-500">
                  <h3 className="font-bold text-xl text-green-600 truncate">
                    <Link
                      to={`/object/${obj?.objectid__objectid}`}
                      className="hover:underline"
                    >
                      {obj?.objectid__objectname || 'Unknown Object'}
                    </Link>
                  </h3>
                  <div>
                    <strong>Type:</strong> {obj?.objectid__typeid__typename || 'Unknown'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {/* Render IdeasAndExperimentsMeasurement if type matches */}
      {isIdeasOrExperiment && objectData?.AssociatedObjects?.length > 0 && (
        <div className="ideas-experiments-measurements-section mt-8">
          <IdeasAndExperimentsMeasurement objectId={objectId} />
        </div>
      )}
      {objectData?.Type?.TypeName === 'LSV (xlsx, csv, txt)' && objectData?.FileUrl && (
        <LsvsViewer filePath={`${config.BASE_URL}${objectData.FileUrl}`} />
      )}



      {/* Button Section */}
      <div className="flex flex-wrap justify-center mt-10 gap-4">
        <button
          onClick={goToWorkflowStatus}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:from-blue-600 hover:to-blue-800 transition-transform transform hover:scale-105"
        >
          <i className="fas fa-project-diagram"></i> View Workflow Status
        </button>

        {isSeccmType && (
          <button
            onClick={() => setIsLsvsOpen(!isLsvsOpen)}
            className="bg-gradient-to-r from-green-500 to-green-700 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:from-green-600 hover:to-green-800 transition-transform transform hover:scale-105"
          >

            {isLsvsOpen ? 'Hide LSVs Input' : 'Load LSVs'}
          </button>
        )}


        <button
          onClick={handleAddProperty}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-700 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:from-purple-600 hover:to-purple-800 transition-transform transform hover:scale-105"
        >
          <FaPlus className="text-lg" />
          <span>Add Property</span>
        </button>

        {/* Add Property Modal */}
        {showAddPropertyModal && (
          <AddPropertyModal
            onClose={() => setShowAddPropertyModal(false)}
            onSelectOption={handleModalSelect}
          />
        )}
        <button
          onClick={() => navigate(`/add-handover-form/${objectId}`)}
          className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-teal-700 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:from-teal-600 hover:to-teal-800 transition-transform transform hover:scale-105">
          <i className="fas fa-hands-helping"></i> Add Handover
        </button>

        <button
          onClick={() => setShowChooseUploadOption(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-700 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:from-yellow-600 hover:to-yellow-800 transition-transform transform hover:scale-105"
        >

          <i className="fas fa-link"></i> Add Associated Object
        </button>
        {objectData?.Type?.TypeName === 'Sample' && (
          <Link
            to={`/create/synthesis?projectTitle=${encodeURIComponent(objectData?.RubricNameUrl || '')}`}
            className="no-underline"
          >
            <button className="flex items-center gap-2 bg-gradient-to-r from-red-400 to-red-600 text-white px-5 py-2 rounded-lg shadow hover:from-orange-500 hover:to-orange-700 transition-transform transform hover:scale-105">
              <i className="fas fa-flask text-xl"></i>
              <span>Add Synthesis</span>
            </button>
          </Link>
        )}

      </div>

      {/* LSVs Input Form */}
      {isLsvsOpen && (
        <div className="lsvs-input-section bg-white p-4 rounded-lg shadow-lg mt-6">
          <LsvsInputForm onSubmit={handleLsvsSubmit} objectId={objectId} />
        </div>
      )}
      <br />
      {/* Conditional Buttons for 'Request for Synthesis' */}
      {(objectData?.Type?.TypeName === 'Request for Synthesis' || objectData?.Type?.TypeName === 'Ideas or experiment plans') && (
        <div className="flex flex-wrap justify-center gap-4">
          {/* Add Sample Button */}
          <Link
            to={`/create/sample?projectTitle=${encodeURIComponent(objectData?.RubricNameUrl || '')}`}
            className="no-underline"
          >
            <button className="flex items-center gap-2 bg-gradient-to-r from-orange-400 to-orange-600 text-white px-5 py-2 rounded-lg shadow hover:from-orange-500 hover:to-orange-700 transition-transform transform hover:scale-105">
              <i className="fas fa-vial text-xl"></i>
              <span>Add Sample</span>
            </button>
          </Link>

          {/* Add Comment Button */}
          <Link
            to={`/create/comment?rubricnameurl=${encodeURIComponent(objectData?.RubricNameUrl || '')}`}
            className="no-underline"
          >
            <button className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-5 py-2 rounded-lg shadow hover:from-yellow-500 hover:to-yellow-700 transition-transform transform hover:scale-105">
              <i className="fas fa-lightbulb text-xl"></i>
              <span>Add Comment</span>
            </button>
          </Link>

          {/* Create Request for Synthesis Button (Only for Ideas or Experiment Plans) */}
          {objectData?.Type?.TypeName === 'Ideas or experiment plans' && (
            <Link
              to={`/create/Request for Synthesis?parentId=${encodeURIComponent(objectData?.RubricNameUrl || '')}`}
              className="no-underline"
            >
              <button className="flex items-center gap-2 bg-gradient-to-r from-blue-400 to-blue-600 text-white px-5 py-2 rounded-lg shadow hover:from-blue-500 hover:to-blue-700 transition-transform transform hover:scale-105">
                <i className="fas fa-flask text-xl"></i>
                <span>Create Request for Synthesis</span>
              </button>
            </Link>
          )}
        </div>
      )}

      {/* Choose Upload Option Modal */}
      {
        showChooseUploadOption && (
          <ChooseUploadOptionModal
            onClose={() => setShowChooseUploadOption(false)}
            onSelectOption={(option) => {
              setShowChooseUploadOption(false);

              if (option === 'ListEditor') {
                // Handle ListEditor option
                if (objectData?.RubricNameUrl) {
                  navigate(`/list-of-objects/${encodeURIComponent(objectData.RubricNameUrl)}?objectId=${encodeURIComponent(objectId)}`);
                } else {
                  console.error("RubricNameUrl is missing.");
                  alert("Error: RubricNameUrl is not available for navigation.");
                }
              } else if (option === 'DragDropUpload') {
                // Handle DragDropUpload option
                if (objectData?.RubricNameUrl) {
                  let url = `/create/upload_files?rubricnameurl=${encodeURIComponent(objectData.RubricNameUrl)}`;
                  if (objectId) {
                    url += `&objectId=${encodeURIComponent(objectId)}`;
                  }
                  console.log("Navigating to URL:", url); // Debugging
                  navigate(url);
                } else {
                  console.error("RubricNameUrl is missing.");
                  alert("Error: RubricNameUrl is not available for navigation.");
                }
                navigate(url);
              } else if (option === 'AddFromSaved') {
                if (objectData?.RubricNameUrl) {
                  navigate(`/edit-associated-objects/${objectId}`, {
                    state: {
                      mainObjectId: objectId,
                      rubricNameUrl: objectData.RubricNameUrl,
                      associatedObjects: objectData.AssociatedObjects.map((obj) => ({
                        ObjectLinkObjectId: obj.objectlinkobjectid || null,
                        ObjectName: obj.linkedobjectid__objectname || 'Unknown Object',
                        ObjectId: obj.linkedobjectid__objectid || null,
                        TypeName: obj.linkedobjectid__typeid__typename || 'Unknown Type',
                        RubricId: obj.linkedobjectid__rubricid || null,
                        RubricName: obj.linkedobjectid__rubricid__rubricname || 'Unknown Area',
                      })),
                    },
                  });
                } else {
                  console.error("RubricNameUrl is missing for associated objects.");
                }
              }
            }}
          />

        )
      }

    </div>

  );
}

export default ObjectDetail;