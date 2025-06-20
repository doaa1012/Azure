import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import config from '../../../config_path';
import { FaSortNumericUp } from 'react-icons/fa'; // for heading icon

Modal.setAppElement('#root');

function EditLinkModal({ isOpen, onClose, linkObject, onSave }) {
  const [sortCode, setSortCode] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (linkObject && linkObject.sortcode !== undefined) {
      setSortCode(linkObject.sortcode);
    }
    setErrorMessage('');
  }, [linkObject]);

  const handleSave = () => {
    const payload = {
      link_id: linkObject.link_id,
      sortcode: sortCode,
    };

    fetch(`${config.BASE_URL}api/update_link/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Server returned ${res.status}: ${errorText}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          onSave();
          onClose();
        } else {
          setErrorMessage('Failed to update link. Please try again.');
        }
      })
      .catch(() => {
        setErrorMessage('Something went wrong. Please check your connection.');
      });
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto p-8"
      overlayClassName="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center"
    >
      <div className="flex items-center gap-3 mb-4">
        <FaSortNumericUp className="text-blue-600 text-xl" />
        <h2 className="text-xl font-bold text-blue-800">Adjust Link</h2>
      </div>

      <label className="block text-sm text-gray-600 font-medium mb-1">
        Sort Code (ascending order)
      </label>
      <input
        type="number"
        value={sortCode}
        onChange={(e) => setSortCode(Number(e.target.value))}
        className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4 shadow-sm focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
        placeholder="Enter sort code"
      />

      {errorMessage && (
        <p className="text-red-600 text-sm mb-4">{errorMessage}</p>
      )}

      <div className="flex justify-between mt-6">
        <button
          onClick={onClose}
          className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition font-semibold"
        >
          ✖ Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition font-semibold"
        >
          ✅ Save Link
        </button>
      </div>
    </Modal>
  );
}

export default EditLinkModal;
