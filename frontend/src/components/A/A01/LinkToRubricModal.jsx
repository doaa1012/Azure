import React, { useState } from 'react';
import config from '../../../config_path';

function LinkToRubricModal({ isOpen, onClose, rubricId }) {
  const [objectId, setObjectId] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleClose = () => {
    setObjectId('');
    setSuccessMessage('');
    setErrorMessage('');
    onClose();
  };

  const handleLink = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setErrorMessage('You must be logged in.');
        return;
      }

      const response = await fetch(`${config.BASE_URL}api/link-object-to-rubric/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          object_id: objectId,
          rubric_id: rubricId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Object successfully linked to rubric!');
        setErrorMessage('');
        setTimeout(() => {
          handleClose();
        }, 1000);
      } else {
        if (
          data.error &&
          data.error.toLowerCase().includes('duplicate') &&
          data.error.toLowerCase().includes('objectlinkrubric')
        ) {
          setErrorMessage('This object is already linked to the selected rubric.');
        } else {
          setErrorMessage(data.error || 'Failed to link object.');
        }
      }
    } catch (error) {
      console.error('Error linking object:', error);
      setErrorMessage('Something went wrong.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
        <button
          onClick={handleClose}
          className="absolute top-3 right-4 text-gray-500 hover:text-red-500 text-2xl font-bold"
          title="Close"
        >
          &times;
        </button>

        <h2 className="text-2xl font-bold text-blue-800 mb-6 flex items-center gap-2">
          🔗 Link Object to Rubric
        </h2>

        <div className="mb-4">
          <label className="block text-blue-700 text-sm font-semibold mb-1">Object ID</label>
          <input
            type="text"
            value={objectId}
            onChange={(e) => setObjectId(e.target.value)}
            className="w-full bg-white border border-blue-300 rounded-xl p-3 text-blue-700 placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
            placeholder="Enter Object ID to link"
          />
        </div>

        {successMessage && (
          <div className="mb-2 text-green-700 bg-green-100 border border-green-300 rounded-md p-2 text-sm font-medium shadow">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-2 text-red-700 bg-red-100 border border-red-300 rounded-md p-2 text-sm font-medium shadow">
            {errorMessage}
          </div>
        )}

        <div className="flex justify-between gap-4 mt-6">
          <button
            onClick={handleClose}
            className="w-1/2 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-xl shadow hover:from-gray-300 hover:to-gray-400 transition-all duration-200"
          >
            ✖ Cancel
          </button>

          <button
            onClick={handleLink}
            className="w-1/2 bg-gradient-to-r from-green-400 to-green-600 text-white font-semibold py-2 px-4 rounded-xl shadow hover:from-green-500 hover:to-green-700 transition-all duration-200"
          >
            ✅ Link to Rubric
          </button>
        </div>
      </div>
    </div>
  );
}

export default LinkToRubricModal;
