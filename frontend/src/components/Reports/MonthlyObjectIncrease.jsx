import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './ElementCompositionReport.css';
import config from '../../config_path';

const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  return `#${Array.from({ length: 6 }, () => letters[Math.floor(Math.random() * 16)]).join('')}`;
};

const MeasurementLineChart = () => {
  const [objectTypes, setObjectTypes] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [plotType, setPlotType] = useState('monthly');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isSelectAll, setIsSelectAll] = useState(true);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedClaim, setSelectedClaim] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasPlotted, setHasPlotted] = useState(false);

  const claimOptions = [
    'A01', 'A02', 'A03', 'A04', 'A05', 'A06',
    'B01', 'B02', 'B03', 'B04', 'B05',
    'C01', 'C02', 'C03', 'C04',
    'INF', 'S', 'Z'
  ];

  // Load object types and users on mount
  useEffect(() => {
    axios.get(`${config.BASE_URL}api/get_typenames/`)
      .then(res => {
        const types = res.data.map(item => item.typename);
        setObjectTypes(types);
      })
      .catch(err => {
        console.error('Failed to fetch object types:', err);
      });

    axios.get(`${config.BASE_URL}api/users/`)
      .then(res => setUsers(res.data))
      .catch(err => console.error('Error fetching users:', err));
  }, []);

  const handleSelectChange = (e) => {
    const { value, checked } = e.target;
    const updated = checked
      ? [...selectedTypes, value]
      : selectedTypes.filter((type) => type !== value);
  
    setSelectedTypes(updated);
    if (updated.length === 0) {
      setChartData(null);           
      setHasPlotted(false);        
      setErrorMessage('');          
    }
  };
  

  const handleToggleSelectAll = () => {
    if (isSelectAll) {
      setSelectedTypes([...objectTypes]);
    } else {
      setSelectedTypes([]);
      setChartData(null);
      setHasPlotted(false);         
      setErrorMessage('');          
    }
    setIsSelectAll(!isSelectAll);
  };
  

  const clearDateSelection = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const fetchDataAndPlot = () => {
    if (selectedTypes.length === 0) {
      setErrorMessage('⚠ Please select at least one object type.');
      setChartData(null);
      return;
    }
  
    const params = new URLSearchParams();
    selectedTypes.forEach(type => params.append('typename', type));
    if (startDate && endDate) {
      params.append('start_date', startDate.toISOString().split('T')[0]);
      params.append('end_date', endDate.toISOString().split('T')[0]);
    }
    if (selectedUser) params.append('user_id', selectedUser);
    if (selectedClaim) params.append('claimvalue', selectedClaim);
  
    axios.get(`${config.BASE_URL}api/monthly-object-increase/`, { params })
      .then(response => {
        const data = response.data;
        if (!data || typeof data !== 'object' || !Object.keys(data).length) {
          setChartData({ labels: [], datasets: [] });
          setHasPlotted(true);
          return;
        }
  
        const filteredData = {};
        const allMonthsSet = new Set();
        const startTime = startDate ? new Date(startDate).getTime() : null;
        const endTime = endDate ? new Date(endDate).getTime() : null;
  
        Object.entries(data).forEach(([typename, entries]) => {
          const filtered = entries.filter(entry => {
            const time = new Date(entry.month).getTime();
            return (!startTime || time >= startTime) && (!endTime || time <= endTime);
          });
  
          const hasRealData = filtered.some(e => e.count > 0);
          if (hasRealData) {
            filteredData[typename] = filtered;
            filtered.forEach(entry => allMonthsSet.add(entry.month));
          }
        });
  
        const allMonths = Array.from(allMonthsSet).sort((a, b) => new Date(a) - new Date(b));
        const labels = allMonths.map(month =>
          new Date(month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
        );
  
        const datasets = Object.entries(filteredData).map(([typename, entries]) => {
          const dataByMonth = {};
          entries.forEach(entry => {
            dataByMonth[entry.month] = entry.count;
          });
  
          let counts = allMonths.map(month => dataByMonth[month] || 0);
  
          let isCumulative = plotType === 'cumulative';
          if (isCumulative) {
            let cumulative = 0;
            let started = false;
            counts = counts.map(count => {
              if (count > 0) started = true;
              if (started) {
                cumulative += count;
                return cumulative;
              }
              return 0;
            });
          }
  
          return {
            label: typename,
            data: counts,
            borderColor: getRandomColor(),
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.1,
            showLine: isCumulative, 
            pointRadius: isCumulative ? 3 : 5,
            pointHoverRadius: isCumulative ? 5 : 7,
          };
        });
  
        setChartData(null);
        setTimeout(() => {
          setChartData({ labels, datasets });
          setErrorMessage('');
          setHasPlotted(true);
        }, 50);
      })
      .catch(error => {
        console.error('Error fetching chart data:', error.response?.data || error.message);
      });
  };
  
  return (
    <div className="min-h-screen bg-[#eef5fd] flex flex-col">
      <div className="text-center py-4">
        <br />
        <header className="bg-blue-600 text-white py-3 px-6 rounded-xl shadow-md inline-block">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center justify-center gap-2">
            📊 Measurement Object Type Analysis
          </h1>
        </header>
      </div>

      <div className="flex flex-1 flex-col md:flex-row gap-4 px-4 pb-6">
        {/* Sidebar */}
        <div className={`bg-white rounded-xl shadow-md transition-all duration-300 ${isSidebarOpen ? 'w-full md:w-64' : 'w-14'} p-3`}>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full bg-blue-600 text-white py-2 px-3 rounded-md mb-4 font-semibold"
          >
            {isSidebarOpen ? 'Hide Filters' : 'Show'}
          </button>

          {isSidebarOpen && (
            <div className="space-y-6">
              {/* Object Types */}
              <div className="bg-blue-50 rounded-md shadow p-3">
                <h3 className="font-semibold text-blue-700 mb-2">🎯 Object Types</h3>
                <button
                  onClick={handleToggleSelectAll}
                  className={`w-full py-2 rounded-md text-white font-semibold mb-3 ${isSelectAll ? 'bg-green-600' : 'bg-red-600'}`}
                >
                  {isSelectAll ? '✅ Select All' : '❌ Deselect All'}
                </button>

                <div className="bg-blue-50 rounded-md shadow p-3">
                  <h3 className="font-semibold text-blue-700 mb-2">👤 Select User</h3>
                  <select
                    value={selectedUser}
                    onChange={(e) => {
                      setSelectedUser(e.target.value);
                      setSelectedClaim('');
                    }}
                    disabled={!!selectedClaim}
                    className={`w-full p-2 rounded border ${selectedClaim ? 'bg-gray-200' : 'bg-white'} border-gray-300`}
                  >
                    <option value="">All Users</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.username}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-50 rounded-md shadow p-3">
                  <h3 className="font-semibold text-blue-700 mb-2">🏷️ Projects</h3>
                  <select
                    value={selectedClaim}
                    onChange={(e) => {
                      setSelectedClaim(e.target.value);
                      setSelectedUser('');
                    }}
                    disabled={!!selectedUser}
                    className={`w-full p-2 rounded border ${selectedUser ? 'bg-gray-200' : 'bg-white'} border-gray-300`}
                  >
                    <option value="">All Projects</option>
                    {claimOptions.map(claim => (
                      <option key={claim} value={claim}>{claim}</option>
                    ))}
                  </select>
                </div>

                <div className="max-h-48 overflow-y-auto pr-1 text-sm">
                  {objectTypes.map(type => (
                    <label key={type} className="block mb-1">
                      <input
                        type="checkbox"
                        value={type}
                        onChange={handleSelectChange}
                        checked={selectedTypes.includes(type)}
                        className="mr-1"
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>

              {/* Plot Type */}
              <div className="bg-blue-50 rounded-md shadow p-3">
                <h3 className="font-semibold text-blue-700 mb-2">📈 Plot Type</h3>
                <label className="block mb-2">
                  <input
                    type="radio"
                    value="monthly"
                    checked={plotType === 'monthly'}
                    onChange={(e) => setPlotType(e.target.value)}
                    className="mr-1"
                  />
                  Monthly
                </label>
                <label>
                  <input
                    type="radio"
                    value="cumulative"
                    checked={plotType === 'cumulative'}
                    onChange={(e) => setPlotType(e.target.value)}
                    className="mr-1"
                  />
                  Cumulative
                </label>
              </div>

              {/* Date Range */}
              <div className="bg-blue-50 rounded-md shadow p-3">
                <h3 className="font-semibold text-blue-700 mb-2">📅 Date Range</h3>
                <div className="mb-2">
                  <label className="text-sm text-blue-600">Start:</label>
                  <DatePicker
                    selected={startDate}
                    onChange={(date) => setStartDate(date)}
                    dateFormat="yyyy-MM-dd"
                    className="block w-full border rounded p-1 mt-1"
                  />
                </div>
                <div className="mb-2">
                  <label className="text-sm text-blue-600">End:</label>
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => setEndDate(date)}
                    dateFormat="yyyy-MM-dd"
                    className="block w-full border rounded p-1 mt-1"
                  />
                </div>
                <button
                  onClick={clearDateSelection}
                  className="w-full bg-yellow-400 text-black font-semibold py-2 rounded"
                >
                  ✖ Clear Dates
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Chart Area */}
        <div className="flex-1 w-full">
          <button
            onClick={fetchDataAndPlot}
            className="mb-4 bg-blue-600 text-white py-2 px-6 rounded-md font-semibold shadow hover:bg-blue-700"
          >
            Plot
          </button>

          {errorMessage && (
            <div className="text-red-600 text-center mb-2 font-medium">
              {errorMessage}
            </div>
          )}

          <div className="w-full h-[500px] relative bg-white rounded-lg shadow p-4">
            {!hasPlotted ? (
              <p className="text-gray-600 text-center mt-20 text-base sm:text-lg">
                📊 To get started, please select object types and filters, then click <strong>"Plot"</strong> to generate the chart.
              </p>
            ) : chartData && chartData.datasets.length > 0 ? (
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { title: { display: true, text: 'Month' } },
                    y: { title: { display: true, text: 'Count' }, beginAtZero: true },
                  },
                }}
              />
            ) : (
              <p className="text-red-600 text-center mt-20 text-base sm:text-lg">
                ⚠ No data available for the selected user or project.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeasurementLineChart;
