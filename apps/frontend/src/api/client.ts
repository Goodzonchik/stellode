import axios from 'axios';
import { API_BASE } from '../const';

export const apiClient = axios.create({ baseURL: API_BASE });
