// Define the environment type
type Environment = 'development' | 'production';

// Get the current environment
const ENV = (process.env.NODE_ENV || 'development') as Environment;

// Define base URLs
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8002';
const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8001';

// Socket.IO Configuration
export const SOCKET_CONFIG = {
    url: `${WS_BASE_URL}/socket.io`,
    options: {
        path: '/',
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: false,
        forceNew: true,
    }
} as const;

export const config = {
    development: ENV === 'development',
    debug: true,
    appKey: "crash-0.1.0",
    // Base URLs
    API_URL: API_BASE_URL,
    WS_GAME_URL: `${WS_BASE_URL}/ws/game`,
    WS_BETTING_URL: WS_BASE_URL,
    // Socket configuration
    socket: SOCKET_CONFIG,
    // Auth endpoints
    AUTH_ENDPOINTS: {
        LOGIN: '/api/auth/login/',
        REGISTER: '/api/auth/register/',
        LOGOUT: '/api/auth/logout/',
        PROFILE: '/api/auth/profile/'
    },
    // User endpoints
    USER_ENDPOINTS: {
        USER: '/api/user/',
        PROFILE: '/api/user/profile/'
    },
    // Game endpoints
    GAME_ENDPOINTS: {
        ROUND: '/api/round/',
        USER_BETS: (username: string) => `/api/game/bets/${username}`,
        MY_BETS: '/api/game/my-bets/',
        HISTORY: (date: string) => `/api/history/${date}`
    }
} as const;  // Make the configuration immutable

// Export the type of the config object
export type Config = typeof config;
