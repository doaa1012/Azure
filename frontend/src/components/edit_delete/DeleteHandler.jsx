import React, { useState } from "react";
import { FaTrash } from "react-icons/fa";

const DeleteHandler = ({ objectId, onDeleteComplete, apiEndpoint }) => {
  const [errorMessage, setErrorMessage] = useState(""); // State to track error messages
  const [showErrorModal, setShowErrorModal] = useState(false); // State to toggle modal
  const [isDeleting, setIsDeleting] = useState(false); // State to track deletion progress

  const handleDelete = async () => {
    try {
      setErrorMessage(""); // Clear any previous error message
      setIsDeleting(true); // Start deletion process
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("User is not authenticated.");
      }

      const response = await fetch(`${apiEndpoint}/${objectId}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete the object.");
      }

      if (onDeleteComplete) {
        onDeleteComplete(objectId); // Call the callback if deletion is successful
      }
    } catch (error) {
      setErrorMessage(error.message); // Set the error message
      setShowErrorModal(true); // Show the error modal
    } finally {
      setIsDeleting(false); // Reset deletion progress
    }
  };

  return (
    <div>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className={`text-red-500 hover:text-red-700 flex items-center gap-2 bg-transparent hover:bg-transparent ${
          isDeleting ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <FaTrash className="text-sm" />
        {isDeleting ? "Deleting..." : "Delete"}
      </button>

      {showErrorModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-1/3">
            <h2 className="text-xl font-bold text-red-500 mb-4">Delete Error</h2>
            <p className="text-gray-700">{errorMessage}</p>
            <button
              onClick={() => setShowErrorModal(false)}
              className="mt-4 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeleteHandler;
