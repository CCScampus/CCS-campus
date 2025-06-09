import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface TeacherGuardProps {
  children: React.ReactNode;
}

export default function TeacherGuard({ children }: TeacherGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Immediate redirect when component mounts
  useEffect(() => {
    if (!loading && (!user || user.role !== 'teacher')) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  // If not a teacher, redirect to login
  if (!user || user.role !== 'teacher') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
} 