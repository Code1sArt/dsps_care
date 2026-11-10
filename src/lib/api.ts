import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? 'http://localhost:3000' : '');

if (!apiUrl) {
  throw new Error('Missing VITE_API_URL environment variable');
}

const apiConfig = {
  baseURL: apiUrl.replace(/\/+$/, ''),
};

// Signup and login must not inherit a previous account's expired school JWT.
// LINE credentials, when required, are verified separately from the request body.
export const publicApi = axios.create(apiConfig);
export const api = axios.create(apiConfig);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
