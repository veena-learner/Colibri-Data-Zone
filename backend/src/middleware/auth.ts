import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthPayload } from '../types';
import { USER_ROLES } from '../config/constants';

const JWT_SECRET = process.env.JWT_SECRET || 'your-local-dev-secret';

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export const generateToken = (payload: AuthPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

export const verifyToken = (token: string): AuthPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
};

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ success: false, error: 'Invalid token' });
    return;
  }

  req.user = payload;
  next();
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

export const isAdmin = requireRole(USER_ROLES.ADMIN);
export const isOwnerOrAdmin = requireRole(USER_ROLES.ADMIN, USER_ROLES.DATA_OWNER);
export const isStewardOrAbove = requireRole(
  USER_ROLES.ADMIN,
  USER_ROLES.DATA_OWNER,
  USER_ROLES.DATA_STEWARD
);
