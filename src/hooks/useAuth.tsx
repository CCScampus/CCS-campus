// This file is deprecated and only exists for backward compatibility
// Import from contexts/AuthContext.tsx instead
import { useAuth as useAuthFromContext, AuthProvider, UserRole } from '@/contexts/AuthContext';

// Re-export everything from the new location
export { AuthProvider, UserRole };
export const useAuth = useAuthFromContext;

// For backward compatibility
export default useAuthFromContext;
