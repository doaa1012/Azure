import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import config from '../../config_path';

const IdeasAndExperimentsTable = () => {
  const [ideas, setIdeas] = useState([]);

  useEffect(() => {
    axios.get(`${config.BASE_URL}api/ideas-experiments/`)
      .then(response => setIdeas(response.data))
      .catch(error => console.error('Error fetching data:', error));
  }, []);

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 md:px-10 bg-blue-50 min-h-screen font-sans overflow-hidden">
      <div className="max-w-5xl mx-auto">
      <header className="bg-blue-800 text-white rounded-2xl shadow-lg py-4 mb-8 mt-6 flex items-center justify-center min-h-[60px]">
      <h1 className="text-xl font-semibold tracking-tight">Ideas and Experiment Plans</h1>
    </header>


        <p className="mb-6 text-gray-700 text-center text-base">
          <span className="text-green-700 font-semibold">Green badge</span> = completed &nbsp;|&nbsp;
          <span className="text-red-700 font-semibold">Red badge</span> = pending/open
        </p>

        {/* Table header */}
        <div className="grid grid-cols-4 bg-gray-100 rounded-lg font-semibold text-gray-700 text-center py-4 mb-2 shadow">
          <div>Date</div>
          <div>Name / Description</div>
          <div>Created by</div>
          <div>Samples</div>
        </div>

        {/* Card rows */}
        <div className="flex flex-col gap-4">
          {ideas.map((idea) => (
            <div
              key={idea.object_id}
              className={`
                grid grid-cols-4 bg-white rounded-xl shadow group 
                transition-all duration-200 border-l-4
                ${idea.sample_count > 0 
                  ? 'border-green-400 hover:shadow-lg' 
                  : 'border-red-400 hover:shadow-lg'
                }
                items-start py-6
              `}
            >
              {/* Date + status badge */}
              <div className="flex flex-col items-center justify-center px-2">
                <span className="font-semibold text-blue-900 text-sm">{idea.date_created}</span>
                <span className={`
                  mt-2 px-3 py-0.5 rounded-full text-xs font-bold
                  ${idea.sample_count > 0 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-600'
                  }
                `}>
                  {idea.sample_count > 0 ? 'Completed' : 'Pending'}
                </span>
              </div>

              {/* Name/description */}
              <div className="px-2">
                <Link
                  to={`/object/${idea.object_id}`}
                  className="text-blue-700 font-semibold hover:underline text-base"
                >
                  {idea.object_name}
                </Link>
                <div
                  className="mt-1 text-gray-600 text-sm font-normal line-clamp-2"
                  title={idea.description}
                >
                  {idea.description}
                </div>
              </div>

              {/* Created by */}
              <div className="text-center px-2 truncate text-gray-700 text-sm" title={idea.created_by}>
                {idea.created_by.length > 25 ? idea.created_by.slice(0, 23) + '…' : idea.created_by}
              </div>

              {/* Samples Synthesised */}
              <div className="text-center font-bold text-lg text-gray-800 px-2">
                {idea.sample_count}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IdeasAndExperimentsTable;
