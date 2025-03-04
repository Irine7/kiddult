import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Конфигурация MongoDB
const connectDB = async () => {
  try {
    const mongoOptions = {
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(process.env.MONGODB_URI!, mongoOptions);
    console.log('✅ Подключено к MongoDB Atlas');

    mongoose.connection.on('error', (err) => {
      console.error('❌ Ошибка MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ Отключено от MongoDB');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('📴 MongoDB соединение закрыто через app termination');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Ошибка подключения к MongoDB:', error);
    process.exit(1);
  }
};

// Инициализация подключения к MongoDB
connectDB();

// Модель данных
const locationSchema = new mongoose.Schema({
  name: String,
  type: {
    type: String,
    enum: ['circle', 'polygon'],
    required: true
  },
  center: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  radius: Number,
  boundaries: {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon'
    },
    coordinates: [[Number]]
  }
}, {
  timestamps: true
});

const Location = mongoose.model('Location', locationSchema);

// Роуты
app.get('/api/safe-zones', async (req, res) => {
  try {
    const zones = await Location.find();
    res.json(zones);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении зон' });
  }
});

app.post('/api/safe-zones', async (req, res) => {
  try {
    const newZone = new Location(req.body);
    await newZone.save();
    res.status(201).json(newZone);
  } catch (error) {
    res.status(400).json({ message: 'Ошибка при создании зоны' });
  }
});

// Запуск сервера
app.listen(port, () => {
  console.log(`🚀 Сервер запущен на порту ${port}`);
});
