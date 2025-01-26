import React, { useState, useEffect } from 'react';
import { NavLink, Routes, Route } from 'react-router-dom';
import axios from 'axios';

// TwoFactorAuth.jsx
const TwoFactorAuth = () => {
  return (
    <div className="p-4 bg-white shadow-md rounded-md">
      <h2 className="text-xl font-bold mb-4">Two-Factor Authentication</h2>
      <p className="text-gray-600 mb-4">
        Add an extra layer of security to your account by enabling two-factor authentication.
      </p>
      <button className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 transition">
        Add Authenticator App
      </button>
    </div>
  );
};

export default TwoFactorAuth;
