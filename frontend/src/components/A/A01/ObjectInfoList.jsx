import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import DragDropFileUpload from '../../Create_object/UploadFile';
import DeleteHandler from '../../edit_delete/DeleteHandler';
import config from '../../../config_path';
import { FaBoxOpen, FaPlus, FaFileUpload, FaFolderPlus, FaEye, FaClipboardList, FaEdit, FaTrash } from 'react-icons/fa';
import { linkObjectToRubric } from './linkObjectToRubric';
import LinkToRubricModal from './LinkToRubricModal';
import jwt_decode from 'jwt-decode';
import EditRubricButton from '../../edit_delete/EditRubricButton';
import DeleteRubricButton from '../../edit_delete/DeleteRubricButton';
import EditLinkModal from './EditLinkModal';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import { useTour } from '../../Tour/TourProvider';
function ObjectInfoList() {
  const [groupedData, setGroupedData] = useState({});
  const [relatedObjects, setRelatedObjects] = useState([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [viewUserItemsOnly, setViewUserItemsOnly] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { area } = useParams(); // Dynamic parameter from the route (e.g., A01, A02, etc.)
  const rubricPath = `Area ${area.charAt(0)}}${area}`; // Construct rubricPath dynamically based on the route parameter
  const navigate = useNavigate();
  const [rubricId, setRubricId] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkedObjects, setLinkedObjects] = useState([]);
  const [editLinkModalOpen, setEditLinkModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState({ link_id: null, sortcode: 0 });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

const { startTour } = useTour();
const waitForElements = (selectors, maxRetries = 10, delay = 300) => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      const missing = selectors.filter(sel => !document.querySelector(sel));
      if (missing.length === 0) {
        resolve();
      } else if (attempts < maxRetries) {
        attempts++;
        setTimeout(check, delay);
      } else {
        reject(`Elements not found: ${missing.join(', ')}`);
      }
    };
    check();
  });
};

