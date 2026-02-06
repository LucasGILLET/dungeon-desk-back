import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import authRoutes from './routes/authRoutes';
import npcRoutes from './routes/npcRoutes';
import characterRoutes from './routes/characterRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
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
