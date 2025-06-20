import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import config from '../../config_path';

const SamplesPerElementChart = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${config.BASE_URL}api/samples-per-element/`)
      .then((response) => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then((data) => {
        const formattedData = {
          labels: data.elementnames,
          datasets: [
            {
              label: 'Number of Samples',
              data: data.counts,
              backgroundColor: data.elementnames.map((_, index) => `hsl(${index * 25}, 70%, 60%)`),
              borderColor: data.elementnames.map((_, index) => `hsl(${index * 25}, 70%, 40%)`),
              borderWidth: 2,
              barThickness: 30,
            },
          ],
        };
        setChartData(formattedData);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        setError('Failed to fetch data');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center mt-20 text-blue-600 font-medium">Loading...</div>;

  if (error) {
    return (
      <div className="text-center mt-20 text-red-600">
        {error}
        <br />
        <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eaf4fc] px-4 py-6 sm:px-6 lg:px-12">
      <div className="max-w-6xl mx-auto bg-white p-4 sm:p-6 lg:p-8 rounded-xl shadow-md">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-6">
          Samples Per Element Overview
        </h1>
        <div className="w-full overflow-x-auto">
          {chartData ? (
            <Bar
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: {
                    title: {
                      display: true,
                      text: 'Elements',
                      font: { size: 14 }
                    },
                    ticks: {
                      maxRotation: 60,
                      minRotation: 30,
                    },
                  },
                  y: {
                    title: {
                      display: true,
                      text: 'Number of Samples',
                      font: { size: 14 },
                    },
                    beginAtZero: true,
                  },
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: '#34495e',
                    titleColor: '#ecf0f1',
                  },
                },
              }}
              height={400}
            />
          ) : (
            <p className="text-center text-gray-500">No data to display</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SamplesPerElementChart;
