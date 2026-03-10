// src/modules/users/user.service.ts
import { AuthRepository } from './auth.repository';
import * as bcrypt from 'bcrypt';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import config from '../../config';
import { UserRepository } from '../users/user.repository';
import { UserRole, UserStatus } from '../../enums/user.enums';
import { isInvalidUser } from '../../utilities/helper';
import { User } from '../users/user.model';
import { logger } from '../../shared/logger';

interface VerifyOtpUser {
  phone_number: string;
  role: string;
  otp: string;
  device_id: string;
  allow_new_device: boolean;
}

export const AuthService = {
  generateResetToken(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },
  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  },

  genNumericOTP(length: number): string {
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += Math.floor(Math.random() * 10);
    }
    return otp;
  },

  async hashValue(value: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(value, saltRounds);
  },

  async compareHash(value: string, hashed: string) {
    return bcrypt.compare(value, hashed);
  },

  async requestOtp({
    phone_number,
    role,
    device_id,
    allow_new_device,
  }: {
    phone_number: string;
    role: string;
    device_id: string;
    allow_new_device: boolean;
  }): Promise<{ expiresIn: number, userexists: boolean, userData: any, otp: any }> {
    const TTL = config.auth.otpExpiryTime;
    const MaxAttempt = config.auth.maxAttempts;

    try {
      // Verify existing user
      const userData = await AuthRepository.getUser(phone_number, role);
      const isExistingUser = !!userData;

      if (isExistingUser && userData.device_id !== device_id && !allow_new_device) {
        throw {
          statusCode: 500,
          message: `[${phone_number}] - User Exists for this number`,
        };
      }

      // Handle brute force attempt
      const attempt_count = await AuthRepository.verifyAttemptCount(phone_number, role);
      if (attempt_count > MaxAttempt) {
        throw {
          statusCode: 500,
          message: `${role} - [${phone_number}] exceeds maximum verification attempts`,
          detail: `${role} - [${phone_number}] exceeds maximum verification attempts`,
        };
      }

      // Generate otp and hash it
      const otpLength = role === 'driver' ? 6 : 4;
      const otp = AuthService.genNumericOTP(otpLength);
      const otpHash = await AuthService.hashValue(otp);

      console.log(`otp for ${phone_number} is ${otp}`);
      const expires_at = new Date(Date.now() + TTL * 60 * 1000);

      // Save otp hash
      await AuthRepository.saveHashedOtp(phone_number, role, otpHash, expires_at, attempt_count);

      return { expiresIn: TTL, userexists: isExistingUser, userData: userData?.full_name, otp: otp };
    } catch (err) {
      throw {
        statusCode: 500,
        message: 'Failed to send OTP',
        detail: err,
      };
    }
  },

  async verifyOtp({ phone_number, role, otp, device_id, allow_new_device }: VerifyOtpUser) {
    try {
      // Get otp data
      const otpData = await AuthRepository.getOtpData(phone_number, role);
      if (!otpData) {
        throw {
          statusCode: 400,
          message: 'OTP not found or not requested',
        };
      }

      const { otp_hash, expires_at } = otpData;

      // Check expiry
      if (new Date() > new Date(expires_at)) {
        throw {
          statusCode: 400,
          message: 'OTP expired',
        };
      }

      // Compare otp with hash
      const isMatch = await AuthService.compareHash(otp, otp_hash);

      if (!isMatch) {
        // increase attempt_count
        await AuthRepository.incrementAttemptCount(phone_number, role);

        throw {
          statusCode: 400,
          message: 'Invalid OTP',
        };
      }

      // Clear otp record
      await AuthRepository.clearOtpRecord(phone_number, role);

      // Verify existing user
      const userData = await AuthRepository.getUser(phone_number, role);
      const isExistingUser = !!userData;

      let accessToken: string | undefined;
      let refreshToken: string | undefined;

      if (isExistingUser && device_id && allow_new_device) {
        const userId = userData.id;
        if (!userId) return;

        const updated = await AuthRepository.userDeviceIDUpdate(userId, device_id);
        if (updated) {
          logger.info(`Device ID "${device_id}" updated for User ID "${userId}"`);
        }
      }

      if (isExistingUser && userData && userData.id) {
        // Generate access token and refresh token
        const payload: JwtPayload & { id: string; deviceId: string } = {
          id: userData.id,
          deviceId: device_id,
        };
        const tokens = AuthService.generateTokens(payload);

        accessToken = tokens.accessToken;
        refreshToken = tokens.refreshToken;
      }

      return {
        verified: true,
        userData,
        isNewUser: !isExistingUser,
        ...(isExistingUser ? { accessToken } : {}),
        ...(isExistingUser ? { refreshToken } : {}),
      };
    } catch (error) {
      throw {
        statusCode: 500,
        message: 'Failed to send OTP',
        detail: error,
      };
    }
  },

  generateTokens(payload: JwtPayload & { id: string; deviceId: string }) {
    const accessTokenOptions: SignOptions = { expiresIn: config.jwt.expiresIn };
    const refreshTokenOptions: SignOptions = { expiresIn: config.jwt.refreshExpiresIn };

    const accessToken = jwt.sign(payload, config.jwt.secret, accessTokenOptions);
    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, refreshTokenOptions);

    return {
      accessToken,
      refreshToken,
    };
  },

  async refreshAccessToken(refreshToken: string, device_id: string): Promise<string> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as JwtPayload & {
        id: string;
      };

      if (!decoded?.id && !decoded?.deviceId) {
        throw { statusCode: 401, message: 'Invalid refresh token' };
      }

      // Check if user exists
      const userData = await UserRepository.findById(decoded.id, UserStatus.DELETED);

      if (userData?.device_id !== device_id) {
        throw { statusCode: 404, message: 'Invalid Device login' };
      }

      const inValidUser = isInvalidUser(userData);
      if (!userData?.id || inValidUser) {
        throw { statusCode: 500, message: 'Invalid user record: missing ID' };
      }

      // Generate new access token
      const payload: JwtPayload & { id: string; deviceId: string } = {
        id: userData.id,
        deviceId: userData?.device_id,
      };
      const accessTokenOptions: SignOptions = { expiresIn: config.jwt.expiresIn };
      const newAccessToken = jwt.sign(payload, config.jwt.secret, accessTokenOptions);

      return newAccessToken;
    } catch (error) {
      throw { statusCode: 401, message: 'Invalid or expired refresh token' };
    }
  },

  async getMe(userId: string): Promise<User | null> {
    return await UserRepository.findById(userId, UserStatus.DELETED);
  },

  async verifyUser(phone_number: string, role: UserRole): Promise<boolean> {
    const user = await AuthRepository.getUser(phone_number, role);
    return !!user;
  },

  async signOutUser(id: string): Promise<boolean> {
    const signOut = await AuthRepository.signOutUser(id);
    return signOut;
  },
};
