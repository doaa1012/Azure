import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import config from '../../config_path';
const EditPropertyPage = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    valueEpsilon: '',
    sortCode: '',
    row: '',
    comment: '',
    propertyType: 'string',
    sourceObjectId: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    setLoading(true); // Start loading
    fetch(`${config.BASE_URL}api/property/${propertyId}/`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load property data');
        return response.json();
      })
      .then((data) => {
        setFormData({
          name: data.name || '',
          value: data.value || '',
          valueEpsilon: data.valueEpsilon || '',
          sortCode: data.sortCode !== null && data.sortCode !== undefined ? data.sortCode : '', // Explicitly handle 0 or default
          row: data.row || '',
          comment: data.comment || '',
          propertyType: data.type , 
          sourceObjectId: data.sourceObjectId || '',
        });
        setLoading(false); // End loading
        console.log('Fetched data:', data); // Debug fetched data
      })
      .catch((error) => {
        console.error('Error loading property data:', error);
        setError(error.message);
        setLoading(false);
      });
  }, [propertyId]);
  

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
      setError('User is not authenticated');
      return;
    }

    const payload = { ...formData };
    payload.row = payload.row ? parseInt(payload.row, 10) : null; // Convert row to a number or null
    payload.sortCode = payload.sortCode ? parseInt(payload.sortCode, 10) : 0; // Default to 0 if sortCode is not provided
    payload.valueEpsilon = payload.valueEpsilon ? parseFloat(payload.valueEpsilon) : null; // Convert valueEpsilon to a float or null

    console.log('Submitting payload:', payload);

    try {
      const response = await fetch(
        `${config.BASE_URL}api/edit_property/${propertyId}/`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        setSuccessMessage('Property updated successfully!');
        setError(null);
        setTimeout(() => navigate(-1), 2000); // Navigate back after 2 seconds
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update property');
      }
    } catch (err) {
      setError('Failed to update property');
    }
  };

  if (loading) return <p>Loading...</p>;
  return (
    <div className="flex justify-center p-8 bg-blue-50 min-h-screen">
      <div className="bg-white p-10 rounded-lg shadow-md w-full max-w-4xl">
        <h1 className="text-3xl font-extrabold text-blue-600 text-center mb-8">Edit Property</h1>
        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {successMessage}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            
            <label className="block text-lg font-semibold text-blue-800">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
            />
          </div>
          <div>
            <label className="block text-lg font-semibold text-blue-800">Value</label>
            <input
              type="text"
              name="value"
              value={formData.value}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
            />
          </div>
          <div>
            <label className="block text-lg font-semibold text-blue-800">Value Epsilon</label>
            <input
              type="text"
              name="valueEpsilon"
              value={formData.valueEpsilon}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
            />
          </div>
          <div>
            <label className="block text-lg font-semibold text-blue-800">Sort Code</label>
            <input
              type="text"
              name="sortCode"
              value={formData.sortCode}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded"
            />
          </div>
          <div>
            <label className="block text-lg font-semibold text-blue-800">Comment</label>
            <textarea
              name="comment"
              value={formData.comment}
              onChange={handleInputChange}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded h-32"
            />
          </div>
          <div>
            <button
              type="submit"
              className="bg-blue-500 text-white px-5 py-2 rounded-lg hover:bg-blue-600"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPropertyPage;
