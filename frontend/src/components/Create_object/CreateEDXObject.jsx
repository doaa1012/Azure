import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import config from '../../config_path';
const CreateEDXObject = () => {
  const { typeName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const groupName = queryParams.get('group');
  const rubricnameurl = queryParams.get('rubricnameurl');
  const objectId = queryParams.get('objectId');

  const [formData, setFormData] = useState({
    type: typeName,
    rubricId: '',
    sortCode: 0,
    accessControl: '',
    name: '',
    url: '',
    filePath: '',
    description: '',
  });

  const [rubrics, setRubrics] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false); // Loading state

  useEffect(() => {
    fetch(`${config.BASE_URL}api/rubrics/`)
      .then((response) => response.json())
      .then((data) => {
        setRubrics(data);
        if (rubricnameurl) {
          const matchingRubric = data.find((rubric) => rubric.rubricnameurl === rubricnameurl);
          if (matchingRubric) {
            setFormData((prevData) => ({
              ...prevData,
              rubricId: matchingRubric.rubricid,
            }));
          }
        }
      })
      .catch((error) => console.error('Error fetching rubrics:', error));
  }, [rubricnameurl]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, filePath: e.target.files[0] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
  
    const token = localStorage.getItem('token');
    const payload = new FormData();
  
    payload.append('tenantId', 4);
    payload.append('typeId', typeName);
    payload.append('rubricId', formData.rubricId);
    payload.append(
      'accessControl',
      formData.accessControl === 'protected' ? 1 :
      formData.accessControl === 'public' ? 2 :
      formData.accessControl === 'protectednda' ? 3 :
      formData.accessControl === 'private' ? 4 : 1
    );
    payload.append('sortCode', formData.sortCode || 0);
    payload.append('name', formData.name);
    payload.append('url', formData.url);
    payload.append('description', formData.description);
  
    if (objectId) {
      console.log('Debug: objectId being sent:', objectId);
      payload.append('objectId', objectId);
    }
  
    if (formData.filePath) {
      payload.append('filePath', formData.filePath);
    }
  
    fetch(`${config.BASE_URL}api/create_main_and_child_objects/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: payload,
    })
      .then(async (response) => {
        const data = await response.json(); // ✅ Always parse JSON
        if (response.ok) {
          if (data.success) {
            setSuccessMessage(data.success);
            setErrorMessage('');
            setLoading(false);
            setTimeout(() => navigate(-2), 2000);
          } else {
            throw new Error(data.error || 'Unexpected error occurred.');
          }
        } else {
          // Show backend error instead of generic "Bad Request"
          throw new Error(data.error || `Failed to process data: ${response.statusText}`);
        }
      })
      .catch((error) => {
        setErrorMessage(error.message || 'An unknown error occurred.');
        setLoading(false);
      });
  };
  
{!objectId && (
  <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg mb-6 text-center font-semibold">
    Object ID is missing. You cannot create an EDX object without linking to an existing sample.
  </div>
)}

  return (
    <div className="flex justify-center p-8 bg-blue-50 min-h-screen">
      <div className="bg-white p-10 rounded-lg shadow-md w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-blue-600">
            Create New Object ({typeName})
          </h1>
        </div>

        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
            {successMessage}
          </div>
        )}
        {loading && (
          <div className="text-center text-gray-600 mb-6">
            <div className="flex justify-center items-center space-x-4">
              <div className="loader animate-spin h-8 w-8 border-t-4 border-blue-500 rounded-full"></div>
              <span className="font-medium">Saving your data...</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Type */}
          <div>
            <label className="block text-lg font-semibold text-blue-800">
              Type
            </label>
            <input
              type="text"
              value={typeName}
              disabled
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
            />
          </div>

          {/* Rubric/Group Selection */}
          <div>
            <label className="block text-lg font-semibold text-blue-800">
              Area or Project to Belong
            </label>
            <select
              name="rubricId"
              value={formData.rubricId}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded" required
              disabled={!!groupName}
            >
              <option value="">-- Select the Section --</option>
              {rubrics.map((rubric) => (
                <option key={rubric.rubricid} value={rubric.rubricid}>
                  {rubric.rubricname}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-lg font-semibold text-blue-800">Access Control</label>
            <select
              name="accessControl"
              value={formData.accessControl}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
              required
            >
              <option value="">-- Select Access Control --</option>
              <option value="public">Public</option>
              <option value="protected">Protected</option>
              <option value="protectednda">Protected NDA</option>
              <option value="private">Private</option>
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-lg font-semibold text-blue-800">
              Name
            </label>
            <input
              type="text"
              name="name" required
              value={formData.name}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
              placeholder="Enter object name"
            />
          </div>
          <div>
  <label className="block text-lg font-semibold text-blue-800">Sort Code</label>
  <input
    type="number"
    name="sortCode"
    value={formData.sortCode}
    onChange={handleInputChange}
    className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
    placeholder="Enter sort code (e.g. 0, 1, 2...)"
  />
</div>

          <div>
            <label className="block text-lg font-semibold text-blue-800">URL (unique)</label>
            <input
              type="text"
              name="url"
              value={formData.url}
              onChange={handleInputChange}
              className={`w-full p-3 bg-blue-50 border border-blue-300 rounded`}
              placeholder="Enter unique URL"
            />
          </div>

          {/* File Path */}
          <div>
            <label className="block text-lg font-semibold text-blue-800">
              File Path
            </label>
            <input
              type="file"
              name="filePath"
              onChange={handleFileChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-lg font-semibold text-blue-800">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded h-32"
              placeholder="Enter description (optional)"
            ></textarea>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              type="button"
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
              onClick={() => navigate(-1)} // Go back to the previous page
            >
              Close and Back to the Site
            </button>
            <button
              type="submit"
              className={`bg-green-500 text-white px-5 py-2 rounded-lg hover:bg-green-600 transition ${loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              disabled={loading} // Disable button during loading
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default CreateEDXObject;