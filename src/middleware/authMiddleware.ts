import { Request, Response, NextFunction } from 'express';
import { auth } from 'express-oauth2-jwt-bearer';
import prisma from '../prismaClient';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any; // You can make this more specific with Prisma User type
    }
  }
}

export interface AuthRequest extends Request {
    user?: any;
}

export const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_ISSUER,
});

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  // First check JWT
  checkJwt(req, res, async (err) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized', error: err.message });
    }
    
    // Now sync/fetch user from DB
    try {
      const auth0Id = req.auth?.payload.sub;
      if (!auth0Id) {
         return res.status(401).json({ message: 'No user ID in token' });
      }

      let user = await prisma.user.findUnique({
        where: { auth0Id: auth0Id as string },
      });

      if (!user) {
        // User not found in local DB, try to fetch info from Auth0 or use token claims
        let email = req.auth?.payload['https://dungeon-desk.com/email'] as string || req.auth?.payload.email as string;

        if (!email) {
            // Fetch user info from Auth0
            try {
                const userInfoRes = await fetch(`https://dev-mvx3b7ah7u0lggj0.us.auth0.com/userinfo`, {
                    headers: { Authorization: req.headers.authorization as string }
                });
                if (userInfoRes.ok) {
                    const userInfo = await userInfoRes.json();
                    email = userInfo.email;
                }
            } catch (e) {
                console.error("Failed to fetch userinfo", e);
            }
        }

        if (email) {
             const existingUser = await prisma.user.findUnique({ where: { email } });
             if (existingUser) {
                 user = await prisma.user.update({
                     where: { id: existingUser.id },
                     data: { auth0Id: auth0Id as string },
                 });
             } else {
                 user = await prisma.user.create({
                     data: {
                         auth0Id: auth0Id as string,
                         email,
                         username: email.split('@')[0],
                         password: '', // Placeholder since password is required but unused for Auth0
                     },
                 });
             }
        } else {
             // If we really can't get email, we fail for now as DB requires it
             return res.status(401).json({ message: 'User not registered in database. Email required.' });
        }
      }

      req.user = user;
      next();
    } catch (dbError) {
      console.error("Database auth error:", dbError);
      return res.status(500).json({ message: 'Internal Server Error during auth' });
    }
  });
};
