
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import Navbar from './components/layout/Navbar';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import CreateListingPage from './pages/CreateListingPage';
import MyListingsPage from './pages/MyListingsPage';
import EditListingPage from './pages/EditListingPage';
import MessagesPage from './pages/MessagesPage';

import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminModerationQueuePage from './pages/admin/AdminModerationQueuePage';
import AdminManageListingsPage from './pages/admin/AdminManageListingsPage';
import AdminManageUsersPage from './pages/admin/AdminManageUsersPage'; // Import new page
import useLocalStorage from './hooks/useLocalStorage';

import { AuthProvider } from './components/auth/AuthContext';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import ProtectedRoute from './components/layout/ProtectedRoute';

const App: React.FC = () => {
  const [theme] = useTheme();
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useLocalStorage<boolean>('isAdminAuthenticated', false);

  const handleAdminLogin = () => {
    setIsAdminAuthenticated(true);
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
  };

  const AdminAuthGuard: React.FC = () => {
    if (!isAdminAuthenticated) {
      return <Navigate to="/admin/login" replace />;
    }
    return <Outlet />;
  };
  
  const MainLayout: React.FC = () => (
    <>
      <Navbar isAdmin={false} />
      <main className="flex-grow bg-light-primary dark:bg-dark-primary text-light-text-primary dark:text-dark-text-primary pt-2 pb-20 md:pb-2"> {/* Adjusted padding for bottom mobile nav */}
        <Outlet />
      </main>
    </>
  );

  const AdminLayout: React.FC = () => (
     <>
      <Navbar isAdmin={true} onAdminLogout={handleAdminLogout}/>
      <main className="flex-grow bg-light-secondary dark:bg-dark-secondary text-light-text-primary dark:text-dark-text-primary pt-2 pb-20 md:pb-2">
        <Outlet />
      </main>
    </>
  );

  const AuthLayout: React.FC = () => ( // Layout for login/register pages (no navbar)
    <main className="flex-grow bg-light-secondary dark:bg-dark-secondary">
      <Outlet/>
    </main>
  );


  return (
    <AuthProvider>
      <HashRouter>
        <div className={`min-h-screen flex flex-col theme-${theme}`}>
          <Routes>
            {/* Auth Routes (Login, Registration, Admin Login) */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegistrationPage />} />
              <Route path="/admin/login" element={<AdminLoginPage onLoginSuccess={handleAdminLogin} />} />
            </Route>

            {/* Admin Protected Routes */}
            <Route element={<AdminAuthGuard />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="/admin/moderation" element={<AdminModerationQueuePage />} />
                <Route path="/admin/manage-listings" element={<AdminManageListingsPage />} />
                <Route path="/admin/manage-users" element={<AdminManageUsersPage />} /> {/* New route */}
              </Route>
            </Route>
            
            {/* User Facing Routes */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/create-listing" element={<CreateListingPage />} />
                <Route path="/edit-listing/:id" element={<EditListingPage />} />
                <Route path="/my-listings" element={<MyListingsPage />} />
                <Route path="/messages" element={<MessagesPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </div>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;