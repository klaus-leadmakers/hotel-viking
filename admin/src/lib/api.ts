import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://hotelvikingapi.leadmakers.dk';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('hotel_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('hotel_token');
      localStorage.removeItem('hotel_user');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);
