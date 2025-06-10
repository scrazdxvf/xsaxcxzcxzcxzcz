
import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Product, Message, ProductCondition } from '../types'; // Import ProductCondition
import { listingService } from '../services/listingService';
import { chatService } from '../services/chatService';
import Spinner from '../components/ui/Spinner';
import { CURRENCY_SYMBOL, DEFAULT_PLACEHOLDER_IMAGE } from '../constants';
import Button from '../components/ui/Button';
import Textarea from '../components/ui/Textarea';
import Input from '../components/ui/Input';
import { useAuth } from '../components/auth/AuthContext';

const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isLoading: authIsLoading } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('openChat') === 'true' && currentUser) { 
      setShowChat(true);
    }
  }, [location.search, currentUser]);

  const fetchProductAndMessages = useCallback(async () => {
    if (!id) {
      setError("ID товара не найден.");
      setIsLoading(false);
      return;
    }
    if (authIsLoading) return; 

    setIsLoading(true);
    setError(null);
    try {
      const fetchedProduct = await listingService.getListingById(id);
      if (fetchedProduct) {
        setProduct(fetchedProduct);
        if (currentUser && fetchedProduct.userId !== currentUser.uid) { // Use .uid
           const fetchedMessages = await chatService.getMessagesForAd(id, currentUser.uid); // Use .uid
           setMessages(fetchedMessages);
           await chatService.markMessagesAsRead(id, currentUser.uid); // Use .uid
        }
      } else {
        setError("Товар не найден.");
      }
    } catch (err: any) {
      setError("Не удалось загрузить информацию о товаре.");
      console.error("Error fetching product in ProductPage:", err.message, err.code, err);
    } finally {
      setIsLoading(false);
    }
  }, [id, currentUser, authIsLoading]);

  useEffect(() => {
    fetchProductAndMessages();
  }, [fetchProductAndMessages]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !product || !currentUser || product.userId === currentUser.uid) return; // Use .uid
    setIsSendingMessage(true);
    try {
      const sentMessage = await chatService.sendMessage(product.id, currentUser.uid, product.userId, newMessageText.trim()); // Use .uid
      setMessages(prev => [...prev, sentMessage]);
      setNewMessageText('');
    } catch (err: any) {
      console.error("Failed to send message in ProductPage:", err.message, err.code, err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const promptLoginForChat = () => {
    navigate('/login', { state: { from: location } });
  };

  if (isLoading || authIsLoading) return <Spinner fullPage />;
  if (error) return <div className="text-center text-red-500 dark:text-red-400 p-8">{error} <Button onClick={() => navigate('/')}>На главную</Button></div>;
  if (!product) return <div className="text-center text-slate-600 dark:text-slate-300 p-8">Товар не найден.</div>;

  const images = product.images && product.images.length > 0 ? product.images : [`${DEFAULT_PLACEHOLDER_IMAGE}${product.id}`];
  const isOwnAd = currentUser ? product.userId === currentUser.uid : false; // Use .uid

  const conditionText = product.condition === ProductCondition.NEW ? 'Новый' : 'Б/У';
  const conditionColor = product.condition === ProductCondition.NEW ? 'text-green-600 dark:text-green-400' : 'text-sky-600 dark:text-sky-400';

  return (
    <div className="container mx-auto px-2 sm:px-4 py-8">
      <Button onClick={() => navigate(-1)} variant="ghost" size="sm" className="mb-4">
        <i className="fa-solid fa-arrow-left mr-2"></i> Назад
      </Button>
      <div className="bg-light-primary dark:bg-dark-primary shadow-xl rounded-lg overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/2 p-4">
            <div className="relative aspect-w-4 aspect-h-3 mb-2">
              <img 
                src={images[currentImageIndex]} 
                alt={product.title} 
                className="w-full h-full object-contain rounded-lg max-h-[500px]"
                onError={(e) => { (e.target as HTMLImageElement).src = `${DEFAULT_PLACEHOLDER_IMAGE}${product.id}`; }}
              />
            </div>
            {images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto p-1">
                {images.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`${product.title} - ${index + 1}`}
                    className={`w-20 h-20 object-cover rounded cursor-pointer border-2 ${index === currentImageIndex ? 'border-sky-500 dark:border-dark-accent' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}
                    onClick={() => setCurrentImageIndex(index)}
                    onError={(e) => { (e.target as HTMLImageElement).src = `${DEFAULT_PLACEHOLDER_IMAGE}${product.id}${index}`; }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="md:w-1/2 p-6 flex flex-col">
            <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-1">{product.title}</h1>
            <div className="flex items-center space-x-3 text-sm text-slate-500 dark:text-slate-400 mb-3">
              <span><i className="fa-solid fa-tag mr-1"></i>{listingService.getCategoryName(product.category)} &raquo; {listingService.getSubcategoryName(product.category, product.subcategory)}</span>
              <span><i className="fa-solid fa-location-dot mr-1"></i>{product.city}</span>
              <span className={`font-medium ${conditionColor}`}><i className="fa-solid fa-gem mr-1"></i>{conditionText}</span>
            </div>

            <p className="text-3xl font-extrabold text-sky-600 dark:text-dark-accent mb-6">
              {product.price.toLocaleString('uk-UA')} {CURRENCY_SYMBOL}
            </p>
            
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">Описание</h2>
                <p className="text-slate-700 dark:text-dark-text-secondary whitespace-pre-wrap leading-relaxed">{product.description}</p>
            </div>

            <div className="mt-auto">
              <Input
                label="Контакт продавца"
                value={product.contactInfo || 'Не указано'}
                readOnly
                wrapperClassName="mb-4"
                className="bg-slate-100 dark:bg-slate-700 cursor-default"
              />
              {isOwnAd ? (
                 <Button onClick={() => navigate(`/edit-listing/${product.id}`)} variant="secondary" className="w-full" leftIcon={<i className="fa-solid fa-edit"/>}>
                    Редактировать объявление
                  </Button>
              ) : currentUser ? (
                <Button onClick={() => setShowChat(s => !s)} variant="primary" className="w-full" leftIcon={<i className="fa-solid fa-comments"/>}>
                  {showChat ? 'Скрыть чат' : 'Написать продавцу'}
                </Button>
              ) : (
                 <Button onClick={promptLoginForChat} variant="primary" className="w-full" leftIcon={<i className="fa-solid fa-comments"/>}>
                  Написать продавцу (Нужен вход)
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {!isOwnAd && currentUser && showChat && (
          <div className="border-t border-slate-200 dark:border-slate-700 p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">Чат с продавцом</h2>
            <div className="max-h-96 overflow-y-auto mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-3">
              {messages.length === 0 && <p className="text-center text-sm text-slate-500 dark:text-slate-400">Сообщений пока нет. Начните диалог первым!</p>}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}> {/* Use .uid */}
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl ${msg.senderId === currentUser.uid ? 'bg-sky-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-light-text-primary dark:text-dark-text-primary'}`}> {/* Use .uid */}
                    <p className="text-sm">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.senderId === currentUser.uid ? 'text-sky-200 text-right' : 'text-slate-500 dark:text-slate-400 text-left'}`}> {/* Use .uid */}
                      {new Date(msg.timestamp).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Textarea
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Ваше сообщение..."
                rows={2}
                className="flex-grow"
                wrapperClassName="mb-0 flex-grow"
                required
              />
              <Button type="submit" isLoading={isSendingMessage} disabled={!newMessageText.trim()} className="self-end h-full">
                <i className="fa-solid fa-paper-plane"></i>
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductPage;
