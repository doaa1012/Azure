import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import jwt_decode from 'jwt-decode';
import { useAuth } from '../../AuthContext';
import config from '../../../config_path';
const Navbar = () => {
  const [isReportsDropdownOpen, setIsReportsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('User');
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const fetchUserEmail = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const decoded = jwt_decode(storedToken);
          const response = await axios.get(`${config.BASE_URL}api/users/`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          const currentUser = response.data.find(user => user.id === decoded.user_id);
          if (currentUser) {
            const firstName = currentUser.email.split('@')[0];
            setCurrentUserName(firstName.charAt(0).toUpperCase() + firstName.slice(1));
          }
        } catch (error) {
          console.error('Error fetching user email:', error);
          setCurrentUserName('Error');
        }
      }
    };

    fetchUserEmail();
  }, []);

  const toggleReportsDropdown = () => {
    setIsReportsDropdownOpen(prev => !prev);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  const handleLogout = async () => {
    try {
      await axios.post(
       `${config.BASE_URL}api/logout/`,
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
        {/* Brand */}
        <Link
  to="/"
  className="text-xl font-semibold hover:text-orange-600 transition-colors duration-300"
>
  CRC 1625
</Link>
<span className="text-base text-orange-600">|</span>


        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button onClick={toggleMobileMenu} className="text-2xl text-black focus:outline-none">
            ☰
          </button>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-3 rounded-full bg-[#e3f2fd] py-1 px-4">
          <Link to="/search" className="text-xl font-semibold hover:text-orange-600 transition">Search</Link>
          <span className="text-base text-orange-600">|</span>

          <Link to="/list-of-objects" className="text-xl font-semibold hover:text-orange-600 transition">Create Object</Link>
          <span className="text-base text-orange-600">|</span>

          <Link to="/SampleTable" className="text-xl font-semibold hover:text-orange-600 transition">Sample Progress Overview</Link>
          <span className="text-base text-orange-600">|</span>

          <Link to="/workflows" className="text-xl font-semibold hover:text-orange-600 transition">Workflows</Link>
          <span className="text-base text-orange-600">|</span>

          <div className="relative">
            <button
              onClick={toggleReportsDropdown}
              className="text-xl font-semibold hover:text-orange-600 transition focus:outline-none"
            >
              Reports
            </button>
            {isReportsDropdownOpen && (
              <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md py-2 z-10">
                {[
                  ['reports', 'Element Composition'],
                  ['MonthlyObjectIncrease', 'Monthly Object Increase'],
                  ['SamplesPerElementChart', 'Samples Per Element'],
                  ['SynthesisRequestsTable', 'Synthesis Requests Table'],
                  ['ObjectStatisticsTable', 'Object Statistics Table'],
                  ['IdeasAndExperimentsTable', 'Ideas and Experiments Table'],
                  ['empty-samples', 'Samples Overview'],
                  ['User_Handover_Report', 'User Handover Report'],
                ].map(([to, label]) => (
                  <Link
                    key={to}
                    to={`/${to}`}
                    onClick={() => setIsReportsDropdownOpen(false)}
                    className="block px-4 py-2 text-gray-700 hover:bg-orange-600 hover:text-white"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <span className="text-base text-orange-600 mx-2">|</span>

          <Link to="/identity" className="text-xl font-semibold hover:text-orange-600 transition">{currentUserName}</Link>
          <span className="text-base text-orange-600">|</span>

          <button
            onClick={handleLogout}
            className="text-xl font-semibold hover:text-orange-600 transition focus:outline-none"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-2 space-y-2 text-lg bg-[#e3f2fd] px-4 pb-4 rounded shadow">
          <Link to="/search" className="block hover:text-orange-600">Search</Link>
          <Link to="/list-of-objects" className="block hover:text-orange-600">Create Object</Link>
          <Link to="/SampleTable" className="block hover:text-orange-600">Sample Progress Overview</Link>
          <Link to="/workflows" className="block hover:text-orange-600">Workflows</Link>

          <button onClick={toggleReportsDropdown} className="block w-full text-left hover:text-orange-600">
            Reports
          </button>
          {isReportsDropdownOpen && (
            <div className="pl-4">
              <Link to="/reports" className="block py-1 hover:text-orange-600">Element Composition</Link>
              <Link to="/MonthlyObjectIncrease" className="block py-1 hover:text-orange-600">Monthly Object Increase</Link>
              <Link to="/SamplesPerElementChart" className="block py-1 hover:text-orange-600">Samples Per Element</Link>
              <Link to="/SynthesisRequestsTable" className="block py-1 hover:text-orange-600">Synthesis Requests Table</Link>
              <Link to="/ObjectStatisticsTable" className="block py-1 hover:text-orange-600">Object Statistics Table</Link>
              <Link to="/IdeasAndExperimentsTable" className="block py-1 hover:text-orange-600">Ideas and Experiments Table</Link>
              <Link to="/empty-samples" className="block py-1 hover:text-orange-600">Samples Overview</Link>
              <Link to="/User_Handover_Report" className="block py-1 hover:text-orange-600">User Handover Report</Link>
            </div>
          )}
          <Link to="/identity" className="block hover:text-orange-600">{currentUserName}</Link>
          <button onClick={handleLogout} className="block hover:text-orange-600">Log Out</button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
