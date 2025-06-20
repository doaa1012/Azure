import React, { useState, useEffect } from "react";
import Select from "react-select";
import { PeriodicTable } from "./PeriodicTableElements/PeriodicTable";
import Modal from "./Create_object/Modal";
import config from "../config_path";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const SampleAssociationSearch = () => {
  const [typenames, setTypenames] = useState([]);
  const [selectedTypenames, setSelectedTypenames] = useState([]);
  const [selectedElements, setSelectedElements] = useState([]);
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [strictSearch, setStrictSearch] = useState(false);
  const [sampleAssociations, setSampleAssociations] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elementDetails, setElementDetails] = useState({});
  const [chartData, setChartData] = useState([]);
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; 
  const [userOptions, setUserOptions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [properties, setProperties] = useState([
    { table: "", name: "", value: "" }
  ]);
  const [propertyNames, setPropertyNames] = useState({});

  const propertyTables = [
    { label: "Property String", value: "propertystring" },
    { label: "Property Int", value: "propertyint" },
    { label: "Property Float", value: "propertyfloat" },
    { label: "Property Big String", value: "propertybigstring" }
  ];
  
  // Calculate total pages
  const totalPages = Math.ceil(Object.keys(sampleAssociations).length / pageSize);
  // Define color palette
const colorPalette = [
  "#4A90E2", "#FF6F61", "#FFB74D", "#81C784", "#BA68C8", "#F06292",
  "#64B5F6", "#FFD54F", "#A1887F", "#4DB6AC"
];

// Function to assign colors dynamically
const getBarColor = (index) => colorPalette[index % colorPalette.length];
  // Get paginated results
  const paginatedSamples = Object.entries(sampleAssociations)
    .slice((currentPage - 1) * pageSize, currentPage * pageSize);


  useEffect(() => {
    fetch(`${config.BASE_URL}api/list_editor/`)
      .then((response) => response.json())
      .then((data) => {
        const sortedTypenames = data.map((item) => ({
          value: item.typeid.typename,
          label: item.typeid.typename,
        }));
        setTypenames(sortedTypenames);
      })
      .catch((error) => console.error("Error fetching typenames:", error));
  }, []);

  useEffect(() => {
    propertyTables.forEach((table) => {
      fetch(`${config.BASE_URL}api/distinct_property_names/${table.value}/`)
        .then(res => res.json())
        .then(data => {
          setPropertyNames(prev => ({ ...prev, [table.value]: data }));
        });
    });
  }, []);
  

  useEffect(() => {
    fetch(`${config.BASE_URL}api/users/`)
      .then(res => res.json())
      .then(data => setUserOptions(data.map(u => ({ value: u.id, label: u.username }))));
  }, []);
  
  const handleSearch = () => {
    setLoading(true);
    setSampleAssociations({}); // Clear previous results here
    setChartData([]); // Optionally clear chart data too
  
    const formattedElements = selectedElements.map((element) => {
      const details = elementDetails[element] || {}; // Get min/max if exists
      return {
        element,
        min: details.min !== undefined ? parseFloat(details.min) : null,  // Ensure it's a number
        max: details.max !== undefined ? parseFloat(details.max) : null,
      };
    });
  
    const payload = {
      typenames: selectedTypenames.map((t) => t.value),
      elements: formattedElements, 
      createdFrom,
      createdTo,
      strict: strictSearch,
      createdBy: selectedUser?.value || null,
      properties: properties.filter(p => p.table && p.name && p.value)
    };
    
    console.log(" Sending Payload:", JSON.stringify(payload, null, 2)); // Debug output
  
    fetch(`${config.BASE_URL}api/sample_typename_element_association/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Fetched Data:", data);
        if (data && data.samples) {
          setSampleAssociations(data.samples);
        } else {
          console.warn("No samples found");
          setSampleAssociations({});
        }
        setCurrentPage(1);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching samples:", error);
        setLoading(false);
      });
  };
  

  const handleElementPercentageChange = (element, type, value) => {
    setElementDetails((prev) => ({
      ...prev,
      [element]: {
        ...prev[element],
        [type]: value !== "" ? parseFloat(value) : null, // Ensure correct data type
      },
    }));
  };
  
  
  const handleElementSelect = (newSelectedElements) => {
    setSelectedElements(newSelectedElements);
  };

  const handleDownloadSample = (sampleId) => {
    fetch(`${config.BASE_URL}api/download_sample_files/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sampleId,
        typenames: selectedTypenames.map((t) => t.value)
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to download ZIP. Please check server logs.");
        }
        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `sample_${sampleId}_files.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch((error) => console.error("Error downloading sample:", error));
  };

  const handleDownloadAll = () => {
    const sampleIds = Object.keys(sampleAssociations);
    if (sampleIds.length === 0) return;

    fetch(`${config.BASE_URL}api/download_all_samples/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sampleIds,
        typenames: selectedTypenames.map((t) => t.value)
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to download ZIP. Please check server logs.");
        }
        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "all_samples.zip";
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch((error) => console.error("Error downloading all samples:", error));
  };

  const handleDownloadProcessedData = (sampleId) => {
    if (!selectedTypenames.length) {
      console.error("No typenames selected for processing.");
      return;
    }

    fetch(`${config.BASE_URL}api/download_processed_data/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sampleId,
        typenames: selectedTypenames.map((t) => t.value)
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to download JSON. Please check server logs.");
        }
        return response.blob();
      })
      .then((blob) => {
        if (blob.size === 0) {
          console.error("Empty JSON file received.");
          alert("No valid data available for processing.");
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `processed_sample_${sampleId}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch((error) => console.error("Error downloading processed data:", error));
  };

  const handleDownloadAllProcessedData = () => {
    const sampleIds = Object.keys(sampleAssociations);
    if (sampleIds.length === 0) {
      alert("No samples found for processing.");
      return;
    }

    fetch(`${config.BASE_URL}api/download_all_processed_data/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sampleIds,
        typenames: selectedTypenames.map((t) => t.value)
      }),
    })
      .then((response) => {
        console.log("Download All Processed Data Response:", response);
        if (!response.ok) {
          throw new Error(`Failed to download JSON: ${response.statusText}`);
        }
        return response.blob();
      })
      .then((blob) => {
        if (blob.size === 0) {
          console.error("Empty JSON file received.");
          alert("No valid data available.");
          return;
        }
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "all_processed_samples.json";
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch((error) => {
        console.error("Error downloading all processed data:", error);
        alert(`Error: ${error.message}`);
      });
  };
  const getChartData = () => {
    if (!sampleAssociations || Object.keys(sampleAssociations).length === 0) {
      console.log("No sampleAssociations data available.");
      return [];
    }
  
    const typeCounts = {};
  
    Object.values(sampleAssociations).forEach((sample) => {
      if (sample.associatedTypes && sample.associatedTypes.length > 0) {
        sample.associatedTypes.forEach((typename) => {
          //  Only count typenames the user searched for
          if (selectedTypenames.some((t) => t.value === typename)) {
            typeCounts[typename] = (typeCounts[typename] || 0) + 1;
          }
        });
      } else {
        console.log(`Sample ${sample.objectId} has no associated typenames.`);
      }
    });
  
    // Convert object to array for Recharts
    return Object.entries(typeCounts).map(([typename, count]) => ({
      typename,
      count,
    }));
  };
  

useEffect(() => {
  setChartData(getChartData());
}, [sampleAssociations, selectedTypenames]); 

  return (
    <div className="p-8 bg-gradient-to-r from-blue-50 via-blue-100 to-indigo-100 min-h-screen">
      <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-blue-600 mb-6">
          Search Samples by Associated Type names & Elements
        </h1>

        {/* Typename Selection */}
        <div className="mb-6">
          <label className="block text-lg font-medium text-blue-700">
            Select Associated Type names
          </label>
          <Select
            options={typenames}
            isMulti
            onChange={setSelectedTypenames}
            placeholder="Choose typenames..."
            className="mb-4"
          />
        </div>

        {/* Element Selection */}
        <div className="mb-6">
          <label className="block text-lg font-medium text-blue-700">
            Select Elements
          </label>
          <button
            type="button"
            className="mt-2 bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition"
            onClick={() => setIsModalOpen(true)}
          >
            Add Elements
          </button>
          {selectedElements.length > 0 && (
            <div className="mt-2 text-indigo-700">
              <strong>Selected Elements:</strong> {selectedElements.join(", ")}
            </div>
          )}
        </div>
        {selectedElements.length > 0 && (
  <div className="mt-4 flex flex-wrap gap-1">
    {selectedElements.map((element) => (
      <div key={element} className="p-1 bg-indigo-50 border border-indigo-300 rounded shadow-sm w-48">
        <h4 className="text-sm font-semibold text-indigo-800">{element}</h4>
        <div className="flex gap-1 mt-1">
          <div className="flex-1">
            <label className="block text-xs text-indigo-600">Min %</label>
            <input
              type="number"
              placeholder="Min"
              value={elementDetails[element]?.min || ""}
              onChange={(e) => handleElementPercentageChange(element, "min", e.target.value)}
              className="w-14 h-6 p-1 border border-indigo-300 rounded text-xs"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-indigo-600">Max %</label>
            <input
              type="number"
              placeholder="Max"
              value={elementDetails[element]?.max || ""}
              onChange={(e) => handleElementPercentageChange(element, "max", e.target.value)}
              className="w-14 h-6 p-1 border border-indigo-300 rounded text-xs"
            />
          </div>
        </div>
        <button
          className="mt-1 text-red-500 hover:text-red-700 text-xs font-medium"
          onClick={() => setSelectedElements((prev) => prev.filter((el) => el !== element))}
        >
          Remove
        </button>
      </div>
    ))}
  </div>
)}
        {/* Date Filters */}
        <div className="mb-6">
          <label className="block text-lg font-medium text-blue-700">
            Created From
          </label>
          <input
            type="date"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
            className="w-full p-3 border rounded"
          />
        </div>
        <div className="mb-6">
          <label className="block text-lg font-medium text-blue-700">
            Created To
          </label>
          <input
            type="date"
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
            className="w-full p-3 border rounded"
          />
        </div>
{/* Created By User */}
<label className="block text-lg font-medium text-blue-700 mt-4">Created By</label>
<Select options={userOptions} onChange={setSelectedUser} placeholder="Filter by user..." />
{/* Properties Filter */}
<div className="mt-6">
  <label className="block text-lg font-medium text-blue-700 mb-2">
    Filter by Properties
  </label>

  {properties.map((prop, i) => (
    <div key={i} className="grid grid-cols-3 gap-3 mb-3">
      {/* Table Dropdown */}
      <select
        value={prop.table}
        onChange={(e) => {
          const newProps = [...properties];
          newProps[i].table = e.target.value;
          newProps[i].name = ""; // Reset name when table changes
          setProperties(newProps);
        }}
        className="border border-gray-300 p-2 rounded w-full"
      >
        <option value="">Select Table</option>
        {propertyTables.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Property Name Dropdown */}
      <select
        value={prop.name}
        onChange={(e) => {
          const newProps = [...properties];
          newProps[i].name = e.target.value;
          setProperties(newProps);
        }}
        className="border border-gray-300 p-2 rounded w-full"
        disabled={!prop.table}
      >
        <option value="">Select Property</option>
        {(propertyNames[prop.table] || []).map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>

      {/* Value Input */}
      <input
        type="text"
        placeholder="Value"
        value={prop.value}
        onChange={(e) => {
          const newProps = [...properties];
          newProps[i].value = e.target.value;
          setProperties(newProps);
        }}
        className="border border-gray-300 p-2 rounded w-full"
      />
    </div>
  ))}

  <button
    onClick={() => setProperties([...properties, { table: "", name: "", value: "" }])}
    className="text-blue-600 hover:text-blue-800 font-medium mt-1"
  >
    + Add Property
  </button>
</div>

<br />
       {/* Switch */}
<div className="mb-6 flex items-center">
  <label className="text-lg font-medium text-blue-700 mr-4">
    Enable Strict Search
  </label>
  <label className="relative inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      checked={strictSearch}
      onChange={() => setStrictSearch(!strictSearch)}
      className="sr-only peer"
    />
    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
  </label>
</div>


        {/* Search Button */}
        <button
          onClick={() => handleSearch(1)}
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition"
        >
          Search
        </button>

        {/* Loading Indicator */}
        {loading && <p className="text-blue-600 mt-4">Loading samples...</p>}

        {/* Results Section */}
        {Object.keys(sampleAssociations).length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-blue-700">Search Results</h2>

            {/* Download Buttons */}
            <button onClick={handleDownloadAll} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition mt-4">
              Download All Samples
            </button>
            <button onClick={handleDownloadAllProcessedData} className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition mt-4 ml-4">
              Download All Processed JSON
            </button>

            <ul className="space-y-4 mt-4">
              {paginatedSamples.map(([sampleId, data]) => (
                <li key={sampleId} className="bg-blue-100 p-4 rounded shadow">
                  <p>
                    <strong>Sample ID:</strong>
                    <Link to={`/object/${sampleId}`} className="text-blue-600 underline ml-2">{sampleId}</Link>
                  </p>
                  <p>
                    <strong>Associated Objects:</strong>{" "}
                    {data.associatedTypes.join(", ")}
                  </p>
                  <p>
                    <strong>Elements:</strong> {data.elements.join(", ")}
                  </p>
                  <p>
                    <strong>Created:</strong> {data.created}
                  </p>
                  {/* Buttons for Download */}
                  <button onClick={() => handleDownloadSample(sampleId)} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
                    Download Sample
                  </button>
                  <button onClick={() => handleDownloadProcessedData(sampleId)} className="mt-2 ml-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition">
                    Download Processed JSON
                  </button>
                </li>
              ))}
            </ul>
             
          </div>
        )}

{chartData.length > 0 ? (
  <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
    <h2 className="text-xl font-semibold text-blue-700">
      Associated Object Type Counts
    </h2>
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
        <XAxis 
          dataKey="typename" 
          angle={-45} 
          textAnchor="end" 
          interval={0} 
          height={100} 
          tick={{ fill: "#333", fontSize: 12 }} 
        />
        <YAxis tick={{ fill: "#333", fontSize: 12 }} />
        <Tooltip 
          contentStyle={{ backgroundColor: "#fff", border: "1px solid #ddd" }} 
          itemStyle={{ color: "#333" }} 
        />
        <Legend />

        {/* Single Bar component with dynamic colors */}
        <Bar 
          dataKey="count" 
          fill="#4A90E2" 
          radius={[5, 5, 0, 0]} 
          barSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
) : (
  <p className="text-gray-500 text-center mt-4">No data available for the chart.</p>
)}
        {/* Pagination Controls */}
       {/* Fancy Pagination */}
<div className="flex justify-center items-center gap-6 mt-6">
  <button
    onClick={() => setCurrentPage(currentPage - 1)}
    disabled={currentPage === 1}
    className="px-5 py-2 rounded bg-blue-200 hover:bg-blue-300 text-gray-800 font-medium disabled:opacity-40"
  >
    ⬅ Previous
  </button>
  <span className="text-gray-700 font-semibold">
    Page <span className="text-blue-700 font-bold">{currentPage}</span> of {totalPages}
  </span>
  <button
    onClick={() => setCurrentPage(currentPage + 1)}
    disabled={currentPage === totalPages}
    className="px-5 py-2 rounded bg-blue-200 hover:bg-blue-300 text-gray-800 font-medium disabled:opacity-40"
  >
    Next ➡
  </button>
</div>

      </div>

      {/*  Modal for Periodic Table */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h3 className="text-xl font-semibold mb-4">Select Elements</h3>
        <PeriodicTable
          onElementSelect={handleElementSelect}
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


export default SampleAssociationSearch;
