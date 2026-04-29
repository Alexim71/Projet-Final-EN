import axios from 'axios';
import { Platform } from 'react-native';

const getBaseURL = () => {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env && env !== 'http://localhost:3000') return env;
  // Sur l'émulateur Android, 10.0.2.2 pointe vers le PC hôte
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
};

const BASE_URL = getBaseURL();

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
