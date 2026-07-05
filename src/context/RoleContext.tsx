import React, { createContext, useContext, useState, useEffect } from "react";
import { stopLocationTracking } from "@/utils/locationTracker";

export type UserRole = "superadmin" | "admin" | "manager" | "supervisor" | "employee" | null;

export interface User {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  joinDate: string;
  site: string;
  department: string;
  contactNumber?: string;
  lastLogin?: string;
  [key: string]: unknown;
}

interface RoleContextType {
  user: User | null;
  role: UserRole;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

// ============ UPDATED API URL CONFIGURATION ============
// Get the API URL with proper fallbacks
const getApiUrl = () => {
  // If VITE_API_URL is set in environment variables
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/auth`;
  }
  
  // For production (Vercel) - use your Render backend URL
  if (import.meta.env.PROD) {
    return 'https://sk-backend-d743.onrender.com/api/auth';
  }
  
  // For development (localhost)
  return 'http://localhost:5001/api/auth';
};

const API_URL = getApiUrl();

// Log the API URL for debugging
console.log('🔧 API URL:', API_URL);
console.log('🔧 Environment:', import.meta.env.MODE);

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedUser = localStorage.getItem("sk_user");
      const storedToken = localStorage.getItem("sk_token");

      if (storedUser && storedToken) {
        const response = await fetch(`${API_URL}/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${storedToken}`
          },
          body: JSON.stringify({ token: storedToken })
        });

        if (response.ok) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setRole(parsedUser.role);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("sk_user");
          localStorage.removeItem("sk_token");
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string, selectedRole: UserRole) => {
    try {
      console.log('🟡 Signup attempt:', { name, email, role: selectedRole });
      
      const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role: selectedRole
        })
      });

      const data = await response.json();
      console.log('🟡 Signup response:', data);

      if (!data.success) {
        throw new Error(data.message || 'Signup failed');
      }

      localStorage.setItem("sk_user", JSON.stringify(data.user));
      localStorage.setItem("sk_token", data.token);
      localStorage.setItem("token", data.token);
      setUser(data.user);
      setRole(data.user.role);
      setIsAuthenticated(true);
      
      console.log('✅ Signup successful for:', data.user.email);
      
    } catch (error) {
      console.error('🔴 Signup error:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string, selectedRole: UserRole) => {
    try {
      console.log('🟡 Login attempt:', { 
        email, 
        role: selectedRole,
        passwordLength: password.length,
        apiUrl: API_URL 
      });
      
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          role: selectedRole
        })
      });

      console.log('🟡 Response status:', response.status);
      
      const data = await response.json();
      console.log('🟡 Login response data:', data);

      if (!response.ok || !data.success) {
        console.error('🔴 Login failed:', {
          status: response.status,
          success: data.success,
          message: data.message,
          debug: data.debug
        });
        
        let errorMessage = data.message || 'Login failed';
        if (data.debug) {
          errorMessage += ` (Debug: ${JSON.stringify(data.debug)})`;
        }
        throw new Error(errorMessage);
      }

      localStorage.setItem("sk_user", JSON.stringify(data.user));
      localStorage.setItem("sk_token", data.token);
      localStorage.setItem("token", data.token);
      setUser(data.user);
      setRole(data.user.role);
      setIsAuthenticated(true);
      
      console.log('✅ Login successful for:', data.user.email);
      
    } catch (error) {
      console.error('🔴 Login error details:', error);
      throw error;
    }
  };

  const logout = () => {
    stopLocationTracking();

    setUser(null);
    setRole(null);
    setIsAuthenticated(false);
    localStorage.removeItem("sk_user");
    localStorage.removeItem("sk_token");
    console.log('✅ User logged out');
  };

  return (
    <RoleContext.Provider
      value={{
        user,
        role,
        login,
        signup,
        logout,
        isAuthenticated,
        loading
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within RoleProvider");
  }
  return context;
};
