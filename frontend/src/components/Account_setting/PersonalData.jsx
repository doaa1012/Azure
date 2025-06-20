import React, { useState } from 'react';
import axios from 'axios';
import config from '../../config_path';
const PersonalData = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token'); // Get the token from localStorage
      if (!token) {
        alert('Authentication token is missing. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${config.BASE_URL}api/personal-data/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      

      if (response.status === 200) {
        // Convert the JSON data to a file and download it
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'personal_data.json';
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error downloading personal data:', err.response?.data || err.message);
      setError('Failed to download personal data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your personal data? This action cannot be undone.')) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token'); // Get the token from localStorage
      if (!token) {
        alert('Authentication token is missing. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await axios.delete('http://127.0.0.1:8000/api/delete-account/', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        alert('Your personal data and account have been deleted successfully.');
        // Optionally, redirect to a logout or home page
      }
    } catch (err) {
      console.error('Error deleting personal data:', err.response?.data || err.message);
      setError('Failed to delete personal data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-md">
      <h2 className="text-xl font-bold mb-4">Personal Data</h2>
      <p className="text-gray-600 mb-4">
        Your account contains personal data that you have provided. You can download or delete your data below.
      </p>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="flex space-x-4">
        <button
          onClick={handleDownload}
          className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 transition"
          disabled={loading}
        >
          {loading ? 'Downloading...' : 'Download'}
        </button>
        <button
          onClick={handleDelete}
          className="bg-red-600 text-white px-6 py-2 rounded-md font-medium hover:bg-red-700 transition"
          disabled={loading}
        >
          {loading ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
};

export default PersonalData;


