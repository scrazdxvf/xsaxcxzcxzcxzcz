
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, ProductCondition } from '../types';
import { listingService } from '../services/listingService';
import ProductCard from '../components/product/ProductCard';
import Spinner from '../components/ui/Spinner';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { CATEGORIES, CURRENCY_SYMBOL } from '../constants';
import { UKRAINIAN_CITIES } from '../cities';
import Button from '../components/ui/Button';

const POLLING_INTERVAL = 30000; // 30 seconds for polling

const HomePage: React.FC = () => {
  const [allListings, setAllListings] = useState<Product[]>([]);
  const [filteredListings, setFilteredListings] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<ProductCondition | ''>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  
  const [showDetailedFilters, setShowDetailedFilters] = useState(false);

  const fetchListings = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) setIsLoading(true);
    setError(null);
    try {
      const activeListings = await listingService.getActiveListings();
      setAllListings(activeListings);
    } catch (err: any) {
      setError('Не удалось загрузить объявления.');
      console.error("Error fetching listings in HomePage:", err.message, err.code, err);
    } finally {
      if (isInitialLoad) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings(true);
    const intervalId = setInterval(() => fetchListings(false), POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchListings]);

  const subcategoriesForFilter = useMemo(() => {
    if (!selectedCategory) return [];
    const category = CATEGORIES.find(cat => cat.id === selectedCategory);
    return category ? category.subcategories : [];
  }, [selectedCategory]);

  const applyFiltersAndSort = useCallback(() => {
    let listingsToFilter = [...allListings];

    if (searchTerm) {
      listingsToFilter = listingsToFilter.filter(
        (p) =>
          p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (selectedCategory) {
      listingsToFilter = listingsToFilter.filter(p => p.category === selectedCategory);
    }
    if (selectedSubcategory) {
      listingsToFilter = listingsToFilter.filter(p => p.subcategory === selectedSubcategory);
    }
    if (selectedCity) {
      listingsToFilter = listingsToFilter.filter(p => p.city === selectedCity);
    }
    if (selectedCondition) {
      listingsToFilter = listingsToFilter.filter(p => p.condition === selectedCondition);
    }
    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);
    if (!isNaN(min)) {
      listingsToFilter = listingsToFilter.filter(p => p.price >= min);
    }
    if (!isNaN(max)) {
      listingsToFilter = listingsToFilter.filter(p => p.price <= max);
    }
    
    switch (sortBy) {
        case 'price_asc':
            listingsToFilter.sort((a, b) => a.price - b.price);
            break;
        case 'price_desc':
            listingsToFilter.sort((a, b) => b.price - a.price);
            break;
        case 'newest':
        default:
            listingsToFilter.sort((a, b) => b.createdAt - a.createdAt);
            break;
    }
    setFilteredListings(listingsToFilter);
  }, [allListings, searchTerm, selectedCategory, selectedSubcategory, selectedCity, selectedCondition, minPrice, maxPrice, sortBy]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
    setSelectedSubcategory(''); 
  };
  
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setSelectedCity('');
    setSelectedCondition('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    // setShowDetailedFilters(false); // Optionally collapse on reset
  };

  if (isLoading && filteredListings.length === 0) return <Spinner fullPage />;
  if (error) return <div className="text-center text-red-500 dark:text-red-400 p-8">{error}</div>;

  const categoryOptions = [ { value: '', label: 'Все категории' }, ...CATEGORIES.map(cat => ({ value: cat.id, label: cat.name })) ];
  const subcategoryOptions = [ { value: '', label: 'Все подкатегории' }, ...subcategoriesForFilter.map(sub => ({ value: sub.id, label: sub.name })) ];
  const cityOptions = [ { value: '', label: 'Любой город' }, ...UKRAINIAN_CITIES.map(city => ({ value: city, label: city })) ];
  const conditionOptions = [ { value: '', label: 'Любое состояние' }, { value: ProductCondition.NEW, label: 'Новый' }, { value: ProductCondition.USED, label: 'Б/У' } ];
  const sortOptions = [ { value: 'newest', label: 'Сначала новые'}, { value: 'price_asc', label: 'Цена: по возрастанию'}, { value: 'price_desc', label: 'Цена: по убыванию'} ];

  return (
    <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-8">
      <div className="bg-light-secondary dark:bg-dark-secondary p-4 sm:p-6 rounded-xl shadow-md mb-8">
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">
            <Input
              label="Поиск по названию/описанию"
              placeholder="Что ищете?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              wrapperClassName="mb-0 flex-grow"
              className="h-11"
            />
            <Button 
              variant='ghost'
              onClick={() => setShowDetailedFilters(!showDetailedFilters)} 
              className="md:w-auto w-full text-left justify-between text-light-text-primary dark:text-dark-text-primary h-11"
              rightIcon={
                <i className={`fa-solid ${showDetailedFilters ? 'fa-chevron-up' : 'fa-chevron-down'} transition-transform`} />
              }
            >
              {showDetailedFilters ? 'Меньше фильтров' : 'Больше фильтров'}
            </Button>
        </div>

        {showDetailedFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end animate-fade-in-down">
            <style>{`
              @keyframes fade-in-down {
                0% { opacity: 0; transform: translateY(-10px); }
                100% { opacity: 1; transform: translateY(0); }
              }
              .animate-fade-in-down { animation: fade-in-down 0.3s ease-out; }
            `}</style>
            <Select
              label="Категория"
              options={categoryOptions}
              value={selectedCategory}
              onChange={handleCategoryChange}
              placeholder="Все категории"
              wrapperClassName="mb-0"
            />
            <Select
              label="Подкатегория"
              options={subcategoryOptions}
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
              disabled={!selectedCategory || subcategoriesForFilter.length === 0}
              placeholder="Все подкатегории"
              wrapperClassName="mb-0"
            />
             <Select
              label="Город"
              options={cityOptions}
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              placeholder="Любой город"
              wrapperClassName="mb-0"
            />
            <Select
              label="Состояние товара"
              options={conditionOptions}
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value as ProductCondition | '')}
              placeholder="Любое состояние"
              wrapperClassName="mb-0"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label={`Цена от (${CURRENCY_SYMBOL})`}
                type="number"
                placeholder="Мин."
                value={minPrice}
                min="0"
                onChange={(e) => setMinPrice(e.target.value)}
                wrapperClassName="mb-0"
              />
              <Input
                label={`Цена до (${CURRENCY_SYMBOL})`}
                type="number"
                placeholder="Макс."
                value={maxPrice}
                min="0"
                onChange={(e) => setMaxPrice(e.target.value)}
                wrapperClassName="mb-0"
              />
            </div>
            <Select
              label="Сортировать по"
              options={sortOptions}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'price_asc' | 'price_desc')}
              placeholder="Сначала новые"
              wrapperClassName="mb-0"
            />
            <Button onClick={resetFilters} variant="secondary" className="w-full h-11 self-end"> {/* Ensured button aligns with others */}
              <i className="fa-solid fa-arrows-rotate mr-2"></i> Сбросить все
            </Button>
          </div>
        )}
      </div>

      {isLoading && filteredListings.length === 0 && <Spinner />} 
      {!isLoading && filteredListings.length === 0 && !error && (
         <div className="text-center py-12">
          <i className="fa-solid fa-box-open text-6xl text-slate-400 dark:text-slate-500 mb-4"></i>
          <p className="text-xl text-slate-600 dark:text-slate-300">По вашему запросу ничего не найдено.</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Попробуйте изменить параметры фильтрации или <Button variant="link" onClick={resetFilters}>сбросить фильтры</Button>.</p>
        </div>
      )}

      {filteredListings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {filteredListings.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;
