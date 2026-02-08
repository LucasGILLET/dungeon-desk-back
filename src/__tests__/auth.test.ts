import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import prisma from '../prismaClient';
import bcrypt from 'bcryptjs';

// Mock de Prisma pour éviter de toucher à la vraie BDD
vi.mock('../prismaClient', () => ({
  default: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe('Auth Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      // Mock: L'utilisateur n'existe pas encore
      (prisma.user.findFirst as any).mockResolvedValue(null);
      // Mock: La création réussit
      (prisma.user.create as any).mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      });

      const res = await request(app).post('/api/auth/register').send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'User registered successfully');
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should fail if email is invalid (Zod validation)', async () => {
        const res = await request(app).post('/api/auth/register').send({
        username: 'testuser',
        email: 'invalid-email', // Email invalide
        password: 'password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.errors.email).toBeDefined();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should fail if password is too short (Zod validation)', async () => {
        const res = await request(app).post('/api/auth/register').send({
        username: 'testuser',
        email: 'test@example.com',
        password: '123', // Trop court
      });

      expect(res.status).toBe(400);
      expect(res.body.errors.password).toBeDefined();
    });

    it('should fail if user already exists', async () => {
        // Mock: L'utilisateur existe déjà
      (prisma.user.findFirst as any).mockResolvedValue({ id: 1, email: 'test@example.com' });

      const res = await request(app).post('/api/auth/register').send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
        // On génère un vrai hash pour que bcrypt.compare fonctionne
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should fail with wrong password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
      });

      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid credentials');
    });
  });
});
