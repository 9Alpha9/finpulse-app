"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type SubscriptionTier = "free" | "premium";

// 1. Kita tambahkan struktur user_metadata agar TypeScript tidak error
interface User {
  email: string;
  name: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface ThemeAuthContextType {
  theme: Theme;
  toggleTheme: () => void;
  user: User | null;
  login: (email: string, name?: string) => boolean;
  register: (email: string, name: string) => boolean;
  logout: () => void;
  isLoading: boolean;
  subscriptionTier: SubscriptionTier;
  setSubscriptionTier: (tier: SubscriptionTier) => void;
}

const ThemeAuthContext = createContext<ThemeAuthContextType | undefined>(undefined);

export function ThemeAuthProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [user, setUser] = useState<User | null>(null);
  const [subscriptionTier, setSubscriptionTierState] = useState<SubscriptionTier>("free");
  const [isLoading, setIsLoading] = useState(true);

  // Initialize theme, auth and subscription from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");

    setTheme(initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("user");
      }
    }

    const savedTier = localStorage.getItem("subscription_tier") as SubscriptionTier;
    if (savedTier) {
      setSubscriptionTierState(savedTier);
    }

    setIsLoading(false);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const setSubscriptionTier = (tier: SubscriptionTier) => {
    setSubscriptionTierState(tier);
    localStorage.setItem("subscription_tier", tier);
  };

  const login = (email: string, name?: string): boolean => {
    const defaultName = name || email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1);

    // 2. Kita isi data mock ini dengan struktur yang benar saat login
    const mockUser: User = {
      email,
      name: defaultName,
      user_metadata: {
        full_name: defaultName,
      }
    };

    setUser(mockUser);
    localStorage.setItem("user", JSON.stringify(mockUser));
    return true;
  };

  const register = (email: string, name: string): boolean => {
    // 3. Kita isi data mock ini dengan struktur yang benar saat register
    const mockUser: User = {
      email,
      name,
      user_metadata: {
        full_name: name,
      }
    };

    setUser(mockUser);
    localStorage.setItem("user", JSON.stringify(mockUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <ThemeAuthContext.Provider
      value={{
        theme,
        toggleTheme,
        user,
        login,
        register,
        logout,
        isLoading,
        subscriptionTier,
        setSubscriptionTier,
      }}
    >
      {children}
    </ThemeAuthContext.Provider>
  );
}

export function useThemeAuth() {
  const context = useContext(ThemeAuthContext);
  if (context === undefined) {
    throw new Error("useThemeAuth must be used within a ThemeAuthProvider");
  }
  return context;
}