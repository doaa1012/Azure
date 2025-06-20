import React, { useState, useEffect } from "react";
import { PeriodicTable } from "./PeriodicTableElements/PeriodicTable";
import Modal from "./Create_object/Modal";
import Select from 'react-select';
import config from "../config_path";
const ObjectSearchPage = () => {
  const [typenames, setTypenames] = useState([]);
  const [query, setQuery] = useState({
    typename: "", // String
    associatedTypes: [], // Array of strings
    chemicalSystem: "", // String
    createdFrom: "", // Date string
    createdTo: "", // Date string
  });

  const [selectedElements, setSelectedElements] = useState([]);
  const [elementDetails, setElementDetails] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [properties, setProperties] = useState([{ table: "", name: "", value: "" }]);
  const [propertyNames, setPropertyNames] = useState({});
  useEffect(() => {
    const propertyTables = ["propertystring", "propertyint", "propertyfloat", "propertybigstring"];
    propertyTables.forEach((table) => {
      fetch(`${config.BASE_URL}api/distinct_property_names/${table}/`)
        .then(res => res.json())
        .then(data => {
          setPropertyNames(prev => ({ ...prev, [table]: data }));
        });
    });
  }, []);

  // Custom styles for react-select to match other inputs
  const customSelectStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: 'rgb(240, 245, 255)', // Match the input background
      border: '1px solid rgb(190, 190, 250)', // Match the border
      borderRadius: '0.375rem', // Match rounded corners
      padding: '0.5rem', // Add padding for better appearance
      boxShadow: 'none',
      '&:hover': {
        borderColor: 'rgb(110, 110, 220)', // Hover effect
      },
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'rgb(240, 245, 255)', // Match the dropdown background
      zIndex: 999, // Ensure it's above other components
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? 'rgb(110, 110, 220)' : 'rgb(240, 245, 255)',
      color: state.isSelected ? 'white' : 'black',
      '&:hover': {
        backgroundColor: 'rgb(190, 190, 250)',
      },
    }),
  };
  // Fetch available typenames from the backend
  useEffect(() => {
    fetch(`${config.BASE_URL}api/list_editor/`)
      .then((response) => response.json())
      .then((data) => {
        const sortedTypenames = data.map((item) => item.typeid.typename).sort();
        setTypenames(sortedTypenames);
      })
      .catch((error) => console.error("Error fetching typenames:", error));
  }, []);

  // Update the chemical system whenever selected elements change
  useEffect(() => {
    setQuery((prevQuery) => ({
      ...prevQuery,
      chemicalSystem: selectedElements.join("-"),
    }));
  }, [selectedElements]);

  const handleInputChange = (field, value) => {
    setQuery((prevQuery) => ({
      ...prevQuery,
      [field]: value,
    }));
  };

  const handleSearch = (page = 1) => {
    const queryPayload = {
      typename: query.typename,
      associatedTypes: query.associatedTypes,
      chemicalSystem: query.chemicalSystem,
      createdFrom: query.createdFrom,
      createdTo: query.createdTo,
      elements: selectedElements.map((element) => ({
        element,
        min: elementDetails[element]?.min || null,
        max: elementDetails[element]?.max || null,
      })),
      properties: properties.filter(p => p.table && p.name && p.value),
      page,
      pageSize: 10,
    };

    console.log("🔎 Sending Search Request:", JSON.stringify(queryPayload, null, 2));

    fetch(`${config.BASE_URL}api/object_search/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queryPayload),
    })
      .then((response) => response.json())
      .then((data) => {
        setResults(data.results);
        setTotalPages(data.totalPages);
        setCurrentPage(data.currentPage);
      })
      .catch((error) => console.error("Error fetching search results:", error));
  };


  const handleDownloadObject = (objectId) => {
    fetch(`${config.BASE_URL}api/download_dataset/${objectId}/`, {
      method: "GET",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to download dataset");
        }
        return response.blob(); // Convert response to blob
      })
      .then((blob) => {
        // Create a URL for the blob
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `dataset_${objectId}.zip`; // Name of the downloaded file
        document.body.appendChild(link);
        link.click();
        link.remove(); // Clean up
      })
      .catch((error) => console.error("Error downloading dataset:", error));
  };

  const handleElementPercentageChange = (element, type, value) => {
    setElementDetails((prev) => ({
      ...prev,
      [element]: {
        ...prev[element],
        [type]: value !== "" ? parseFloat(value) : null,
      },
    }));
  };

  return (
    <div className="flex flex-col items-center p-8 bg-gradient-to-r from-blue-50 via-indigo-50 to-indigo-100 min-h-screen">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-5xl">
        <h1 className="text-3xl font-bold text-indigo-600 text-center mb-8">
          Advanced Object Search
        </h1>

        {/* Search Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Typename Selection */}
          <div>
            <label className="block text-lg font-medium text-indigo-800">Looking for</label>
            <select
              value={query.typename}
              onChange={(e) => handleInputChange("typename", e.target.value)}
              className="w-full p-3 bg-indigo-50 border border-indigo-300 rounded focus:ring focus:ring-indigo-300"
            >
              <option value="">-= Select typename =-</option>
              {typenames.map((typename, index) => (
                <option key={index} value={typename}>
                  {typename}
                </option>
              ))}
            </select>
          </div>

          {/* Associated Type Selection */}
          <div>
            <label className="block text-lg font-medium text-indigo-800">Which has</label>
            <Select
              isMulti
              options={typenames.map((typename) => ({
                value: typename,
                label: typename,
              }))}
              onChange={(selectedOptions) =>
                handleInputChange(
                  'associatedTypes',
                  selectedOptions ? selectedOptions.map((option) => option.value) : []
                )
              }
              styles={customSelectStyles} // Apply custom styles
              className="react-select-container"
              classNamePrefix="react-select"
            />
            {query.associatedTypes.length > 0 && (
              <div className="mt-2 text-indigo-700">
                <strong>Selected Types:</strong> {query.associatedTypes.join(', ')}
              </div>
            )}
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-lg font-medium text-indigo-800">Created From</label>
            <input
              type="date"
              value={query.createdFrom}
              onChange={(e) => handleInputChange("createdFrom", e.target.value)}
              className="w-full p-3 bg-indigo-50 border border-indigo-300 rounded focus:ring focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="block text-lg font-medium text-indigo-800">Created To</label>
            <input
              type="date"
              value={query.createdTo}
              onChange={(e) => handleInputChange("createdTo", e.target.value)}
              className="w-full p-3 bg-indigo-50 border border-indigo-300 rounded focus:ring focus:ring-indigo-300"
            />
          </div>
          <div className="mt-6">
            <label className="block text-lg font-medium text-indigo-800 mb-2">
              Filter by Properties
            </label>

            {properties.map((prop, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                {/* Property Table Dropdown */}
                <select
                  value={prop.table}
                  onChange={(e) => {
                    const updated = [...properties];
                    updated[i].table = e.target.value;
                    updated[i].name = "";
                    setProperties(updated);
                  }}
                  className="w-full p-3 bg-indigo-50 border border-indigo-300 rounded focus:ring focus:ring-indigo-300"
                >
                  <option value="">Select Table</option>
                  <option value="propertystring">Property String</option>
                  <option value="propertyint">Property Int</option>
                  <option value="propertyfloat">Property Float</option>
                  <option value="propertybigstring">Property Big String</option>
                </select>

                {/* Property Name Dropdown */}
                <select
                  value={prop.name}
                  onChange={(e) => {
                    const updated = [...properties];
                    updated[i].name = e.target.value;
                    setProperties(updated);
                  }}
                  className="w-full p-3 bg-indigo-50 border border-indigo-300 rounded focus:ring focus:ring-indigo-300"
                  disabled={!prop.table}
                >
                  <option value="">Select Property</option>
                  {(propertyNames[prop.table] || []).map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>

                {/* Property Value Input */}
                <input
                  type="text"
                  value={prop.value}
                  onChange={(e) => {
                    const updated = [...properties];
                    updated[i].value = e.target.value;
                    setProperties(updated);
                  }}
                  placeholder="Value"
                  className="w-full p-3 bg-indigo-50 border border-indigo-300 rounded focus:ring focus:ring-indigo-300"
                />
              </div>
            ))}

            <button
              onClick={() => setProperties([...properties, { table: "", name: "", value: "" }])}
              className="text-indigo-600 hover:text-indigo-800 font-medium mt-1 focus:outline-none focus:ring-0"
            >
              + Add Property
            </button>

          </div>

          {/* Chemical System Selection */}
          <div className="col-span-2">
            <label className="block text-lg font-medium text-indigo-800">Including Elements</label>
            <button
              type="button"
              className="mt-2 bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition"
              onClick={() => setIsModalOpen(true)}
            >
              Add Elements
            </button>
          </div>
        </div>

        {/* Element Grid */}
        {selectedElements.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-indigo-800 mb-4">Element Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedElements.map((element) => (
                <div key={element} className="p-4 bg-indigo-50 border border-indigo-300 rounded-lg">
                  <h4 className="text-lg font-semibold text-indigo-800">{element}</h4>
                  <label className="block text-sm text-indigo-600 mt-2">Min %</label>
                  <input
                    type="number"
                    placeholder="Min"
                    value={elementDetails[element]?.min || ""}
                    onChange={(e) => handleElementPercentageChange(element, "min", e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                  <label className="block text-sm text-indigo-600 mt-2">Max %</label>
                  <input
                    type="number"
                    placeholder="Max"
                    value={elementDetails[element]?.max || ""}
                    onChange={(e) => handleElementPercentageChange(element, "max", e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                  <button
                    className="mt-2 text-red-500 hover:text-red-700"
                    onClick={() =>
                      setSelectedElements((prev) => prev.filter((el) => el !== element))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Search Button */}
        <div className="text-center mt-8">
          <button
            onClick={() => handleSearch()} // Do not pass the event object
            className="bg-green-500 text-white px-8 py-3 rounded-lg shadow hover:bg-green-600 transition"
          >
            Search
          </button>

        </div>
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="mt-10 bg-white p-6 rounded-lg shadow-lg w-full max-w-5xl">
          <h2 className="text-2xl font-semibold text-indigo-800 mb-4">Search Results</h2>
          <ul className="space-y-4">
            {results.map((result, index) => (
              <li
                key={index}
                className="p-4 bg-indigo-50 border border-indigo-300 rounded hover:bg-indigo-100 transition"
              >
                <p>
                  <strong>Object Name:</strong>{" "}
                  <a
                    href={`/object/${result.objectid}`}
                    className="text-blue-500 hover:underline"
                  >
                    {result.objectname || "Unnamed Object"}
                  </a>
                </p>
                <p>
                  <strong>Typename:</strong> {result.typename}
                </p>
                <AssociatedTypesDisplay associatedTypes={result.associatedTypes} />
                <p>
                  <strong>Created:</strong> {result.created}
                </p>
                <p>
                  <strong>Elements:</strong> {result.elements}
                </p>
                <p>
                  <strong>Compositions:</strong>{" "}
                  {result.compositions
                    .map((comp) => `${comp.element}: ${comp.percentage}%`)
                    .join(", ")}
                </p>
                {/* Add Download Button */}
                <button
                  onClick={() => handleDownloadObject(result.objectid)}
                  className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                >
                  Download Dataset
                </button>
              </li>
            ))}
          </ul>

          {/* Pagination Controls */}
          <div className="flex justify-center items-center mt-8 space-x-2 flex-wrap">
            <button
              onClick={() => handleSearch(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg shadow-sm transition ${currentPage === 1
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-indigo-500 text-white hover:bg-indigo-600'
                }`}
            >
              ⟨ Prev
            </button>

            {/* Show a range of pages around the current one */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
              .map((page) => (
                <button
                  key={page}
                  onClick={() => handleSearch(page)}
                  className={`px-3 py-2 rounded-lg text-sm shadow-sm transition ${page === currentPage
                    ? 'bg-indigo-700 text-white font-bold'
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                    }`}
                >
                  {page}
                </button>
              ))}

            <button
              onClick={() => handleSearch(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg shadow-sm transition ${currentPage === totalPages
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-indigo-500 text-white hover:bg-indigo-600'
                }`}
            >
              Next ⟩
            </button>
          </div>

        </div>

      )}


      {/* Modal for Periodic Table */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h3 className="text-xl font-semibold mb-4">Select Elements</h3>
        <PeriodicTable
          onElementSelect={setSelectedElements}
          selectedElements={selectedElements}
        />
        <button
          className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
          onClick={() => setIsModalOpen(false)}
        >
          Confirm Selection
        </button>
      </Modal>
    </div>
  );
};

// Subcomponent for Associated Types with Show More/Less
const AssociatedTypesDisplay = ({ associatedTypes }) => {
  const [showAll, setShowAll] = useState(false);

  const displayedTypes = showAll ? associatedTypes : associatedTypes.slice(0, 5);

  return (
    <div>
      <p>
        <strong>Associated Types:</strong>{" "}
        {displayedTypes.join(", ")}
      </p>
      {associatedTypes.length > 5 && (
        <button
          onClick={() => setShowAll((prev) => !prev)}
          className="text-blue-500 hover:underline"
        >
          {showAll ? "Show Less" : `Show More (${associatedTypes.length - 5})`}
        </button>
      )}
    </div>
  );
};

export default ObjectSearchPage;
