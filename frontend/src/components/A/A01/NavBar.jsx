import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import jwt_decode from 'jwt-decode';
import { useAuth } from '../../AuthContext';

const Navbar = () => {
  const [isReportsDropdownOpen, setIsReportsDropdownOpen] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('Loading...');
  const [currentUserName, setCurrentUserName] = useState('User');
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const fetchUserEmail = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const decoded = jwt_decode(storedToken);
          if (decoded.user_id) {
            const response = await axios.get('http://127.0.0.1:8000/api/users/', {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            const currentUser = response.data.find(
              (user) => user.id === decoded.user_id
            );
            if (currentUser) {
              setCurrentUserEmail(currentUser.email || 'No Email Found');
              const firstName = currentUser.email.split('@')[0];
              setCurrentUserName(firstName.charAt(0).toUpperCase() + firstName.slice(1));
            } else {
              setCurrentUserName('User Not Found');
            }
          }
        } catch (error) {
          console.error('Error fetching user email:', error);
          setCurrentUserName('Error');
        }
      } else {
        setCurrentUserName('No Token');
      }
    };

    fetchUserEmail();
  }, []);

  const toggleReportsDropdown = () => {
    setIsReportsDropdownOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        'http://127.0.0.1:8000/api/logout/',
        {},
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );
      localStorage.removeItem('token');
      logout();
      navigate('/start', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Logout failed. Please try again.');
    }
  };

  return (
    <nav className="fixed top-0 right-0 z-50 py-2 px-4">
      <div className="flex justify-center items-center space-x-3 rounded-full bg-[#e3f2fd] shadow-md py-1 px-4">
        <Link
          to="/"
          className="text-xl font-semibold hover:text-orange-600 transition-colors duration-300"
        >
          CRC 1625
        </Link>
        <span className="text-base text-orange-600">|</span>
        <Link
          to="/search"
          className="text-xl font-semibold hover:text-orange-600 transition-colors duration-300"
        >
          Search
        </Link>
        <span className="text-base text-orange-600">|</span>
        <Link
          to="/list-of-objects"
          className="text-xl font-semibold hover:text-orange-600 transition-colors duration-300"
        >
          Create Object
        </Link>
        <span className="text-base text-orange-600">|</span>
        <Link
          to="/SampleTable"
          className="text-xl font-semibold hover:text-orange-600 transition-colors duration-300"
        >
          Sample Progress Overview
        </Link>
        <span className="text-base text-orange-600">|</span>
        <Link
          to="/workflows"
          className="text-xl font-semibold hover:text-orange-600 transition-colors duration-300"
        >
          Workflows
        </Link>
        <span className="text-base text-orange-600">|</span>
        <div className="relative">
          <button
            onClick={toggleReportsDropdown}
            className="text-xl font-semibold hover:text-orange-600 transition-colors duration-300 focus:outline-none"
          >
            Reports
          </button>
               {/* Dropdown menu */}
               {isReportsDropdownOpen && (
            <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md py-2">
              <Link
                to="/reports"
                className="block px-4 py-2 text-gray-700 hover:bg-orange-600 hover:text-white"
                onClick={() => setIsReportsDropdownOpen(false)}  // Close dropdown after navigation
              >
                Element Composition 
              </Link>
              <Link
                to="/MonthlyObjectIncrease"
                className="block px-4 py-2 text-gray-700 hover:bg-orange-600 hover:text-white"
                onClick={() => setIsReportsDropdownOpen(false)}
              >
                Monthly Object Increase
              </Link>

              <Link
                to="/SamplesPerElementChart"
                className="block px-4 py-2 text-gray-700 hover:bg-orange-600 hover:text-white"
                onClick={() => setIsReportsDropdownOpen(false)}
              >
                Samples Per Element
              </Link>

              <Link
                to="/SynthesisRequestsTable"
                className="block px-4 py-2 text-gray-700 hover:bg-orange-600 hover:text-white"
                onClick={() => setIsReportsDropdownOpen(false)}
              >
                Synthesis Requests Table
              </Link>

              <Link
                to="/ObjectStatisticsTable"
                className="block px-4 py-2 text-gray-700 hover:bg-orange-600 hover:text-white"
                onClick={() => setIsReportsDropdownOpen(false)}
              >
                Object Statistics Table
              </Link>

              <Link
                to="/IdeasAndExperimentsTable"
                className="block px-4 py-2 text-gray-700 hover:bg-orange-600 hover:text-white"
                onClick={() => setIsReportsDropdownOpen(false)}
              >
                Ideas and Experiments Table
              </Link>
            </div>
          )}
        </div>
        <span className="text-base text-orange-600 mx-2">|</span>

        {/* User Tab */}
        <Link
          to="/identity"
          className="text-xl font-semibold hover:text-orange-600 transition-colors duration-300"
        >
          {currentUserName}
        </Link>

        <span className="text-base text-orange-600">|</span>

        {/* Logout Tab */}
        <button
          onClick={handleLogout}
          className="text-xl font-semibold hover:text-orange-600 transition-colors duration-300 focus:outline-none"
        >
          Log Out
        </button>
      </div>
    </nav>
  );
};

export default Navbar;

