import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

// Define user role type
export type UserRole = 'admin' | 'teacher';

// Extend User type to include role
interface AuthUser extends User {
  role?: UserRole;
  displayName?: string;
}

interface AuthContextType {
  session: Session | null;
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<{
    success: boolean;
    error?: string;
  }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to update user with role
  const updateUserWithRole = async (authUser: User | null) => {
    if (!authUser) {
      setUser(null);
      return;
    }
    
    try {
      // Always check the database for the user's role
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single();
      
      if (error) {
        console.error('Error fetching user role:', error);
        // Clear any role data if we can't verify
        sessionStorage.removeItem(`userRole-${authUser.id}`);
        setUser(null);
        await supabase.auth.signOut();
        return;
      }
      
      // Map database role to application role
      // In database: 'admin' or 'user' (which maps to 'teacher')
      let appRole: UserRole = 'admin';
      let displayName = authUser.email?.split('@')[0] || 'Admin';

      if (data?.role === 'user') {
        appRole = 'teacher';
        // Fetch teacher's name from teachers table
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('name')
          .eq('id', authUser.id)
          .single();

        if (!teacherError && teacherData?.name) {
          displayName = teacherData.name;
        }
      }
      
      // Check if sessionStorage role matches database role
      const storedRole = sessionStorage.getItem(`userRole-${authUser.id}`) as UserRole | null;
      if (storedRole && storedRole !== appRole) {
        // Role mismatch, clear the invalid stored role
        console.warn('Stored role does not match database role, clearing session');
        sessionStorage.removeItem(`userRole-${authUser.id}`);
        setUser(null);
        await supabase.auth.signOut();
        return;
      }
      
      // Store the correct role for future use with unique key per user
      sessionStorage.setItem(`userRole-${authUser.id}`, appRole);
      setUser({ ...authUser, role: appRole, displayName });
    } catch (error) {
      console.error('Error in updateUserWithRole:', error);
      if (authUser?.id) {
        sessionStorage.removeItem(`userRole-${authUser.id}`);
      }
      setUser(null);
      await supabase.auth.signOut();
    }
  };

  useEffect(() => {
    // Set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        updateUserWithRole(session?.user ?? null);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      updateUserWithRole(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string, role: UserRole = 'admin') => {
    try {
      setLoading(true);
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoading(false);
        return {
          success: false,
          error: error.message,
        };
      }

      // Verify the user's role in the database
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
      
      if (profileError) {
        console.error('Error fetching user role:', profileError);
        await supabase.auth.signOut();
        setLoading(false);
        return {
          success: false,
          error: "Unable to verify user role. Please contact administrator.",
        };
      }

      // Map database role to application role
      // In database: 'admin' or 'user' (which corresponds to 'teacher' in the app)
      const dbRole = profileData.role;
      const appRole: UserRole = dbRole === 'user' ? 'teacher' : 'admin';
      
      // Check if the selected role matches the user's actual role
      if (role !== appRole) {
        await supabase.auth.signOut();
        setLoading(false);
        return {
          success: false,
          error: `You do not have ${role} privileges. Please select the correct role.`,
        };
      }
      
      // Store user role in session storage with unique key per user
      sessionStorage.setItem(`userRole-${data.user.id}`, appRole);
      
      // Get current user and update with role immediately
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await updateUserWithRole(currentUser);
      }

      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      console.error("Login error:", error);
      return {
        success: false,
        error: "An unexpected error occurred",
      };
    }
  };

  const logout = async () => {
    // Clear role from session storage if user exists
    if (user?.id) {
      sessionStorage.removeItem(`userRole-${user.id}`);
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
