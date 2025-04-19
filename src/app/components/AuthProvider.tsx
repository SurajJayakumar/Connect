'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase';
import { useRouter, usePathname } from 'next/navigation';

// Define the context type
type AuthContextType = {
  user: User | null;
  loading: boolean;
};

// Create the auth context
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Protected routes - add any routes that require authentication
const protectedRoutes = ['/dashboard', '/call'];
// Public only routes - routes that should redirect to dashboard if authenticated
const publicOnlyRoutes = ['/login', '/signup'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Handle route protection based on auth state
  useEffect(() => {
    if (loading) return; // Wait until auth state is determined

    // Check if current path starts with any protected route
    const isProtectedRoute = protectedRoutes.some(route => 
      pathname?.startsWith(route)
    );
    
    // Check if current path starts with any public only route
    const isPublicOnlyRoute = publicOnlyRoutes.some(route => 
      pathname?.startsWith(route)
    );

    if (isProtectedRoute && !user) {
      // Redirect to login if trying to access protected route without authentication
      router.push('/login');
    } else if (isPublicOnlyRoute && user) {
      // Redirect to dashboard if trying to access login/signup while already authenticated
      router.push('/dashboard');
    }
  }, [user, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}