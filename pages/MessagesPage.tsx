
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { chatService } from '../services/chatService';
import { listingService } from '../services/listingService';
import { Product, Message } from '../types';
import Spinner from '../components/ui/Spinner';
import { DEFAULT_PLACEHOLDER_IMAGE } from '../constants';
import { useAuth } from '../components/auth/AuthContext'; // Import useAuth
import Button from '../components/ui/Button';

interface ChatPreview {
  adId: string;
  adTitle: string;
  adImage: string;
  lastMessage: Message | null;
  unreadCount: number;
}

const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isLoading: authIsLoading } = useAuth(); // Get current user

  const [chatPreviews, setChatPreviews] = useState<ChatPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChatPreviews = useCallback(async () => {
    if (!currentUser || authIsLoading) {
      setIsLoading(false);
      if(!authIsLoading && !currentUser) setError("Пожалуйста, войдите, чтобы увидеть ваши сообщения.");
      setChatPreviews([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const adIdsWithChats = await chatService.getChatsForUser(currentUser.uid); // Use .uid
      const previews: ChatPreview[] = [];

      for (const adId of adIdsWithChats) {
        const adDetails: Product | undefined = await listingService.getListingById(adId);
        if (!adDetails) continue;

        const messagesForAd = await chatService.getMessagesForAd(adId, currentUser.uid); // Use .uid
        const lastMessage = messagesForAd.length > 0 ? messagesForAd[messagesForAd.length - 1] : null;
        const unreadCount = messagesForAd.filter(msg => msg.receiverId === currentUser.uid && !msg.read).length; // Use .uid
        
        previews.push({
          adId,
          adTitle: adDetails.title,
          adImage: adDetails.images && adDetails.images.length > 0 ? adDetails.images[0] : `${DEFAULT_PLACEHOLDER_IMAGE}${adId}`,
          lastMessage,
          unreadCount,
        });
      }
      
      previews.sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
        if (a.lastMessage && b.lastMessage) return b.lastMessage.timestamp - a.lastMessage.timestamp;
        if (a.lastMessage) return -1;
        if (b.lastMessage) return 1;
        return 0;
      });

      setChatPreviews(previews);
    } catch (err: any) {
      console.error("Failed to fetch chat previews in MessagesPage:", err.message, err.code, err);
      setError("Не удалось загрузить ваши чаты.");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, authIsLoading]);

  useEffect(() => {
    fetchChatPreviews();
    const intervalId = setInterval(fetchChatPreviews, 10000); // Poll for updates
    return () => clearInterval(intervalId);
  }, [fetchChatPreviews]);

  if (isLoading || authIsLoading) return <Spinner fullPage />;

  if (!currentUser && !authIsLoading) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-8 text-center">
        <p className="text-xl text-slate-600 dark:text-slate-300 mb-4">{error || "Пожалуйста, войдите, чтобы увидеть ваши сообщения."}</p>
        <Button onClick={() => navigate('/login')} variant="primary">Войти</Button>
      </div>
    );
  }
  
  if (error && currentUser) return <div className="text-center text-red-500 dark:text-red-400 p-8">{error}</div>;


  return (
    <div className="container mx-auto px-2 sm:px-4 py-8">
      <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-6">Мои сообщения</h1>
      
      {chatPreviews.length === 0 ? (
        <div className="text-center py-12">
          <i className="fa-solid fa-comments-dollar text-6xl text-slate-400 dark:text-slate-500 mb-4"></i>
          <p className="text-xl text-slate-600 dark:text-slate-300">У вас пока нет активных чатов.</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Начните общение, написав продавцу интересующего вас товара.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {chatPreviews.map(preview => (
            <Link 
              key={preview.adId} 
              to={`/product/${preview.adId}?openChat=true`}
              className="block bg-light-secondary dark:bg-dark-secondary p-4 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <img 
                  src={preview.adImage} 
                  alt={preview.adTitle} 
                  className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = `${DEFAULT_PLACEHOLDER_IMAGE}${preview.adId}`; }}
                />
                <div className="flex-grow overflow-hidden">
                  <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary truncate">{preview.adTitle}</h3>
                  {preview.lastMessage && currentUser ? ( 
                    <p className={`text-sm truncate ${preview.unreadCount > 0 ? 'font-bold text-sky-600 dark:text-dark-accent' : 'text-slate-500 dark:text-slate-400'}`}>
                      {preview.lastMessage.senderId === currentUser.uid ? "Вы: " : ""} {/* Use .uid */}
                      {preview.lastMessage.text}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">Нет сообщений</p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  {preview.lastMessage && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
                      {new Date(preview.lastMessage.timestamp).toLocaleDateString('uk-UA', { day:'numeric', month:'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  {preview.unreadCount > 0 && (
                    <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                      {preview.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
