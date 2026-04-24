import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Navbar.css";

const Navbar: React.FC = () => {
  const { isAuthenticated, isAdmin, userRole, logout } = useAuth();
  
  useEffect(() => {
    console.log('Navbar re-rendered with states:');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('isAdmin:', isAdmin);
    console.log('userRole:', userRole);
  }, [isAuthenticated, isAdmin, userRole]);

  // Check if role is ADMIN (any case)
  
  return (
    <nav className="nav">
      <Link to="/dashboard" className="nav-brand">
        LamboRadar
      </Link>
      <div className="nav-items">
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="nav-link">
              Dashboard
            </Link>
            
            {/* Show admin button based on role */}
            {isAdmin && (
              <Link to="/admin" className="nav-link">
                Admin
              </Link>
            )}
            
            {/* For testing - shows if your role is uppercase "ADMIN" */}
            {!isAdmin && userRole?.toUpperCase() === "ADMIN" && (
              <Link to="/admin" className="nav-link" style={{backgroundColor: "#ffd700", color: "#000"}}>
                Admin (Case)
              </Link>
            )}
            
            <button onClick={logout} className="nav-button">
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="nav-button">
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
