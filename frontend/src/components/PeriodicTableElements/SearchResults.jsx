import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import config from '../../config_path';

export const SearchResultsTable = ({ results }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const ACCESS_CONTROL_LABELS = {
    0: 'Public',
    1: 'Protected',
    2: 'Protected NDA',
    3: 'Private',
  };

  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  const getSortArrow = (key) => {
    if (sortConfig.key !== key) return '⇅'; // Neutral arrow
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const sortedResults = [...results].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    return typeof aVal === 'string'
      ? (sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal))
      : (sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal);
  });

  const thClass = (key) =>
    `px-6 py-3 cursor-pointer select-none ${sortConfig.key === key ? 'bg-blue-600 text-yellow-300 font-bold' : ''
    } hover:bg-blue-500`;

  return (
    <div className="bg-blue-100 rounded-xl shadow-md overflow-x-auto mt-6">
      <h2 className="text-2xl font-bold mb-4 text-blue-900 px-6 pt-6">Search Results</h2>
      {results.length > 0 ? (
        <table className="min-w-full text-sm text-left">
          <thead className="bg-blue-700 text-white uppercase text-xs font-semibold">
            <tr>
              <th className={thClass('objectid')} onClick={() => handleSort('objectid')}>
                ID <span className="ml-1 text-lg">{getSortArrow('objectid')}</span>
              </th>
              <th className={thClass('typeid__typename')} onClick={() => handleSort('typeid__typename')}>
                Type <span className="ml-1 text-lg">{getSortArrow('typeid__typename')}</span>
              </th>
              <th className={thClass('objectname')} onClick={() => handleSort('objectname')}>
                Name / Description <span className="ml-1 text-lg">{getSortArrow('objectname')}</span>
              </th>
              <th className={thClass('field_created')} onClick={() => handleSort('field_created')}>
                Created <span className="ml-1 text-lg">{getSortArrow('field_created')}</span>
              </th>
              <th className={thClass('field_createdby__username')} onClick={() => handleSort('field_createdby__username')}>
                Created By <span className="ml-1 text-lg">{getSortArrow('field_createdby__username')}</span>
              </th>
              <th className={thClass('elements')} onClick={() => handleSort('elements')}>
                Elements <span className="ml-1 text-lg">{getSortArrow('elements')}</span>
              </th>
              <th className={thClass('elemnumber')} onClick={() => handleSort('elemnumber')}>
                N <span className="ml-1 text-lg">{getSortArrow('elemnumber')}</span>
              </th>
              <th className={thClass('accesscontrol')} onClick={() => handleSort('accesscontrol')}>
                Access <span className="ml-1 text-lg">{getSortArrow('accesscontrol')}</span>
              </th>
              <th className="px-6 py-3">Download</th>
            </tr>
          </thead>
          <tbody>
            {sortedResults.map((result, index) => (
              <tr
                key={index}
                style={{
                  backgroundColor: index % 2 === 0 ? '#E3F2FD' : '#FFF8E1', // Fancy pastel
                  transition: 'background-color 0.3s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FCE4EC'; // Hover color
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#E3F2FD' : '#FFF8E1';
                }}
              >
                <td className="px-6 py-3 font-bold text-indigo-800">
                  <Link to={`/object/${result.objectid}`} className="hover:underline">
                    {result.objectid}
                  </Link>
                </td>
                <td className="px-6 py-3 text-indigo-700 font-medium">{result.typeid__typename}</td>
                <td className="px-6 py-3 text-purple-800">{result.objectname}</td>
                <td className="px-6 py-3 text-gray-800">
                  {result.field_created ? new Date(result.field_created).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-3 text-cyan-900">{result.field_createdby__username}</td>
                <td className="px-6 py-3 text-gray-800">{result.elements || '-'}</td>
                <td className="px-6 py-3 text-gray-800">{result.elemnumber ?? '-'}</td>
                <td className="px-6 py-3 text-pink-800">
                  {ACCESS_CONTROL_LABELS[result.accesscontrol] || 'Unknown'}
                </td>
                <td className="px-6 py-3">
                  {result.download_url ? (
                    <a
                      href={`${config.BASE_URL}${result.download_url}`}
                      className="text-green-700 underline hover:text-green-900"
                      download
                    >
                      {result.file_name || 'Download'}
                    </a>
                  ) : (
                    <span className="text-pink-600 italic">No File</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      ) : (
        <p className="text-blue-800 italic px-6 pb-6">No results found.</p>
      )}
    </div>
  );
};

// Component to render Dataset Results Table with Download Functionality
export const SearchResultsDataset = ({ results }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  const getSortArrow = (key) => {
    if (sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const sortedResults = [...results].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    return typeof aVal === 'string'
      ? (sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal))
      : (sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal);
  });

  const downloadDataset = async (objectId) => {
    try {
      const response = await fetch(`${config.BASE_URL}api/download_dataset/${objectId}/`);
      if (!response.ok) {
        throw new Error(`Failed to download dataset for ID: ${objectId}, Status: ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dataset_${objectId}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading dataset:', error);
    }
  };

  return (
    <div className="bg-blue-100 rounded-xl shadow-md overflow-x-auto mt-6">
      <h2 className="text-2xl font-bold mb-4 text-blue-900 px-6 pt-6">Dataset Results</h2>
      {results.length > 0 ? (
        <table className="min-w-full text-sm text-left">
          <thead className="bg-blue-700 text-white uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('objectid')}>
                ID <span className="ml-1 text-lg">{getSortArrow('objectid')}</span>
              </th>
              <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('typeid__typename')}>
                Type <span className="ml-1 text-lg">{getSortArrow('typeid__typename')}</span>
              </th>
              <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('objectname')}>
                Name <span className="ml-1 text-lg">{getSortArrow('objectname')}</span>
              </th>
              <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('field_created')}>
                Created <span className="ml-1 text-lg">{getSortArrow('field_created')}</span>
              </th>
              <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('field_createdby__username')}>
                Created By <span className="ml-1 text-lg">{getSortArrow('field_createdby__username')}</span>
              </th>
              <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('elements')}>
                Elements <span className="ml-1 text-lg">{getSortArrow('elements')}</span>
              </th>
              <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('elemnumber')}>
                N <span className="ml-1 text-lg">{getSortArrow('elemnumber')}</span>
              </th>
              <th className="px-6 py-3">Download Dataset</th>
            </tr>
          </thead>

          <tbody>
            {sortedResults.map((result, index) => (
              <tr
                key={index}
                style={{
                  backgroundColor: index % 2 === 0 ? '#E0F7FA' : '#FFF3E0', // Aqua Blue & Peach
                  transition: 'background-color 0.3s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFEBEE'; // Light Rose on hover
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#E0F7FA' : '#FFF3E0';
                }}
              >
                <td className="p-3 text-center font-semibold text-teal-900 border-b">
                  <Link to={`/object/${result.objectid}`} className="hover:underline text-teal-800">
                    {result.objectid}
                  </Link>
                </td>
                <td className="p-3 text-center text-indigo-700 font-medium border-b">{result.typeid__typename}</td>
                <td className="p-3 text-center text-purple-800 border-b">{result.objectname}</td>
                <td className="p-3 text-center text-gray-800 border-b">
                  {new Date(result.field_created).toLocaleDateString()}
                </td>
                <td className="p-3 text-center text-cyan-900 border-b">{result.field_createdby__username}</td>
                <td className="p-3 text-center text-gray-900 border-b">{result.elements || '-'}</td>
                <td className="p-3 text-center text-gray-900 border-b">{result.elemnumber ?? '-'}</td>
                <td className="p-3 text-center border-b">
                  {result.has_files ? (
                    <button
                      onClick={() => downloadDataset(result.objectid)}
                      className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white px-4 py-1 rounded-md shadow-sm transition"
                    >
                      Download
                    </button>
                  ) : (
                    <span className="text-pink-700 italic">No File</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      ) : (
        <p className="text-blue-800 italic px-6 pb-6">No datasets found.</p>
      )}
    </div>
  );
};
