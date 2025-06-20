import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config_path';
const Profile = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token is missing. Please log in.');
        return;
      }
  
      const response = await axios.get(`${config.BASE_URL}api/user-profile/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
  
      const { username, phonenumber } = response.data;
      setUsername(username || '');
      setPhoneNumber(phonenumber || '');
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError('Error fetching user data.');
      }
    }
  };
  
  useEffect(() => {
    fetchUserData();
  }, []);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token'); // Ensure token is available
      if (!token) {
        setError('Authentication token is missing');
        return;
      }

      const response = await axios.put(
        'http://127.0.0.1:8000/api/user-profile/',
        {
          phone_number: phoneNumber,
        },
        {
          headers: {
            
            Authorization: `Bearer ${token}`, // Pass token in headers
          },
        }
      );

      if (response.status === 200) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      }
    } catch (err) {
      setError('Error saving data. Please try again.');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Profile</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-2">Username</label>
        <input
          type="text"
          value={username}
          readOnly
          className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-2">Phone number</label>
        <input
          type="text"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Enter your phone number"
          className="w-full px-4 py-2 border border-gray-300 rounded-md"
        />
      </div>
      <button
        onClick={handleSave}
        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
      >
        Save
      </button>
      {isSaved && (
        <p className="text-green-600 font-medium mt-4">Phone number updated successfully!</p>
      )}
    </div>
  );
};

export default Profile;
