
import React, { useState, useEffect, FormEvent } from 'react';
import { Product, AdStatus, ProductCondition, UserProfile } from '../../types';
import { CATEGORIES, CURRENCY_SYMBOL, DEFAULT_PLACEHOLDER_IMAGE, MAX_IMAGES_PER_AD } from '../../constants';
import { UKRAINIAN_CITIES } from '../../cities';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import CategorySelector from './CategorySelector';
import Select from '../ui/Select'; // Import Select for city and condition
import { useAuth } from '../auth/AuthContext'; 

interface ProductFormProps {
  initialProduct?: Product;
  onSubmit: (productData: Omit<Product, 'id' | 'createdAt' | 'status' | 'userId'> | Product) => Promise<void>;
  isSubmitting: boolean;
  submitButtonText?: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  price?: string;
  category?: string;
  subcategory?: string;
  images?: string;
  contactInfo?: string;
  city?: string;
  condition?: string;
  general?: string;
}

const ProductForm: React.FC<ProductFormProps> = ({
  initialProduct,
  onSubmit,
  isSubmitting,
  submitButtonText = 'Разместить объявление'
}) => {
  const { currentUser, userProfile } = useAuth(); 

  const [title, setTitle] = useState(initialProduct?.title || '');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [price, setPrice] = useState<string>(initialProduct?.price?.toString() || '');
  const [selectedCategory, setSelectedCategory] = useState(initialProduct?.category || '');
  const [selectedSubcategory, setSelectedSubcategory] = useState(initialProduct?.subcategory || '');
  const [images, setImages] = useState<string[]>(initialProduct?.images || []);
  const [contactInfo, setContactInfo] = useState(initialProduct?.contactInfo || userProfile?.username || '');
  const [city, setCity] = useState(initialProduct?.city || '');
  const [condition, setCondition] = useState<ProductCondition | ''>(initialProduct?.condition || '');
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (initialProduct) {
      setTitle(initialProduct.title);
      setDescription(initialProduct.description);
      setPrice(initialProduct.price.toString());
      setSelectedCategory(initialProduct.category);
      setSelectedSubcategory(initialProduct.subcategory);
      setImages(initialProduct.images);
      setContactInfo(initialProduct.contactInfo || '');
      setCity(initialProduct.city);
      setCondition(initialProduct.condition);
    } else if (userProfile) { // Use userProfile here
      setContactInfo(userProfile.username);
    }
  }, [initialProduct, userProfile]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!title.trim()) newErrors.title = 'Название обязательно';
    else if (title.trim().length < 5) newErrors.title = 'Название должно быть не менее 5 символов';
    if (!description.trim()) newErrors.description = 'Описание обязательно';
    else if (description.trim().length < 20) newErrors.description = 'Описание должно быть не менее 20 символов';
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) newErrors.price = 'Цена должна быть положительным числом';
    if (!selectedCategory) newErrors.category = 'Выберите категорию';
    const cat = CATEGORIES.find(c => c.id === selectedCategory);
    if (cat && cat.subcategories.length > 0 && !selectedSubcategory) {
      newErrors.subcategory = 'Выберите подкатегорию';
    }
    if (images.length === 0 || images.every(img => !img.trim())) newErrors.images = 'Добавьте хотя бы одну фото (ссылку)';
    if (!contactInfo.trim()) newErrors.contactInfo = 'Укажите контактную информацию (напр. Telegram username)';
    if (!city) newErrors.city = 'Выберите город';
    if (!condition) newErrors.condition = 'Укажите состояние товара';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) { 
        setErrors(prev => ({ ...prev, general: 'Необходимо войти в систему для создания объявления.' }));
        return;
    }
    if (!validateForm()) {
        return;
    }

    const productData = {
      title,
      description,
      price: parseFloat(price),
      category: selectedCategory,
      subcategory: selectedSubcategory,
      images: images.filter(img => img.trim()).length > 0 ? images.filter(img => img.trim()) : [`${DEFAULT_PLACEHOLDER_IMAGE}${Date.now()}`],
      userId: initialProduct?.userId || currentUser.uid, // Use currentUser.uid
      username: userProfile?.username || 'Неизвестный пользователь', // Add username from profile
      contactInfo,
      city,
      condition: condition as ProductCondition, 
      ...(initialProduct && { 
        id: initialProduct.id, 
        createdAt: initialProduct.createdAt, 
        status: initialProduct.status,
        rejectionReason: initialProduct.rejectionReason,
      })
    };
    
    await onSubmit(initialProduct ? productData as Product : productData as Omit<Product, 'id' | 'createdAt' | 'status' | 'userId'>);
  };

  const handleImageInputChange = (index: number, value: string) => {
    const newImages = [...images];
    newImages[index] = value;
    setImages(newImages);
  };

  const addImageField = () => {
    if (images.length < MAX_IMAGES_PER_AD) {
      setImages([...images, '']);
    }
  };

  const removeImageField = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (images.length === 0) {
      setImages(['']);
    }
  }, []);

  const cityOptions = [
    { value: '', label: 'Выберите город', disabled: true },
    ...UKRAINIAN_CITIES.map(c => ({ value: c, label: c }))
  ];

  const conditionOptions = [
    { value: '', label: 'Выберите состояние', disabled: true },
    { value: ProductCondition.NEW, label: 'Новый' },
    { value: ProductCondition.USED, label: 'Б/У' }
  ];


  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 bg-light-primary dark:bg-dark-primary rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-6">
        {initialProduct ? 'Редактировать объявление' : 'Новое объявление'}
      </h2>
      {errors.general && <p className="text-red-500 text-center mb-4">{errors.general}</p>}
      
      <Input
        id="title"
        name="title"
        label="Название товара/услуги"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        placeholder="Например, iPhone 14 Pro Max 256GB"
        required
      />
      
      <Textarea
        id="description"
        name="description"
        label="Подробное описание"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={errors.description}
        placeholder="Опишите состояние, комплектацию, особенности товара..."
        rows={5}
        required
      />

      <Input
        id="price"
        name="price"
        type="number"
        label={`Цена (${CURRENCY_SYMBOL})`}
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        error={errors.price}
        placeholder="25000"
        min="0"
        step="any"
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          id="city"
          name="city"
          label="Город"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          options={cityOptions}
          placeholder="Выберите город"
          error={errors.city}
          required
        />
        <Select
          id="condition"
          name="condition"
          label="Состояние товара"
          value={condition}
          onChange={(e) => setCondition(e.target.value as ProductCondition | '')}
          options={conditionOptions}
          placeholder="Выберите состояние"
          error={errors.condition}
          required
        />
      </div>

      <CategorySelector
        selectedCategory={selectedCategory}
        selectedSubcategory={selectedSubcategory}
        onCategoryChange={setSelectedCategory}
        onSubcategoryChange={setSelectedSubcategory}
        categoryError={errors.category}
        subcategoryError={errors.subcategory}
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1">
          Фотографии (ссылки)
        </label>
        {images.map((imgUrl, index) => (
          <div key={index} className="flex items-center mb-2">
            <Input
              type="url"
              placeholder={`https://picsum.photos/600/400?random=${index + 1}`}
              value={imgUrl}
              onChange={(e) => handleImageInputChange(index, e.target.value)}
              wrapperClassName="flex-grow mb-0"
              className="mr-2"
            />
            {images.length > 1 && (images.length > 1 || imgUrl.trim() !== '') && (
              <Button type="button" variant="danger" size="sm" onClick={() => removeImageField(index)}>
                <i className="fa-solid fa-trash-can"></i>
              </Button>
            )}
          </div>
        ))}
        {images.length < MAX_IMAGES_PER_AD && (
          <Button type="button" variant="secondary" size="sm" onClick={addImageField} leftIcon={<i className="fa-solid fa-plus"></i>}>
            Добавить фото
          </Button>
        )}
        {errors.images && <p className="mt-1 text-xs text-red-500">{errors.images}</p>}
         <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Вставьте прямые ссылки на изображения. Используйте, например, picsum.photos или imgbb.com.</p>
      </div>

       <Input
        id="contactInfo"
        name="contactInfo"
        label="Контактная информация (например, ваш Telegram @username)"
        value={contactInfo}
        onChange={(e) => setContactInfo(e.target.value)}
        error={errors.contactInfo}
        placeholder="@your_telegram_username"
        required
      />
      
      <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} className="w-full" disabled={!currentUser}>
        {submitButtonText}
      </Button>
    </form>
  );
};

export default ProductForm;