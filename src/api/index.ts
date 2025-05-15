import { config } from '../config';

// Define API endpoints using the typed config
export const API_ENDPOINTS = {
    // Auth endpoints
    LOGIN: `${config.API_URL}/auth/login/`,
    REGISTER: `${config.API_URL}/auth/register/`,
    PROFILE: `${config.API_URL}/auth/profile/`,
    LOGOUT: `${config.API_URL}/auth/logout/`,
    
    // User endpoints
    USER_PROFILE: `${config.API_URL}/user/profile/`,
    
    // Game endpoints
    USER_BETS: (username: string) => `${config.API_URL}/game/bets/${username}/`,
    MY_BETS: `${config.API_URL}/game/my-bets/`
} as const;  // Make the object immutable

interface ApiCallOptions extends RequestInit {
    headers?: Record<string, string>;
}

export const makeApiCall = async (endpoint: string, options: ApiCallOptions = {}) => {
    const token = localStorage.getItem('token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    try {
        const response = await fetch(endpoint, {
            ...options,
            headers,
            credentials: 'include' // Include cookies for CSRF token
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'API call failed');
        }

        return response.json();
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}; 