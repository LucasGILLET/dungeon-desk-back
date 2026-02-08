import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import authRoutes from './routes/authRoutes';
import npcRoutes from './routes/npcRoutes';
import characterRoutes from './routes/characterRoutes';
import prisma from './prismaClient';

dotenv.config();

export const app = express();

// Important pour Cloud Run (derrière un proxy) : faire confiance au premier proxy pour avoir la vraie IP client
app.set('trust proxy', 1);

// Note: Pour les tests, on pourrait vouloir désactiver ou augmenter cette limite
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limite à 50 requêtes par fenêtre par IP
  standardHeaders: true, // Retourne les infos de limite dans les headers `RateLimit-*`
  legacyHeaders: false, // Désactive les headers `X-RateLimit-*`
  message: 'Trop de requêtes, veuillez réessayer plus tard.'
});

app.use(limiter);

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/npcs', npcRoutes);
app.use('/api/characters', characterRoutes);


// Basic health check route
app.get('/', (req, res) => {
  res.send('Dungeon Desk Backend is running!');
});

// Health Check complet pour le Cloud & Monitoring
app.get('/health', async (req, res) => {
  try {
    // Vérifie la connexion BDD avec une requête légère
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health Check Failed:', error);
    res.status(503).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

