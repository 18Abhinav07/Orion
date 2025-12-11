// API for Story Protocol backend verification
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import verificationRoutes from './routes/verification.js';

dotenv.config();

const app = express();
const PORT = process.env.PROXY_PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;

// --- MongoDB Connection ---
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully.'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// --- Middleware ---
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'],
  credentials: true
}));

app.use(express.json());

// --- Routes ---
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Orion Backend Verification API', 
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.use('/api/verification', verificationRoutes);


// --- Server ---
app.listen(PORT, () => {
  console.log(`🌐 Orion Backend Verification API running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});

export default app;
