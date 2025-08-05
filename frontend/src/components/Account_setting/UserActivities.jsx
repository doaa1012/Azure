import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import config from '../../config_path';
import jwt_decode from 'jwt-decode';

const UserActivities = () => {
  const [userObjects, setUserObjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showObjects, setShowObjects] = useState(false); // toggle state
  const [openSections, setOpenSections] = useState({});
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwt_decode(token);
      setCurrentUser(decoded.user_id);
      fetchUserObjects(decoded.user_id);
    }
  }, []);

  const fetchUserObjects = (userId) => {
    fetch(`${config.BASE_URL}api/objects-by-user/${userId}/`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded with status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setUserObjects(data);
        else {
          console.error('Expected array but got:', data);
          setUserObjects([]);
        }
      })
      .catch((err) => {
        console.error('Failed to load user objects:', err);
        setUserObjects([]);
      });
  };

  return (
    <div className="p-6 bg-blue-50 min-h-screen">
      <h2 className="text-2xl font-bold text-blue-800 mb-4">My Created Objects</h2>

      {/* Toggle Button */}
      <button
        onClick={() => setShowObjects(!showObjects)}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500"
      >
        {showObjects ? 'Hide My Objects' : 'Show My Objects'}
      </button>

      {/* Collapsible List */}
    {showObjects && (
  <>
    {userObjects.length === 0 ? (
      <p className="text-gray-600">You haven't created any objects yet.</p>
    ) : (
      Object.entries(
        userObjects.reduce((acc, obj) => {
          const type = obj.TypeName || 'Unknown Type';
          if (!acc[type]) acc[type] = [];
          acc[type].push(obj);
          return acc;
        }, {})
      ).map(([type, objs], index) => {
        const isOpen = openSections[type] ?? false; // default open
        return (
          <div key={type} className="mb-4 border rounded shadow bg-white">
            <button
              onClick={() =>
                setOpenSections((prev) => ({
                  ...prev,
                  [type]: !prev[type],
                }))
              }
              className="w-full flex justify-between items-center px-4 py-2 bg-blue-100 text-left text-blue-800 font-semibold hover:bg-blue-200"
            >
              <span>{type}</span>
              <span>{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <ul className="space-y-2 p-4 pt-2">
                {objs.map((obj) => (
                  <li
                    key={obj.ObjectID}
                    className="border-l-4 border-blue-500 pl-3"
                  >
                    <Link
                      to={`/object/${obj.ObjectID}`}
                      className="text-blue-700 font-semibold text-lg hover:underline"
                    >
                      {obj.ObjectName || `Unnamed Object (ID: ${obj.ObjectID})`}
                    </Link>
                    <div className="text-sm text-gray-600">
                      Created: {obj.Created || 'Unknown'}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })
    )}
  </>
)}


      <div className="mt-8">
        <Link to="/list-of-objects">
          <button className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-500">
            + Create New Object
          </button>
        </Link>
      </div>
    </div>
  );
};

export default UserActivities;
