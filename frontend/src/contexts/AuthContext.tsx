// contexts/auth-context.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  profile_picture?: string;
  role: string;
  is_buyer: boolean;
  is_seller: boolean;
  is_finance: boolean;
  is_admin: boolean;
  is_active: boolean;
  is_staff: boolean;
  is_super_admin?: boolean;
  permissions?: string[];
  created_at: string;
  updated_at: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (userData: User | null) => void;
  logout: () => void;
  getUser: () => User | null;
  updateUser: (userData: Partial<User>) => void;
  isRootAccess: () => boolean;
  validateToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate token with backend
  const validateToken = async (): Promise<boolean> => {
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) return false;
      
      const parsedUser = JSON.parse(storedUser);
      if (!parsedUser.token) return false;

      // Make a request to validate token using the profile endpoint
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/profile/`, {
        headers: {
          Authorization: `Token ${parsedUser.token}`
        }
      });

      if (response.status === 200) {
        const profile = response.data;
        if (profile?.permissions && Array.isArray(profile.permissions)) {
          const updatedUser = {
            ...parsedUser,
            permissions: profile.permissions,
            role: (profile.role || parsedUser.role).toLowerCase(),
            is_admin: profile.is_admin ?? parsedUser.is_admin,
            is_staff: profile.is_staff ?? parsedUser.is_staff,
          };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setUserState(updatedUser);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Token validation failed:", error);
      return false;
    }
  };

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          
          // Validate the parsed user data structure
          const hasAllFields =
            typeof parsedUser.id === "string" &&
            typeof parsedUser.email === "string" &&
            typeof parsedUser.username === "string" &&
            typeof parsedUser.token === "string" &&
            typeof parsedUser.role === "string";

          if (hasAllFields) {
            const normalizedUser = {
              ...parsedUser,
              role: parsedUser.role.toLowerCase(),
            };
            setUserState(normalizedUser);
            validateToken();
          } else {
            console.warn("Stored user data is incomplete:", parsedUser);
            localStorage.removeItem("user");
            setUserState(null);
          }
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        localStorage.removeItem("user");
        setUserState(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const setUser = (userData: User | null) => {
    if (userData) {
      // Validate user data before saving
      const hasAllFields =
        typeof userData.id === "string" &&
        typeof userData.email === "string" &&
        typeof userData.username === "string" &&
        typeof userData.token === "string" &&
        typeof userData.role === "string";

      if (hasAllFields) {
        const normalizedUserData = {
          ...userData,
          role: userData.role.toLowerCase(),
        };
        localStorage.setItem("user", JSON.stringify(normalizedUserData));
        setUserState(normalizedUserData);
      } else {
        console.warn("Attempted to set incomplete user object:", userData);
        // Don't save incomplete user data
        setUserState(null);
      }
    } else {
      localStorage.removeItem("user");
      setUserState(null);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (!user) return;

    const updatedUser = { ...user, ...userData };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUserState(updatedUser);
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUserState(null);
    // Only redirect if not already on login page
    if (window.location.pathname !== '/') {
      window.location.href = "/";
    }
  };

  const getUser = (): User | null => {
    return user;
  };

  const isRootAccess = (): boolean => {
    return user?.is_super_admin === true;
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user && !!user.token,
    isLoading,
    setUser,
    logout,
    getUser,
    updateUser,
    isRootAccess,
    validateToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
