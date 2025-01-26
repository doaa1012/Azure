import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2'; // For plotting

function LsvsViewer({ filePath }) {
  const [data, setData] = useState(null);
  const [selectedArea, setSelectedArea] = useState('');
  const [plotAllAreas, setPlotAllAreas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (filePath) {
      fetchData(filePath);
    }
  }, [filePath]);

  const fetchData = async (path) => {
    try {
      const response = await fetch(path); // Use the file path to fetch data
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.status}`);
      }
      const fileData = await response.json();
      setData(fileData);
      setSelectedArea(Object.keys(fileData)[0] || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAreaChange = (e) => {
    setSelectedArea(e.target.value);
    setPlotAllAreas(false);
  };

  const handlePlotAllAreas = () => {
    setPlotAllAreas(true);
  };

  const handlePlotSelectedArea = () => {
    setPlotAllAreas(false);
  };

  const renderPlot = () => {
    if (!data || (!plotAllAreas && !selectedArea)) return <p>No data available for plotting.</p>;
  
    const datasets = [];
    if (plotAllAreas) {
      Object.keys(data).forEach((area) => {
        const areaData = data[area];
        datasets.push({
          label: `Area ${area}`,
          data: areaData["Current density [A/cm^2]"],
          borderColor: getRandomColor(),
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: false,
          pointRadius: 0, // Hide points
          pointHoverRadius: 0, // Hide hover points
        });
      });
    } else if (selectedArea) {
      const areaData = data[selectedArea];
      datasets.push({
        label: `Current Density vs Potential - Area ${selectedArea}`,
        data: areaData["Current density [A/cm^2]"],
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        pointRadius: 3, // Show points for selected area
        pointHoverRadius: 5, // Larger hover points for selected area
      });
    }
  
    const plotData = {
      labels: data[selectedArea]?.["Potential"].map((pot) => pot.toFixed(2)) || [],
      datasets,
    };
  
    const options = {
      scales: {
        x: {
          title: {
            display: true,
            text: 'Potential (V)',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Current Density (A/cm^2)',
          },
        },
      },
      plugins: {
        legend: {
          display: !plotAllAreas, // Hide legend when plotting all areas
        },
      },
      elements: {
        line: {
          tension: 0.3, // Smoother curves
        },
      },
    };
  
    return <Line data={plotData} options={options} />;
  };
  

  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="lsvs-viewer bg-white shadow-md rounded-lg p-6 mt-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Processed LSV Data Viewer</h2>
      {data && Object.keys(data).length > 0 ? (
        <>
          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2">Select Measurement Area:</label>
            <select
              value={selectedArea}
              onChange={handleAreaChange}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {Object.keys(data).map((area, index) => (
                <option key={index} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          <div className="flex mb-6">
            <button
              onClick={handlePlotSelectedArea}
              className="bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition duration-200"
            >
              Plot Selected Area
            </button>
            <button
              onClick={handlePlotAllAreas}
              className="ml-4 bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition duration-200"
            >
              Plot All Areas
            </button>
          </div>

          {renderPlot()}
        </>
      ) : (
        <p>No measurement areas available.</p>
      )}
    </div>
  );
}

export default LsvsViewer;
