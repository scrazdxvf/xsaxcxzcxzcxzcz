
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Spinner from '../ui/Spinner';

interface ProtectedRouteProps {
  children?: React.ReactNode; // For wrapping specific components if needed, otherwise Outlet is used
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Spinner fullPage />; // Or some other loading indicator
  }

  if (!currentUser) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to so we can send them along after they login.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
