
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import Logo from '../ui/Logo';
import Button from '../ui/Button';
import { Theme, UserProfile } from '../../types'; // UserProfile needed for type
import { chatService } from '../../services/chatService';
import { useAuth } from '../auth/AuthContext';

interface NavbarProps {
  isAdmin: boolean; // True if currently in an admin section path like /admin/*
  onAdminLogout?: () => void; 
}

const ADMIN_USER_USERNAME_CHECK = 'jessieinberg'; // Define the special admin username for checks

const Navbar: React.FC<NavbarProps> = ({ isAdmin, onAdminLogout }) => {
  const [theme, toggleTheme] = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userProfile, logout: userLogout, isLoading: authIsLoading } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!isAdmin && currentUser && userProfile && !authIsLoading) { // Added userProfile check
        const count = await chatService.getUnreadMessagesCountForUser(currentUser.uid);
        setUnreadMessages(count);
      } else if (!currentUser || authIsLoading) {
        setUnreadMessages(0);
      }
    };
    
    if (!authIsLoading) {
        fetchUnreadCount();
        const intervalId = setInterval(fetchUnreadCount, 5000); 
        return () => clearInterval(intervalId);
    }
  }, [isAdmin, currentUser, userProfile, location.pathname, authIsLoading]);


  const navLinkClasses = "px-3 py-2 rounded-md text-sm font-medium transition-colors";
  const activeNavLinkClasses = "bg-sky-100 dark:bg-sky-700 text-sky-700 dark:text-sky-200";
  const inactiveNavLinkClasses = "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700";

  const getLinkClass = (path: string) => {
    return location.pathname === path ? `${navLinkClasses} ${activeNavLinkClasses}` : `${navLinkClasses} ${inactiveNavLinkClasses}`;
  };
  
  const handleUserLogout = () => {
    userLogout();
    navigate('/');
  };

  const isJessieInberg = userProfile?.username === ADMIN_USER_USERNAME_CHECK;

  return (
    <nav className="bg-light-primary dark:bg-dark-primary shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0">
              <Logo />
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/" className={getLinkClass('/')}>
              Главная
            </Link>
            {!isAdmin && currentUser && (
              <>
                <Link to="/my-listings" className={getLinkClass('/my-listings')}>
                  Мои объявления
                </Link>
                <Link to="/messages" className={`${getLinkClass('/messages')} relative`}>
                  Сообщения
                  {unreadMessages > 0 && (
                    <span className="absolute top-0 right-0 -mt-1 -mr-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
              </>
            )}
             {isAdmin && ( 
              <>
                <Link to="/admin/dashboard" className={getLinkClass('/admin/dashboard')}>
                  Админ. панель
                </Link>
                 <Link to="/admin/moderation" className={getLinkClass('/admin/moderation')}>
                  Модерация
                </Link>
                <Link to="/admin/manage-listings" className={getLinkClass('/admin/manage-listings')}>
                  Объявления
                </Link>
                <Link to="/admin/manage-users" className={getLinkClass('/admin/manage-users')}>
                  Пользователи
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center">
            {!isAdmin && currentUser && !isJessieInberg && ( 
               <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/create-listing')}
                className="mr-3 hidden sm:inline-flex"
                leftIcon={<i className="fa-solid fa-plus"></i>}
              >
                Разместить
              </Button>
            )}
            {!isAdmin && isJessieInberg && (
                 <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/admin/login')}
                    className="mr-3 text-yellow-500 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/50"
                    leftIcon={<i className="fa-solid fa-shield-halved"></i>}
                  >
                    Панель Администратора
                  </Button>
            )}
            {!isAdmin && !currentUser && !authIsLoading && (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="mr-2">Войти</Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/register')} className="mr-3">Регистрация</Button>
              </>
            )}
            {!isAdmin && currentUser && userProfile && (
                <Button variant="secondary" size="sm" onClick={handleUserLogout} className="mr-3">
                  Выйти ({userProfile.username})
                </Button>
            )}
             {isAdmin && onAdminLogout && ( 
                <Button variant="secondary" size="sm" onClick={onAdminLogout} className="mr-3">
                  Выйти (Админ)
                </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="text-xl"
            >
              {theme === Theme.DARK ? <i className="fa-solid fa-sun text-yellow-400"></i> : <i className="fa-solid fa-moon text-slate-600"></i>}
            </Button>
          </div>
        </div>
      </div>
       {/* Mobile "Разместить" button */}
       {!isAdmin && currentUser && !isJessieInberg && (
        <div className="md:hidden p-2 bg-light-secondary dark:bg-dark-secondary">
             <Button
                variant="primary"
                size="md"
                onClick={() => navigate('/create-listing')}
                className="w-full"
                leftIcon={<i className="fa-solid fa-plus"></i>}
              >
                Разместить объявление
              </Button>
        </div>
      )}
       {/* Mobile Navigation */}
       <div className="md:hidden flex justify-around p-2 border-t border-slate-200 dark:border-slate-700 bg-light-primary dark:bg-dark-primary fixed bottom-0 left-0 right-0 z-30">
          <Link to="/" className={`${getLinkClass('/')} flex flex-col items-center text-xs`}>
            <i className="fa-solid fa-home text-lg mb-0.5"></i> Главная
          </Link>
          {!isAdmin && currentUser && (
            <>
              <Link to="/my-listings" className={`${getLinkClass('/my-listings')} flex flex-col items-center text-xs`}>
                <i className="fa-solid fa-rectangle-list text-lg mb-0.5"></i> Мои
              </Link>
              <Link to="/messages" className={`${getLinkClass('/messages')} relative flex flex-col items-center text-xs`}>
                <i className="fa-solid fa-comments text-lg mb-0.5"></i> Чаты
                {unreadMessages > 0 && (
                  <span className="absolute top-0 right-0 -mt-1 mr-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {unreadMessages}
                  </span>
                )}
              </Link>
               {isJessieInberg && (
                 <Link to="/admin/login" className={`${getLinkClass('/admin/login')} flex flex-col items-center text-xs text-yellow-600 dark:text-yellow-400`}>
                    <i className="fa-solid fa-shield-halved text-lg mb-0.5"></i> Админ
                  </Link>
               )}
            </>
          )}
           {isAdmin && ( // Admin mobile navigation links
            <>
              <Link to="/admin/dashboard" className={`${getLinkClass('/admin/dashboard')} flex flex-col items-center text-xs`}>
                 <i className="fa-solid fa-shield-halved text-lg mb-0.5"></i> Дашборд
              </Link>
               <Link to="/admin/moderation" className={`${getLinkClass('/admin/moderation')} flex flex-col items-center text-xs`}>
                <i className="fa-solid fa-check-double text-lg mb-0.5"></i> Модерация
              </Link>
            </>
          )}
          {!isAdmin && !currentUser && !authIsLoading && (
             <Link to="/login" className={`${getLinkClass('/login')} flex flex-col items-center text-xs`}>
                <i className="fa-solid fa-right-to-bracket text-lg mb-0.5"></i> Войти
              </Link>
          )}
        </div>
    </nav>
  );
};

export default Navbar;