import React, { useState, useEffect } from 'react';
import { MeasurementFilters } from './MeasurementFilters'; 
import { ObjectTypeOptions } from './ObjectTypeOptions'; 
import ObjectSearchPage from '../ObjectSearchPage';
import { useNavigate } from 'react-router-dom';
import config from '../../config_path';
export const SearchPanel = ({ 
  selectedElements, 
  clearElements, 
  onSearch, 
  resultFormat, 
  setResultFormat, 
  setSelectedMeasurements,
  handleObjectSelect // Add handleObjectSelect prop to pass object ID to parent
}) => {
  const [objectType, setObjectType] = useState('');  
  const [searchPhrase, setSearchPhrase] = useState('');
  const [createdBy, setCreatedBy] = useState('');  // Dropdown for user selection
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [objectID, setObjectID] = useState('');  // State for Object ID (input field for number)
  const [elementPercentages, setElementPercentages] = useState({}); 
  const [users, setUsers] = useState([]);  // State for storing fetched users
  const [isLoading, setIsLoading] = useState(true);  // Loading state for users
  const navigate = useNavigate();

  const goToQueryForm = () => {
    navigate('/QueryForm');
};

  // Fetch users from backend API for "Created By" dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${config.BASE_URL}api/users/`);
        if (!response.ok) {
          throw new Error(`Failed to fetch users: ${response.statusText}`);
        }
        const usersData = await response.json();
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUsers();
  }, []);

  // Handle percentage input change for each element
  const handlePercentageChange = (element, type, value) => {
    setElementPercentages(prevState => ({
      ...prevState,
      [element]: {
        ...prevState[element],
        [type]: value
      }
    }));
  };

  // Handle Object ID change and pass it to the parent component
  const handleObjectIdChange = (e) => {
    const value = e.target.value;
    setObjectID(value);
    handleObjectSelect(value); // Call the parent's function to pass the object ID
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    const searchParams = {
      objectType,         
      searchPhrase,
      createdBy,
      startDate,
      endDate,
      objectID: objectID ? parseInt(objectID, 10) : null, 
      elementPercentages, 
    };

    console.log('Submitting search with params:', searchParams); 

    // Call the onSearch function passed from the parent component
    onSearch(searchParams);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {/* Selected elements and percentage inputs */}
      <div className="flex items-center space-x-4">
        <input
          type="text"
          readOnly
          value={selectedElements.length > 0 ? selectedElements.join(', ') : 'No elements selected'}
          className="p-2 border border-gray-300 rounded flex-grow bg-gray-50"
        />
        <button type="button" onClick={clearElements} className="hover:bg-blue-600 p-2 rounded bg-red-500 text-white">
          Clear
        </button>
      </div>

      {/* Percentage range for each selected element */}
      {selectedElements.map(element => (
        <div key={element} className="flex space-x-4 items-center">
          <span>{element}</span>
          <input
            type="number"
            placeholder="Min %"
            value={elementPercentages[element]?.min || ''}
            onChange={(e) => {
              const value = Math.max(0, e.target.value); 
              handlePercentageChange(element, 'min', value);
            }}
            className="p-2 border border-gray-300 rounded w-20"
          />
          <input
            type="number"
            placeholder="Max %"
            value={elementPercentages[element]?.max || ''}
            onChange={(e) => {
              const value = Math.min(100, e.target.value); 
              handlePercentageChange(element, 'max', value);
            }}
            className="p-2 border border-gray-300 rounded w-20"
          />

          <button
            type="button"
            onClick={() => {
              const newElements = selectedElements.filter(el => el !== element);
              clearElements(newElements); 
            }}
            className="hover:bg-red-600 p-2 rounded bg-red-500 text-white"
          >
            Delete
          </button>
        </div>
      ))}

      {/* Object ID Input */}
      <div className="input-group">
        <label className="block font-semibold mb-2">Object ID:</label>
        <input
          type="text"
          value={objectID}
          onChange={handleObjectIdChange} // Update Object ID and pass it to the parent
          placeholder="Enter Object ID"
          className="p-2 border border-gray-300 rounded w-full"
        />
      </div>

      {/* Created By Dropdown */}
      <div className="input-group">
        <label className="block font-semibold mb-2">Created By:</label>
        <select 
          value={createdBy} 
          onChange={(e) => setCreatedBy(e.target.value)} 
          className="p-2 border border-gray-300 rounded w-full"
          disabled={isLoading} 
        >
          <option value="">Select User</option>
          {isLoading ? (
            <option>Loading...</option>
          ) : (
            users.map(user => (
              <option key={user.id} value={user.username}>{user.username}</option>
            ))
          )}
        </select>
      </div>

      {/* Object Type Selection */}
      <div className="input-group">
        <label className="block font-semibold mb-2">Object Type:</label>
        <select 
          value={objectType} 
          onChange={(e) => setObjectType(e.target.value)} 
          className="p-2 border border-gray-300 rounded w-full"
        >
          <option value="">Select Type</option>
          <ObjectTypeOptions />  
        </select>
      </div>

      {/* Search Phrase */}
      <div className="input-group">
        <label className="block font-semibold mb-2">Search Phrase:</label>
        <input
          type="text"
          value={searchPhrase}
          onChange={(e) => setSearchPhrase(e.target.value)}
          placeholder="Search by name or description"
          className="p-2 border border-gray-300 rounded w-full"
        />
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="input-group">
          <label className="block font-semibold mb-2">Start Date:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-2 border border-gray-300 rounded w-full"
          />
        </div>
        <div className="input-group">
          <label className="block font-semibold mb-2">End Date:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-2 border border-gray-300 rounded w-full"
          />
        </div>
      </div>

      {/* Measurement Filters */}
      <MeasurementFilters 
        setSelectedMeasurements={setSelectedMeasurements}
      />

      {/* Result Format */}
      <div className="input-group">
        <label className="block font-semibold mb-2">Result Format:</label>
        <select 
          value={resultFormat} 
          onChange={(e) => setResultFormat(e.target.value)} 
          className="p-2 border border-gray-300 rounded w-full"
        >
          <option value="table">Table</option>
          <option value="dataset">Dataset</option>
        </select>
      </div>
      <button
    type="button"
    onClick={goToQueryForm}
    className="hover:bg-blue-600 p-2 rounded bg-green-500 text-white w-full"
>
Advanced Search
</button>


      {/* Submit Button */}
      <button type="submit" className="hover:bg-blue-600 p-2 rounded bg-blue-500 text-white w-full">
        Search
      </button>
    </form>
  );
};
