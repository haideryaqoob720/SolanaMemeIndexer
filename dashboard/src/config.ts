// Load the API URL from environment variables based on current environment
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

// Log the current API URL for debugging
console.log(`Using API URL: ${API_URL} (${process.env.NODE_ENV} environment)`);

export const config = {
  apiUrl: `${API_URL}/api`,
  appName: "Meme Token Dashboard",
  version: "1.0.0",
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development'
};
