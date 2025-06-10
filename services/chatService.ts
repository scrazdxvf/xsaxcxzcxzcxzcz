
import { Message, SAMPLE_USER_ID_1, SAMPLE_USER_ID_2 } from '../types';

const CHAT_MESSAGES_STORAGE_KEY = 'scrBaraholkaChatMessages';

const getInitialMessages = (): Message[] => {
  const sampleMessages: Message[] = [
    {
      id: 'msg1',
      adId: '1', // For "Крутые кроссовки Nike Air" (owned by SAMPLE_USER_ID_2)
      senderId: SAMPLE_USER_ID_1, // Sample user is asking
      receiverId: SAMPLE_USER_ID_2, // Seller of ad '1'
      text: 'Здравствуйте! Кроссовки еще в наличии? Возможен торг? (Пример сообщения)',
      timestamp: Date.now() - 1000 * 60 * 30, // 30 mins ago
      read: false,
    },
    {
      id: 'msg2',
      adId: '1',
      senderId: SAMPLE_USER_ID_2, // Seller replies
      receiverId: SAMPLE_USER_ID_1,
      text: 'Добрый день! Да, в наличии. Могу уступить немного, за 2300 отдам. (Пример ответа)',
      timestamp: Date.now() - 1000 * 60 * 15, // 15 mins ago
      read: false,
    }
  ];
  try {
    const storedMessages = localStorage.getItem(CHAT_MESSAGES_STORAGE_KEY);
    if (storedMessages) {
      const parsedMessages = JSON.parse(storedMessages) as Message[];
      return Array.isArray(parsedMessages) ? parsedMessages : sampleMessages;
    }
  } catch (error) {
    console.error("Error reading messages from localStorage:", error);
  }
  localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(sampleMessages)); // Initialize if not present
  return sampleMessages;
};

let messages: Message[] = getInitialMessages();

const saveMessages = () => {
  try {
    localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error("Error saving messages to localStorage:", error);
  }
};

export const chatService = {
  getMessagesForAd: async (adId: string, currentUserId: string): Promise<Message[]> => {
    if (messages.length === 0) messages = getInitialMessages();
    return messages
      .filter(msg => msg.adId === adId && (msg.senderId === currentUserId || msg.receiverId === currentUserId))
      .sort((a, b) => a.timestamp - b.timestamp);
  },

  sendMessage: async (adId: string, senderId: string, receiverId: string, text: string): Promise<Message> => {
    if (messages.length === 0) messages = getInitialMessages();
    const newMessage: Message = {
      id: String(Date.now() + Math.random()),
      adId,
      senderId,
      receiverId,
      text,
      timestamp: Date.now(),
      read: false,
    };
    messages.push(newMessage);
    saveMessages();
    return newMessage;
  },

  markMessagesAsRead: async (adId: string, readerId: string): Promise<void> => {
    if (messages.length === 0) messages = getInitialMessages();
    messages = messages.map(msg => 
      (msg.adId === adId && msg.receiverId === readerId) ? { ...msg, read: true } : msg
    );
    saveMessages();
  },

  getUnreadMessagesCountForUser: async (userId: string): Promise<number> => {
    if (messages.length === 0) messages = getInitialMessages();
    return messages.filter(msg => msg.receiverId === userId && !msg.read).length;
  },

  getChatsForUser: async (userId: string): Promise<string[]> => {
    if (messages.length === 0) messages = getInitialMessages();
    const adIds = new Set<string>();
    messages.forEach(msg => {
      if (msg.senderId === userId || msg.receiverId === userId) {
        adIds.add(msg.adId);
      }
    });
    return Array.from(adIds);
  }
};
