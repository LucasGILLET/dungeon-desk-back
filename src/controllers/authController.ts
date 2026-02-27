import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient';
import { registerSchema, loginSchema } from '../validators/authValidator';

export const register = async (req: Request, res: Response) => {
  try {
    // Validation des données entrantes avec Zod
    const validation = registerSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ message: 'Validation error', errors: validation.error.format() });
    }

    const { username, email, password } = validation.data;

    // Vérifier si l'utilisateur existe déjà
    const userExists = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      },
    });
    
    if (userExists) {
      return res.status(400).json({ message: 'User or Email already exists' });
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Créer le nouvel utilisateur
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    res.status(201).json({ message: 'User registered successfully', userId: newUser.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    // Validation des données entrantes avec Zod
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ message: 'Validation error', errors: validation.error.format() });
    }

    const { email, password } = validation.data;

    // Trouver l'utilisateur par email
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user || !user.password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Créer le token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username,
        email: user.email 
      } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
