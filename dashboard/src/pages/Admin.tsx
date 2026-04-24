import React, { useState } from "react";
import { Redirect } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/auth.css";

const Admin: React.FC = () => {
  const { isAdmin, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Redirect if not authenticated or not admin
  if (!isAuthenticated || !isAdmin) {
    return <Redirect to="/dashboard" />;
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ email, password, role: 'user' })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`User created successfully: ${email}`);
        setEmail("");
        setPassword("");
      } else {
        setError(data.message || "Failed to create user");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while creating the user");
    }
  };

  return (
    <div className="admin-container">
      <h1>Admin Dashboard</h1>
      
      <div className="admin-section">
        <h2>Create New User</h2>
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleCreateUser} className="admin-form">
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input"
            />
          </div>
          
          <button type="submit" className="button admin-button">
            Create User
          </button>
        </form>
      </div>
    </div>
  );
};

export default Admin;