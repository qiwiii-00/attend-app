import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ApiError } from "@/lib/api/apiClient";
import {
  type LoginPayload,
  type RegisterPayload,
  type SessionUser,
  login,
  logout,
  me,
  register,
} from "@/lib/api/session-service";

export type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: SessionUser | null;
  refreshSession: () => Promise<SessionUser | null>;
  signIn: (payload: LoginPayload) => Promise<SessionUser>;
  signUp: (payload: RegisterPayload) => Promise<SessionUser>;
  signOut: () => Promise<void>;
  syncUser: (user: SessionUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function getPostAuthRoute(user: SessionUser) {
  if (!user.course_id || !user.semester_id) {
    return "/profile-reg" as const;
  }

  return "/(tabs)/home" as const;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const response = await me();
      setUser(response.data);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        return null;
      }

      throw error;
    }
  }, []);

  const signIn = useCallback(async (payload: LoginPayload) => {
    const response = await login(payload);
    setUser(response.data);
    return response.data;
  }, []);

  const signUp = useCallback(async (payload: RegisterPayload) => {
    const response = await register(payload);
    setUser(response.data);
    return response.data;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      setUser(null);
    }
  }, []);

  const syncUser = useCallback((nextUser: SessionUser | null) => {
    setUser(nextUser);
  }, []);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const currentUser = await refreshSession();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: !!user,
      user,
      refreshSession,
      signIn,
      signUp,
      signOut,
      syncUser,
    }),
    [isLoading, refreshSession, signIn, signOut, signUp, syncUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useSession must be used within an AuthProvider.");
  }

  return context;
}
