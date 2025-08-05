import React, { useState } from 'react';
import axios from 'axios';
import config from '../config_path';
import Cookies from 'js-cookie';

const RagPage = () => {
  const [query, setQuery] = useState('');
  const [conversation, setConversation] = useState([]);

  const handleSubmit = async () => {
    if (!query.trim()) return;

    const tempEntry = { question: query, answer: 'Loading...', chunks: [], sources: [] };
    setConversation((prev) => [tempEntry, ...prev]);

    const currentQuery = query;
    setQuery('');

    try {
      const csrftoken = Cookies.get('csrftoken');

      const res = await axios.post(
        `${config.BASE_URL}/api/rag_query/`,
        { query: currentQuery },
        {
          headers: { 'X-CSRFToken': csrftoken },
          withCredentials: true,
        }
      );

      const updatedEntry = {
        question: currentQuery,
        answer: res.data.answer,
        chunks: res.data.chunks,
        sources: res.data.sources,
      };

      setConversation((prev) => [updatedEntry, ...prev.slice(1)]);
    } catch (err) {
      console.error(err);

      const errorEntry = {
        question: currentQuery,
        answer: '❌ Server error. Try again.',
        chunks: [],
        sources: [],
      };

      setConversation((prev) => [errorEntry, ...prev.slice(1)]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 bg-gradient-to-br from-[#f0f5ff] to-white rounded-lg shadow-md mt-8">
      <h2 className="text-3xl font-extrabold text-[#2c3e50] mb-6">📄 PDF Q&A Assistant</h2>

      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:flex-1 border-2 border-blue-300 px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ask something based on your PDFs..."
        />
        <button
          onClick={handleSubmit}
          className="bg-[#6c63ff] hover:bg-[#574fdd] text-white px-6 py-2 rounded-lg font-semibold shadow-md transition-all duration-200"
        >
          Ask
        </button>
      </div>

      {conversation.length > 0 && (
        <div className="space-y-6">
          {conversation.map((entry, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg shadow p-5 transition-all hover:shadow-md"
            >
              <p className="mb-2 text-lg font-semibold text-[#2c3e50]">
                ❓ <span className="font-bold">Question:</span> {entry.question}
              </p>

              <p className="text-base text-gray-800 mb-3">
                💡 <span className="font-bold">Answer:</span> {entry.answer}
              </p>

              {Array.isArray(entry.chunks) && entry.chunks.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-2">
                  <p className="font-semibold text-blue-800 mb-2">🔍 Top Sources:</p>
                  {entry.chunks.map((chunk, i) => (
                    <div key={i} className="mb-3">
                      <p className="text-blue-700 font-medium">
                        📁 Source: {entry.sources[i]?.source || 'Unknown'}
                      </p>
                      <p className="text-gray-700 italic">{chunk}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RagPage;
