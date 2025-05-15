export const API_ENDPOINTS = {
  ROUNDS: '/api/rounds/',
  BETS: '/api/bets/',
  // History endpoints
  DAY_HISTORY: '/api/get-day-history/',
  MONTH_HISTORY: '/api/get-month-history/',
  YEAR_HISTORY: '/api/get-year-history/',
  // Admin endpoints
  ADMIN_ROUND_STATUS: '/admin/round-status/',
  // Auth endpoints
  LOGIN: '/api/auth/login',
  SIGNUP: '/api/auth/signup',
  LOGOUT: '/api/auth/logout',
  ME: '/api/auth/me',
  // Nested structure for backward compatibility
  HISTORY: {
    DAY: '/api/get-day-history/',
    MONTH: '/api/get-month-history/',
    YEAR: '/api/get-year-history/'
  },
  ADMIN: {
    ROUND_STATUS: '/admin/round-status/'
  }
};

export const API_BASE_URL = 'http://localhost:8001';
export const WS_GAME_URL = 'ws://localhost:8001/ws/game';
export const WS_BETTING_URL = 'ws://localhost:8001/ws/betting';

export const SOCKET_CONFIG = {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 5000
};

export const CURRENCY = 'USD';
export const DEFAULT_BET_AMOUNT = 20;
export const MIN_CASHOUT_MULTIPLIER = 1.01;
export const LANGUAGE = 'en';

export const config = {
  API_BASE_URL,
  WS_GAME_URL,
  WS_BETTING_URL,
  API_ENDPOINTS,
  SOCKET_CONFIG
}; 