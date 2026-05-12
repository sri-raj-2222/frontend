import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

const API = 'https://backend-a41z.onrender.com';

type UserRole = 'user' | 'admin' | 'moderator' | 'support';

export interface BanInfo {
  type: 'temp' | 'permanent';
  ban_expires_at?: string | null;
  warning_count?: number;
}

type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profilePic?: string | null;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  banInfo: BanInfo | null;
  clearBan: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function buildUserFromSession(su: SupabaseUser): User {
  return {
    id: su.id,
    email: su.email || '',
    name:
      su.user_metadata?.name ||
      su.user_metadata?.full_name ||
      su.email?.split('@')[0] ||
      'User',
    profilePic:
      su.user_metadata?.avatar_url ||
      su.user_metadata?.picture ||
      su.user_metadata?.profilePic || null,
    role: 'user', // default — updated asynchronously below
  };
}

// Ensures a user row exists in both `users` and `profiles` tables.
// task_requests.requester_id has a FK → users.id, so the row must exist.
async function ensureUserRow(su: SupabaseUser) {
  const name = su.user_metadata?.name || su.user_metadata?.full_name || su.email?.split('@')[0] || 'User';
  const email = su.email || '';
  const pic = su.user_metadata?.avatar_url || su.user_metadata?.picture || null;

  // Upsert into `profiles` table (used for display names)
  supabase
    .from('profiles')
    .upsert({ id: su.id, name, email, profile_pic: pic }, { onConflict: 'id' })
    .then(({ error }) => { if (error) console.warn('[auth] profiles upsert:', error.message) });
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);

  // ── 1. Sync auth state + ensure DB rows exist ─────────────────────────────
  useEffect(() => {
    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser(buildUserFromSession(session.user));
        ensureUserRow(session.user);
      }
    });

    // Listen for sign-in / sign-out — must stay synchronous
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          setUser(buildUserFromSession(session.user));
          ensureUserRow(session.user);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── 2. Async profile fetch + ban check ────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    // Enrich profile from Supabase
    supabase
      .from('profiles')
      .select('name, email, role, profile_pic')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setUser(prev => prev ? {
            ...prev,
            name: data.name || prev.name,
            email: data.email || prev.email,
            role: (data.role as UserRole) || prev.role,
            profilePic: data.profile_pic || prev.profilePic,
          } : prev);
        }
      })

    // Check ban status
    fetch(`${API}/api/users/${user.id}/ban-status`)
      .then(r => r.json())
      .then(data => {
        if (data.banned) {
          setBanInfo({ type: data.type, ban_expires_at: data.ban_expires_at, warning_count: data.warning_count });
        } else {
          setBanInfo(null);
        }
      })
      .catch(() => { /* server offline — fail open */ });
  }, [user?.id]);

  const clearBan = () => setBanInfo(null);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setBanInfo(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAuthenticated: !!session, banInfo, clearBan, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

