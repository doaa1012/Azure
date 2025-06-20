import React, { useState, useEffect } from 'react';
import { PeriodicTable } from './PeriodicTable';
import { SearchPanel } from './SearchPanel';
import { SearchResultsTable, SearchResultsDataset } from './SearchResults';
import config from '../../config_path';
const PeriodicTableSearch = () => {
  const [selectedElements, setSelectedElements] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [resultFormat, setResultFormat] = useState('table'); // Default format is table
  const [selectedObjectId, setSelectedObjectId] = useState(''); // Initialize as empty string
  const [selectedMeasurements, setSelectedMeasurements] = useState([]);
  const [elementPercentages, setElementPercentages] = useState({}); // Add state for percentages
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const resultsPerPage = 20;
  const [searchFilters, setSearchFilters] = useState({});  // Store filters globally
  const [hasSearched, setHasSearched] = useState(false);

  // Handle Element Selection
  const handleElementSelect = (elements) => {
    setSelectedElements(elements);
  };

  // Clear Selected Elements
  const clearElements = () => {
    setSelectedElements([]);
    setElementPercentages({});
  };

  // Handle Object ID Selection from Search Panel
  const handleObjectSelect = (objectId) => {
    setSelectedObjectId(objectId);
  };

  // Handle Search Function, triggered on form submission or pagination
  const handleSearch = async (searchParams) => {
    const {
      objectType,
      searchPhrase,
      createdBy,
      startDate,
      endDate,
      properties,
      selectedObjectId,
      selectedElements = [], 
      selectedMeasurements = [], 
      elementPercentages = {},
    } = searchParams;

    // Debugging logs for filter conditions
    console.log('Selected Elements:', selectedElements);
    console.log('Object Type:', objectType);
    console.log('Search Phrase:', searchPhrase);
    console.log('Created By:', createdBy);
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);
    console.log('Selected Measurements:', selectedMeasurements);
    console.log('Selected Object ID:', selectedObjectId);
    console.log('Element Percentages:', elementPercentages);

    // Check if any filters are applied
    const hasFilters =
    selectedElements.length > 0 ||
    objectType ||
    searchPhrase ||
    createdBy ||
    (startDate && endDate) ||
    selectedMeasurements.length > 0 ||
    (selectedObjectId && !isNaN(parseInt(selectedObjectId, 10))) ||
    Object.keys(elementPercentages).length > 0 ||
    (properties && properties.length > 0);
  
    if (!hasFilters) {
      console.log('No search filters applied, not sending request');
      return;  
    }
    

    const endpoint = resultFormat === 'dataset'
      ? `${config.BASE_URL}api/search-dataset/`
      : `${config.BASE_URL}api/search-table/`;

    try {
      // Construct the request payload with all possible filters
      const requestData = {
        elements: selectedElements.length > 0 ? selectedElements : null,
        object_type: objectType || '',
        search_phrase: searchPhrase || '',
        created_by: createdBy || '',
        start_date: startDate || '',
        end_date: endDate || '',
        selectedMeasurements: selectedMeasurements.length > 0 ? selectedMeasurements : [],
        object_id: selectedObjectId && !isNaN(parseInt(selectedObjectId, 10)) 
  ? parseInt(selectedObjectId, 10) 
  : null,
        elementPercentages: elementPercentages || null,
        properties: properties || [],   
        page: currentPage,
        page_size: resultsPerPage,
      };

      console.log('Sending request with data:', requestData);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${await response.text()}`);
      }

      const data = await response.json();
      setSearchResults(data.results);
      setTotalPages(data.total_pages);
    } catch (error) {
      console.error('Error fetching search results:', error);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prevPage => prevPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prevPage => prevPage - 1);
    }
  };


  const handleFormSubmit = (searchParams) => {
    setSearchFilters(searchParams);  
    setCurrentPage(1);  
    setHasSearched(true);
  };

  useEffect(() => {
    if (!hasSearched) return; // ✅ block first-load auto-search
  
    const hasFilters =
      searchFilters.selectedElements?.length > 0 ||
      searchFilters.objectType ||
      searchFilters.searchPhrase ||
      searchFilters.createdBy ||
      (searchFilters.startDate && searchFilters.endDate) ||
      searchFilters.selectedMeasurements?.length > 0 ||
      (searchFilters.selectedObjectId && !isNaN(parseInt(searchFilters.selectedObjectId))) ||
      (searchFilters.elementPercentages && Object.keys(searchFilters.elementPercentages).length > 0) ||
      (searchFilters.properties && searchFilters.properties.length > 0);
  
    if (hasFilters) {
      console.log(`Page changed to ${currentPage}, fetching data with filters...`, searchFilters);
      handleSearch({ ...searchFilters, page: currentPage });
    } else {
      console.log('Skipping search due to no filters.');
    }
  }, [currentPage, searchFilters, hasSearched]);
  

  return (
    <div className="p-4 bg-blue-50 min-h-screen text-black rounded-lg">
      <PeriodicTable
        onElementSelect={handleElementSelect}
        selectedElements={selectedElements}
      />
      <SearchPanel
        selectedElements={selectedElements}
        clearElements={clearElements}
        onSearch={handleFormSubmit} // Trigger search on form submission
        resultFormat={resultFormat}
        setResultFormat={setResultFormat}
        setSelectedMeasurements={setSelectedMeasurements}
        handleObjectSelect={handleObjectSelect}  // Pass Object Select handler to SearchPanel
        setElementPercentages={setElementPercentages} // Pass percentages handler to SearchPanel
      />
      {resultFormat === 'table' ? (
        <div>
          <SearchResultsTable results={searchResults} />
          {/* Pagination Controls */}

          <div className="flex justify-center items-center gap-6 mt-6">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="px-5 py-2 rounded bg-blue-200 hover:bg-blue-300 text-gray-800 font-medium disabled:opacity-40"
            >
              ⬅ Previous
            </button>

            <span className="text-gray-700 font-semibold">
              Page <span className="text-blue-700 font-bold">{currentPage}</span> of {totalPages}
            </span>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="px-5 py-2 rounded bg-blue-200 hover:bg-blue-300 text-gray-800 font-medium disabled:opacity-40"
            >
              Next ➡
            </button>
          </div>

        </div>
      ) : (
        <div>
          <SearchResultsDataset results={searchResults} />
          {/* Pagination Controls for Dataset */}

          <div className="flex justify-center items-center gap-6 mt-6">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="px-5 py-2 rounded bg-blue-200 hover:bg-blue-300 text-gray-800 font-medium disabled:opacity-40"
            >
              ⬅ Previous
            </button>

            <span className="text-gray-700 font-semibold">
              Page <span className="text-blue-700 font-bold">{currentPage}</span> of {totalPages}
            </span>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="px-5 py-2 rounded bg-blue-200 hover:bg-blue-300 text-gray-800 font-medium disabled:opacity-40"
            >
              Next ➡
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeriodicTableSearch;
