// src/modules/users/user.service.ts
import { query } from '../../shared/database';
import { AuthRepository } from './auth.repository';
import { DriverRepository } from '../drivers/driver.repository';
import * as bcrypt from 'bcrypt';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import config from '../../config';
import { UserRepository } from '../users/user.repository';
import { UserRole, UserStatus } from '../../enums/user.enums';
import { isInvalidUser } from '../../utilities/helper';
import { User } from '../users/user.model';
import { logger } from '../../shared/logger';
import axios from 'axios';

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
  }): Promise<{ expiresIn: number }> {
    const {
      otpExpiryTime: TTL,
      maxAttempts: MaxAttempt,
      otpRequestLimit,
      otpRequestWindow,
      otpBlockDuration,
    } = config.auth;

    try {
      // Get existing OTP data for security checks
      const otpData = (await AuthRepository.getOtpData(phone_number, role)) as any;

      // 1. Check if currently blocked
      if (otpData?.blocked_until && new Date() < new Date(otpData.blocked_until)) {
        const remainingTime = Math.max(
          1,
          Math.ceil((new Date(otpData.blocked_until).getTime() - Date.now()) / (60 * 1000))
        );
        throw {
          statusCode: 429,
          message: `Too many attempts. Please try again after ${remainingTime} minutes.`,
        };
      }

      // 2. Handle Request Rate Limiting
      let currentRequestCount = otpData?.request_count || 0;
      const lastRequestedAt = otpData?.last_requested_at ? new Date(otpData.last_requested_at) : null;
      const now = new Date();

      if (
        lastRequestedAt &&
        now.getTime() - lastRequestedAt.getTime() < otpRequestWindow * 60 * 1000
      ) {
        // Within window
        currentRequestCount++;
        if (currentRequestCount > otpRequestLimit) {
          const blockUntil = new Date(now.getTime() + otpBlockDuration * 60 * 1000);
          await AuthRepository.blockUser(phone_number, role, blockUntil);
          throw {
            statusCode: 429,
            message: `OTP request limit exceeded. You are blocked for ${otpBlockDuration} minutes.`,
          };
        }
      } else {
        // Outside window or first request, reset count
        currentRequestCount = 1;
      }

      // Verify existing user
      let userData = await AuthRepository.getUser(phone_number, role);
      let isExistingUser = !!userData;

      if (isExistingUser && role === 'driver') {
        const driverId = (userData as any).driverId || userData?.id;
        if (driverId) {
          const mappedDriver = await DriverRepository.findById(driverId);
          if (mappedDriver) {
            userData = mappedDriver as any;
          }
        }
      }

      if (
        isExistingUser &&
        userData &&
        (userData as any).device_id !== device_id &&
        !allow_new_device
      ) {
        throw {
          statusCode: 403,
          message: `[${phone_number}] - User already exists with a different device ID`,
        };
      }

      // Generate otp and hash it
      const otp = AuthService.genNumericOTP(6);
      const otpHash = await AuthService.hashValue(otp);

      logger.info('------------------------------------------');
      logger.info(`| OTP for ${phone_number} is | ${otp} |`);
      logger.info('------------------------------------------');
      const expires_at = new Date(Date.now() + TTL * 60 * 1000);

      // Save otp hash - Always start with attempt_count = 1 for a new OTP session
      await AuthRepository.saveHashedOtp(
        phone_number,
        role,
        otpHash,
        expires_at,
        1,
        currentRequestCount
      );

      return { expiresIn: TTL };
    } catch (err: any) {
      if (err.statusCode) throw err;
      throw {
        statusCode: 500,
        message: 'Failed to send OTP',
        detail: err?.message || JSON.stringify(err),
      };
    }
  },

  async verifyOtp({ phone_number, role, otp, device_id, allow_new_device }: VerifyOtpUser) {
    try {
      logger.info(`OTP verification attempt for: ${phone_number} with role: ${role}`);
      const { maxAttempts: MaxAttempt, otpBlockDuration } = config.auth;

      // Get otp data
      const otpData = (await AuthRepository.getOtpData(phone_number, role)) as any;
      if (!otpData) {
        throw {
          statusCode: 400,
          message: 'OTP not found or not requested',
        };
      }

      // Check if blocked
      if (otpData.blocked_until && new Date() < new Date(otpData.blocked_until)) {
        const remainingTime = Math.max(
          1,
          Math.ceil((new Date(otpData.blocked_until).getTime() - Date.now()) / (60 * 1000))
        );
        throw {
          statusCode: 429,
          message: `Account is temporarily locked due to too many failed attempts. Try again after ${remainingTime} minutes.`,
        };
      }

      const { otp_hash, expires_at, attempt_count } = otpData;

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

        if (attempt_count + 1 >= MaxAttempt) {
          const blockUntil = new Date(Date.now() + otpBlockDuration * 60 * 1000);
          await AuthRepository.blockUser(phone_number, role, blockUntil);
          throw {
            statusCode: 429,
            message: `Too many failed attempts. Account locked for ${otpBlockDuration} minutes.`,
          };
        }

        throw {
          statusCode: 400,
          message: `Invalid OTP. You have ${MaxAttempt - (attempt_count + 1)} attempts left.`,
        };
      }

      // Clear otp record
      await AuthRepository.clearOtpRecord(phone_number, role);

      // Verify existing user
      let userData = await AuthRepository.getUser(phone_number, role);
      let isExistingUser = !!userData;

      if (isExistingUser && role === 'driver') {
        const driverId = (userData as any).driverId || userData?.id;
        if (driverId) {
          const mappedDriver = await DriverRepository.findById(driverId);
          if (mappedDriver) {
            userData = mappedDriver as any;
          }
        }
      }

      // Ensure driver exists if role is driver
      if (!isExistingUser && role === 'driver') {
        // IMPORTANT: Clear this device_id from any other driver first before creating a new one
        // to avoid unique constraint violations on device_id
        if (device_id) {
          await query(`UPDATE drivers SET device_id = NULL WHERE device_id = $1`, [device_id]);
        }

        const newDriverInput: any = {
          first_name: '',
          last_name: '',
          full_name: '',
          phone_number,
          email: null,
          role,
          status: UserStatus.ACTIVE,
          address: {
            street: '',
            city: '',
            state: '',
            country: '',
            pincode: '',
          },
          device_id,
          onboarding_status: 'PHONE_VERIFIED',
          documents_submitted: false,
          date_of_birth: null,
          gender: null,
        };

        const newDriver = await DriverRepository.create(newDriverInput);
        userData = {
          id: newDriver.driverId,
          ...newDriver,
          role: UserRole.DRIVER,
          status: UserStatus.ACTIVE
        } as any;
        isExistingUser = false;

        // Trigger webhook asynchronously for Admin App real-time notifications
        try {
          const webhookUrl = process.env.ADMIN_WEBHOOK_URL || 'http://localhost:3000/api/webhooks/driver-events';
          axios.post(webhookUrl, {
            eventType: 'NEW_DRIVER',
            message: `New Driver ${phone_number} Registered`,
            data: newDriver
          }).catch(err => logger.error(`Webhook trigger failed: ${err.message}`));
        } catch (e) {
          // Ignore
        }
      }

      let accessToken: string | undefined;
      let refreshToken: string | undefined;

      if (userData && (userData.id || (userData as any).driverId)) {
        const userId = userData.id || (userData as any).driverId;

        // Update device ID if needed
        if (device_id && allow_new_device) {
          await AuthRepository.userDeviceIDUpdate(userId, device_id, role);
        }

        // Generate access token and refresh token
        const payload: JwtPayload & { id: string; deviceId: string } = {
          id: userId,
          deviceId: device_id || userData.device_id || 'unknown',
        };
        const tokens = AuthService.generateTokens(payload);

        accessToken = tokens.accessToken;
        refreshToken = tokens.refreshToken;
      }

      return {
        verified: true,
        userData,
        isNewUser: !isExistingUser,
        accessToken,
        refreshToken,
        onboarding_status: (userData as any)?.onboarding_status || 'PHONE_VERIFIED', // Ensure status is returned
      };
    } catch (error: any) {
      console.error('OTP Verification Error:', error);
      if (error.statusCode) {
        throw error;
      }
      throw {
        statusCode: 500,
        message: 'Failed to verify OTP',
        detail: error.message || error,
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
      let userData = await UserRepository.findById(decoded.id, UserStatus.DELETED);

      if (!userData) {
        const driver = await DriverRepository.findById(decoded.id);
        if (driver) {
          userData = { ...driver, id: driver.driverId } as any;
        }
      }

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
    const user = await UserRepository.findById(userId, UserStatus.DELETED);
    if (user) return user;

    const driver = await DriverRepository.findById(userId);
    if (driver) {
      return { ...driver, id: driver.driverId } as any;
    }
    return null;
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
