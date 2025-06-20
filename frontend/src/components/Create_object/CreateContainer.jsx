import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';  // Assuming useAuth provides authentication
import config from '../../config_path';
function CreateChild() {
  const { url_parent } = useParams();  // Get the parent name directly from the URL
  const { userId, token } = useAuth();  // Fetch the userId and token from your authentication context
  
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');  // This will come from the backend
  const [sortCode, setSortCode] = useState('');
  const [accessControl, setAccessControl] = useState('protected');
  const [text, setText] = useState('');
  const [showMore, setShowMore] = useState(false);  // Set to false to collapse by default
  const [rubricName, setRubricName] = useState(url_parent.toUpperCase());  // Capitalize the parent name
  const [errorMessage, setErrorMessage] = useState("");
  const tenantId = 4;  // Set tenantId to default to 4
  const slugify = (str) => {
    return str.toLowerCase().replace(/\s+/g, '-'); // "Recycle Bin" -> "recycle-bin"
  };
  
  // Fetch rubric info based on the url_parent
  useEffect(() => {
    if (url_parent && url_parent !== 'root') {
      const safeUrl = slugify(url_parent);  // Convert to 'recycle-bin'
  
      fetch(`${config.BASE_URL}api/rubric-id/${safeUrl}/`)
        .then(response => response.json())
        .then(data => {
          console.log("Rubric ID Response:", data);
          setParentId(data.rubricid);
        })
        .catch(error => {
          console.error('Error fetching rubric:', error);
          setParentId('Unknown ID');
        });
    } else {
      setParentId(null);
      setRubricName('');
    }
  }, [url_parent]);
  

  const handleSubmit = (e) => {
    e.preventDefault();
  
    const accessControlValue =
      accessControl === "public"
        ? 0
        : accessControl === "protected"
        ? 1
        : accessControl === "protectedNDA"
        ? 2
        : 3; // For 'private'
  
    const token = localStorage.getItem("token"); // Retrieve token from localStorage
  
    if (!token) {
      setErrorMessage("Token is missing. Please ensure you are logged in.");
      console.error("Token is missing. Please ensure you are logged in.");
      return; // Stop the function execution if token is missing
    }
  
    console.log("Token:", token); // Debug log to check if the token is correctly retrieved
  
    const formData = {
      name,
      parent_id: parentId, // will be null for root
      sort_code: sortCode || 0,
      access_control: accessControlValue,
      text,
      tenant_id: tenantId,
      created_by: userId,
      updated_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      rubric_name: rubricName || name, // fallback to name if empty
    };
    
    fetch(`${config.BASE_URL}api/create_rubric/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Include the token here
      },
      body: JSON.stringify(formData),
    })
      .then(async (response) => {
        const data = await response.json(); // Extract response body as JSON
  
        if (!response.ok) {
          // Handle specific error cases
          if (response.status === 401) {
            setErrorMessage("Token error: You are not logged in or your session has expired.");
          } else if (response.status === 400 && data.error?.includes("already exists")) {
            setErrorMessage("Duplicate error: A rubric with this name already exists.");
          } else {
            setErrorMessage(data.error || "An unexpected error occurred.");
          }
          throw new Error("Form submission failed");
        }
  
        return data; // Return the JSON data for the next .then()
      })
      .then((data) => {
        if (data.id) {
          console.log("Rubric created successfully:", data);
          console.log("Redirecting to:", `/${url_parent}`);
  
          // Redirect to the main page for the parent node
          if (url_parent === 'root') {
            window.location.assign('/');  // Redirect to home
          } else {
            window.location.assign(`/${url_parent}`);
          }
          
          
        } else {
          console.error("Error creating new rubric:", data);
          setErrorMessage("An unexpected error occurred while creating the rubric.");
        }
      })
      .catch((error) => {
        console.error("Error submitting form:", error);
        if (!errorMessage) {
          setErrorMessage("An unexpected error occurred. Please try again.");
        }
      });
  };
  

  return (
    <div className="flex justify-center items-start min-h-screen bg-blue-50 py-10">
      <div className="bg-white shadow-lg rounded-lg p-10 w-full max-w-4xl">
        <h2 className="text-3xl font-bold text-blue-600 mb-6">
          Creating a Child for <span className="text-blue-500">{rubricName}</span> (ID: {parentId})
        </h2>
{/* Error Message */}
{errorMessage && (
          <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
            {errorMessage}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div>
            <label className="block text-lg font-medium text-blue-800">
              Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full p-4 bg-blue-50 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Enter name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <p className="text-sm text-gray-500 mt-1">Name of the node.</p>
          </div>

          {/* Toggle button for showing/hiding additional parameters */}
          <div
            className="text-blue-600 font-semibold cursor-pointer"
            onClick={() => setShowMore(!showMore)}
          >
            {showMore ? 'Hide more parameters' : 'Show more parameters'}
          </div>

          {showMore && (
            <>
              {/* Parent ID */}
              <div>
                <label className="block text-lg font-medium text-blue-800">
                  Parent Name (ID)
                </label>
                <input
                  type="text"
                  className="w-full p-4 bg-gray-100 border border-gray-300 rounded-lg cursor-not-allowed"
                  value={`${rubricName} (ID: ${parentId})`}
                  disabled
                />
                <p className="text-sm text-gray-500 mt-1">
                  This is the name and ID of the parent node.
                </p>
              </div>

              {/* Sort Code */}
              <div>
                <label className="block text-lg font-medium text-blue-800">
                  Sort Code
                </label>
                <input
                  type="number"
                  className="w-full p-4 bg-blue-50 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="Input sort code"
                  value={sortCode}
                  onChange={(e) => setSortCode(e.target.value)}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Children are sorted by this number (ascending).
                </p>
              </div>

              {/* Access Control */}
              <div>
                <label className="block text-lg font-medium text-blue-800">
                  Access Control
                </label>
                <select
                  className="w-full p-4 bg-blue-50 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={accessControl}
                  onChange={(e) => setAccessControl(e.target.value)}
                >
                  <option value="public">Public</option>
                  <option value="protected">Protected</option>
                  <option value="protectedNDA">Protected NDA</option>
                  <option value="private">Private</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Specify the accessibility of the node.
                </p>
              </div>

              {/* Text Field */}
              <div>
                <label className="block text-lg font-medium text-blue-800">
                  Description
                </label>
                <textarea
                  className="w-full p-4 bg-blue-50 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="Enter description (HTML allowed)"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows="5"
                ></textarea>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition"
              onClick={() => window.history.back()}
            >
              Close
            </button>
            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateChild;