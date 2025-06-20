import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import config from "../config_path";
import axios from "axios";
import Plot from "react-plotly.js";
import "./CSVTable.css"; // Import Table Styling

const CsvViewerPage = () => {
    const { objectId } = useParams();
    const navigate = useNavigate();
    
    const [data, setData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState(null);
    
    const [xAxis, setXAxis] = useState("");
    const [yAxis, setYAxis] = useState([]);
    const [plotData, setPlotData] = useState([]);
    const [isEdxCsv, setIsEdxCsv] = useState(false);
    const [selectAll, setSelectAll] = useState(false);
    const [excludedElements, setExcludedElements] = useState([]);
    const [availableElements, setAvailableElements] = useState([]); // ✅ Extracted from CSV dynamically
    const [plotImage, setPlotImage] = useState("");

    useEffect(() => {
        if (!objectId) return;
    
        axios.get(`${config.BASE_URL}api/get_csv_data/${objectId}/`)
            .then((response) => {
                //console.log("Backend Response:", response.data);
                
                const { columns, data, fileName, objectType } = response.data;
    
                setColumns(columns || []);
                setData(data || []);
                setFileName(fileName || "Unknown File");
    
                // ✅ Extract elements dynamically (ignore 'x' and 'y')
                if (columns && Array.isArray(columns)) {
                    const elements = columns.filter(col => col.toLowerCase() !== "x" && col.toLowerCase() !== "y");
                    setAvailableElements(elements);
                } else {
                    setAvailableElements([]);  // Ensure it's an empty list if data is incorrect
                }
    
                // ✅ Ensure `objectType` exists before using `.trim()`
                if (objectType && typeof objectType === "string") {
                    const normalizedType = objectType.trim().toLowerCase();
                    setIsEdxCsv(normalizedType === "edx csv" && columns.includes("x") && columns.includes("y"));
                } else {
                    console.warn("⚠️ objectType is missing or not a string:", objectType);
                    setIsEdxCsv(false);
                }
            })
            .catch((error) => {
                console.error("Error fetching CSV data:", error);
                setError("Failed to load CSV data.");
            });
    }, [objectId]);
    
    
    
    // ✅ Handle element exclusion
    const handleElementToggle = (element) => {
        setExcludedElements((prev) =>
            prev.includes(element) ? prev.filter(el => el !== element) : [...prev, element]
        );
    };

    // ✅ Handle "Select All" toggle for Y-axis
    const handleSelectAll = () => {
        if (selectAll) {
            setYAxis([]);
        } else {
            setYAxis(columns.filter(col => col !== xAxis));
        }
        setSelectAll(!selectAll);
    };

    // ✅ Handle plot generation
    const handlePlot = () => {
        if (!xAxis || yAxis.length === 0) {
            alert("Please select an X-axis and at least one Y-axis.");
            return;
        }

        const traces = yAxis.map((yCol) => ({
            x: data.map(row => row[xAxis]),
            y: data.map(row => row[yCol]),
            type: "scatter",
            mode: "lines+markers",
            name: yCol
        }));

        setPlotData(traces);
    };

     // ✅ Fetch CSV data & generate plots
     const fetchCsvData = () => {
        if (!objectId) return;
    
        const params = new URLSearchParams();
        excludedElements.forEach((el) => params.append("exclude", el.toLowerCase()));

        axios.get(`${config.BASE_URL}api/get_csv_data/${objectId}/?${params.toString()}`)
            .then((response) => {
                //console.log("Backend Response:", response.data);
                setColumns(response.data.columns);
                setData(response.data.data);
                setFileName(response.data.fileName);

                if (response.data.plots && response.data.plots.edx_plot) {
                    setPlotImage(`data:image/png;base64,${response.data.plots.edx_plot}`);
                } else {
                    setPlotImage(null);
                }
            })
            .catch((error) => {
                console.error("Error fetching CSV data:", error);
                setError("Failed to load CSV data.");
            });
    };

    return (
        <div className="container mx-auto p-8 bg-blue-50 min-h-screen">
            {/* File Header */}
            <div className="flex justify-between items-center mb-6 bg-white p-4 shadow-lg rounded-lg">
                <h2 className="text-3xl font-bold text-gray-800">📊 CSV Viewer: {fileName}</h2>
                <button className="bg-red-500 text-white px-5 py-3 rounded-lg shadow-md hover:bg-red-700 transition" onClick={() => navigate(-1)}>
                    ← Go Back
                </button>
            </div>

            {/* Chart Controls */}
            <div className="bg-white p-6 shadow-lg rounded-lg mb-6">
                <h3 className="text-2xl font-semibold text-gray-700 mb-4">📊 Chart Controls</h3>
                <div className="grid grid-cols-3 gap-6">
                    {/* X-axis Selector */}
                    <div>
                        <label className="block text-gray-700 font-medium">X axis:</label>
                        <select className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" value={xAxis} onChange={(e) => setXAxis(e.target.value)}>
                            <option value="">Select X axis</option>
                            {columns.map((col, index) => (
                                <option key={index} value={col}>{col}</option>
                            ))}
                        </select>
                    </div>

                    {/* Y-axis Multi-Selector */}
                    <div>
                        <label className="block text-gray-700 font-medium">Y axis:</label>
                        <div className="flex items-center mb-2">
                            <input type="checkbox" className="mr-2" checked={selectAll} onChange={handleSelectAll} />
                            <span className="text-gray-700 font-medium">Select All</span>
                        </div>
                        <select multiple className="w-full p-3 border rounded-lg h-28 focus:ring-2 focus:ring-blue-500" onChange={(e) => setYAxis([...e.target.selectedOptions].map(option => option.value))} value={yAxis}>
                            {columns.filter(col => col !== xAxis).map((col, index) => (
                                <option key={index} value={col}>{col}</option>
                            ))}
                        </select>
                    </div>

                    {/* Draw Plot Button */}
                    <div className="flex items-end">
                        <button className="w-full bg-blue-600 text-white px-5 py-3 rounded-lg shadow-md hover:bg-blue-800 transition text-lg" onClick={handlePlot}>
                            📈 Draw Plot
                        </button>
                    </div>
                </div>
            </div>

            {/* ✅ Show Materials Library ONLY if it's an EDX CSV and X, Y exist */}
            {isEdxCsv && (
                <div className="bg-white p-6 shadow-lg rounded-lg mb-6">
                    <h3 className="text-2xl font-semibold text-gray-700 mb-4">Materials Library Visualization</h3>
                    <div className="bg-blue-100 p-4 rounded-lg">
                        <h4 className="text-lg font-medium">Exclude elements (e.g., substrate):</h4>
                        {availableElements.map((element) => (
                            <label key={element} className="inline-flex items-center mr-4">
                                <input type="checkbox" className="mr-2" checked={excludedElements.includes(element)} onChange={() => handleElementToggle(element)} />
                                {element}
                            </label>
                        ))}
                        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg ml-4" onClick={fetchCsvData}>
                            Draw Materials Library
                        </button>
                    </div>

                    {/* Display Material Library Plot */}
                    {plotImage && (
                        <div className="wafer-plot-container mt-4">
                            <img className="wafer-plot w-full" src={plotImage} alt="Materials Library Visualization" />
                        </div>
                    )}
                </div>
            )}
              {/* CSV Table */}
              <div className="bg-white p-6 shadow-lg rounded-lg">
                <h3 className="text-2xl font-semibold text-gray-700 mb-4">📑 CSV Data</h3>
                {error ? (
                    <p className="text-red-500">{error}</p>
                ) : (
                    <div className="csv-table-container">
                        <table className="csv-table w-full">
                            <thead>
                                <tr>
                                    {columns.map((col, index) => (
                                        <th key={index}>{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {columns.map((col, colIndex) => (
                                            <td key={colIndex}>{row[col]}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CsvViewerPage;

