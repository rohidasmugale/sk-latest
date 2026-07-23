import { Navigate } from "react-router-dom";
import { useRole, UserRole } from "@/context/RoleContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, role, loading, user } = useRole();

  // ✅ Debug logging
  console.log('🛡️ ProtectedRoute Check:', { 
    loading, 
    isAuthenticated, 
    role, 
    userEmail: user?.email 
  });

  // ✅ Show loading only while checking auth
  if (loading) {
    console.log('⏳ Still loading...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // ✅ Check authentication
  if (!isAuthenticated) {
    console.log('🔴 Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // ✅ Check role permissions
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    console.log(`🔴 Role ${role} not allowed, redirecting to dashboard`);
    return <Navigate to={`/${role}/dashboard`} replace />;
  }

  console.log('✅ Access granted!');
  return <>{children}</>;
};