const handleStartTour = () => {
  const allTargets = [
    '.project-overview-title',
    '.my-items-button',
    '.handover-button',
    '.category-card',
    '.related-object-card',
    '.btn-link-to-rubric',
    '.btn-create-container',
    '.btn-ideas-plans',
    '.btn-create-object',
    '.btn-upload-files'
  ];

  waitForElements(allTargets).then(() => {
    const steps = [
      {
        target: '.project-overview-title',
        content: 'This is the project overview for a specific research area.',
      },
      {
        target: '.my-items-button',
        content: 'Toggle between showing all items or only items you created.',
      },
      {
        target: '.handover-button',
        content: 'Access the handover report for item transfers.',
      },
      {
        target: '.category-card',
        content: 'Each tile represents a category of research objects or rubrics.',
      },
      {
        target: '.related-object-card',
        content: 'These are related objects connected to the current project.',
      },
      {
        target: '.btn-link-to-rubric',
        content: 'Link an existing object to this rubric.',
      },
      {
        target: '.btn-create-container',
        content: 'Create a new rubric container under this area.',
      },
      {
        target: '.btn-ideas-plans',
        content: 'Add your ideas or experiment plans to the system.',
      },
      {
        target: '.btn-create-object',
        content: 'Create a new object of any type in this research area.',
      },
      {
        target: '.btn-upload-files',
        content: 'Upload files and associate them with this rubric.',
      }
    ];
    startTour(steps);
  }).catch(error => {
    console.warn("Tour could not start:", error);
  });
};


  const handleOpenEditModal = (obj) => {
    console.log('Raw object received:', obj); // ADD THIS LINE

    const linkData = {
      link_id: obj.LinkId,
      sortcode: obj.SortCode,
    };


    console.log('Sending to modal:', linkData); // Keep this to verify

    setSelectedLink(linkData);
    setEditLinkModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditLinkModalOpen(false);
    setSelectedLink(null);
  };
  const handleDeleteLink = async (linkId) => {
    try {
      const response = await fetch(`${config.BASE_URL}api/delete-link/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkid: linkId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete link');
      }

      setLinkedObjects(prev => prev.filter(obj => obj.LinkId !== linkId));
      setConfirmDeleteId(null); // Clear confirmation state
      toast.success('Link deleted successfully');
    } catch (error) {
      console.error('Error deleting link:', error);
      toast.error(`Error: ${error.message}`);
    }
  };
  const handleRecycle = async (objectId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.BASE_URL}api/recycle-object/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ objectId }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to recycle object');

      toast.success('Object moved to Recycle Bin.');
      setRelatedObjects(prev => prev.filter(obj => obj.ObjectID !== objectId));
    } catch (error) {
      console.error('Recycle error:', error);
      toast.error(`Error: ${error.message}`);
    }
  };


  const slugify = (text) =>
    text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-") // Replace spaces with -
      .replace(/[^\w\-]+/g, "") // Remove all non-word chars
      .replace(/\-\-+/g, "-"); // Replace multiple - with single -

  const handleDeleteComplete = (deletedId) => {
    console.log(`Related Object with ID ${deletedId} deleted successfully.`);
    setRelatedObjects((prevObjects) =>
      prevObjects.filter((obj) => obj.ObjectID !== deletedId)
    );
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    let decodedUserId = null;

    // Decode token and set current user
    if (token) {
      const decoded = jwt_decode(token);
      //console.log('Decoded token:', decoded);
      //console.log('Current User:', decoded.user_id);
      setCurrentUser(decoded.user_id);
      decodedUserId = decoded.user_id; // Store decoded user ID for use in the request

      if (
        decoded.role === 'Administrator' ||
        decoded.is_admin === true ||
        decoded?.claims?.includes('Admin') ||
        decoded?.claims?.some(claim => claim === 'Administrator')
      ) {
        setIsAdmin(true);
        console.log('User is admin');
      }
    }

    //console.log('Rubric Path:', rubricPath);

    // Only send the request if the user ID is available
    if (decodedUserId) {
      fetch(`${config.BASE_URL}api/get-rubricinfo-by-path/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rubricpath: rubricPath, user_id: decodedUserId }), // Include user_id in the request
      })
        .then(response => {
          console.log('API Response Status:', response.status);
          return response.json();
        })
        .then(data => {
          const rubricData = data.rubric_data || [];
          const objectData = data.object_data || [];
          const linkedObjectData = data.linked_object_data || [];

          if (rubricData.length > 0) {
            setRubricId(rubricData[0].RubricID);
          }

          if (!Array.isArray(rubricData) || !Array.isArray(objectData) || !Array.isArray(linkedObjectData)) {
            console.error('Invalid API response structure:', { rubricData, objectData, linkedObjectData });
            return;
          }

          //  Group rubric data
          const grouped = rubricData.reduce((acc, obj) => {
            const path = obj.RubricPath?.toLowerCase();
            const normalizedRubricPath = rubricPath.toLowerCase();

            if (path && path.includes(`${normalizedRubricPath}}`)) {
              const key = path.split(`${normalizedRubricPath}}`)[1]?.split('}')[0];
              if (key) {
                if (!acc[key]) acc[key] = [];
                acc[key].push({
                  ...obj,
                  created_by: obj.CreatedBy,
                });
              }
            }
            return acc;
          }, {});

          //  Filter object and linked object access
          const filteredObjectData = objectData.filter(obj =>
            obj.AccessControl === 0 ||
            obj.AccessControl === 1 ||
            obj.AccessControl === 2 ||
            (obj.AccessControl === 3 && obj.CreatedBy === decodedUserId)
          );

          const filteredLinkedObjectData = linkedObjectData.filter(obj =>
            obj.AccessControl === 0 ||
            obj.AccessControl === 1 ||
            obj.AccessControl === 2 ||
            (obj.AccessControl === 3 && obj.CreatedBy === decodedUserId)
          );

          //  Set state
          setGroupedData(grouped);
          setRelatedObjects(filteredObjectData);
          setLinkedObjects(filteredLinkedObjectData);
          setProjectTitle(area);

        })
        .catch(error => {
          console.error('Error fetching rubric info:', error);
        });
    } else {
      console.error('User ID is not available. Request aborted.');
    }
  }, [rubricPath, area]);



  const handleDelete = (rubricId) => {
    setGroupedData(prevGroupedData => {
      const updatedData = Object.fromEntries(
        Object.entries(prevGroupedData).map(([key, items]) => [
          key,
          items.filter(item => item.RubricID !== rubricId),
        ])
      );
      return updatedData;
    });
  };

  const preliminaryWork = [];
  const studies = [];
  const otherCategories = [];

  Object.keys(groupedData).forEach(key => {
    if (key.toLowerCase().includes('preliminary work')) {
      preliminaryWork.push(key);
    } else if (key.toLowerCase().includes('study')) {
      studies.push(key);
    } else {
      otherCategories.push(key);
    }
  });

  const filteredData = Object.fromEntries(
    Object.entries(groupedData).map(([key, items]) => [
      key,
      viewUserItemsOnly
        ? items.filter(item => item.created_by === currentUser)
        : items,
    ])
  );

  const filteredObjects = viewUserItemsOnly
    ? relatedObjects.filter(obj => obj.CreatedBy === currentUser)
    : relatedObjects;

  const hasUserItems = Object.values(filteredData).some(items => items.length > 0) || filteredObjects.length > 0;

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 md:px-10 bg-blue-50 min-h-screen font-sans overflow-hidden">
      <br />


     <h1 className="project-overview-title text-center text-3xl font-bold text-gray-800 mb-10">

        Project Overview for {projectTitle.toUpperCase()}
      </h1>

      <div className="flex justify-center gap-5 mb-5">
        <button
          className="my-items-button flex items-center gap-2 bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-500 transition"
          onClick={() => setViewUserItemsOnly(!viewUserItemsOnly)}
        >
          <FaEye className="text-xl" />
          <span>{viewUserItemsOnly ? 'Show All Items' : 'Show My Items'}</span>
        </button>

        <Link to={`/handover-report?projectTitle=${encodeURIComponent(projectTitle)}`}>
          <button className="handover-button flex items-center gap-2 px-5 py-2 rounded-lg shadow-lg text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 transition transform hover:scale-105">
            <FaClipboardList className="text-xl" />
            <span>Handover Report</span>
          </button>
        </Link>
