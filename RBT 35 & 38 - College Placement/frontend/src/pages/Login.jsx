import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      
      if (res.data.role === 'student') navigate('/student');
      else if (res.data.role === 'company') navigate('/company');
      else if (res.data.role === 'admin') navigate('/admin');
    } catch (err) {
      alert('Login failed. Check your credentials.');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-64px)] bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4">Login</h2>
        <input type="email" placeholder="Email" className="w-full border p-2 mb-4 rounded" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" className="w-full border p-2 mb-4 rounded" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Login</button>
      </form>
    </div>
  );
};

export default Login;
