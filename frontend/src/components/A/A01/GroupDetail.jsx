import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaPlus, FaFileUpload, FaBoxOpen, FaEye, FaEyeSlash, FaEdit, FaFolderPlus, FaTrash } from 'react-icons/fa';
import jwt_decode from 'jwt-decode';
import DragDropFileUpload from '../../Create_object/UploadFile';
import DeleteHandler from '../../edit_delete/DeleteHandler';
import config from '../../../config_path';
import EditRubricButton from '../../edit_delete/EditRubricButton';
import DeleteRubricButton from '../../edit_delete/DeleteRubricButton';

function GroupDetail() {
  const { RubricNameUrl } = useParams();
  const [groupedData, setGroupedData] = useState({});
  const [openSection, setOpenSection] = useState('');
  const [openSubgroup, setOpenSubgroup] = useState({});
  const [showUpload, setShowUpload] = useState(false);
  const [showUserItemsOnly, setShowUserItemsOnly] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [rubricName, setRubricName] = useState('');
  const [subcontainers, setSubcontainers] = useState([]);
  const [subcontainersOpen, setSubcontainersOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwt_decode(token);
        setCurrentUser(decoded.user_id);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
  }, []);
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
  
      // Refresh UI after recycle
      fetchGroupData();
    } catch (error) {
      console.error('Recycle error:', error);
      alert(`Error recycling object: ${error.message}`);
    }
  };
  
  const fetchGroupData = () => {
    const token = localStorage.getItem('token');
    const headers = token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };

    fetch(`${config.BASE_URL}api/objectinfo/${encodeURIComponent(RubricNameUrl)}/`, {
      method: 'GET',
      headers,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error fetching data: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.length > 0) {
          const mainRubric = data.find(item => item['Rubric Name URL'] === RubricNameUrl);
          const mainData = data.filter(item => item['Rubric Name URL'] === RubricNameUrl);
          const subcontainers = data.filter(item => item['Rubric Name URL'] !== RubricNameUrl);

          if (mainRubric?.['Rubric Path']) {
            const pathParts = mainRubric['Rubric Path'].split('}').map(p => p.trim()).filter(Boolean);
            const level = mainRubric['Rubric Level'] ?? (pathParts.length - 1);
            setRubricName(pathParts[level] || pathParts[pathParts.length - 1]);
          } else {
            setRubricName(formatRubricNameUrl(RubricNameUrl));
          }

          setGroupedData(categorizeObjects(mainData));
          setSubcontainers(subcontainers);
        } else {
          setRubricName(formatRubricNameUrl(RubricNameUrl));
          setGroupedData({});
          setSubcontainers([]);
        }
      })
      .catch((error) => console.error('Error fetching group data:', error));
  };

  useEffect(() => {
    fetchGroupData();
  }, [RubricNameUrl]);

  const formatRubricNameUrl = (rubricNameUrl) => {
    return rubricNameUrl.replace(/-/g, ' ').replace(/\b\d+\b/g, '').trim();
  };

  const categorizeObjects = (data) => {
    const categorizedData = {};
    data.forEach((obj) => {
      obj.Objects.forEach((innerObj) => {
        const typeName = innerObj?.['Type Info']?.['Type Name'] || 'Unknown Type';
        if (typeName.toLowerCase() === 'composition') {
          const measurementArea = extractMeasurementArea(obj['Rubric Path']);
          if (!categorizedData[typeName]) categorizedData[typeName] = {};
          if (!categorizedData[typeName][measurementArea]) categorizedData[typeName][measurementArea] = [];
          categorizedData[typeName][measurementArea].push({
            ...obj,
            Objects: [innerObj],
          });
        } else {
          if (!categorizedData[typeName]) categorizedData[typeName] = [];
          categorizedData[typeName].push({
            ...obj,
            Objects: [innerObj],
          });
        }
      });
    });
    return categorizedData;
  };

  const extractMeasurementArea = (rubricPath) => {
    const matches = rubricPath.match(/\b\d+\b\sMeasurement\sAreas/);
    return matches ? matches[0] : 'Unknown Area';
  };

  const toggleSection = (typeName) => setOpenSection(prev => (prev === typeName ? '' : typeName));
  const toggleSubgroup = (area) => setOpenSubgroup(prev => ({ ...prev, [area]: !prev[area] }));

  return (
    <div className="p-10 min-h-screen bg-blue-50">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-10 capitalize">
        {rubricName ? rubricName.toUpperCase() : RubricNameUrl.replace(/-/g, ' ').toUpperCase()} DETAILS
      </h1>

      <button
        onClick={() => setShowUserItemsOnly(!showUserItemsOnly)}
        className={`flex items-center gap-2 px-5 py-2 rounded-lg transition mb-5 ${showUserItemsOnly ? 'bg-red-600 text-white' : 'bg-purple-600 text-white hover:bg-purple-500'}`}
      >
        {showUserItemsOnly ? <FaEyeSlash /> : <FaEye />}
        <span>{showUserItemsOnly ? 'Show All Items' : 'Show My Items'}</span>
      </button>

      {subcontainers.length > 0 && (
        <div className="mt-10 mb-8">
          <div
            onClick={() => setSubcontainersOpen(prev => !prev)}
            className="flex justify-between items-center bg-blue-200 px-5 py-3 rounded-lg shadow cursor-pointer hover:bg-blue-300"
          >
            <h2 className="text-2xl font-bold text-gray-800">Subcontainers</h2>
            <span className="text-xl">{subcontainersOpen ? '▲' : '▼'}</span>
          </div>

          {subcontainersOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
              {subcontainers.map((sub, index) => {
                const userIsSubcontainerCreator = sub.CreatedBy === currentUser;
                const userOwnsObjectInSub = sub.Objects?.some(obj => obj.created_by === currentUser);
                const showSubcontainer = userIsSubcontainerCreator || userOwnsObjectInSub;

                if (showUserItemsOnly && !showSubcontainer) return null;

                return (
                  <div
                    key={index}
                    className="bg-white p-5 rounded-lg border-l-4 border-blue-400 shadow hover:shadow-md transition"
                  >
                    <Link
                      to={`/group/${encodeURIComponent(sub['Rubric Name URL'])}`}
                      className="block w-full text-lg font-semibold text-blue-600 hover:underline"
                    >
                      {sub['Rubric Name']}
                    </Link>
                    <p className="text-sm text-gray-500 mt-2">
                      {sub.Objects?.length || 0} object{sub.Objects?.length !== 1 ? 's' : ''}
                    </p>

                    {showUserItemsOnly && userIsSubcontainerCreator && (
                      <div className="flex gap-2 justify-center mt-3">
                        <EditRubricButton rubricId={sub['Rubric ID']} />
                        <DeleteRubricButton rubricId={sub['Rubric ID']} onDeleteComplete={fetchGroupData} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {Object.keys(groupedData).length === 0 && subcontainers.length === 0 ? (
        <p className="text-center text-lg text-gray-500 mt-8">No data available for this group.</p>
      ) : (
        Object.keys(groupedData).map((typeName, indexType) => (
          <div key={`${typeName}-${indexType}`} className="mb-6">
            <h2
              onClick={() => toggleSection(typeName)}
              className="flex justify-between items-center p-4 text-lg font-semibold text-blue-600 bg-blue-100 rounded-lg cursor-pointer hover:bg-blue-200"
            >
              {typeName}
              <span className="ml-2 px-2 py-1 text-sm font-bold text-white bg-gray-600 rounded-full">
                {Array.isArray(groupedData[typeName]) ? groupedData[typeName].length : Object.keys(groupedData[typeName]).length}
              </span>
            </h2>

            <div className={`${openSection === typeName ? 'grid' : 'hidden'} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4`}>
              {typeName.toLowerCase() === 'composition' &&
                Object.keys(groupedData[typeName]).map(measurementArea => (
                  <div key={measurementArea} className="mb-4">
                    <h3
                      onClick={() => toggleSubgroup(measurementArea)}
                      className="flex justify-between items-center p-3 text-lg font-medium text-gray-700 bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300"
                    >
                      {measurementArea}
                      <span className="ml-2 px-2 py-1 text-sm font-bold text-white bg-gray-500 rounded-full">
                        {groupedData[typeName][measurementArea].length}
                      </span>
                    </h3>

                    <div className={`${openSubgroup[measurementArea] ? 'grid' : 'hidden'} gap-4 mt-4`}>
                      {(showUserItemsOnly
                        ? groupedData[typeName][measurementArea].filter(item => item.Objects[0]?.created_by === currentUser)
                        : groupedData[typeName][measurementArea]
                      ).map((obj, indexObj) => (
                        <div key={`${obj["Rubric ID"]}-${indexObj}`} className="p-4 bg-white rounded-lg shadow-md border-l-4 border-blue-400 hover:shadow-lg">
                          <h3 className="text-lg font-semibold text-blue-600">
                            {obj.Objects?.[0]?.["Object ID"] ? (
                              <Link
                                to={`/object/${obj.Objects[0]["Object ID"]}`}
                                className="text-blue-500 hover:text-blue-700"
                              >
                                {obj.Objects[0]["Object Name"] || "Unknown Measurement"}
                              </Link>
                            ) : (
                              <span className="text-red-500">Invalid Object (missing ID)</span>
                            )}

                          </h3>
                          {showUserItemsOnly && obj.Objects[0]?.created_by === currentUser && (
                            <div className="flex gap-2 justify-center mt-2">
                              <Link
                                to={`/edit/object/${encodeURIComponent(typeName.toLowerCase())}/${obj["Object ID"]}`}
                                className="text-blue-500 hover:text-blue-700 flex items-center gap-2 "
                              >
                                <FaEdit className="text-sm" />
                                Edit
                              </Link>
                             {/* <DeleteHandler
                                objectId={obj["Object ID"]}
                                apiEndpoint={`${config.BASE_URL}api/delete_object`}
                                onDeleteComplete={(deletedId) => {
                                  // Refresh data or notify the user after deletion
                                  console.log(`Object with ID ${deletedId} deleted.`);
                                  // Add logic to refresh the UI or remove the deleted item
                                }}
                              />*/}
                              <button
                                onClick={() => handleRecycle(obj["Object ID"])}
                                className="text-blue-500 hover:text-blue-700 hover:bg-gray-100 px-2 py-1 rounded transition-all duration-200 flex items-center gap-2"
                              >
                                <FaEdit className="text-sm rotate-45" />
                                Recycle
                              </button>

                            </div>
                          )}
                        </div>
                      ))}
                      {showUserItemsOnly && groupedData[typeName][measurementArea].filter(item => item.Objects[0]?.created_by === currentUser).length === 0 && (
                        <p className="text-center text-sm text-gray-500">No items created by you in this section.</p>
                      )}
                    </div>
                  </div>
                ))
              }

              {typeName.toLowerCase() !== 'composition' &&
                (showUserItemsOnly
                  ? groupedData[typeName].filter(item => item.Objects[0]?.created_by === currentUser)
                  : groupedData[typeName]
                ).map((obj, index) => (
                  <div key={`${obj["Rubric ID"]}-${index}`} className={`p-4 bg-white rounded-lg shadow-md border-l-4 ${obj.Objects[0]?.created_by === currentUser ? 'border-green-400' : 'border-blue-400'} hover:shadow-lg`}>
                    <h3 className="text-lg font-semibold text-blue-600">
                      {obj.Objects?.[0]?.["Object ID"] ? (
                        <Link to={`/object/${obj.Objects[0]["Object ID"]}`}>
                          {obj.Objects[0]["Object Name"] || "Unnamed Object"}
                        </Link>
                      ) : (
                        <span className="text-red-500">Invalid Object (missing ID)</span>
                      )}



                    </h3>
                    {showUserItemsOnly && obj.Objects[0]?.created_by === currentUser && (
                      <div className="flex gap-2 justify-center mt-2">
                        <Link
                          to={`/edit/object/${encodeURIComponent(typeName.toLowerCase())}/${obj["Object ID"]}`}
                          className="text-blue-500 hover:text-blue-700 flex items-center gap-2 "
                        >
                          <FaEdit className="text-sm" />
                          Edit
                        </Link>
                        {/* <DeleteHandler
                          objectId={obj["Object ID"]}
                          apiEndpoint={`${config.BASE_URL}api/delete_object`}
                          onDeleteComplete={(deletedId) => {
                            // Refresh data or notify the user after deletion
                            console.log(`Object with ID ${deletedId} deleted.`);
                            // Add logic to refresh the UI or remove the deleted item
                          }}
                        />*/}
                      <button
                          onClick={() => handleRecycle(obj["Object ID"])}
                          className="flex items-center gap-2 text-red-500 font-medium hover:text-red-700 hover:bg-gray-100 px-2 py-1 rounded transition-all duration-200"
                        >
                           <FaTrash className="text-lg" />
                          Recycle
                        </button>
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          </div>
        ))
      )}

      {/* Buttons for category creation */}
      <div className="flex flex-wrap justify-center gap-4 mt-10">
        <Link to={`/create/new_container/${encodeURIComponent(RubricNameUrl)}`} className="no-underline">
          <button className="flex items-center gap-2 bg-pink-600 text-white px-5 py-2 rounded-lg shadow hover:bg-pink-500 transition">
            <FaFolderPlus className="text-xl" />
            <span>Create a New Subcontainer</span>
          </button>
        </Link>


        <Link to={`/list-of-objects/${RubricNameUrl}`} className="no-underline">
          <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-500">
            <FaBoxOpen className="text-xl" />
            <span>Create a New Object Type</span>
          </button>
        </Link>

        <Link to={`/create/sample?rubricnameurl=${encodeURIComponent(RubricNameUrl)}`} className="no-underline">
          <button className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2 rounded-lg shadow hover:bg-orange-400">
            <FaPlus className="text-xl" />
            <span>Add Sample</span>
          </button>
        </Link>

        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-2 bg-green-500 text-white px-5 py-2 rounded-lg shadow hover:bg-green-400"
        >
          <FaFileUpload className="text-xl" />
          <span>Upload Files</span>
        </button>
      </div>
      {showUpload && (
        <div className="mt-10 mb-8">

          <DragDropFileUpload objectnameurl={RubricNameUrl} />
        </div>
      )}

    </div>
  );
}

export default GroupDetail;
