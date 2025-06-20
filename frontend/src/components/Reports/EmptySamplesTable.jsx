import React, { useEffect, useState } from 'react';
import config from '../../config_path';
const ITEMS_PER_PAGE = 30;

const EmptySamplesTable = () => {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [filterCharZero, setFilterCharZero] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${config.BASE_URL}api/users/`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchSamples = async (page, userId = '', charZero = false) => {
    setLoading(true);
    let url = `${config.BASE_URL}api/empty-samples/?page=${page}&limit=${ITEMS_PER_PAGE}`;
    if (userId) url += `&user_id=${userId}`;
    if (charZero) url += `&char_zero_only=true`; 


    try {
      const response = await fetch(url);
      const data = await response.json();
      setSamples(data.results);
      setTotalPages(data.total_pages);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sample data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSamples(currentPage);
  }, []);

  useEffect(() => {
    fetchSamples(currentPage, selectedUser, filterCharZero);
  }, [currentPage, selectedUser, filterCharZero]);

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  return (
    <div className="p-10 min-h-screen bg-blue-50">
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-xl text-center shadow-lg mb-6">
        <h1 className="text-4xl font-extrabold tracking-wide">📊 Samples Overview</h1>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-6">
  {/* Fancy User Dropdown */}
  <div className="flex items-center gap-2">
    <label className="text-lg font-semibold text-gray-800">Filter by User:</label>
    <div className="relative">
      <select
        value={selectedUser}
        onChange={(e) => {
          setCurrentPage(1);
          setSelectedUser(e.target.value);
        }}
        className="block appearance-none w-full bg-white border border-gray-300 text-gray-800 py-2 px-4 pr-8 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Users</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>{user.username}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        ▼
      </div>
    </div>
  </div>

  {/* Fancy Toggle for Characterizations */}
  <div className="flex items-center gap-3">
    <label htmlFor="charToggle" className="text-lg font-semibold text-gray-800">
      Only samples with 0 characterizations
    </label>
    <label className="inline-flex relative items-center cursor-pointer">
      <input
        type="checkbox"
        id="charToggle"
        checked={filterCharZero}
        onChange={() => {
          setCurrentPage(1);
          setFilterCharZero(prev => !prev);
        }}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-gray-400 peer-checked:bg-blue-600 transition-all duration-300"></div>
      <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 transform peer-checked:translate-x-full"></div>
    </label>
  </div>
</div>


      {loading ? (
        <p className="text-gray-700 text-lg text-center">Loading...</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg shadow-md mt-6">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-orange-600 text-white text-sm text-center">
                  <th className="p-3">Id</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Project Name</th>
                  <th className="p-3">Person</th>
                  <th className="p-3">N</th>
                  <th className="p-3">Sample Material</th>
                  <th className="p-3">Substrate</th>
                  <th className="p-3">Chamber</th>
                  <th className="p-3">Depositions</th>
                  <th className="p-3">Characterizations</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((sample, index) => (
                  <tr
                    key={sample.Id}
                    style={{
                      backgroundColor: index % 2 === 0 ? '#E0F7FA' : '#FCE4EC',
                      transition: 'background-color 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B2EBF2'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#E0F7FA' : '#FCE4EC'}
                  >
                    <td className="p-3 text-center border-b">
                      <a href={`/object/${sample.Id}`} className="text-blue-600 underline hover:text-blue-800">
                        {sample.Id}
                      </a>
                    </td>
                    <td className="p-3 text-center border-b">{sample.Created}</td>
                    <td className="p-3 text-center border-b">{sample['Project Name']}</td>
                    <td className="p-3 text-center border-b">{sample.Person}</td>
                    <td className="p-3 text-center border-b">{sample.N}</td>
                    <td className="p-3 text-center border-b">{sample['Sample Material']}</td>
                    <td className="p-3 text-center border-b">{sample.Substrate}</td>
                    <td className="p-3 text-center border-b">{sample.Chamber}</td>
                    <td className="p-3 text-center border-b">{sample.Depositions}</td>
                    <td className="p-3 text-center border-b">{sample.Characterizations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-center items-center gap-6 mt-6">
            <button
              onClick={handlePrev}
              disabled={currentPage === 1}
              className="px-5 py-2 rounded bg-blue-200 hover:bg-blue-300 text-gray-800 font-medium disabled:opacity-40"
            >⬅ Previous</button>

            <span className="text-gray-700 font-semibold">
              Page <span className="text-blue-700 font-bold">{currentPage}</span> of {totalPages}
            </span>

            <button
              onClick={handleNext}
              disabled={currentPage === totalPages}
              className="px-5 py-2 rounded bg-blue-200 hover:bg-blue-300 text-gray-800 font-medium disabled:opacity-40"
            >Next ➡</button>
          </div>
        </>
      )}
    </div>
  );
};

export default EmptySamplesTable;
