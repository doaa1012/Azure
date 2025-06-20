import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function DragDropFileUpload({ objectnameurl }) {
  const [files, setFiles] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  // Extract query parameters if objectnameurl is not provided as a prop
  const queryParams = new URLSearchParams(location.search);
  const resolvedObjectNameURL = objectnameurl || queryParams.get("rubricnameurl") || "";
  const objectId = queryParams.get("objectId") || "";

  // Debugging: Log the resolved parameters
  console.log("Resolved ObjectNameURL in DragDropFileUpload:", resolvedObjectNameURL);
  console.log("Resolved ObjectId in DragDropFileUpload:", objectId);

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(droppedFiles);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  const handleProceed = () => {
    console.log("Proceeding with files:", files);

    if (!resolvedObjectNameURL) {
      console.error("Error: objectnameurl is missing.");
      return;
    }

    // Navigate to file-processing page with the resolved objectnameurl
    navigate(`/file-processing?objectnameurl=${encodeURIComponent(resolvedObjectNameURL)}&objectId=${encodeURIComponent(objectId)}`, {
      state: { files },
    });
  };

  return (
    <div className="flex justify-center items-start min-h-screen bg-blue-50 py-10">
      <div className="shadow-md rounded-lg p-6 w-full max-w-4xl">
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer h-60 w-full bg-blue-100"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="text-gray-600">
            <i className="fas fa-cloud-upload-alt text-5xl mb-4"></i>
          </div>
          {files.length === 0 ? (
            <p className="text-lg text-gray-600">Drag & Drop files here or select files</p>
          ) : (
            <p className="text-lg text-gray-600 mb-2">Files selected: {files.length}</p>
          )}
          <input
            type="file"
            multiple
            className="mt-4"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            id="fileInput"
          />
          <label
            htmlFor="fileInput"
            className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
          >
            Select Files
          </label>
        </div>

        {files.length > 0 && (
          <div className="flex justify-end mt-6">
            <button
              className="bg-blue-500 text-white px-5 py-3 rounded-lg shadow hover:bg-blue-600 transition"
              onClick={handleProceed}
            >
              Proceed to File Processing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DragDropFileUpload;
