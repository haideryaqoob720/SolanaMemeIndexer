import React, { createContext, useContext, useState, useEffect } from "react";
import { getAuthToken, removeAuthToken, setAuthToken } from "../utils/auth";
import { verifyToken } from "../services/authService";

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  userRole: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const userData = await verifyToken(token);
          if (userData) {
            console.log('User data in AuthContext:', userData);
            console.log('User role:', userData.role);
            console.log('Is admin?', userData.role?.toLowerCase() === 'admin');
            
            setIsAuthenticated(true);
            setUserRole(userData.role);
            setIsAdmin(userData.role?.toLowerCase() === 'admin');
            
            // Log state after setting
            console.log('Auth state after update: isAuthenticated=true, role=' + userData.role + ', isAdmin=' + (userData.role?.toLowerCase() === 'admin'));
          } else {
            console.log('No user data returned from verifyToken');
            setIsAuthenticated(false);
            setUserRole(null);
            setIsAdmin(false);
          }
        } catch (error) {
          console.error('Error in checkAuth:', error);
          setIsAuthenticated(false);
          setUserRole(null);
          setIsAdmin(false);
        }
      } else {
        console.log('No token found in localStorage');
        setIsAuthenticated(false);
        setUserRole(null);
        setIsAdmin(false);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (token: string): Promise<boolean> => {
    setAuthToken(token);
    // After login, check the token to determine role
    try {
      const userData = await verifyToken(token);
      if (userData) {
        setUserRole(userData.role);
        setIsAdmin(userData.role?.toLowerCase() === 'admin');
        console.log('Login set role:', userData.role);
        console.log('Login set isAdmin:', userData.role?.toLowerCase() === 'admin');
      }
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Error verifying token during login:', error);
      setIsAuthenticated(false);
      return false;
    }
  };

  const logout = () => {
    removeAuthToken();
    setIsAuthenticated(false);
    setUserRole(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      isAdmin, 
      userRole, 
      login, 
      logout, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