<button
  className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-500 transition"
  onClick={handleStartTour}
>
  <FaEye className="text-xl" />
  <span>Start Tour</span>
</button>

      </div>

      {viewUserItemsOnly && !hasUserItems ? (
        <p className="text-center text-gray-500">No items found for the current user.</p>
      ) : (
        <>
          {/* Categories Rendering */}
          {[{ title: 'Preliminary Work', keys: preliminaryWork, color: 'blue' },
          { title: 'Studies', keys: studies, color: 'orange' },
          { title: 'Other Categories', keys: otherCategories, color: 'green' }].map(category => (
            category.keys.length > 0 && (
              <div key={category.title} className="mt-10">
                <h2 className={`text-2xl font-bold text-${category.color}-600 mb-5`}>{category.title}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">

                  {category.keys.map(key => (
                    filteredData[key]?.length > 0 && (
                      <div
                        key={key}
                        className={`category-card bg-white rounded-lg p-5 shadow hover:shadow-lg transition transform hover:scale-105 text-center ${filteredData[key][0]?.created_by === currentUser ? `border-2 border-${category.color}-500` : ''}`}
                      >
                        <Link to={`/group/${encodeURIComponent(filteredData[key][0]?.RubricNameUrl)}`} className="no-underline">

                          <h3 className={`text-${category.color}-600 text-sm sm:text-base md:text-lg font-bold break-words whitespace-normal leading-tight`}>{key.toUpperCase()}</h3>
                        </Link>

                        {((viewUserItemsOnly && filteredData[key][0]?.created_by === currentUser) || isAdmin) && (
                          <div className="flex gap-2 justify-center mt-2">
                            {filteredData[key][0]?.created_by === currentUser && (
                              <EditRubricButton rubricId={filteredData[key][0].RubricID} />

                            )}
                            {isAdmin && (
                              <DeleteRubricButton rubricId={filteredData[key][0].RubricID} onDelete={handleDelete} />
                            )}
                          </div>

                        )}

                      </div>
                    )
                  ))}
                </div>
              </div>
            )
          ))}

          {/* Related Objects Rendering */}
          {filteredObjects.length > 0 && (
            <div className="mt-10">
              <h2 className="text-2xl font-bold text-red-600 mb-5">Related Objects</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">

                {filteredObjects.map(obj => (
                  <div
                    key={obj.ObjectID}
                    className={`related-object-card bg-white rounded-lg p-5 shadow hover:shadow-lg transition transform hover:scale-105 text-center ${obj.CreatedBy === currentUser ? 'border-2 border-red-500' : ''}`}
                  >
                    <Link to={`/object/${obj.ObjectID}`} className="no-underline">
                      <h3 className="text-red-600 text-xl font-bold mb-3 break-words whitespace-normal">{obj.ObjectName}</h3>
                    </Link>
                    <p className="text-sm text-gray-500">Type: {obj.TypeName}</p>

                    {/* Inline Edit and Delete Buttons */}
                    {viewUserItemsOnly && obj.CreatedBy === currentUser && (
                      <div className="flex gap-2 justify-center mt-2">
                        <Link
                          to={`/edit/object/${slugify(obj.TypeName)}/${obj.ObjectID}`}
                          className="text-blue-500 hover:text-blue-700 flex items-center gap-2"
                        >
                          <FaEdit className="text-sm" />
                          Edit
                        </Link>

                        {/* <DeleteHandler
                    objectId={obj.ObjectID}
                    apiEndpoint={`${config.BASE_URL}api/delete_object`}
                  onDeleteComplete={handleDeleteComplete}
                    >
                 <div className="text-red-500 hover:text-red-700 flex items-center gap-2 cursor-pointer">
                <FaTrash className="text-sm" />
                         Delete
                 </div>
                </DeleteHandler> */}

                        <button
                          className="text-red-500 hover:text-red-700 hover:bg-gray-100 px-2 py-1 rounded flex items-center gap-2 cursor-pointer transition-all duration-200"
                          onClick={() => handleRecycle(obj.ObjectID)}
                        >
                          <FaTrash className="text-sm" />
                          Recycle
                        </button>


                      </div>
                    )}
                  </div>

                ))}
                {/* Linked objects */}
                {linkedObjects.map(obj => (
                  <div
                    key={`linked-${obj.ObjectID}`}
                    className={`bg-white rounded-lg p-5 shadow hover:shadow-lg transition transform hover:scale-105 text-center ${obj.CreatedBy === currentUser ? 'border-2 border-green-500' : ''}`}
                  >
                    <Link to={`/object/${obj.ObjectID}`} className="no-underline">
                      <h3 className="text-green-600 text-xl font-bold mb-3 break-words whitespace-normal">{obj.ObjectName}</h3>
                    </Link>
                    <p className="text-sm text-gray-500">Type: {obj.TypeName}</p>

                    {/* Adjust Link Button */}
                    {obj.LinkCreatedBy === currentUser && (
                      <div className="flex gap-2 justify-center mt-2">
                        <button
                          className="text-indigo-600 hover:text-white bg-transparent hover:bg-indigo-600 border border-indigo-600 px-2 py-1 rounded transition-colors duration-200"

                          onClick={() => handleOpenEditModal(obj)}

                        >
                          <FaEdit className="text-sm" />
                          Adjust Link
                        </button>

                        {confirmDeleteId === obj.LinkId ? (
                          <div className="flex flex-col items-center text-sm mt-1">
                            <p className="text-gray-600 mb-1">
                              Are you sure you want to delete the link to <strong>{obj.ObjectName}</strong>?
                            </p>
                            <div className="flex gap-3">
                              <button
                                className="text-red-600 hover:text-white bg-transparent hover:bg-red-600 border border-red-600 px-2 py-1 rounded transition-colors duration-200"
                                onClick={() => handleDeleteLink(obj.LinkId)}
                              >
                                Confirm Delete
                              </button>
                              <button
                                className="text-gray-600 hover:text-white bg-transparent hover:bg-gray-500 border border-gray-500 px-2 py-1 rounded transition-colors duration-200"

                                onClick={() => setConfirmDeleteId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="text-red-600 hover:text-white bg-transparent hover:bg-red-600 border border-red-600 px-2 py-1 rounded transition-colors duration-200"

                            onClick={() => setConfirmDeleteId(obj.LinkId)}
                          >
                            <FaTrash className="text-sm" />
                            Delete Link
                          </button>
                        )}


                      </div>
                    )}
                  </div>
                ))}

                {editLinkModalOpen && selectedLink && (
                  <EditLinkModal
                    isOpen={editLinkModalOpen}
                    onClose={handleCloseEditModal}
                    linkObject={selectedLink}
                    onSave={() => {

                      setEditLinkModalOpen(false);

                      fetchRubricInfo();
                    }}
                  />
                )}
              </div>
            </div>
          )}
          {/* Buttons for creating new items */}
          <div className="flex justify-center gap-5 mt-10">
            <button
              onClick={() => setShowLinkModal(true)}
              className="btn-link-to-rubric flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg shadow hover:bg-green-500 transition"
            >
              <FaPlus className="text-xl" />
              <span>Link to Rubric</span>
            </button>
            {showLinkModal && <LinkToRubricModal isOpen={showLinkModal} onClose={() => setShowLinkModal(false)} rubricId={rubricId} />}

            <Link to={`/create/new_container/${projectTitle}`} className="no-underline">
              <button className="btn-create-container flex items-center gap-2 bg-pink-600 text-white px-5 py-2 rounded-lg shadow hover:bg-pink-500 transition">
                <FaFolderPlus className="text-xl" />
                <span>Create a New Container</span>
              </button>
            </Link>

            <Link to={`/create/Ideas or experiment plans?rubricnameurl=${encodeURIComponent(projectTitle)}`} className="no-underline">
              <button className="btn-ideas-plans flex items-center gap-2 bg-orange-500 text-white px-5 py-2 rounded-lg hover:bg-orange-400 transition">
                <FaPlus className="text-xl" />
                <span>Ideas and Plans</span>
              </button>
            </Link>

            <Link to={`/list-of-objects/${projectTitle}`} className="no-underline">
              <button className="btn-create-object flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-500 transition">
                <FaBoxOpen className="text-xl" />
                <span>Create a New Object Type</span>
              </button>
            </Link>
            <button
              className="btn-upload-files flex items-center gap-2 bg-green-500 text-white px-5 py-2 rounded-lg hover:bg-green-400 transition"
              onClick={() => setShowUpload(!showUpload)}
            >
              <FaFileUpload className="text-xl" />
              <span>Upload Files</span>
            </button>
          </div>
          {showUpload && (
            <div className="mt-10">
              <DragDropFileUpload objectnameurl={projectTitle} />
            </div>
          )}
        </>
      )}
      <ToastContainer />
    </div>
  );
}
export default ObjectInfoList;
