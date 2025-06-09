import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RouteGuardProps {
  children: ReactNode;
}

export default function RouteGuard({ children }: RouteGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // More aggressive check that runs on every route change or user change
  useEffect(() => {
    if (!loading && user?.role === 'teacher' && !location.pathname.includes('/attendance')) {
      console.log('RouteGuard redirecting teacher to attendance page');
      navigate('/attendance', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  // If no user, show login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user is a teacher but trying to access non-attendance pages, redirect to attendance
  if (user.role === 'teacher' && !location.pathname.includes('/attendance')) {
    console.log('RouteGuard redirecting teacher to attendance page in render');
    return <Navigate to="/attendance" replace />;
  }

  // Otherwise, show requested route
  return <>{children}</>;
} 