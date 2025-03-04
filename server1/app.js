const express = require('express');
const app = express();
const path = require('path');

// Middleware для парсинга JSON и URL-encoded данных
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройка EJS как шаблонизатора
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Подключение маршрутов
const authRoutes = require('../routes/authRoutes');
const nokiaRoutes = require('../routes/nokiaRoutes');
app.use('/', authRoutes);
app.use('/nokia', nokiaRoutes);

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
