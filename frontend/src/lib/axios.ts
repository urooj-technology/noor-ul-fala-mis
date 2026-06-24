import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Flag to prevent multiple logout calls
let isLoggingOut = false;

// Function to handle logout
const handleLogout = () => {
  if (isLoggingOut) return;
  isLoggingOut = true;
  
  // Clear user data from localStorage
  localStorage.removeItem('user');
  
  // Reset flag after a short delay
  setTimeout(() => {
    isLoggingOut = false;
  }, 1000);
  
  // Redirect to login page
  window.location.href = '/';
};

// Request interceptor to add token and company_id for root access
api.interceptors.request.use(
  (config) => {
    // Add trailing slash to URL if not present (Django requirement)
    if (config.url && !config.url.endsWith('/') && !config.url.includes('?')) {
      config.url = config.url + '/';
    }
    
    // Skip authentication for login and register endpoints
    const isAuthEndpoint = config.url?.includes('/login/') || 
                          config.url?.includes('/register/') || 
                          config.url?.includes('/password-reset/') ||
                          config.url?.includes('/verify-otp/');
    
    if (isAuthEndpoint) {
      return config;
    }
    
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.token) {
          config.headers.Authorization = `Token ${userData.token}`;
          

        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token validation and errors
api.interceptors.response.use(
  (response) => {
    const contentType = response.headers['content-type'] || '';
    const isHtml = contentType.includes('text/html');
    const isApiRequest = response.config.url?.includes('/api/') ||
      response.config.baseURL?.includes('/api') ||
      !response.config.url?.startsWith('http');

    if (isHtml && isApiRequest) {
      const error = new Error(
        'API returned HTML instead of JSON. Restart the Django server so new API routes are loaded.'
      );
      (error as any).response = response;
      return Promise.reject(error);
    }

    return response;
  },
  (error) => {
    // Skip logout for auth endpoints
    const isAuthEndpoint = error.config?.url?.includes('/login/') || 
                          error.config?.url?.includes('/register/') || 
                          error.config?.url?.includes('/password-reset/') ||
                          error.config?.url?.includes('/verify-otp/');
    
    // Check if the error is due to authentication issues
    if (
      !isAuthEndpoint && (
        error.response?.status === 401 ||
        error.response?.data?.detail === "Invalid token." ||
        error.response?.data?.detail === "Authentication credentials were not provided." ||
        error.response?.data?.detail === "Token has expired" ||
        error.response?.data?.code === "token_not_valid"
      )
    ) {
      console.error('Authentication error:', error.response?.data);
      handleLogout();
    }
    
    // Check for network errors
    if (!error.response) {
      console.error('Network error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;