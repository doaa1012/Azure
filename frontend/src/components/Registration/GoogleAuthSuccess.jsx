import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';

const GoogleAuthSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const email = searchParams.get('email');
    const username = searchParams.get('username');
    const isNewUser = searchParams.get('is_new_user') === 'true';

    // 🔍 Debug print
    console.log("✅ Google Login Success:");
    console.log("Email:", email);
    console.log("Username:", username);
    console.log("User ID:", userId);
    console.log("Role:", role);
    console.log("Token:", token);
    console.log("Is New User:", isNewUser);

    if (token && userId && role) {
      login(token, userId, role);
      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);

      if (isNewUser) {
        navigate('/'); 
      } else {
        navigate('/'); 
      }
    } else {
      console.warn("⚠️ Missing token or user info in callback.");
      navigate('/login'); 
    }
  }, []);

  return <div className="text-center p-8 text-gray-600">Logging in via Google...</div>;
};

export default GoogleAuthSuccess;
