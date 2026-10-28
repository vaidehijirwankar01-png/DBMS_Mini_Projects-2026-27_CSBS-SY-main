import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch (err) {
      console.error('Failed to verify token:', err);
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('role', user.role);
    setUser(user);
    return user;
  };

  const register = async (formData) => {
    const res = await api.post('/auth/register', formData);
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('role', user.role);
    setUser(user);
    return user;
  };

  const registerStudent = async (formData) => {
    const res = await api.post('/auth/register/student', formData);
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('role', user.role);
    setUser(user);
    return user;
  };

  const registerCompany = async (formData) => {
    const res = await api.post('/auth/register/company', formData);
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('role', user.role);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      registerStudent, 
      registerCompany, 
      logout, 
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
