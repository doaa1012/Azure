import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the Auth context
const AuthContext = createContext();

// Create the AuthProvider component
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('isAuthenticated') === 'true');
  const [role, setRole] = useState(() => localStorage.getItem('role') || '');

  // Login function to set the authentication state and role
  const login = (token, userId, userRole) => {
    setIsAuthenticated(true);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('role', userRole);
    setRole(userRole);
  };

  // Logout function to clear the authentication state
  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('role');
    setRole('');
  };

  useEffect(() => {
    const storedAuth = localStorage.getItem('isAuthenticated');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

 return (
  <AuthContext.Provider value={{ 
    isAuthenticated, 
    setIsAuthenticated, 
    login, 
    logout, 
    role 
  }}>
    {children}
  </AuthContext.Provider>
);

};

// Hook to use the Auth context
export const useAuth = () => useContext(AuthContext);
