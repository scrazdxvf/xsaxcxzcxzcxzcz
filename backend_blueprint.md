
# СКР БАРАХОЛКА - Проект Бэкенда

Этот документ описывает архитектуру и ключевые компоненты бэкенда для приложения "СКР БАРАХОЛКА".

## I. Технологический стек

*   **Среда выполнения:** Node.js
*   **Веб-фреймворк:** Express.js
*   **База данных:** MongoDB
*   **ODM:** Mongoose
*   **Аутентификация:** JSON Web Tokens (JWT)
*   **Хеширование паролей:** bcrypt.js
*   **Обновления в реальном времени:** Socket.IO
*   **Обработка изображений:** Сохранение URL (по текущей логике фронтенда) или Multer + облачное хранилище (для загрузки файлов).

## II. Структура проекта (примерная)

```
/project-root
|-- /backend
|   |-- /config         // Конфигурация (база данных, JWT секрет и т.д.)
|   |-- /controllers    // Логика обработки запросов
|   |-- /middlewares    // Промежуточное ПО (auth, error handling)
|   |-- /models         // Схемы Mongoose для базы данных
|   |-- /routes         // Определения маршрутов API
|   |-- /services       // Бизнес-логика, если выносится из контроллеров
|   |-- /socket         // Логика для Socket.IO
|   |-- .env            // Переменные окружения
|   |-- server.js       // Основной файл сервера
|   |-- package.json
|-- /frontend           // Ваше текущее React-приложение
```

## III. Модели Mongoose (примеры)

Располагаются в `/backend/models/`

**1. `User.js` (Пользователь)**
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Имя пользователя обязательно'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Пароль обязателен'],
    minlength: 6,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isAdmin: { // Для простоты, можно определять админа и по username
    type: Boolean,
    default: false,
  }
});

// Хеширование пароля перед сохранением
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Метод для сравнения паролей
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
```

**2. `Product.js` (Объявление)**
```javascript
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true }, // ID категории
  subcategory: { type: String, required: true }, // ID подкатегории
  images: [{ type: String }], // Массив URL изображений
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'rejected', 'sold'],
    default: 'pending',
  },
  rejectionReason: { type: String },
  createdAt: { type: Date, default: Date.now },
  contactInfo: { type: String, trim: true },
  city: { type: String, required: true },
  condition: {
    type: String,
    enum: ['new', 'used'],
    required: true,
  },
});

// Индексация для поиска
productSchema.index({ title: 'text', description: 'text' });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
```

**3. `Message.js` (Сообщение в чате)**
```javascript
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  adId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: { type: String, required: true, trim: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
});

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
```

## IV. API Endpoints (Маршруты и Контроллеры - примеры)

**Конфигурация JWT и middleware для аутентификации:**
`/backend/middlewares/authMiddleware.js`
```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Путь к вашей модели User

// Защита маршрутов
exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET); // JWT_SECRET в .env
      req.user = await User.findById(decoded.id).select('-password'); // Добавляем пользователя в req
      if (!req.user) {
        return res.status(401).json({ message: 'Пользователь не найден' });
      }
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Нет авторизации, токен недействителен' });
    }
  }
  if (!token) {
    res.status(401).json({ message: 'Нет авторизации, нет токена' });
  }
};

// Проверка на админа
exports.isAdmin = (req, res, next) => {
  if (req.user && (req.user.isAdmin || req.user.username === 'jessieinberg')) { // Проверяем isAdmin или специальное имя пользователя
    next();
  } else {
    res.status(403).json({ message: 'Доступ запрещен: требуются права администратора' });
  }
};
```

**Пример маршрута для объявлений (`/backend/routes/productRoutes.js`):**
```javascript
const express = require('express');
const router = express.Router();
const {
  createProduct,
  getActiveProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  approveProduct,
  rejectProduct,
  getMyProducts,
  markProductAsSold
} = require('../controllers/productController'); // Контроллеры нужно будет создать
const { protect, isAdmin } = require('../middlewares/authMiddleware');

router.route('/').post(protect, createProduct).get(getActiveProducts);
router.route('/my').get(protect, getMyProducts);
router.route('/:id')
  .get(getProductById)
  .put(protect, updateProduct) // Логику "владелец или админ" нужно реализовать в контроллере
  .delete(protect, deleteProduct); // Аналогично

router.route('/:id/approve').put(protect, isAdmin, approveProduct);
router.route('/:id/reject').put(protect, isAdmin, rejectProduct);
router.route('/:id/sell').put(protect, markProductAsSold); // Проверка на владельца в контроллере

module.exports = router;
```

**Пример контроллера для объявлений (`/backend/controllers/productController.js`):**
```javascript
const Product = require('../models/Product'); // Путь к вашей модели Product
const User = require('../models/User'); // Путь к вашей модели User

