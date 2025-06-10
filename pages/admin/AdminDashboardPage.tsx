
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { listingService } from '../../services/listingService';
import { Product, AdStatus, UserProfile } from '../../types'; // Changed User to UserProfile
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../components/auth/AuthContext'; 

interface Stats {
  totalActive: number;
  totalPending: number;
  totalRejected: number;
  totalListings: number;
  totalUsers: number;
  usersRegisteredLast24h: number;
}

const AdminDashboardPage: React.FC = () => {
  const { allUserProfiles, isLoading: authLoading } = useAuth(); // Use allUserProfiles
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentPending, setRecentPending] = useState<Product[]>([]);

  const fetchDashboardData = useCallback(async () => {
    if (authLoading) return; 

    setIsLoading(true);
    try {
      const allDBListings = await listingService.getAllListings();
      const pendingDBListings = await listingService.getPendingListings();
      
      const now = Date.now();
      const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
      // Ensure allUserProfiles is not undefined before filtering
      const usersRegisteredLast24h = (allUserProfiles || []).filter(user => user.createdAt >= twentyFourHoursAgo).length;

      setStats({
        totalActive: allDBListings.filter(p => p.status === AdStatus.ACTIVE).length,
        totalPending: pendingDBListings.length,
        totalRejected: allDBListings.filter(p => p.status === AdStatus.REJECTED).length,
        totalListings: allDBListings.length,
        totalUsers: (allUserProfiles || []).length,
        usersRegisteredLast24h: usersRegisteredLast24h,
      });
      setRecentPending(pendingDBListings.slice(0, 5));

    } catch (error: any) {
      console.error("Error fetching admin dashboard data:", error.message, error.code, error);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, allUserProfiles]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (isLoading || authLoading || !stats) return <Spinner fullPage />;

  const StatCard: React.FC<{ title: string; value: number | string; icon: string; color: string; linkTo?: string }> = 
  ({ title, value, icon, color, linkTo }) => (
    <div className={`bg-light-primary dark:bg-dark-secondary p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow ${linkTo ? 'cursor-pointer' : ''}`}>
      {linkTo ? (
        <Link to={linkTo} className="block">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
              <p className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">{value}</p>
            </div>
            <div className={`p-3 rounded-full bg-opacity-20 dark:bg-opacity-30 ${color.replace('text-', 'bg-')}`}>
              <i className={`${icon} ${color} text-2xl`}></i>
            </div>
          </div>
        </Link>
      ) : (
         <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">{value}</p>
          </div>
          <div className={`p-3 rounded-full bg-opacity-20 dark:bg-opacity-30 ${color.replace('text-', 'bg-')}`}>
            <i className={`${icon} ${color} text-2xl`}></i>
          </div>
        </div>
      )}
    </div>
  );


  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-8">Панель Администратора</h1>
      
      <h2 className="text-2xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">Объявления</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Активные объявления" value={stats.totalActive} icon="fa-solid fa-check-circle" color="text-green-500" linkTo="/admin/manage-listings?status=active" />
        <StatCard title="На модерации" value={stats.totalPending} icon="fa-solid fa-clock" color="text-yellow-500" linkTo="/admin/moderation" />
        <StatCard title="Отклоненные" value={stats.totalRejected} icon="fa-solid fa-times-circle" color="text-red-500" linkTo="/admin/manage-listings?status=rejected" />
        <StatCard title="Всего объявлений" value={stats.totalListings} icon="fa-solid fa-list-alt" color="text-sky-500 dark:text-dark-accent" linkTo="/admin/manage-listings" />
      </div>

      <h2 className="text-2xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">Пользователи</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Всего пользователей" value={stats.totalUsers} icon="fa-solid fa-users" color="text-purple-500" linkTo="/admin/manage-users" />
        <StatCard title="Новых за 24ч" value={stats.usersRegisteredLast24h} icon="fa-solid fa-user-plus" color="text-teal-500" linkTo="/admin/manage-users?filter=last24h" />
         <StatCard title="Онлайн / Посещения" value="N/A" icon="fa-solid fa-wifi" color="text-slate-500" />
         <StatCard title="Доп. Статистика" value="N/A" icon="fa-solid fa-chart-line" color="text-slate-500" />
      </div>
       <p className="text-xs text-slate-500 dark:text-slate-400 mb-8 -mt-4">
        * Статистика "Онлайн / Посещения" требует серверной части для точного отслеживания.
      </p>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-light-primary dark:bg-dark-secondary p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">Недавние объявления на модерацию</h2>
          {recentPending.length > 0 ? (
            <ul className="space-y-3">
              {recentPending.map(p => (
                <li key={p.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                  <div>
                    <Link to={`/product/${p.id}`} target="_blank" className="font-medium text-sky-600 dark:text-dark-accent hover:underline">{p.title}</Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(p.createdAt).toLocaleString('uk-UA')} - {p.price} ₴
                    </p>
                  </div>
                  <Link to={`/admin/moderation#listing-${p.id}`}>
                    <span className="text-xs font-semibold px-2 py-1 bg-yellow-400 text-yellow-800 rounded-full">Проверить</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 dark:text-slate-400">Нет объявлений, ожидающих модерации.</p>
          )}
          {stats.totalPending > 0 && 
            <Link to="/admin/moderation" className="mt-4 inline-block text-sm text-sky-600 dark:text-dark-accent hover:underline font-medium">
              Смотреть все ({stats.totalPending}) <i className="fa-solid fa-arrow-right ml-1"></i>
            </Link>
          }
        </div>

        <div className="bg-light-primary dark:bg-dark-secondary p-6 rounded-xl shadow-lg">
           <h2 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">Быстрые действия</h2>
            <div className="space-y-3">
                 <Link to="/admin/moderation" className="flex items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                    <i className="fa-solid fa-gavel text-xl text-sky-500 dark:text-dark-accent mr-3"></i>
                    <span>Перейти к модерации объявлений</span>
                </Link>
                 <Link to="/admin/manage-listings" className="flex items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                    <i className="fa-solid fa-folder-open text-xl text-sky-500 dark:text-dark-accent mr-3"></i>
                    <span>Управление всеми объявлениями</span>
                </Link>
                <Link to="/admin/manage-users" className="flex items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                    <i className="fa-solid fa-users-cog text-xl text-sky-500 dark:text-dark-accent mr-3"></i>
                    <span>Управление пользователями</span>
                </Link>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
