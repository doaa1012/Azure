import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { handleSubmit } from './submitObject';
import config from '../../config_path';
function FileProcessingPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract query parameters directly from the URL
  const queryParams = new URLSearchParams(location.search);
  const groupName = queryParams.get("groupName") || "";
  const objectnameurl = queryParams.get("objectnameurl") || "";
  const objectId = queryParams.get("objectId") || "";

  // Initial files from location.state (if they exist), otherwise default to an empty array
  const initialFiles = location.state?.files || [];

  // Debugging - Log initial parameters from URL and state
  console.log("Final GroupName:", groupName);
  console.log("Final ObjectNameURL:", objectnameurl);
  console.log("Final ObjectId:", objectId);
  console.log("Received Files from state:", initialFiles);

  const [files, setFiles] = useState(initialFiles);
  const [types, setTypes] = useState([]);
  const [rubrics, setRubrics] = useState([]);
  const [fileData, setFileData] = useState([]);
  const [accessControl, setAccessControl] = useState('protected');
  const [rubricId, setRubricId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [rubricName, setRubricName] = useState(groupName);

  console.log("Extracted ObjectNameURL from queryParams:", objectnameurl);

  // Convert objectnameurl to lowercase before sending the request
  useEffect(() => {
    if (objectnameurl) {
      const normalizedObjectNameURL = objectnameurl.toLowerCase(); // Ensure it's lowercase
      fetch(`${config.BASE_URL}api/get_rubric_from_objectnameurl/${normalizedObjectNameURL}/`)
        .then((response) => response.json())
        .then((data) => {
          console.log("Fetched rubric data:", data); // Debugging output for rubric data
          setRubricName(data.rubricname || groupName); // Fallback to groupName if no rubricname
        })
        .catch((error) => console.error('Error fetching rubric name:', error));
    }
  }, [objectnameurl, groupName]);
  

  useEffect(() => {
    axios.get(`${config.BASE_URL}api/typeinfo/`)
      .then(response => {
        setTypes(response.data);
        setFileData(
          files.map(file => ({
            file,
            type: getClosestType(file.name, response.data),
            sortCode: '',
          }))
        );
      })
      .catch(error => console.error("Error fetching types:", error));
  
    axios.get(`${config.BASE_URL}api/rubrics/`)
      .then(response => {
        setRubrics(response.data);
  
        // Debugging - Log fetched rubrics and the lowercase rubricnameurl
        console.log('Fetched rubrics:', response.data);
        console.log('Lowercased objectnameurl for matching:', objectnameurl.toLowerCase());
  
        // Find matching rubric using rubricnameurl
        const matchingRubric = response.data.find(
          rubric => rubric.rubricnameurl.toLowerCase() === objectnameurl.toLowerCase()
        );
  
        if (matchingRubric) {
          setRubricId(matchingRubric.rubricid);
          console.log('Matching rubric found:', matchingRubric);
        } else {
          console.warn('No matching rubric found for objectnameurl:', objectnameurl);
        }
      })
      .catch(error => console.error("Error fetching rubrics:", error));
  }, [files, objectnameurl]);
  

  const getClosestType = (fileName, types) => {
    let closestType = types[0]?.typename || '';
    let maxMatchLength = 0;

    types.forEach(type => {
      const typeNameLower = type.typename.toLowerCase();
      const fileNameLower = fileName.toLowerCase();

      if (fileNameLower.includes(typeNameLower)) {
        const matchLength = typeNameLower.length;
        if (matchLength > maxMatchLength) {
          maxMatchLength = matchLength;
          closestType = type.typename;
        }
      }
    });

    return closestType;
  };

  const handleTypeChange = (index, type) => {
    setFileData(prevData => {
      const updatedData = [...prevData];
      updatedData[index].type = type;
      return updatedData;
    });
  };

  const handleSortCodeChange = (index, value) => {
    setFileData(prevData => {
      const updatedData = [...prevData];
      updatedData[index].sortCode = value;
      return updatedData;
    });
  };

  const handleDeleteFile = (index) => {
    setFileData(prevData => prevData.filter((_, i) => i !== index));
  };

  const handleCreateObjects = async () => {
    const token = localStorage.getItem('token');

    if (!rubricId) {
      setErrorMessage("Error: No matching rubric found for the specified group.");
      return;
    }

    for (const fileObj of fileData) {
      const formData = {
        type: fileObj.type,
        rubricId,
        sortCode: fileObj.sortCode,
        accessControl,
        name: fileObj.file.name,
        url: '', // Customize URL if needed
        description: '',
        filePath: fileObj.file,
        objectId, // Pass objectId if it exists
      };

      await handleSubmit({
        formData,
        token,
        groupName,
        navigate,
        setErrorMessage,
      });
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-blue-50">
      <div className="shadow-lg rounded-lg p-8 w-full max-w-4xl bg-white">
        <h2 className="text-2xl font-semibold text-blue-800 mb-6">Objects to Create</h2>

        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {errorMessage}
          </div>
        )}

        <h3 className="text-lg font-semibold text-blue-700 mb-4">Files to Process</h3>
        
        {fileData.map((fileObj, index) => (
          <div key={index} className="flex items-center bg-blue-50 p-4 rounded-lg mb-4 shadow-md border border-blue-200">
            <div className="flex-1">
              <p className="font-medium text-blue-800 mb-2">{fileObj.file.name}</p>
              <div className="flex items-center mt-2 space-x-4">
                <div>
                  <label className="text-sm text-blue-500">Type:</label>
                  <select
                    className="border border-blue-300 rounded-md p-2 mt-1"
                    value={fileObj.type}
                    onChange={(e) => handleTypeChange(index, e.target.value)}
                  >
                    {types.map(type => (
                      <option key={type.typeid} value={type.typename}>{type.typename}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-blue-500">Sort Code:</label>
                  <input
                    type="number"
                    className="border border-blue-300 rounded-md p-2 mt-1 w-24"
                    value={fileObj.sortCode}
                    onChange={(e) => handleSortCodeChange(index, e.target.value)}
                  />
                </div>
              </div>
            </div>
            <button
              className="ml-4 text-red-500 hover:text-red-700 transition duration-200"
              onClick={() => handleDeleteFile(index)}
            >
              <i className="fas fa-trash-alt"></i> Delete
            </button>
          </div>
        ))}

        <h3 className="text-lg font-semibold text-blue-700 mt-6 mb-2">Common Properties</h3>
        <div className="flex items-center space-x-6 mb-4">
          <div>
            <label className="text-sm text-blue-500">Access Control (accessibility):</label>
            <select
              className="border border-blue-300 rounded-md p-2 mt-1 w-full"
              value={accessControl}
              onChange={(e) => setAccessControl(e.target.value)}
            >
             <option value="protected">Protected</option>
              <option value="public">Public</option>
              <option value="protectednda">Protectednda</option>
              <option value="private">Private</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-blue-500">Rubric:</label>
            <input
              type="text"
              className="border border-blue-300 rounded-md p-2 mt-1 w-full bg-blue-100 text-blue-700"
              value={rubricName || ''} 
              readOnly
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            className="bg-blue-500 text-white px-5 py-3 rounded-lg shadow hover:bg-blue-600 transition duration-200"
            onClick={handleCreateObjects}
          >
            Create Objects from Files
          </button>
        </div>
      </div>
    </div>
  );
}

export default FileProcessingPage;


