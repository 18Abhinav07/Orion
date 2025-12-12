import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_API_URL,
});

// Add a request interceptor to automatically attach the JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
