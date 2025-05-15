import React, { createContext, useContext, useState, useEffect } from "react";
import { API_BASE_URL, API_ENDPOINTS } from '../config/env';
import { socketService } from '../services/socket';
import { toast } from 'react-toastify';

interface User {
  id: string;
  username: string;
  balance: number;
  email: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string, phoneNumber: string, country: string) => Promise<void>;
  logout: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isAdmin: false,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  updateBalance: () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [socketInitialized, setSocketInitialized] = useState(false);

  // Initialize socket when auth state changes
  useEffect(() => {
    const initializeSocket = () => {
      const token = localStorage.getItem('token');
      if (user && token && !socketInitialized) {
        try {
          socketService.initialize(token);
          setSocketInitialized(true);
        } catch (error) {
          console.error('Failed to initialize socket:', error);
          toast.error('Failed to connect to game server');
        }
      } else if (!user || !token) {
        socketService.disconnect();
        setSocketInitialized(false);
      }
    };

    initializeSocket();
  }, [user, socketInitialized]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ME}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          localStorage.removeItem('token');
          socketService.disconnect();
          setSocketInitialized(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        socketService.disconnect();
        setSocketInitialized(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const { token, user: userData } = await response.json();
      localStorage.setItem('token', token);
      setUser(userData);
      setSocketInitialized(false); // Reset socket initialization flag
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, username: string, phoneNumber: string, country: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SIGNUP}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          username,
          phoneNumber,
          country
        }),
      });

      if (!response.ok) {
        throw new Error('Signup failed');
      }

      const { token, user: userData } = await response.json();
      localStorage.setItem('token', token);
      setUser(userData);
      // Socket will be initialized in useEffect
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${API_BASE_URL}${API_ENDPOINTS.LOGOUT}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      socketService.disconnect();
      setSocketInitialized(false);
    }
  };

  const updateBalance = (newBalance: number) => {
    if (user) {
      setUser({
        ...user,
        balance: newBalance
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isAdmin: user?.isAdmin || false,
        login,
        signup,
        logout,
        updateBalance
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
