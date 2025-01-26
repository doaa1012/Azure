import React, { useState } from 'react';
import Profile from './Profile';
import Email from './Email';
import Password from './Password';
import ExternalLogins from './ExternalLogins';
import TwoFactorAuth from './TwoFactorAuth';
import PersonalData from './PersonalData';

const AccountSettings = () => {
  const [selectedSection, setSelectedSection] = useState('Profile');

  const renderContent = () => {
    switch (selectedSection) {
      case 'Profile':
        return <Profile />;
      case 'Email':
        return <Email />;
      case 'Password':
        return <Password />;
      case 'External Logins':
        return <ExternalLogins />;
      case 'Two-Factor Authentication':
        return <TwoFactorAuth />;
      case 'Personal Data':
        return <PersonalData />;
      default:
        return <Profile />;
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 py-10 px-6">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4">
          <h1 className="text-2xl font-bold">Manage your account</h1>
          <p className="text-sm">Change your account settings</p>
        </div>
        <div className="flex">
          {/* Sidebar */}
          <div className="w-1/4 bg-blue-100 p-6">
            <ul className="space-y-4">
              <li
                className={`cursor-pointer p-2 rounded-md ${
                  selectedSection === 'Profile'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-blue-700 hover:bg-blue-200'
                }`}
                onClick={() => setSelectedSection('Profile')}
              >
                Profile
              </li>
              <li
                className={`cursor-pointer p-2 rounded-md ${
                  selectedSection === 'Email'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-blue-700 hover:bg-blue-200'
                }`}
                onClick={() => setSelectedSection('Email')}
              >
                Email
              </li>
              <li
                className={`cursor-pointer p-2 rounded-md ${
                  selectedSection === 'Password'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-blue-700 hover:bg-blue-200'
                }`}
                onClick={() => setSelectedSection('Password')}
              >
                Password
              </li>
              <li
                className={`cursor-pointer p-2 rounded-md ${
                  selectedSection === 'External Logins'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-blue-700 hover:bg-blue-200'
                }`}
                onClick={() => setSelectedSection('External Logins')}
              >
                External Logins
              </li>
              <li
                className={`cursor-pointer p-2 rounded-md ${
                  selectedSection === 'Two-Factor Authentication'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-blue-700 hover:bg-blue-200'
                }`}
                onClick={() => setSelectedSection('Two-Factor Authentication')}
              >
                Two-Factor Authentication
              </li>
              <li
                className={`cursor-pointer p-2 rounded-md ${
                  selectedSection === 'Personal Data'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-blue-700 hover:bg-blue-200'
                }`}
                onClick={() => setSelectedSection('Personal Data')}
              >
                Personal Data
              </li>
            </ul>
          </div>

          {/* Main Content */}
          <div className="w-3/4 p-6">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;