// @desc    Создать новое объявление
// @route   POST /api/products
// @access  Private
exports.createProduct = async (req, res) => {
  try {
    const { title, description, price, category, subcategory, images, contactInfo, city, condition } = req.body;
    const product = new Product({
      title,
      description,
      price,
      category,
      subcategory,
      images,
      contactInfo,
      city,
      condition,
      userId: req.user._id, // req.user добавляется middleware'ом protect
      status: 'pending', // Новые объявления всегда на модерацию
    });
    const createdProduct = await product.save();
    
    // TODO: Отправить событие Socket.IO админам о новом объявлении на модерацию
    // req.io.to('admins').emit('new_pending_listing', createdProduct);

    res.status(201).json(createdProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера при создании объявления', error: error.message });
  }
};

// @desc    Получить все активные объявления (с фильтрацией и пагинацией)
// @route   GET /api/products
// @access  Public
exports.getActiveProducts = async (req, res) => {
  try {
    const { category, subcategory, city, condition, minPrice, maxPrice, sortBy, search, page = 1, limit = 20 } = req.query;
    const query = { status: 'active' };

    if (search) {
      query.$text = { $search: search };
    }
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (city) query.city = city;
    if (condition) query.condition = condition;
    if (minPrice) query.price = { ...query.price, $gte: Number(minPrice) };
    if (maxPrice) query.price = { ...query.price, $lte: Number(maxPrice) };

    let sortOption = { createdAt: -1 }; // По умолчанию сначала новые
    if (sortBy === 'price_asc') sortOption = { price: 1 };
    if (sortBy === 'price_desc') sortOption = { price: -1 };

    const products = await Product.find(query)
      .populate('userId', 'username') // Опционально: добавить имя пользователя
      .sort(sortOption)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    
    const count = await Product.countDocuments(query);

    res.json({ products, page: Number(page), pages: Math.ceil(count / Number(limit)), total: count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера при получении объявлений' });
  }
};

// @desc    Одобрить объявление
// @route   PUT /api/products/:id/approve
// @access  Private/Admin
exports.approveProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      product.status = 'active';
      product.rejectionReason = undefined;
      const updatedProduct = await product.save();
      // TODO: Отправить событие Socket.IO о смене статуса
      // req.io.emit('listing_status_changed', { adId: updatedProduct._id, newStatus: 'active' });
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Объявление не найдено' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Другие контроллеры (getProductById, updateProduct, deleteProduct, rejectProduct, getMyProducts, markProductAsSold) реализуются аналогично.
// Важно в updateProduct и deleteProduct проверять права:
// if (product.userId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
//   return res.status(401).json({ message: 'Нет прав на это действие' });
// }
```

**Маршруты и контроллеры для аутентификации (`authRoutes.js`, `authController.js`):**
*   Регистрация: создание пользователя, хеширование пароля, генерация JWT.
*   Логин: поиск пользователя, проверка пароля, генерация JWT.

## V. Обновления в реальном времени (Socket.IO)

**Инициализация Socket.IO в `server.js`:**
```javascript
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
// ...другие импорты

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "http://localhost:3000", // URL вашего фронтенда для разработки
    methods: ["GET", "POST"]
  }
});

// Сделать io доступным в req для контроллеров
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Пример подключения клиента и комнаты для админов
io.on('connection', (socket) => {
  console.log('New WebSocket connection:', socket.id);

  // Присоединение к комнате админов (логика определения админа должна быть здесь)
  // socket.on('join_admin_room', (userId) => { /* Проверить, админ ли userId */ if (isAdmin) socket.join('admins'); });
  
  // Пример комнаты для чата
  socket.on('join_chat_room', (adId) => {
    socket.join(`chat_${adId}`);
    console.log(`User ${socket.id} joined chat room: chat_${adId}`);
  });

  socket.on('leave_chat_room', (adId) => {
    socket.leave(`chat_${adId}`);
    console.log(`User ${socket.id} left chat room: chat_${adId}`);
  });
  
  socket.on('send_chat_message', (data) => { // data: { adId, message }
    // Сохранить сообщение в БД (через API или напрямую, если это бэкенд-сервис)
    // Затем отправить его участникам комнаты
    io.to(`chat_${data.adId}`).emit('new_chat_message', data.message); 
  });

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected:', socket.id);
  });
});

// ...остальной код server.js (подключение к БД, middleware, маршруты)

// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

**Клиентская часть Socket.IO (во фронтенде):**
```javascript
// В каком-нибудь глобальном месте или контексте React
import io from 'socket.io-client';
const socket = io('http://localhost:5000'); // URL вашего бэкенда

// Пример подписки на события
socket.on('new_pending_listing', (productData) => {
  // Обновить UI админа, показать уведомление
});

socket.on('listing_status_changed', (data) => {
  // Обновить объявление в списке на клиенте
});

// Для чата
// При входе в чат по объявлению: socket.emit('join_chat_room', adId);
// При выходе: socket.emit('leave_chat_room', adId);
// При отправке сообщения: socket.emit('send_chat_message', { adId, message: newMessageObject });
// Подписка на получение:
// socket.on('new_chat_message', (message) => {
//   // Добавить сообщение в UI чата
// });
```

## VI. Запуск и Развертывание

1.  **Установка зависимостей:** `npm install express mongoose bcryptjs jsonwebtoken dotenv socket.io cors`
2.  **Настройка `.env`:** `MONGO_URI`, `JWT_SECRET`, `PORT`.
3.  **Локальный запуск:** `node server.js` или с `nodemon`.
4.  **Развертывание:** Платформы типа Heroku, Render, AWS, DigitalOcean и т.д. Потребуется настройка базы данных (например, MongoDB Atlas).

---

Это подробный, но не исчерпывающий проект. Реализация потребует значительных усилий по написанию кода, тестированию и отладке. Удачи!
      