import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import config from '../../../config_path';

function UserHandoverReport() {
    const [receivedHandovers, setReceivedHandovers] = useState([]);
    const [sentHandovers, setSentHandovers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserHandovers = async () => {
            try {
                const response = await fetch(`${config.BASE_URL}api/user_handover/`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch user handovers');
                }

                const result = await response.json();
                setReceivedHandovers(result.received_handovers);
                setSentHandovers(result.sent_handovers);
            } catch (error) {
                console.error('Error fetching user handovers:', error);
                alert('Failed to fetch data. Please check the server connection and CORS settings.');
            } finally {
                setLoading(false);
            }
        };

        fetchUserHandovers();
    }, []);

    if (loading) {
        return <div className="text-center mt-10 text-lg text-blue-700 font-semibold">Loading...</div>;
    }

    const renderTable = (title, handovers, colorClass) => (
        <div className={`mb-10 p-6 rounded-lg shadow-md ${colorClass}`}>
            <h2 className="text-2xl font-bold mb-4 text-white bg-gradient-to-r from-blue-600 to-indigo-700 p-3 rounded-lg">{title}</h2>
            <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 bg-white rounded-lg shadow-sm">
                    <thead className="bg-blue-600 text-white">
                        <tr>
                            {['Name / Sample', 'Amount', 'Sender', 'Sent', 'Sender Comments', 'Recipient', 'Received', 'Recipient Comments'].map((header, index) => (
                                <th key={index} className="py-3 px-4 font-medium text-left border-b border-gray-200">{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {handovers.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="py-4 text-center text-gray-500">No handovers available</td>
                            </tr>
                        ) : (
                            handovers.map((item, index) => (
                                <tr key={index} className={`hover:bg-blue-50 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                    <td className="py-3 px-4">
                                        <Link to={`/object/${item.sample_id}`} className="text-blue-600 hover:underline font-semibold">
                                            {item.sample_name || 'Unknown Object'}
                                        </Link>
                                    </td>
                                    <td className="py-3 px-4">{item.amount}</td>
                                    <td className="py-3 px-4">{item.sender_email}</td>
                                    <td className="py-3 px-4">{new Date(item.sent_date).toLocaleString()}</td>
                                    <td className="py-3 px-4">{item.sender_comments || 'No comments'}</td>
                                    <td className="py-3 px-4">{item.recipient} ({item.recipient_email})</td>
                                    <td className="py-3 px-4">{item.received_date ? new Date(item.received_date).toLocaleString() : 'Pending'}</td>
                                    <td className="py-3 px-4">{item.recipient_comments || 'No comments'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="p-10 bg-gradient-to-b from-indigo-100 to-blue-50 min-h-screen font-sans">
            <h1 className="text-4xl font-extrabold text-center text-blue-900 mb-10">
                Your Handover Report
            </h1>

            {renderTable('Received Handovers', receivedHandovers, 'bg-green-200')}
            {renderTable('Sent Handovers', sentHandovers, 'bg-yellow-200')}
        </div>
    );
}

export default UserHandoverReport;

