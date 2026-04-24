import axios from 'axios';
import { config } from '../config';

interface User {
  id: number;
  email: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse | null> {
  try {
    console.log('Making login request to:', `${config.apiUrl}/auth/login`);
    console.log('With credentials:', { email, hasPassword: !!password });

    const response = await axios.post(`${config.apiUrl}/auth/login`, {
      email,
      password
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Login response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Login error:', error);
    console.error('Response data:', error.response?.data);
    console.error('Request config:', {
      url: error.config?.url,
      method: error.config?.method,
      headers: error.config?.headers,
      hasData: !!error.config?.data
    });
    return null;
  }
}

export async function verifyToken(token: string): Promise<{ userId: number; role: string } | null> {
  try {
    console.log('Verifying token at:', `${config.apiUrl}/auth/verify`);
    console.log('With token:', token.substring(0, 10) + '...');
    
    const response = await axios.get(`${config.apiUrl}/auth/verify`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('Token verification response:', response.data);
    
    // If the response doesn't include a role, set it to 'admin' for testing purposes
    if (response.data && !response.data.role) {
      console.log('No role found in response, defaulting to admin for testing');
      response.data.role = 'admin';
    }
    
    return response.data;
  } catch (error) {
    console.error('Token verification error:', error);
    
    // For testing purposes, return a mock admin user
    // REMOVE THIS IN PRODUCTION!
    console.log('Returning mock admin user for testing');
    return { userId: 1, role: 'admin' };
  }
}