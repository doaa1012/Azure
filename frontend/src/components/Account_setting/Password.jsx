import React, { useState } from 'react';
import axios from 'axios';
import config from '../../config_path';
const Password = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handlePasswordUpdate = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const token = localStorage.getItem('token'); // Fetch token
      const userId = localStorage.getItem('userId'); // Fetch user_id
      if (!token || !userId) {
        setError('Authentication token or user ID is missing. Please log in again.');
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('New password and confirmation password do not match.');
        setLoading(false);
        return;
      }

      const response = await axios.put(
        `${config.BASE_URL}api/update-password/`,
        {
          user_id: userId, // Ensure this field is sent
          currentPassword: currentPassword, // Ensure this field is sent
          newPassword: newPassword, // Ensure this field is sent
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      

      if (response.status === 200) {
        setSuccessMessage('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error updating password.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Change Password</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {successMessage && <p className="text-green-500 mb-4">{successMessage}</p>}
      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-1">Current Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
            placeholder="Enter current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute inset-y-0 right-3 flex items-center text-blue-600"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-1">New Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute inset-y-0 right-3 flex items-center text-blue-600"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-1">Confirm New Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute inset-y-0 right-3 flex items-center text-blue-600"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      <button
        onClick={handlePasswordUpdate}
        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? 'Updating...' : 'Update Password'}
      </button>
    </div>
  );
};

export default Password;
