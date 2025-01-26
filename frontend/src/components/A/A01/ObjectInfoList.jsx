import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import DragDropFileUpload from '../../Create_object/UploadFile';
import DeleteHandler from '../../edit_delete/DeleteHandler';
import config from '../../../config_path';
import { FaBoxOpen, FaPlus, FaFileUpload, FaFolderPlus, FaEye, FaClipboardList, FaEdit , FaTrash} from 'react-icons/fa';

import jwt_decode from 'jwt-decode';
import EditRubricButton from '../../edit_delete/EditRubricButton';
import DeleteRubricButton from '../../edit_delete/DeleteRubricButton';

function ObjectInfoList() {
  const [groupedData, setGroupedData] = useState({});
  const [relatedObjects, setRelatedObjects] = useState([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [viewUserItemsOnly, setViewUserItemsOnly] = useState(false);

  const { area } = useParams(); // Dynamic parameter from the route (e.g., A01, A02, etc.)
  const rubricPath = `Area ${area.charAt(0)}}${area}`; // Construct rubricPath dynamically based on the route parameter
  const navigate = useNavigate();
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
      console.log('Current User:', decoded.user_id);
      setCurrentUser(decoded.user_id);
      decodedUserId = decoded.user_id; // Store decoded user ID for use in the request
    }
  
    console.log('Rubric Path:', rubricPath);
  
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
          console.log('API Response Data:', data);
  
          const rubricData = data.rubric_data || [];
          const objectData = data.object_data || [];
  
          console.log('Rubric Data Received:', rubricData);
          console.log('Object Data Received:', objectData);
  
          if (!Array.isArray(rubricData) || !Array.isArray(objectData)) {
            console.error('Invalid API response structure:', { rubricData, objectData });
            return;
          }
  
          // Group rubric data
          const grouped = rubricData.reduce((acc, obj) => {
            const path = obj.RubricPath?.toLowerCase();
            const normalizedRubricPath = rubricPath.toLowerCase();
  
            if (path && path.includes(`${normalizedRubricPath}}`)) {
              const key = path.split(`${normalizedRubricPath}}`)[1]?.split('}')[0];
              if (key) {
                if (!acc[key]) {
                  acc[key] = [];
                }
                acc[key].push({
                  ...obj,
                  created_by: obj.CreatedBy,
                });
              } else {
                console.warn('Failed to extract key from RubricPath:', path);
              }
            } else {
              console.warn('RubricPath does not match the expected format:', {
                path,
                normalizedRubricPath,
              });
            }
            return acc;
          }, {});
  
          console.log('Grouped Rubric Data:', grouped);
  
          // Filter objects based on access control
          const filteredObjectData = objectData.filter(obj => 
            obj.AccessControl === 0 || // Public objects
            obj.AccessControl === 1 || // Protected objects
            obj.AccessControl === 2 || // Protected NDA objects
            (obj.AccessControl === 3 && obj.CreatedBy === decodedUserId) // Private objects visible only to the creator
          );
  
          console.log('Filtered Object Data:', filteredObjectData);
  
          setGroupedData(grouped);
          setRelatedObjects(filteredObjectData); // Store filtered objects
          setProjectTitle(area); // Set project title dynamically
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
    <div className="p-10 bg-blue-50 min-h-screen font-sans">
      <h1 className="text-center text-3xl font-bold text-gray-800 mb-10">
      Project Overview for {projectTitle.toUpperCase()}
      </h1>

      <div className="flex justify-center gap-5 mb-5">
        <button
          className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-500 transition"
          onClick={() => setViewUserItemsOnly(!viewUserItemsOnly)}
        >
          <FaEye className="text-xl" />
          <span>{viewUserItemsOnly ? 'Show All Items' : 'Show My Items'}</span>
        </button>

        <Link to={`/handover-report?projectTitle=${encodeURIComponent(projectTitle)}`}>
    <button className="flex items-center gap-2 px-5 py-2 rounded-lg shadow-lg text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 transition transform hover:scale-105">
        <FaClipboardList className="text-xl" />
        <span>Handover Report</span>
    </button>
</Link>

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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {category.keys.map(key => (
                    filteredData[key]?.length > 0 && (
                      <div
                        key={key}
                        className={`bg-white rounded-lg p-5 shadow hover:shadow-lg transition transform hover:scale-105 text-center ${filteredData[key][0]?.created_by === currentUser ? `border-2 border-${category.color}-500` : ''}`}
                      >
                        <Link to={`/group/${encodeURIComponent(filteredData[key][0]?.RubricNameUrl)}`} className="no-underline">
                          <h3 className={`text-${category.color}-600 text-xl font-bold mb-3`}>{key}</h3>
                        </Link>

                        {viewUserItemsOnly && filteredData[key][0]?.created_by === currentUser && (
                          <div className="flex gap-2 justify-center mt-2">
                            <EditRubricButton rubricId={filteredData[key][0].RubricID} />
                            <DeleteRubricButton rubricId={filteredData[key][0].RubricID} onDelete={handleDelete} />
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {filteredObjects.map(obj => (
                  <div
                  key={obj.ObjectID}
                  className={`bg-white rounded-lg p-5 shadow hover:shadow-lg transition transform hover:scale-105 text-center ${obj.CreatedBy === currentUser ? 'border-2 border-red-500' : ''}`}
                >
                  <Link to={`/object/${obj.ObjectID}`} className="no-underline">
                    <h3 className="text-red-600 text-xl font-bold mb-3">{obj.ObjectName}</h3>
                  </Link>
                  <p className="text-sm text-gray-500">Type: {obj.TypeName}</p>
                
                  {/* Inline Edit and Delete Buttons */}
                  {viewUserItemsOnly && obj.CreatedBy === currentUser && (
                    <div className="flex gap-2 justify-center mt-2">
                     <Link
                      to={`/edit/object/${slugify(obj.TypeName)}/${obj.ObjectID}`}
                      className="text-blue-500 hover:text-blue-700 flex items-center gap-2 underline"
                    >
                      <FaEdit className="text-sm" />
                      Edit
                    </Link>

                      <DeleteHandler
                        objectId={obj.ObjectID}
                        apiEndpoint={`${config.BASE_URL}api/delete_object`}

                        onDeleteComplete={handleDeleteComplete}
                      >
                        <div className="text-red-500 hover:text-red-700 flex items-center gap-2 cursor-pointer">
                          <FaTrash className="text-sm" />
                          Delete
                        </div>
                      </DeleteHandler>
                    </div>
                  )}
                </div>
                
                ))}
              </div>
            </div>
          )}
          {/* Buttons for creating new items */}
          <div className="flex justify-center gap-5 mt-10">
            <Link to={`/create/new_container/${projectTitle}`} className="no-underline">
              <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-500 transition">
                <FaFolderPlus className="text-xl" />
                <span>Create a New Container</span>
              </button>
            </Link>
            <Link to={`/create/Ideas or experiment plans?rubricnameurl=${encodeURIComponent(projectTitle)}`} className="no-underline">
  <button className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2 rounded-lg hover:bg-orange-400 transition">
    <FaPlus className="text-xl" />
    <span>Ideas and Plans</span>
  </button>
</Link>

            <Link to={`/list-of-objects/${projectTitle}`} className="no-underline">
              <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-500 transition">
                <FaBoxOpen className="text-xl" />
                <span>Create a New Object Type</span>
              </button>
            </Link>
            <button
              className="flex items-center gap-2 bg-green-500 text-white px-5 py-2 rounded-lg hover:bg-green-400 transition"
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
    </div>
  );
}

export default ObjectInfoList;
