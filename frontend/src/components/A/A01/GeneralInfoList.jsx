import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaEye, FaEdit, FaFolderPlus, FaPlus, FaBoxOpen, FaFileUpload, FaClipboardList } from 'react-icons/fa';
import jwt_decode from 'jwt-decode';
import EditRubricButton from '../../edit_delete/EditRubricButton';
import DeleteRubricButton from '../../edit_delete/DeleteRubricButton';
import DragDropFileUpload from '../../Create_object/UploadFile';
import config from '../../../config_path';

function GeneralInfoList() {
  const [groupedData, setGroupedData] = useState({});
  const [relatedObjects, setRelatedObjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [viewUserItemsOnly, setViewUserItemsOnly] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const { area } = useParams();

  const predefinedAreas = ['INF', 'RTG', 'S', 'Z', 'Cross-Project Cooperations', 'General information', "Recycle Bin"];
  const normalizedArea = predefinedAreas.find(
    (predefined) => predefined.toLowerCase() === area?.trim().toLowerCase()
  ) || 'INF';

  const rubricPath = normalizedArea;
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

      if (!response.ok) throw new Error('Failed to recycle object');

      setRelatedObjects(prev => prev.filter(obj => obj.ObjectID !== objectId));
      console.log(`Object ${objectId} moved to Recycle Bin`);
    } catch (error) {
      console.error('Error recycling object:', error);
    }
  };

  // Decode JWT token to get user ID
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwt_decode(token);
      console.log('Decoded Token:', decoded);
      if (decoded.user_id) {
        setCurrentUser(decoded.user_id);
      } else {
        console.error('JWT does not contain user_id:', decoded);
      }
    } else {
      console.error('No token found in localStorage');
    }
  }, []);

  // Fetch rubric and object info only when user_id is available
  useEffect(() => {
    if (!rubricPath || !currentUser) return;

    console.log('Fetching data for rubricPath:', rubricPath, 'with user_id:', currentUser);

    fetch(`${config.BASE_URL}api/get-rubricinfo-by-path/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rubricpath: rubricPath,
        user_id: currentUser,
      }),
    })
      .then((response) => {
        console.log('API Response Status:', response.status);
        return response.json();
      })
      .then((data) => {
        console.log('API Response Data:', data);

        if (data.error) {
          console.error('API Error:', data.error);
          return;
        }

        const rubricData = data.rubric_data || [];
        const objectData = data.object_data || [];

        console.log('Rubric Data Received:', rubricData);
        console.log('Object Data Received:', objectData);

        const grouped = rubricData.reduce((acc, rubric) => {
          const path = rubric.RubricPath?.toLowerCase();
          const normalizedRubricPath = rubricPath.toLowerCase();

          if (path?.startsWith(`${normalizedRubricPath}}`)) {
            const key = path.split(`${normalizedRubricPath}}`)[1]?.split('}')[0]?.trim();
            if (key) {
              if (!acc[key]) acc[key] = [];
              acc[key].push({ ...rubric, created_by: rubric.CreatedBy });
            }
          }
          return acc;
        }, {});

        console.log('Grouped Rubric Data:', grouped);
        setGroupedData(grouped);

        const filteredObjects = objectData.filter((obj) =>
          rubricData.some((rubric) => rubric.RubricID === obj.RubricID)
        );

        console.log('Filtered Related Objects:', filteredObjects);
        setRelatedObjects(filteredObjects);
      })
      .catch((error) => {
        console.error('Error fetching rubric info:', error);
      });
  }, [rubricPath, currentUser]);


  const handleDelete = (rubricId) => {
    setGroupedData((prevGroupedData) => {
      const updatedData = Object.fromEntries(
        Object.entries(prevGroupedData).map(([key, items]) => [
          key,
          items.filter((item) => item.RubricID !== rubricId),
        ])
      );
      return updatedData;
    });
  };

  const filteredData = Object.fromEntries(
    Object.entries(groupedData).map(([key, items]) => [
      key,
      viewUserItemsOnly ? items.filter((item) => item.CreatedBy === currentUser) : items

    ])
  );

  const filteredObjects = viewUserItemsOnly
    ? relatedObjects.filter((obj) => obj.CreatedBy === currentUser)
    : relatedObjects;

  const hasUserItems =
    Object.values(filteredData).some((items) => items.length > 0) || filteredObjects.length > 0;

  return (
    <div className="p-10 bg-blue-50 min-h-screen font-sans">
      <h1 className="text-center text-3xl font-bold text-gray-800 mb-10">
        General Overview for {normalizedArea}
      </h1>

      <div className="flex justify-center gap-5 mb-5">
        <button
          className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-500 transition"
          onClick={() => setViewUserItemsOnly(!viewUserItemsOnly)}
        >
          <FaEye className="text-xl" />
          <span>{viewUserItemsOnly ? 'Show All Items' : 'Show My Items'}</span>
        </button>

      </div>

      {viewUserItemsOnly && !hasUserItems ? (
        <p className="text-center text-gray-500">No items found for the current user.</p>
      ) : (
        <>
          {Object.keys(filteredData).map((key) => (
            <div key={key} className="mt-10">
              <h2 className="text-2xl font-bold text-blue-600 mb-5">{key}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {filteredData[key]?.map((item) => (
                  <div
                    key={item.RubricID}
                    className={`bg-white rounded-lg p-5 shadow hover:shadow-lg transition transform hover:scale-105 text-center ${item.created_by === currentUser ? 'border-4 border-blue-500 bg-blue-100' : ''
                      }`}
                  >
                    <Link to={`/group/${encodeURIComponent(item.RubricNameUrl)}`} className="no-underline">
                      <h3 className="text-lg font-bold">{item.RubricName}</h3>
                    </Link>

                    {viewUserItemsOnly && item.created_by === currentUser && (
                      <div className="mt-2 flex gap-2 justify-center">
                        <EditRubricButton rubricId={item.RubricID} />
                        <DeleteRubricButton rubricId={item.RubricID} onDelete={handleDelete} />
                      </div>
                    )}


                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredObjects.length > 0 && (
            <div className="mt-10">
              <h2 className="text-2xl font-bold text-red-600 mb-5">Related Objects</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {filteredObjects.map((obj) => (
                  <div
                    key={obj.ObjectID}
                    className={`bg-white rounded-lg p-5 shadow hover:shadow-lg transition transform hover:scale-105 text-center ${obj.CreatedBy === currentUser ? 'border-4 border-green-500 bg-green-100' : ''
                      }`}
                  >
                    <Link to={`/object/${obj.ObjectID}`} className="no-underline">
                      <h3 className="text-red-600 text-lg font-bold">{obj.ObjectName}</h3>
                    </Link>
                    {viewUserItemsOnly && obj.CreatedBy === currentUser && (
                      <div className="mt-2 flex gap-2 justify-center">
                        <Link
                          to={`/edit/object/${encodeURIComponent(obj.TypeName)}/${obj.ObjectID}`}
                          className="text-blue-600 hover:text-white border border-blue-600 hover:bg-blue-600 px-3 py-1 rounded transition"
                        >
                          <FaEdit className="inline-block mr-1" />
                          Edit
                        </Link>

                        {normalizedArea !== 'Recycle Bin' && (
                          <button
                            className="text-red-600 hover:text-white bg-transparent hover:bg-red-600 border border-red-600 px-3 py-1 rounded transition"
                            onClick={() => handleRecycle(obj.ObjectID)}
                          >
                            <FaBoxOpen className="inline-block mr-1" />
                            Recycle
                          </button>
                        )}
                      </div>
                    )}


                  </div>
                ))}
              </div>

            </div>

          )}
        </>
      )}
      {/* Action Buttons at the Bottom */}
      <div className="flex flex-wrap justify-center gap-4 mt-16">
        <Link to={`/handover-report?projectTitle=${encodeURIComponent(normalizedArea)}`}>
          <button className="flex items-center gap-2 px-5 py-2 rounded-lg shadow-lg text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 transition transform hover:scale-105">
            <FaClipboardList className="text-xl" />
            <span>Handover Report</span>
          </button>
        </Link>

        <Link to={`/create/new_container/${normalizedArea}`} className="no-underline">
          <button className="flex items-center gap-2 bg-pink-600 text-white px-5 py-2 rounded-lg shadow hover:bg-pink-500 transition">
            <FaFolderPlus className="text-xl" />
            <span>Create a New Container</span>
          </button>
        </Link>

        <Link to={`/create/Ideas or experiment plans?rubricnameurl=${encodeURIComponent(normalizedArea)}`} className="no-underline">
          <button className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2 rounded-lg hover:bg-orange-400 transition">
            <FaPlus className="text-xl" />
            <span>Ideas and Plans</span>
          </button>
        </Link>

        <Link to={`/list-of-objects/${normalizedArea}`} className="no-underline">
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
          <DragDropFileUpload objectnameurl={normalizedArea} />
        </div>
      )}

    </div>
  );
}

export default GeneralInfoList;

