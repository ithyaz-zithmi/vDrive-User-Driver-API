import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { successResponse } from '../../shared/errorHandler';
import { logger } from '../../shared/logger';
import config from '../../config';
import jwt from 'jsonwebtoken';
import { User } from '../users/user.model';
import { UserStatus } from '../../enums/user.enums';
import { UserService } from '../users/user.service';

interface AuthRequest extends Request {
  user?: { id: string };
}

export const AuthController = {
  async requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { phone_number, role } = req.body;

    try {
      logger.info(`OTP request received for: ${phone_number || 'unknown'}`);

      if (!phone_number?.trim()) {
        throw { statusCode: 400, message: 'Phone number is required' };
      }

      const result = await AuthService.requestOtp({ phone_number, role });

      logger.info(`OTP sent successfully to: ${phone_number}`);

      successResponse(res, 200, 'OTP sent successfully', {
        expiresIn: result.expiresIn,
      });
    } catch (error: any) {
      logger.warn(`OTP send failed for ${phone_number || 'unknown'}: ${error.detail}`);
      next(error);
    }
  },

  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { phone_number, role, otp } = req.body;

    try {
      logger.info(`OTP request received for: ${phone_number || 'unknown'}`);

      if (!phone_number?.trim()) {
        throw { statusCode: 400, message: 'Phone number is required' };
      }

      const result = await AuthService.verifyOtp({ phone_number, role, otp });

      logger.info(`OTP sent successfully to: ${phone_number}`);

      successResponse(res, 200, 'OTP sent successfully', {
        ...result,
      });
    } catch (error: any) {
      logger.warn(`OTP send failed for ${phone_number || 'unknown'}: ${error.message}`);
      next(error);
    }
  },

  async refreshAccessToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        logger.warn('Refresh token not found in body');
        throw { statusCode: 401, message: 'Refresh token not found in body' };
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

  async signUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, phone_number, alternate_number, date_of_birth, role, gender, email, status } =
        req.body;

      // check if user already exists
      const exists = await AuthService.verifyUser(phone_number, role);
      if (exists) {
        throw { statusCode: 409, message: 'User already exists' };
      }

      const body: User = {
        name,
        phone_number,
        alternate_contact: alternate_number || null,
        date_of_birth: date_of_birth || null,
        role,
        gender: gender || null,
        email: email || null,
        status: status || UserStatus.ACTIVE,
      };

      const newUser = await UserService.createUser(body);

      successResponse(res, 201, 'User created successfully', newUser);
    } catch (error: any) {
      logger.warn(`User creation failed: ${error.message}`);
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
