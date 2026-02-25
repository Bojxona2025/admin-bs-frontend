"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import $api from "@/app/http/api";

export const useAuth = (redirectIfUnauthenticated = false) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const isRefreshingRef = useRef(false);
  const authCheckInProgressRef = useRef(false);
  const interceptorsSetupRef = useRef(false);

  const clearAuthData = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
      }
      setIsAuthenticated(false);
      setUser(null);
      setError(null);
    } catch (err) {
      console.error("Error clearing auth data:", err);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    if (isRefreshingRef.current) {
      return null;
    }

    isRefreshingRef.current = true;

    try {
      const storedRefreshToken =
        typeof window !== "undefined"
          ? localStorage.getItem("refreshToken")
          : null;

      if (!storedRefreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await $api.post(
        "/auth/refresh/token",
        {},
        {
          headers: {
            refreshToken: storedRefreshToken,
          },
          _skipAuthRetry: true,
        }
      );

      if (response.data?.success || response.data?.status === 200) {
        const responseData = response.data.data || response.data;
        const { accessToken, refreshToken: newRefreshToken } = responseData;

        if (typeof window !== "undefined") {
          localStorage.setItem("accessToken", accessToken);
          if (newRefreshToken) {
            localStorage.setItem("refreshToken", newRefreshToken);
          }
        }

        return accessToken;
      } else {
        throw new Error("Invalid refresh response");
      }
    } catch (error) {
      console.error("Token refresh error:", error);
      clearAuthData();
      throw error;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [clearAuthData]);

  const checkAuth = useCallback(async () => {
    if (authCheckInProgressRef.current) {
      return;
    }

    authCheckInProgressRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const accessToken =
        typeof window !== "undefined"
          ? localStorage.getItem("accessToken")
          : null;

      if (!accessToken) {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      // First, try to get user data from localStorage
      const storedUser =
        typeof window !== "undefined" ? localStorage.getItem("user") : null;

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch (parseError) {
          console.error("Error parsing stored user:", parseError);
        }
      }

      try {
        const response = await $api.get("/users/profile/me", {
          _skipAuthRetry: true,
        });

        if (response.status === 201 && !response.data?.data) {
          clearAuthData();
          if (redirectIfUnauthenticated) {
            router.push("/register");
          }
          return;
        }

        if (response.data?.success && response.data?.data) {
          const userData = response.data.data;

          if (typeof window !== "undefined") {
            localStorage.setItem("user", JSON.stringify(userData));
          }

          setIsAuthenticated(true);
          setUser(userData);
        } else {
          throw new Error("Invalid profile response");
        }
      } catch (apiError) {
        console.error("Profile API error:", apiError);

        // Only clear auth data for specific authentication errors
        if (apiError.response?.status === 401) {
          try {
            const newAccessToken = await refreshToken();
            if (newAccessToken) {
              // Retry with new token
              const retryResponse = await $api.get("/users/profile/me");
              if (retryResponse.status === 201 && !retryResponse.data?.data) {
                clearAuthData();
                if (redirectIfUnauthenticated) {
                  router.push("/register");
                }
                return;
              }
              if (retryResponse.data?.success && retryResponse.data?.data) {
                const userData = retryResponse.data.data;

                if (typeof window !== "undefined") {
                  localStorage.setItem("user", JSON.stringify(userData));
                }

                setIsAuthenticated(true);
                setUser(userData);
              } else {
                throw new Error("Retry failed");
              }
            }
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
            clearAuthData();
          }
        } else if (apiError.response?.status === 403) {
          // Forbidden - clear auth data
          clearAuthData();
        } else {
          // For network errors or other issues, keep the user logged in
          // but set error state so UI can show appropriate message
          console.warn(
            "Network or server error, keeping user logged in:",
            apiError.message
          );
          setError(
            "Failed to verify authentication. Please check your connection."
          );

          // If we have stored user data and access token, keep user logged in
          if (accessToken && storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
              setIsAuthenticated(true);
            } catch (parseError) {
              console.error("Error parsing stored user:", parseError);
              clearAuthData();
            }
          } else {
            clearAuthData();
          }
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setError("Authentication check failed");

      // Don't clear auth data for general errors
      // Only clear if we're sure it's an auth issue
    } finally {
      setLoading(false);
      authCheckInProgressRef.current = false;
    }
  }, [refreshToken, clearAuthData, redirectIfUnauthenticated, router]);

  const logout = useCallback(() => {
    clearAuthData();
    router.push("/register");
  }, [clearAuthData, router]);

  const updateUser = useCallback((newUserData) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(newUserData));
      }
      setUser(newUserData);
    } catch (err) {
      console.error("Error updating user data:", err);
    }
  }, []);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const accessToken = localStorage.getItem("accessToken");
      const storedUser = localStorage.getItem("user");

      if (accessToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch (err) {
          console.error("Error loading stored user data:", err);
          clearAuthData();
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
      setLoading(false);
    }
  }, [clearAuthData]);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      checkAuth();
    }
  }, [loading, isAuthenticated, checkAuth]); 

  useEffect(() => {
    if (interceptorsSetupRef.current) {
      return;
    }

    interceptorsSetupRef.current = true;

    const requestInterceptor = $api.interceptors.request.use(
      (config) => {
        if (config._skipAuthRetry) {
          return config;
        }

        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("accessToken")
            : null;

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    const responseInterceptor = $api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const original = error.config;

        if (
          original._skipAuthRetry ||
          original._retry ||
          isRefreshingRef.current ||
          error.response?.status !== 401
        ) {
          return Promise.reject(error);
        }

        original._retry = true;

        try {
          const newAccessToken = await refreshToken();

          if (newAccessToken) {
            original.headers.Authorization = `Bearer ${newAccessToken}`;
            return $api(original);
          } else {
            throw new Error("Failed to refresh token");
          }
        } catch (refreshError) {
          console.error("Token refresh failed in interceptor:", refreshError);

          clearAuthData();

          if (redirectIfUnauthenticated) {
            router.push("/register");
          }

          return Promise.reject(error);
        }
      }
    );

    return () => {
      $api.interceptors.request.eject(requestInterceptor);
      $api.interceptors.response.eject(responseInterceptor);
      interceptorsSetupRef.current = false;
    };
  }, [refreshToken, clearAuthData, router, redirectIfUnauthenticated]);

  return {
    isAuthenticated,
    user,
    loading,
    error,
    logout,
    updateUser,
    checkAuth,
    clearError: () => setError(null),
  };
};
