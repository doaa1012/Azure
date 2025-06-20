import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from '../../config_path';
const ObjectStatisticsTable = () => {
  const [statistics, setStatistics] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');

  useEffect(() => {
    // Fetch all users for the dropdown
    axios.get(`${config.BASE_URL}api/users/`)
      .then(response => {
        setUsers(response.data); // Set the fetched users
      })
      .catch(error => {
        console.error('Error fetching users:', error);
      });

    // Fetch the default statistics
    fetchStatistics();
  }, []);

  // Fetch statistics filtered by user
  const fetchStatistics = (userId = '') => {
    let url = `${config.BASE_URL}api/object-statistics/`;
    if (userId) {
      url += `?user_id=${userId}`;
    }
    axios.get(url)
      .then(response => {
        setStatistics(response.data);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  };

  // Handle user selection from dropdown
  const handleUserChange = (e) => {
    setSelectedUser(e.target.value);
    fetchStatistics(e.target.value);
  };

  return (
    <div className="p-10 min-h-screen bg-blue-50">
<header className="bg-blue-600 text-white p-5 rounded-lg text-center mb-5 shadow-md">
  <h1 className="text-4xl font-bold m-0">Object Statistics</h1>
</header>


<div className="mb-5 text-left">
  <label htmlFor="user-select" className="text-lg mr-3">Filter by User:</label>
  <select
    id="user-select"
    value={selectedUser}
    onChange={handleUserChange}
    className="p-2 text-lg rounded-lg border border-gray-300 shadow-sm w-52"
  >
    <option value="">All Users</option>
    {users.map((user) => (
      <option key={user.id} value={user.id}>{user.username}</option>
    ))}
  </select>
</div>

<div className="overflow-x-auto mt-5">
  <table className="w-full border-collapse rounded-lg shadow-md">
    <thead>
      <tr className="bg-orange-600 text-white text-left">
        <th className="p-3 text-center">Object Count</th>
        <th className="p-3 text-center">TypeId</th>
        <th className="p-3 text-center">Type Name</th>
        <th className="p-3 text-center">Type Comment</th>
      </tr>
    </thead>
          <tbody>
            {statistics.length > 0 ? (
              statistics.map((stat, index) => (
                <tr
                  key={index}
                  style={{
                    backgroundColor: index % 2 === 0 ? '#E0F7FA' : '#FCE4EC', // Alternate row colors: light blue and pink
                    transition: 'background-color 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B2EBF2'} // Hover effect: slightly darker blue
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#E0F7FA' : '#FCE4EC'}
                >
                  <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>{stat.object_count}</td>
                  <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>{stat.typeid}</td>
                  <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>{stat.typename}</td>
                  <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>{stat.typecomment || 'N/A'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ padding: '12px', textAlign: 'center', color: '#6c757d' }}>
                  No statistics found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ObjectStatisticsTable;

