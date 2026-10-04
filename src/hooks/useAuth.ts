import * as React from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "buyer" | "seller" | "admin";

interface Profile {
  id: string;
  name: string;
}

interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  isAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  addRole: (role: AppRole) => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
  verifyAdminStatus: () => Promise<boolean>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [roles, setRoles] = React.useState<AppRole[]>([]);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchProfile = React.useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("id", userId)
      .maybeSingle();
    
    if (data) {
      setProfile(data);
    }
  }, []);

  const fetchRoles = React.useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    if (data) {
      setRoles(data.map((r) => r.role as AppRole));
    }
  }, []);

  // Server-side admin verification using the has_role database function
  const verifyAdminStatus = React.useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    const { data, error } = await supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" });
    
    if (error) {
      console.error("Error verifying admin status:", error);
      return false;
    }
    
    setIsAdmin(!!data);
    return !!data;
  }, [user]);

  // Fetch and verify admin status from server
  const fetchAndVerifyAdmin = React.useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .rpc("has_role", { _user_id: userId, _role: "admin" });
    
    if (!error) {
      setIsAdmin(!!data);
    }
  }, []);

  React.useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer data fetching to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchRoles(session.user.id);
            fetchAndVerifyAdmin(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setIsAdmin(false);
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
        fetchAndVerifyAdmin(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchRoles, fetchAndVerifyAdmin]);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setIsAdmin(false);
  }, []);

  const addRole = React.useCallback(async (role: AppRole) => {
    if (!user) return;
    
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role });
    
    if (!error) {
      setRoles((prev) => [...prev, role]);
      // Re-verify admin status if admin role was added
      if (role === "admin") {
        setIsAdmin(true);
      }
    }
  }, [user]);

  const updateProfile = React.useCallback(async (name: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from("profiles")
      .update({ name })
      .eq("id", user.id);
    
    if (!error && profile) {
      setProfile({ ...profile, name });
    }
  }, [user, profile]);

  return {
    user,
    session,
    profile,
    roles,
    isAdmin,
    isLoading,
    signOut,
    addRole,
    updateProfile,
    verifyAdminStatus,
  };
}
