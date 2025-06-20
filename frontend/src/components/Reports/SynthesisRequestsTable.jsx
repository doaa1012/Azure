import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import config from '../../config_path';

const SynthesisRequestsTable = () => {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    axios.get(`${config.BASE_URL}api/synthesis-requests/`)
      .then(response => setRequests(response.data))
      .catch(error => console.error('Error fetching data:', error));
  }, []);

  return (
    <div style={{ padding: '30px', background: '#f7f9fc', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)', color: 'white', padding: '25px', textAlign: 'center', marginBottom: '20px', borderRadius: '8px', boxShadow: '0 6px 12px rgba(0,0,0,0.15)' }}>
        <h1 style={{ fontSize: '34px', fontWeight: 'bold', margin: '0', letterSpacing: '1px' }}>Requests for Synthesis</h1>
      </header>

      <p style={{ margin: '20px 0', fontSize: '16px', color: '#555', textAlign: 'center' }}>🟢 Linked sample | 🔴 No linked samples</p>

      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', boxShadow: '0 2px 6px rgba(222, 208, 208, 0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#4a90e2', color: '#fff' }}>
            <th style={{ padding: '12px', textAlign: 'center' }}>Date</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Name / Description</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Created by</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Samples Synthesised</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req.object_id} style={{ backgroundColor: req.is_linked ? '#e6f4ea' : '#fdecea', borderRadius: '5px', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <td style={{ padding: '12px', textAlign: 'center' }}>{req.date_created}</td>
              <td style={{ padding: '12px', textAlign: 'center' }}>
                <Link to={`/object/${req.object_id}`} style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: '500' }}>{req.description || req.object_name}</Link>
              </td>
              <td style={{ padding: '12px', textAlign: 'center' }}>{req.created_by}</td>
              <td style={{ padding: '12px', textAlign: 'center' }}>{req.is_linked ? 1 : 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SynthesisRequestsTable;
