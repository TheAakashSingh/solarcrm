import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '@/types/crm';
import { authAPI } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  login: (userId: string) => void;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('currentUser');
    
    if (token && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        // Verify token is still valid
        authAPI.getMe()
          .then((response) => {
            if (response.success && response.data) {
              setCurrentUser(response.data);
              localStorage.setItem('currentUser', JSON.stringify(response.data));
              // Connect socket
              connectSocket(token);
            } else {
              // Token invalid, clear session
              logout();
            }
          })
          .catch(() => {
            logout();
          })
          .finally(() => {
            setLoading(false);
          });
      } catch {
        logout();
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = (userId: string) => {
    // Legacy method - kept for compatibility
    // This should use the API to get user by ID
    console.warn('login(userId) is deprecated, use loginWithEmail instead');
  };

  const loginWithEmail = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authAPI.login(email, password);
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        setCurrentUser(user);
        localStorage.setItem('token', token);
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Connect socket
        connectSocket(token);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentUserId');
    disconnectSocket();
  };

  const updateCurrentUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      setCurrentUser: updateCurrentUser,
      login, 
      loginWithEmail,
      logout, 
      isAuthenticated: !!currentUser,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
