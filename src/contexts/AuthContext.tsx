import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, ApiError } from '@/services/api';
import type { TokenPair } from '@/services/api';

type AppRole = 'wealth_advisor' | 'compliance_officer' | 'client';

/**
 * AuthUser provides backward-compatible properties:
 * - user.id, user.email (used throughout the app)
 * - user.user_metadata.full_name (used in Header and Index)
 */
interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  user_metadata: {
    full_name: string;
    role: string;
  };
}

/**
 * Lightweight session shim for components that use
 * `supabase.auth.getSession()` style patterns like
 * `session.session.access_token` or `session.session.user.id`.
 *
 * Components that still call supabase.auth.getSession() directly will
 * need separate migration, but those consuming session from AuthContext
 * will work via this shim.
 */
interface SessionShim {
  access_token: string;
  user: AuthUser;
}

interface AuthContextType {
  user: AuthUser | null;
  session: SessionShim | null;
  role: AppRole | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: AppRole) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Decode a JWT payload without verification (browser-side only).
 * Falls back to null on any parsing error.
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Build an AuthUser from a JWT access token.
 * Expected JWT claims: sub (user id), email, full_name, role.
 */
function userFromToken(token: string): AuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.sub) return null;

  const fullName = payload.full_name || payload.name || '';
  const role = payload.role || '';

  return {
    id: payload.sub,
    email: payload.email || '',
    full_name: fullName,
    role,
    user_metadata: {
      full_name: fullName,
      role,
    },
  };
}

interface AuthMeResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Try to restore the session from stored tokens on mount.
   * First try to decode user info from the JWT; if that fails,
   * fall back to the /auth/me endpoint.
   */
  useEffect(() => {
    const restoreSession = async () => {
      const accessToken = api.getAccessToken();
      if (!accessToken) {
        setLoading(false);
        return;
      }

      // Attempt fast path: decode from JWT
      let restored = userFromToken(accessToken);

      // Fallback: call /auth/me to get user info
      if (!restored) {
        try {
          const me = await api.get<AuthMeResponse>('/auth/me');
          restored = {
            id: me.id,
            email: me.email,
            full_name: me.full_name,
            role: me.role,
            user_metadata: {
              full_name: me.full_name,
              role: me.role,
            },
          };
        } catch {
          // Token is invalid or expired and refresh also failed
          api.clearTokens();
        }
      }

      if (restored) {
        setUser(restored);
        setRole((restored.role as AppRole) || null);
      }

      setLoading(false);
    };

    restoreSession();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    selectedRole: AppRole
  ): Promise<{ error: Error | null }> => {
    try {
      const tokens = await api.post<TokenPair>('/auth/register', {
        email,
        password,
        full_name: fullName,
        role: selectedRole,
      });

      api.setTokens(tokens);

      // Build user from the returned token
      let newUser = userFromToken(tokens.access_token);
      if (!newUser) {
        // Fallback: construct from known registration data
        newUser = {
          id: '', // Will be populated on next /auth/me call
          email,
          full_name: fullName,
          role: selectedRole,
          user_metadata: {
            full_name: fullName,
            role: selectedRole,
          },
        };

        // Fetch actual user ID from the API
        try {
          const me = await api.get<AuthMeResponse>('/auth/me');
          newUser.id = me.id;
        } catch {
          // Non-critical: ID will be available on next page load
        }
      }

      setUser(newUser);
      setRole(selectedRole);

      return { error: null };
    } catch (err) {
      const error = err instanceof ApiError
        ? new Error(err.message)
        : err instanceof Error
          ? err
          : new Error('Registration failed');
      return { error };
    }
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: Error | null }> => {
    try {
      const tokens = await api.post<TokenPair>('/auth/login', {
        email,
        password,
      });

      api.setTokens(tokens);

      let newUser = userFromToken(tokens.access_token);
      if (!newUser) {
        try {
          const me = await api.get<AuthMeResponse>('/auth/me');
          newUser = {
            id: me.id,
            email: me.email,
            full_name: me.full_name,
            role: me.role,
            user_metadata: {
              full_name: me.full_name,
              role: me.role,
            },
          };
        } catch {
          api.clearTokens();
          return { error: new Error('Failed to fetch user information') };
        }
      }

      setUser(newUser);
      setRole((newUser.role as AppRole) || null);

      return { error: null };
    } catch (err) {
      const error = err instanceof ApiError
        ? new Error(err.message)
        : err instanceof Error
          ? err
          : new Error('Invalid login credentials');
      return { error };
    }
  };

  const signOut = async () => {
    // Optionally notify the backend (fire-and-forget)
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    }

    api.clearTokens();
    setUser(null);
    setRole(null);
  };

  // Build a session shim for backward compatibility with components that
  // read session.access_token or session.user.id
  const session: SessionShim | null =
    user && api.getAccessToken()
      ? { access_token: api.getAccessToken()!, user }
      : null;

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
