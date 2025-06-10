
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, AdStatus } from '../../types';
import { listingService } from '../../services/listingService';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { CURRENCY_SYMBOL, DEFAULT_PLACEHOLDER_IMAGE } from '../../constants';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

const AdminManageListingsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [allListings, setAllListings] = useState<Product[]>([]);
  const [filteredListings, setFilteredListings] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [listingToProcess, setListingToProcess] = useState<Product | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdStatus | ''>('');
  const [userIdFilter, setUserIdFilter] = useState<string | null>(null);


  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  useEffect(() => {
    const statusFromQuery = queryParams.get('status') as AdStatus | '';
    if (statusFromQuery && Object.values(AdStatus).includes(statusFromQuery)) {
        setStatusFilter(statusFromQuery);
    }
    const userIdFromQuery = queryParams.get('userId');
    if (userIdFromQuery) {
        setUserIdFilter(userIdFromQuery);
        setSearchTerm(userIdFromQuery); // Pre-fill search with userId if navigating from user management
    }
  }, [queryParams]);


  const fetchAllListings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const listings = await listingService.getAllListings(); // This now reads fresh from localStorage
      setAllListings(listings);
    } catch (err: any) {
      setError('Не удалось загрузить все объявления.');
      console.error("Error fetching all listings in AdminManageListingsPage:", err.message, err.code, err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllListings();
  }, [fetchAllListings]);

  useEffect(() => {
    let listings = [...allListings];
    if (userIdFilter) {
      listings = listings.filter(p => p.userId === userIdFilter);
    }
    if (searchTerm && !userIdFilter) { // if userIdFilter is active, searchTerm is likely that userId
      listings = listings.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.userId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
     if (searchTerm && userIdFilter && searchTerm !== userIdFilter) { // If user manually changes search term after userId filter
        listings = listings.filter(p => p.userId === userIdFilter && (
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description.toLowerCase().includes(searchTerm.toLowerCase())
        ));
    }

    if (statusFilter) {
      listings = listings.filter(p => p.status === statusFilter);
    }
    setFilteredListings(listings.sort((a,b) => b.createdAt - a.createdAt));
  }, [allListings, searchTerm, statusFilter, userIdFilter]);

  const handleDeleteClick = (product: Product) => {
    setListingToProcess(product);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!listingToProcess) return;
    setIsProcessing(true);
    try {
      await listingService.deleteListing(listingToProcess.id);
      // fetchAllListings(); // Re-fetch to update the list, or filter locally:
      setAllListings(prev => prev.filter(p => p.id !== listingToProcess!.id));
      setShowDeleteModal(false);
      setListingToProcess(null);
    } catch (err: any) {
      console.error("Failed to delete listing in AdminManageListingsPage:", err.message, err.code, err);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleEdit = (product: Product) => {
    navigate(`/edit-listing/${product.id}?admin=true`); 
  };

  const statusOptions = [
    { value: '', label: 'Все статусы' },
    { value: AdStatus.ACTIVE, label: 'Активные' },
    { value: AdStatus.PENDING, label: 'На проверке' },
    { value: AdStatus.REJECTED, label: 'Отклоненные' },
  ];

  const getStatusBadgeColor = (status: AdStatus) => {
    switch (status) {
      case AdStatus.ACTIVE: return "bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100";
      case AdStatus.PENDING: return "bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-100";
      case AdStatus.REJECTED: return "bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100";
      default: return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100";
    }
  };
  const getStatusText = (status: AdStatus) => {
    switch (status) {
      case AdStatus.ACTIVE: return "Активно";
      case AdStatus.PENDING: return "На проверке";
      case AdStatus.REJECTED: return "Отклонено";
      default: return status;
    }
  };


  if (isLoading) return <Spinner fullPage />;
  if (error) return <div className="text-center text-red-500 dark:text-red-400 p-8">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">Управление объявлениями</h1>
      {userIdFilter && <p className="text-md text-slate-600 dark:text-slate-300 mb-6">Показаны объявления пользователя: <strong className="font-semibold">{userIdFilter}</strong></p>}
      
      <div className="mb-6 p-4 bg-light-secondary dark:bg-dark-secondary rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label={userIdFilter ? "Поиск среди объявлений пользователя" : "Поиск (название, описание, ID пользователя)"}
            placeholder={userIdFilter ? "Поиск по названию/описанию..." : "Введите текст..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            wrapperClassName="mb-0"
          />
          <Select
            label="Статус объявления"
            options={statusOptions}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as AdStatus | '')}
            placeholder="Все статусы"
            wrapperClassName="mb-0"
          />
        </div>
         {userIdFilter && (
            <Button variant="link" onClick={() => { setUserIdFilter(null); setSearchTerm(''); navigate('/admin/manage-listings');}} className="mt-2 text-sm">
                Сбросить фильтр по пользователю
            </Button>
        )}
      </div>

      {filteredListings.length === 0 ? (
        <div className="text-center py-12">
          <i className="fa-solid fa-folder-open text-6xl text-slate-400 dark:text-slate-500 mb-4"></i>
          <p className="text-xl text-slate-600 dark:text-slate-300">Объявления не найдены по текущим фильтрам.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-light-primary dark:bg-dark-primary shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Товар</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Цена</th>
                {!userIdFilter && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Пользователь</th>}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Статус</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Дата</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredListings.map(product => (
                <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img 
                          className="h-10 w-10 rounded-md object-cover" 
                          src={product.images && product.images.length > 0 ? product.images[0] : `${DEFAULT_PLACEHOLDER_IMAGE}${product.id}`} 
                          alt="" 
                          onError={(e) => { (e.target as HTMLImageElement).src = `${DEFAULT_PLACEHOLDER_IMAGE}${product.id}`; }}
                        />
                      </div>
                      <div className="ml-4">
                        <Link to={`/product/${product.id}`} target="_blank" className="text-sm font-medium text-sky-600 dark:text-dark-accent hover:underline truncate max-w-xs block" title={product.title}>
                          {product.title}
                        </Link>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{listingService.getCategoryName(product.category)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-light-text-primary dark:text-dark-text-primary">{product.price.toLocaleString('uk-UA')} {CURRENCY_SYMBOL}</td>
                  {!userIdFilter && <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{product.userId}</td>}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(product.status)}`}>
                      {getStatusText(product.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(product.createdAt).toLocaleDateString('uk-UA')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(product)} title="Редактировать">
                      <i className="fa-solid fa-edit text-sky-600 dark:text-dark-accent"></i>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(product)} title="Удалить">
                       <i className="fa-solid fa-trash-can text-red-500"></i>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Подтвердить удаление">
        {listingToProcess && (
          <div>
            <p className="text-slate-700 dark:text-dark-text-secondary mb-4">
              Вы уверены, что хотите удалить объявление "{listingToProcess.title}"? Это действие необратимо.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={isProcessing}>
                Отмена
              </Button>
              <Button variant="danger" onClick={confirmDelete} isLoading={isProcessing}>
                Удалить
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminManageListingsPage;
