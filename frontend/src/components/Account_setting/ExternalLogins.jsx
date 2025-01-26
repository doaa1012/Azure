import React, { useState, useEffect } from 'react';
import { NavLink, Routes, Route } from 'react-router-dom';
import axios from 'axios';

// ExternalLogins.jsx
const ExternalLogins = () => {
  return (
    <div className="p-4 bg-white shadow-md rounded-md">
      <h2 className="text-xl font-bold mb-4">External Logins</h2>
      <p className="text-gray-600 mb-4">
        Add another service to log in with.
      </p>
      <button className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 transition">
        Add Google
      </button>
    </div>
  );
};

export default ExternalLogins;
