import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit'; // Ajout de l'import
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import authRoutes from './routes/authRoutes';
import npcRoutes from './routes/npcRoutes';
import characterRoutes from './routes/characterRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Important pour Cloud Run (derrière un proxy) : faire confiance au premier proxy pour avoir la vraie IP client
app.set('trust proxy', 1);

// Configuration du Rate Limiter : max 50 requêtes par 15 minutes par IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limite à 50 requêtes par fenêtre par IP
  standardHeaders: true, // Retourne les infos de limite dans les headers `RateLimit-*`
  legacyHeaders: false, // Désactive les headers `X-RateLimit-*`
  message: 'Trop de requêtes, veuillez réessayer plus tard.'
});

// Middleware
// Appliquer le rate limiter globalement
app.use(limiter);

// Autoriser uniquement le frontend spécifié
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
