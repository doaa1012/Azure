import React, { useState, useEffect } from 'react'; 
import axios from 'axios';
import jwt_decode from 'jwt-decode';
import { useParams, useNavigate } from 'react-router-dom';
import config from '../../config_path';
function AddHandoverForm() {
  const { objectId } = useParams(); 
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [measurementUnit, setMeasurementUnit] = useState('');
  const [recipient, setRecipient] = useState('');
  const [comments, setComments] = useState('');
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [token, setToken] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      try {
        const decoded = jwt_decode(storedToken);
        if (decoded.user_id) {
          axios.get(`${config.BASE_URL}api/users/`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          })
          .then(response => {
            setUsers(response.data);
            const currentUser = response.data.find(user => user.id === decoded.user_id);
            if (currentUser) {
              setCurrentUserEmail(currentUser.email);
              setCurrentUserName(currentUser.username);
            }
          })
          .catch(error => {
            console.error('Error fetching users:', error);
          });
        }
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
  }, []);
  
 const handleSubmit = (e) => {
  e.preventDefault();

  if (isSubmitting) return; // Prevent multiple rapid clicks
  setIsSubmitting(true);     // Lock submit immediately

  const formErrors = {};

  if (!currentUserEmail) {
    formErrors.sender = 'Sender is required.';
  }
  if (!amount) formErrors.amount = 'Amount is required';
  if (!measurementUnit) formErrors.measurementUnit = 'Measurement unit is required';
  if (!recipient) formErrors.recipient = 'Recipient is required';

  if (Object.keys(formErrors).length > 0) {
    setErrors(formErrors);
    setIsSubmitting(false); // Re-enable submit on error
    return;
  }

  const formData = new FormData();
  formData.append("typeId", "Handover");
  formData.append("tenantId", 4);
  formData.append("sender", currentUserEmail);
  formData.append("amount", amount);
  formData.append("measurementUnit", measurementUnit);
  formData.append("recipient", recipient);
  formData.append("comments", comments || '');
  formData.append("sampleobjectid", objectId);

  axios.post(`${config.BASE_URL}api/submit-handover/`, formData, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  })
  .then(() => {
    navigate(-1); // Go back
  })
  .catch(error => {
    console.error('Error submitting handover:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    setIsSubmitting(false); // Re-enable only on failure
  });
};
  

  const handleClose = () => {
    navigate(-1); // Redirects to the previous page
  };

  return (
    <div className="flex justify-center p-8 bg-blue-50 min-h-screen">
      <div className="bg-white p-10 rounded-lg shadow-md w-full max-w-3xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-blue-600">
            Add Handover
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sender Field */}
          <div>
            <label className="block text-lg font-semibold text-blue-800">
              Sender
            </label>
            <input
              type="text"
              value={`${currentUserName || 'N/A'} (${currentUserEmail || 'N/A'})`}
              readOnly
              className="w-full p-3 bg-blue-100 border border-blue-300 rounded-lg text-blue-500 cursor-not-allowed"
            />
          </div>

          {/* Amount Field */}
          <div>
            <label className="block text-lg font-semibold text-blue-800">
              Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`w-full p-3 bg-blue-50 border ${
                errors.amount ? 'border-red-500' : 'border-blue-300'
              } rounded-lg`}
              placeholder="Enter amount"
            />
            {errors.amount && (
              <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
            )}
          </div>

          {/* Measurement Unit Field */}
          <div>
            <label className="block text-lg font-semibold text-blue-800">
              Measurement Unit
            </label>
            <input
              type="text"
              value={measurementUnit}
              onChange={(e) => setMeasurementUnit(e.target.value)}
              className={`w-full p-3 bg-blue-50 border ${
                errors.measurementUnit ? 'border-red-500' : 'border-blue-300'
              } rounded-lg`}
              placeholder="Enter measurement unit"
            />
            {errors.measurementUnit && (
              <p className="text-red-500 text-sm mt-1">
                {errors.measurementUnit}
              </p>
            )}
          </div>

          {/* Recipient Dropdown */}
          <div>
            <label className="block text-lg font-semibold text-blue-800">
              Recipient
            </label>
            <select
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className={`w-full p-3 bg-blue-50 border ${
                errors.recipient ? 'border-red-500' : 'border-blue-300'
              } rounded-lg`}
            >
              <option value="">Select recipient</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username ? `${user.username}` : user.email}
                </option>
              ))}
            </select>
            {errors.recipient && (
              <p className="text-red-500 text-sm mt-1">{errors.recipient}</p>
            )}
          </div>

          {/* Comments Field */}
          <div>
            <label className="block text-lg font-semibold text-blue-800">
              Comments (optional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full p-3 bg-blue-50 border border-blue-300 rounded-lg resize-none"
              placeholder="Enter any comments"
              rows="4"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleClose}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
            >
              Close
            </button>
            <button
              type="submit"
              className={`bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddHandoverForm;