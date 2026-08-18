import './config/load-env.js';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { env } from './config/env.js';

const connectToDatabase = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
    console.info('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed; retrying in 5 seconds', error instanceof Error ? error.message : error);
    setTimeout(() => void connectToDatabase(), 5_000);
  }
};

const start = () => {
  createApp().listen(env.PORT, '0.0.0.0', () => console.info(`Wellora API listening on ${env.PORT}`));
  void connectToDatabase();
};

start();