// src/modules/auth/auth.controller.ts - Optimized with Winston logger
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { successResponse } from '../../shared/errorHandler';
import { logger } from '../../shared/logger';
import ms from 'ms';
import config from '../../config';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  user?: { id: string };
}

export const AuthController = {
  async createAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { user_name, password } = req.body;

    try {
      logger.info(`Admin creation started: ${user_name}`);

      const adminData = { ...req.body, role: 'admin' as const };
      const newAdmin = await AuthService.createAdmin(adminData);

      const { password: _, reset_token, reset_token_expiry, ...safeAdmin } = newAdmin as any;

      logger.info(`🛡️ Admin created: ${user_name} (ID: ${newAdmin.id})`);
      successResponse(res, 201, 'Admin user created successfully', safeAdmin);
    } catch (error: any) {
      logger.error(`❌ Admin creation failed: ${user_name} - ${error.message}`);
      next(error);
    }
  },

  async signIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { user_name } = req.body;

    try {
      logger.info(`User login attempt: ${user_name || 'unknown'}`);

      const { user_name: username, password } = req.body;

      if (!username?.trim()) {
        throw { statusCode: 400, message: 'Username is required' };
      }
      if (!password?.trim()) {
        throw { statusCode: 400, message: 'Password is required' };
      }

      const tokens = await AuthService.signIn({ user_name: username, password });

      const isProduction = config.nodeEnv === 'production';
      let refreshTokenExpiry: number;

      if (typeof config.jwt.refreshExpiresIn === 'number') {
        refreshTokenExpiry = config.jwt.refreshExpiresIn;
      } else {
        refreshTokenExpiry = ms(config.jwt.refreshExpiresIn || '7d');
      }

      res.cookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        maxAge: refreshTokenExpiry,
        sameSite: 'none',
        // domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
        path: '/api/auth',
      });

      logger.info(`User signed in successfully: ${user_name}`);
      successResponse(res, 200, 'User signed in successfully', {
        accessToken: tokens.accessToken,
      });
    } catch (error: any) {
      logger.warn(`Login failed for ${user_name || 'unknown'}: ${error.message}`);
      next(error);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { user_name } = req.body;

    try {
      logger.info(`Password reset requested for: ${user_name || 'unknown'}`);

      if (!user_name?.trim()) {
        throw { statusCode: 400, message: 'Username is required' };
      }

      await AuthService.forgotPassword({ user_name });

      logger.info(`Password reset link sent successfully to: ${user_name}`);
      successResponse(res, 200, 'Forgot password link sent successfully');
    } catch (error: any) {
      logger.warn(`Password reset request failed for ${user_name || 'unknown'}: ${error.message}`);
      next(error);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { reset_token, new_password } = req.body;

    try {
      logger.info('Password reset attempt with token');

      if (!reset_token?.trim()) {
        throw { statusCode: 400, message: 'Reset token is required' };
      }
      if (!new_password?.trim()) {
        throw { statusCode: 400, message: 'New password is required' };
      }

      await AuthService.resetPassword({ reset_token, new_password });

      logger.info('Password reset completed successfully');
      successResponse(res, 200, 'Password reset successfully');
    } catch (error: any) {
      logger.warn(`Password reset failed with token: ${error.message}`);
      next(error);
    }
  },

  async refreshAccessToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refresh_token;

      if (!refreshToken) {
        logger.warn('Refresh token not found in cookies');
        throw { statusCode: 401, message: 'Refresh token not found in cookies' };
      }

      logger.info('Access token refresh attempt');
      const newAccessToken = await AuthService.refreshAccessToken(refreshToken);

      const decoded = jwt.verify(newAccessToken, config.jwt.secret) as any;
      if (decoded?.id) {
        logger.info(`Token refreshed successfully for user ID: ${decoded.id}`);
      }

      successResponse(res, 200, 'Access token refreshed successfully', {
        accessToken: newAccessToken,
        expiresIn: config.jwt.expiresIn,
      });
    } catch (error: any) {
      logger.warn(`Token refresh failed: ${error.message}`);
      next(error);
    }
  },

  async getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        logger.warn('getMe called without user ID');
        throw { statusCode: 401, message: 'User not authenticated' };
      }

      logger.info(`Fetching profile for user ID: ${userId}`);
      const userProfile = await AuthService.getMe(userId);

      if (!userProfile) {
        logger.warn(`User not found for ID: ${userId}`);
        throw { statusCode: 404, message: 'User not found' };
      }

      logger.info(`Profile fetched successfully for user ID: ${userId}`);
      successResponse(res, 200, 'User profile retrieved successfully', userProfile);
    } catch (error: any) {
      logger.error(`getMe error: ${error.message}`);
      next(error);
    }
  },

  async signOut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        path: '/api/auth',
      });

      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, config.jwt.secret) as any;
          if (decoded?.id) {
            logger.info(`User signed out: User ID ${decoded.id}`);
          }
        } catch (error) {
          logger.info('Sign out completed (token expired/malformed)');
        }
      } else {
        logger.info('Sign out completed (no auth token provided)');
      }

      successResponse(res, 200, 'User signed out successfully');
    } catch (error: any) {
      logger.error(`Sign out error: ${error.message}`);
      next(error);
    }
  },
};
