import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config_path';
const Email = () => {
  const [currentEmail, setCurrentEmail] = useState('Fetching...');
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchEmail = async () => {
    try {
      const token = localStorage.getItem('token'); // Ensure token is available
      if (!token) {
        setError('Authentication token is missing. Please log in.');
        return;
      }

      const response = await axios.get(`${config.BASE_URL}api/user-profile/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const { username } = response.data;
    //console.log('API Response:', response.data);
      setCurrentEmail(username || 'No email found');
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError('Error fetching user email.');
      }
    }
  };

  const handleEmailChange = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token is missing.');
        return;
      }

      const response = await axios.put(
        'http://127.0.0.1:8000/api/update-email/',
        { email: newEmail },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        setSuccessMessage('Email updated successfully!');
        setCurrentEmail(newEmail);
        setNewEmail('');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError('Error updating email. Please try again.');
    }
  };

  useEffect(() => {
    fetchEmail();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Manage Email</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {successMessage && <p className="text-green-500 mb-4">{successMessage}</p>}
      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-1">Current Email</label>
        <input
          type="email"
          value={currentEmail}
          readOnly
          className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100"
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-1">New Email</label>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="Enter your new email"
          className="w-full px-4 py-2 border border-gray-300 rounded-md"
        />
      </div>
      <button
        onClick={handleEmailChange}
        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
      >
        Change Email
      </button>
    </div>
  );
};

export default Email;
