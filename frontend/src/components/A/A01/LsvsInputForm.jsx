import React, { useState } from 'react';
import config from '../../../config_path';

function LsvsInputForm({ objectId, onSubmit }) {
  const [stPot, setStPot] = useState(0.21);
  const [offsetPot, setOffsetPot] = useState(0);
  const [ph, setPh] = useState(1);
  const [dCap, setDCap] = useState(1150);
  const [sweep, setSweep] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('User is not authenticated. Please log in.');

      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload?.user_id;
      const username = payload?.username;

      if (!userId) throw new Error('User ID is missing in the token.');

      const response = await fetch(`${config.BASE_URL}api/load_lsvs/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          object_id: objectId,
          st_pot: stPot,
          offset_pot: offsetPot,
          ph: ph,
          d_cap: dCap,
          sweep: sweep,
          user_id: userId,
          username: username,
        }),
      });

      const data = await response.json();
      if (data.success) {
        onSubmit(data.data); // Trigger parent component to reload LSVViewer
        setSuccessMessage('LSV data loaded and processed successfully! 🎉');

        // Optionally reset the form after success:
        // setStPot(0.21);
        // setOffsetPot(0);
        // setPh(1);
        // setDCap(1150);
        // setSweep(7);
      } else {
        setError(data.error || 'Something went wrong.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mt-6">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Input fields */}
        <div>
          <label className="block text-gray-700 font-bold mb-2">Standard Potential (V):</label>
          <input
            type="number"
            value={stPot}
            onChange={(e) => setStPot(parseFloat(e.target.value))}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 font-bold mb-2">Offset Potential (V):</label>
          <input
            type="number"
            value={offsetPot}
            onChange={(e) => setOffsetPot(parseFloat(e.target.value))}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 font-bold mb-2">pH:</label>
          <input
            type="number"
            value={ph}
            onChange={(e) => setPh(parseFloat(e.target.value))}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 font-bold mb-2">Capillary Diameter (nm):</label>
          <input
            type="number"
            value={dCap}
            onChange={(e) => setDCap(parseFloat(e.target.value))}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 font-bold mb-2">Sweep:</label>
          <input
            type="number"
            value={sweep}
            onChange={(e) => setSweep(parseInt(e.target.value))}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
        </div>
        <div className="col-span-1 md:col-span-2 lg:col-span-3">
          <button
            type="submit"
            className="bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 transition duration-200"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load LSVs'}
          </button>
        </div>
      </form>

      {successMessage && <p className="text-green-600 mt-4 font-semibold">{successMessage}</p>}
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
}

export default LsvsInputForm;
