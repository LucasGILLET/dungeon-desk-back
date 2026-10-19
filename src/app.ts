import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import responseTime from 'response-time';
import helmet from 'helmet';

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import npcRoutes from './routes/npcRoutes';
import characterRoutes from './routes/characterRoutes';
import campaignRoutes from './routes/campaignRoutes';
import srdRoutes from './routes/srdRoutes';
import prisma from './prismaClient';
import { logger } from './utils/logger';
import { httpRequestDurationSeconds, register } from './utils/monitoring';

dotenv.config();

export const app = express();

// Important pour Cloud Run (derrière un proxy) : faire confiance au premier proxy pour avoir la vraie IP client
app.set('trust proxy', 1);

// En-têtes de sécurité HTTP (X-Frame-Options, X-Content-Type-Options, HSTS, etc.)
// CSP désactivée : elle casse les scripts/styles inline de Swagger UI (/api-docs)
app.use(helmet({ contentSecurityPolicy: false }));

// Middleware de mesure du temps de réponse pour Prometheus
app.use(responseTime((req: any, res: any, time) => {
  if (req?.route?.path) {
    httpRequestDurationSeconds.observe(
      {
        method: req.method,
        route: req.route.path,
        status_code: res.statusCode,
      },
      time / 1000 // Conversion ms -> s
    );
  }
}));

// Logger HTTP avec Morgan et Winston
app.use(
  morgan(
    ':method :url :status :res[content-length] - :response-time ms',
    {
      stream: {
        write: (message) => logger.http(message.trim()),
      },
    }
  )
);

// Exposition des métriques Prometheus
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
  } catch (err) {
    res.status(500).send(err);
  }
});

// Limite large : le créateur de personnage interroge l'API à chaque étape.
// (L'authentification est déléguée à Auth0.)
const limit = (max: number) => rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max, // requêtes par fenêtre et par IP
  standardHeaders: true, // Retourne les infos de limite dans les headers `RateLimit-*`
  legacyHeaders: false, // Désactive les headers `X-RateLimit-*`
  message: 'Trop de requêtes, veuillez réessayer plus tard.'
});

app.use(limit(1000));

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
// Réponses compressées : la liste des sorts passe d'environ 570 Ko à une centaine
app.use(compression());
app.use(express.json());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/openapi.json', (req, res) => {
  res.type('application/json').json(swaggerSpec);
});

// Routes
app.use('/api/npcs', npcRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/srd', srdRoutes);


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
    logger.error(`Health Check Failed: ${error instanceof Error ? error.message : error}`);
    res.status(503).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

