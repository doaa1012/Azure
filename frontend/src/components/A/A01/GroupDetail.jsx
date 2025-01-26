import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaPlus, FaFileUpload, FaBoxOpen, FaEye, FaEyeSlash } from 'react-icons/fa';
import jwt_decode from 'jwt-decode';
import DragDropFileUpload from '../../Create_object/UploadFile';
import { FaEdit, FaTrash } from 'react-icons/fa';
import DeleteHandler from '../../edit_delete/DeleteHandler';
import config from '../../../config_path';
function GroupDetail() {
  const { RubricNameUrl } = useParams();
  const [groupedData, setGroupedData] = useState({});
  const [openSection, setOpenSection] = useState('');
  const [openSubgroup, setOpenSubgroup] = useState({});
  const [showUpload, setShowUpload] = useState(false);
  const [showUserItemsOnly, setShowUserItemsOnly] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [rubricName, setRubricName] = useState(''); // Store the Rubric Name
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

  useEffect(() => {
    const token = localStorage.getItem('token'); // Retrieve token from local storage
    const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  
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
          // Assuming Rubric Name is the same for all objects
          setRubricName(data[0]?.['Rubric Name'] || RubricNameUrl); // Use RubricNameUrl as a fallback
        }
  
        const categorizedData = {};
        data.forEach((obj) => {
          obj.Objects.forEach((innerObj) => {
            const typeName = innerObj?.['Type Info']?.['Type Name'] || 'Unknown Type';
            if (typeName.toLowerCase() === 'composition') {
              const measurementArea = extractMeasurementArea(obj['Rubric Path']);
  
              if (!categorizedData[typeName]) categorizedData[typeName] = {};
              if (!categorizedData[typeName][measurementArea]) categorizedData[typeName][measurementArea] = [];
  
              categorizedData[typeName][measurementArea].push({
                'Rubric ID': obj['Rubric ID'],
                'Object ID': innerObj['Object ID'],
                'Rubric Path': obj['Rubric Path'],
                Objects: [innerObj],
                'Linked Objects': obj['Linked Objects'] || [],
              });
            } else {
              if (!categorizedData[typeName]) categorizedData[typeName] = [];
              categorizedData[typeName].push({
                'Rubric ID': obj['Rubric ID'],
                'Object ID': innerObj['Object ID'],
                'Rubric Path': obj['Rubric Path'],
                Objects: [innerObj],
                'Linked Objects': obj['Linked Objects'] || [],
              });
            }
          });
        });
        setGroupedData(categorizedData);
      })
      .catch((error) => console.error('Error fetching group data:', error));
  }, [RubricNameUrl]);
  
  // Helper function to extract the measurement area from the rubric path
 const extractMeasurementArea = (rubricPath) => {

    // Match the number followed by "Measurement Areas"
    const matches = rubricPath.match(/\b\d+\b\sMeasurement\sAreas/);
    return matches ? matches[0] : 'Unknown Area';
  };

  const toggleSection = (typeName) => setOpenSection(prevSection => (prevSection === typeName ? '' : typeName));

  const toggleSubgroup = (measurementArea) => setOpenSubgroup(prevState => ({
    ...prevState,
    [measurementArea]: !prevState[measurementArea]
  }));

  return (
    <div className="p-10 min-h-screen bg-blue-50">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-10 capitalize">
      {rubricName.toUpperCase()} Details
      </h1>

      <button
        onClick={() => setShowUserItemsOnly(!showUserItemsOnly)}
        className={`flex items-center gap-2 px-5 py-2 rounded-lg transition mb-5 ${showUserItemsOnly ? 'bg-red-600 text-white' : 'bg-purple-600 text-white hover:bg-purple-500'
          }`}
      >
        {showUserItemsOnly ? <FaEyeSlash /> : <FaEye />}
        <span>{showUserItemsOnly ? 'Show All Items' : 'Show My Items'}</span>
      </button>

      {Object.keys(groupedData).length === 0 ? (
        <p className="text-center text-lg text-gray-500">No data available for this group.</p>
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
                            <Link
                              to={`/object/${obj["Object ID"]}`}
                              className="text-blue-500 hover:text-blue-700"
                            >
                              {obj.Objects[0]?.["Object Name"] || "Unknown Measurement"}
                            </Link>
                          </h3>
                          {showUserItemsOnly && obj.Objects[0]?.created_by === currentUser && (
                            <div className="flex gap-2 justify-center mt-2">
                              <Link
                                to={`/edit/object/${encodeURIComponent(typeName.toLowerCase())}/${obj["Object ID"]}`}
                                className="text-blue-500 hover:text-blue-700 flex items-center gap-2 underline"
                              >
                                <FaEdit className="text-sm" />
                                Edit
                              </Link>
                              <DeleteHandler
                                objectId={obj["Object ID"]}
                                apiEndpoint={`${config.BASE_URL}api/delete_object`}
                                onDeleteComplete={(deletedId) => {
                                  // Refresh data or notify the user after deletion
                                  console.log(`Object with ID ${deletedId} deleted.`);
                                  // Add logic to refresh the UI or remove the deleted item
                                }}
                              />

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
                      <Link to={`/object/${obj["Object ID"]}`} className="hover:text-blue-500">
                        {obj.Objects[0]?.["Object Name"] || "Unknown Object"}
                      </Link>
                    </h3>
                    {showUserItemsOnly && obj.Objects[0]?.created_by === currentUser && (
                      <div className="flex gap-2 justify-center mt-2">
                        <Link
                          to={`/edit/object/${encodeURIComponent(typeName.toLowerCase())}/${obj["Object ID"]}`}
                          className="text-blue-500 hover:text-blue-700 flex items-center gap-2 underline"
                        >
                          <FaEdit className="text-sm" />
                          Edit
                        </Link>
                        <DeleteHandler
                          objectId={obj["Object ID"]}
                          apiEndpoint={`${config.BASE_URL}api/delete_object`}
                          onDeleteComplete={(deletedId) => {
                            // Refresh data or notify the user after deletion
                            console.log(`Object with ID ${deletedId} deleted.`);
                            // Add logic to refresh the UI or remove the deleted item
                          }}
                        />

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
      <div className="flex justify-center gap-5 mt-10">
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
        <div className="mt-10">
          <DragDropFileUpload objectnameurl={RubricNameUrl} />
        </div>
      )}

    </div>
  );
}

export default GroupDetail;
