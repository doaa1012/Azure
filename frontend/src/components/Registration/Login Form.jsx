import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../components/AuthContext'; // Import your authentication context
import config from '../../config_path';
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth(); // Destructure login function from useAuth

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      email: email,
      password: password,
    };

    try {
      const response = await axios.post(
        `${config.BASE_URL}api/login/`, // Replace with your actual endpoint
        data,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const { token, userId, role } = response.data;
      if (token) {
        login(token, userId, role);
        localStorage.setItem('token', token);
        localStorage.setItem('userId', userId);
        navigate('/'); // Redirect after login
      } else {
        setError('Login failed, no token received.');
      }
    } catch (error) {
      if (error.response && error.response.data) {
        setError('Login failed, please check your credentials.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };

  const handleGoogleLogin = () => {
    // Redirect user to Django Google login endpoint
   window.location.href = `${config.BASE_URL}auth/google/`; 
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-700 mb-6">Login</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter your password"
              required
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
            >
              Login
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <Link to="/forgot-password" className="text-indigo-500 hover:underline">
            Forgot Password?
          </Link>
          <span className="mx-2">|</span>
          <Link to="/register" className="text-indigo-500 hover:underline">
            Register as New User
          </Link>
        </div>

        {/* Google Login Button */}
        <div className="text-center mt-6">
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Login with Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
