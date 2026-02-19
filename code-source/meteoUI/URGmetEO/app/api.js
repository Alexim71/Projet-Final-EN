
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://100.65.155.98:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
