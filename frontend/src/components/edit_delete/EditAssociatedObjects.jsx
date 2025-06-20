import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import config from '../../config_path';
function EditAssociatedObjects() {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract `mainObjectId` and `associatedObjects` from location.state
  const mainObjectId = location.state?.mainObjectId;
  const associatedObjects = location.state?.associatedObjects || [];

  const [editedObjects, setEditedObjects] = useState([...associatedObjects]);
  const [rubrics, setRubrics] = useState([]);
  const [objectsToDelete, setObjectsToDelete] = useState([]);
  const [measurementOpen, setMeasurementOpen] = useState({});
  const [availableTypes, setAvailableTypes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedObjectType, setSelectedObjectType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const resultsPerPage = 10;
  const [isLoading, setIsLoading] = useState(false);

  // Validate `mainObjectId`
  useEffect(() => {
    if (!mainObjectId) {
      console.error('Main object ID is missing! Ensure it is passed in location.state.');
      navigate(-1); // Navigate back to the previous page
    }
  }, [mainObjectId, navigate]);

  // Fetch rubric options and object types on mount
  useEffect(() => {
    fetch(`${config.BASE_URL}api/rubrics/`)
      .then((response) => response.json())
      .then((fetchedRubrics) => setRubrics(fetchedRubrics))
      .catch((error) => console.error('Error fetching rubrics:', error));

    fetch(`${config.BASE_URL}api/get_typenames/`)
      .then((response) => response.json())
      .then((fetchedTypes) => setAvailableTypes(fetchedTypes))
      .catch((error) => console.error('Error fetching object types:', error));
  }, []);

  // Group objects by RubricName
  const groupedObjects = editedObjects.reduce((grouped, obj) => {
    const rubricName = obj.RubricName || 'Not Assigned';
    if (!grouped[rubricName]) {
      grouped[rubricName] = [];
    }
    grouped[rubricName].push(obj);
    return grouped;
  }, {});

  useEffect(() => {
    console.log('Edited Objects:', editedObjects);
    console.log('Objects to Delete:', objectsToDelete);
  }, [editedObjects, objectsToDelete]);
  

  const handleRemoveObject = (objectToRemove) => {
    // Log the object being removed for debugging
    console.log("Removing object:", objectToRemove);

    if (objectToRemove?.ObjectLinkObjectId) {
        // Track the link ID of the removed object
        setObjectsToDelete((prev) => [...prev, objectToRemove.ObjectLinkObjectId]);
    } else if (objectToRemove?.ObjectId) {
        // Use the ObjectId as a fallback to remove the link
        setObjectsToDelete((prev) => [...prev, objectToRemove.ObjectId]);
        console.warn(`ObjectLinkObjectId is missing, using ObjectId (${objectToRemove.ObjectId}) for removal.`);
    } else {
        console.error("Object does not have a valid ObjectLinkObjectId or ObjectId.");
    }

    // Update the editedObjects state by filtering out the removed object
    const updatedObjects = editedObjects.filter((obj) => obj.ObjectId !== objectToRemove.ObjectId);
    setEditedObjects(updatedObjects);

    // Debugging logs
    console.log("Updated Objects after removal:", updatedObjects);
    console.log("Objects to Delete after removal:", objectsToDelete);
};


  
const handleSaveChanges = () => {
  const updatedObjects = editedObjects.filter((editedObj) => {
      const originalObj = associatedObjects.find(
          (obj) => obj.ObjectId === editedObj.ObjectId
      );

      // Handle undefined or empty values for comparison
      const rubricChanged =
          (originalObj?.RubricId || "") !== (editedObj.RubricId || "");
      const typeChanged =
          (originalObj?.TypeName || "") !== (editedObj.TypeName || "");

      return !originalObj || rubricChanged || typeChanged;
  });

  // Log updated objects and objects to delete for debugging
  console.log("Updated Objects:", updatedObjects);
  console.log("Objects to Delete:", objectsToDelete);

  if (updatedObjects.length === 0 && objectsToDelete.length === 0) {
      alert("No changes detected to save.");
      return; // Exit if no changes are detected
  }

  const payload = {
      updatedObjects, // Modified objects
      objectsToDelete, // Objects to delete
      mainObjectId, // Main object being edited
  };

  console.log("Payload being sent to backend:", payload);

  setIsLoading(true); // Start loading spinner
  fetch(`${config.BASE_URL}api/update_associated_objects/`, {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`, // Include user token
      },
      body: JSON.stringify(payload),
  })
      .then((response) => {
          if (!response.ok) {
              throw new Error(`Failed to save changes: ${response.statusText}`);
          }
          return response.json();
      })
      .then((data) => {
          
          console.log("Save Response:", data);
          navigate(-1); // Navigate back to the previous page
      })
      .catch((error) => {
          console.error("Error saving changes:", error);
          alert("Failed to save changes. Please try again.");
      })
      .finally(() => {
          setIsLoading(false); // Stop loading spinner
      });
};

  // Handle search for objects
  const handleSearch = () => {
    if (!searchQuery && !selectedObjectType) {
      
      return;
    }

    const payload = {
      object_type: selectedObjectType || '',
      search_phrase: searchQuery || '',
      page: currentPage,
      page_size: resultsPerPage,
    };

    console.log('Search payload being sent:', payload);

    fetch(`${config.BASE_URL}api/search-associated-objects/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .then((data) => {
        setSearchResults(data.results || []);
        setTotalPages(data.total_pages || 1);
      })
      .catch((error) => console.error('Error searching objects:', error));
  };

  const handleAddObject = (object) => {
    if (editedObjects.some((obj) => obj.ObjectId === object.objectid)) {
      console.error('This object is already linked.');
      return;
    }

    const rubricId = editedObjects[0]?.RubricId || ''; // Use the first object's RubricId as a reference
    const newObject = {
      ObjectId: object.objectid,
      ObjectName: object.objectname,
      TypeName: object.typename,
      RubricId: rubricId, // Assign the same rubric as the main object
    };

    setEditedObjects([...editedObjects, newObject]);
  };

  // Handle pagination
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [currentPage]);

  return (
    <div className="edit-associated-objects-container bg-blue-50 p-10 min-h-screen">
      {isLoading && (
            <div className="loading-overlay">
                <div className="spinner" />
                <p>Saving changes, please wait...</p>
            </div>
        )}
      <h1 className="text-3xl font-bold text-blue-800 mb-8">Edit Associated Objects</h1>

      {/* Add New Objects Section */}
      <div className="add-objects-section mb-8 p-4 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold text-blue-700 mb-4">Add New Objects</h2>
        <div className="flex items-center gap-4 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search objects by name or description"
            className="border border-blue-300 rounded p-2 flex-grow"
          />
          <button
            onClick={() => {
              setCurrentPage(1); // Reset to the first page
              handleSearch();
            }}
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            Search
          </button>
        </div>
        <div className="mb-4">
          <label htmlFor="object-type" className="block text-blue-700 font-bold">
            Select Object Type:
          </label>
          <select
            id="object-type"
            value={selectedObjectType}
            onChange={(e) => {
              setSelectedObjectType(e.target.value);
              setCurrentPage(1); // Reset to the first page
              handleSearch();
            }}
            className="border border-blue-300 rounded p-2 w-full"
          >
            <option value="">Select a type</option>
            {availableTypes.map((type) => (
              <option key={type.typeid} value={type.typename}>
                {type.typename}
              </option>
            ))}
          </select>
        </div>

        {searchResults.length > 0 && (
          <div className="search-results mt-4">
            <h3 className="text-lg font-bold text-blue-700 mb-2">Search Results:</h3>
            {searchResults.map((result) => (
              <div
                key={result.objectid}
                className="result-item bg-blue-50 p-4 rounded mb-2 flex justify-between items-center"
              >
                <Link to={`/object/${result.objectid}`} className="text-blue-600 font-bold hover:underline">
                  {result.objectname || 'Unknown Object'}
                </Link>
                <button
                  onClick={() => handleAddObject(result)}
                  className="bg-green-600 text-white font-bold py-1 px-3 rounded"
                >
                  Add
                </button>
              </div>
            ))}
            <div className="pagination-controls mt-4">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="bg-blue-300 text-blue-700 font-bold py-1 px-3 rounded mr-2"
              >
                Previous
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="bg-blue-300 text-blue-700 font-bold py-1 px-3 rounded ml-2"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing Associated Objects */}
      {Object.keys(groupedObjects).map((rubricName) => (
        <div key={rubricName} className="mb-6">
          <div
            className="flex justify-between items-center bg-blue-100 p-4 rounded-lg shadow-sm mb-2 cursor-pointer hover:bg-blue-200"
            onClick={() =>
              setMeasurementOpen((prev) => ({
                ...prev,
                [rubricName]: !prev[rubricName],
              }))
            }
          >
            <h3 className="text-md font-medium text-blue-800">{rubricName}</h3>
            <span className="bg-blue-600 text-white text-sm font-semibold py-1 px-3 rounded-full shadow">
              {groupedObjects[rubricName].length}
            </span>
          </div>
          {measurementOpen[rubricName] && (
            <div className="associated-grid grid grid-cols-1 md:grid-cols-2 gap-6">
              {groupedObjects[rubricName].map((obj, index) => (
                <div
                  key={index}
                  className="associated-object-item bg-white p-4 rounded-lg shadow-md mb-4 border-l-4 border-blue-500"
                >
                  <h3 className="font-bold text-xl text-blue-600 truncate">
                    <Link to={`/object/${obj.ObjectId}`} className="hover:underline">
                      {obj.ObjectName || 'Unknown Object'}
                    </Link>
                  </h3>
                  <p>
                    <strong>Type:</strong> {obj.TypeName || 'Unknown'}
                  </p>
                  <button
                    onClick={() => handleRemoveObject(obj)} 
                    className="bg-red-600 text-white font-bold py-2 px-4 rounded mt-4"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
     {(editedObjects.length > 0 || objectsToDelete.length > 0) && (
  <button
    onClick={handleSaveChanges}
    className="bg-blue-600 text-white font-bold py-2 px-4 rounded mt-4"
  >
    Save Changes
  </button>
)}

    </div>
  );
}

export default EditAssociatedObjects;
