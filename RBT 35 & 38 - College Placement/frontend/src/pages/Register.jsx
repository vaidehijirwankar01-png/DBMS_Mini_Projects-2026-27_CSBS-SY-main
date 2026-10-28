import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', { email, password, role });
      alert('Registration successful. Please log in.');
      navigate('/login');
    } catch (err) {
      alert('Registration failed.');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-64px)] bg-gray-100">
      <form onSubmit={handleRegister} className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4">Register</h2>
        <input type="email" placeholder="Email" className="w-full border p-2 mb-4 rounded" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" className="w-full border p-2 mb-4 rounded" value={password} onChange={e => setPassword(e.target.value)} required />
        <select value={role} onChange={e => setRole(e.target.value)} className="w-full border p-2 mb-4 rounded">
          <option value="student">Student</option>
          <option value="company">Company</option>
        </select>
        <button type="submit" className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700">Register</button>
      </form>
    </div>
  );
};

export default Register;
