import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { IoChatbubblesOutline, IoCloseCircleOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';  // ✅ Import useNavigate
import config from "../config_path";

const ChatbotComponent = () => {
  const [token, setToken] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [chatMode, setChatMode] = useState('faq'); // Default mode
  const navigate = useNavigate();  //  Initialize React Router navigation

  useEffect(() => {
    const tokenFromLocalStorage = localStorage.getItem('token');
    if (tokenFromLocalStorage) setToken(tokenFromLocalStorage);
    setMessages([{ sender: 'bot', text: '👋 Hi! How can I help you today? Choose a mode below.' }]);
  }, []);

  const handleSend = async () => {
  if (!input) return;
  setMessages((prev) => [...prev, { sender: 'user', text: input }]);

  let endpoint = chatMode === 'faq' ? '/api/chatbot_info/' : '/api/chatbot_cohere/';

  try {
    const response = await axios.post(`${config.BASE_URL}${endpoint}`, {
      message: input,
      mode: chatMode,
    });

    // Handle RAG redirect
    if (chatMode === "rag" && response.data.redirect) {
      navigate(response.data.redirect);  // ✅ Open new page
      return;
    }

    if (chatMode === "search" && response.data.results) {
      const searchResults = response.data.results.map((item) => (
        <button
          key={item.objectid}
          className="underline text-white font-semibold bg-blue-300 hover:bg-blue-700 rounded-lg px-3 py-2 mt-1 transition duration-200"
          onClick={() => navigate(`/object/${item.objectid}`)}
        >
          {item.objectname}
        </button>
      ));

      setMessages((prev) => [...prev, { sender: 'bot', text: "🔍 Search Results:", results: searchResults }]);
    } else {
      setMessages((prev) => [...prev, { sender: 'bot', text: response.data.response }]);
    }
  } catch (error) {
    setMessages((prev) => [...prev, { sender: 'bot', text: '❌ Server error. Try again later.' }]);
  }

  setInput('');
};


  return (
    <div className="fixed bottom-10 right-10 z-50">
      <button className="p-5 bg-gradient-to-r from-blue-300 to-indigo-600 text-white rounded-full shadow-lg hover:scale-105 transition-transform duration-300" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle Chatbot">
        {isOpen ? <IoCloseCircleOutline size={36} /> : <IoChatbubblesOutline size={36} />}
      </button>

      {isOpen && (
        <div className="flex flex-col h-[550px] w-[350px] fixed bottom-20 right-6 bg-white border border-gray-300 shadow-lg rounded-xl overflow-hidden">
          <div className="p-4 bg-blue-700 text-white font-semibold text-lg flex justify-between items-center">
            <span>💬 Research Assistant</span>
            <button onClick={() => setIsOpen(false)} aria-label="Close Chatbot"><IoCloseCircleOutline size={28} /></button>
          </div>

          {/* AI Mode Selection */}
          <div className="p-2 bg-blue-100 border-b border-blue-300">
            <label className="text-sm font-semibold">Choose Chat Mode:</label>
            <select
  className="ml-2 p-1 border rounded"
  value={chatMode}
  onChange={(e) => {
    const selectedMode = e.target.value;
    setChatMode(selectedMode);
    if (selectedMode === 'rag') {
      navigate('/rag');  // ✅ immediately go to RagPage
    }
  }}
>

              <option value="faq">FAQ (Basic Info)</option>
              <option value="scientific">Scientific AI (Materials Science)</option>
              <option value="search">Search Database</option>
              <option value="rag">RAG (Document Assistant)</option>

            </select>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 bg-gray-50 space-y-2">
            {messages.map((msg, idx) => (
              <div key={idx} className={`p-3 rounded-lg ${msg.sender === 'user' ? 'bg-green-500 text-white ml-auto' : 'bg-orange-500 text-white mr-auto'}`}>
                {msg.text}
                {/* Render buttons for search results */}
                {msg.results && <div className="flex flex-col mt-2 space-y-1">{msg.results}</div>}
              </div>
            ))}
          </div>

          {/* Input Box */}
          <div className="flex border-t border-gray-300 bg-gray-100">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything..." className="flex-1 p-3 bg-white border-none focus:outline-none" />
            <button onClick={handleSend} className={`p-3 text-white font-semibold ${token ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`} disabled={!token}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotComponent;
