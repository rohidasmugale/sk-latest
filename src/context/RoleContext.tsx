import React, { createContext, useContext, useState, useEffect } from "react";
import { stopLocationTracking } from "@/utils/locationTracker";
import { toast } from "sonner";
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
  login: (email: string, password: string, role: UserRole, rememberMe?: boolean) => Promise<void>;
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
    return 'https://sk-backend-btbj.onrender.com/api/auth';
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
      const tokenExpiry = localStorage.getItem("token_expiry");

      console.log('🔍 Auth Check Running:', {
        hasUser: !!storedUser,
        hasToken: !!storedToken,
        hasExpiry: !!tokenExpiry
      });

      // ✅ Check if token expired
      if (tokenExpiry) {
        const expiryDate = new Date(tokenExpiry);
        const now = new Date();
        console.log('🕐 Expiry Check:', {
          expiry: expiryDate.toISOString(),
          now: now.toISOString(),
          expired: expiryDate < now
        });

        if (expiryDate < now) {
          console.log('🟡 Token expired, clearing...');
          localStorage.removeItem("sk_user");
          localStorage.removeItem("sk_token");
          localStorage.removeItem("token_expiry");
          setLoading(false);
          setIsAuthenticated(false);
          return;
        }
      }

      // ✅ If we have user and token, authenticate immediately
      if (storedUser && storedToken) {
        try {
          const parsedUser = JSON.parse(storedUser);
          console.log('✅ User found in localStorage:', parsedUser.email, 'Role:', parsedUser.role);

          // ✅ SET ALL STATES IMMEDIATELY
          setUser(parsedUser);
          setRole(parsedUser.role);
          setIsAuthenticated(true);  // ← CRITICAL: Set this to true!
          setLoading(false); // ← Dashboard renders immediately

          console.log('✅ Auth state set:', {
            isAuthenticated: true,
            role: parsedUser.role,
            user: parsedUser.email
          });

          // ✅ Verify token in background (don't block UI)
          console.log('🔍 Verifying token in background...');
          fetch(`${API_URL}/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${storedToken}`
            },
            body: JSON.stringify({ token: storedToken })
          })
            .then(async (res) => {
              if (res.status === 401) {
                console.log('🔴 Token invalid, clearing...');
                localStorage.removeItem("sk_user");
                localStorage.removeItem("sk_token");
                localStorage.removeItem("token_expiry");
                setUser(null);
                setRole(null);
                setIsAuthenticated(false);
                toast.error('Session expired. Please login again.');
              } else if (res.ok) {
                const data = await res.json();
                console.log('✅ Token verified successfully:', data.message);
              }
            })
            .catch((error) => {
              console.log('🟡 Token verification failed (network):', error.message);
              console.log('✅ Keeping user logged in (local cache)');
            });

          return; // ✅ Dashboard is already shown

        } catch (parseError) {
          console.error('❌ Error parsing stored user:', parseError);
          localStorage.removeItem("sk_user");
          localStorage.removeItem("sk_token");
          setLoading(false);
          setIsAuthenticated(false);
        }
      }

      // ❌ No token → Show login
      console.log('🔴 No valid token found, showing login');
      setLoading(false);
      setIsAuthenticated(false);

    } catch (error) {
      console.error('❌ Auth check error:', error);
      setLoading(false);
      setIsAuthenticated(false);
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

  const login = async (email: string, password: string, selectedRole: UserRole, rememberMe: boolean = false) => {
    try {
      console.log('🟡 Login attempt:', {
        email,
        role: selectedRole,
        passwordLength: password.length,
        rememberMe,
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
          role: selectedRole,
          rememberMe
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

      // ✅ Store expiry date
      if (rememberMe) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30); // 30 days
        localStorage.setItem("token_expiry", expiryDate.toISOString());
      } else {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7); // 7 days
        localStorage.setItem("token_expiry", expiryDate.toISOString());
      }

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
    localStorage.removeItem("token_expiry"); // ← ADD THIS LINE
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