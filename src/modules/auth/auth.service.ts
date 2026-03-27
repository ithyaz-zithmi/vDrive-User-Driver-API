// src/modules/users/user.service.ts
import { AuthRepository } from './auth.repository';
import * as bcrypt from 'bcrypt';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import config from '../../config';
import { UserRepository } from '../users/user.repository';
import { OnboardingStatus, UserRole, UserStatus } from '../../enums/user.enums';
import { isInvalidUser } from '../../utilities/helper';
import { User } from '../users/user.model';
import { logger } from '../../shared/logger';
import { DriverRepository } from '../drivers/driver.repository';
import { query } from '../../shared/database';
import { DriverNotifications, UserNotifications } from '../notifications';

interface VerifyOtpUser {
  phone_number: string;
  role: string;
  otp: string;
  device_id: string;
  allow_new_device: boolean;
  fcm_token: string;
}

async function createNewUser(role: string, phone_number: string, device_id: string) {
  const baseInput: any = {
    first_name: '',
    last_name: '',
    phone_number,
    email: null,
    role,
    status: UserStatus.ACTIVE,
    device_id,
    onboarding_status: OnboardingStatus.PHONE_VERIFIED,
    date_of_birth: null,
    gender: null,
  };

  if (role === 'driver') {
    if (device_id) {
      await query(`UPDATE drivers SET device_id = NULL WHERE device_id = $1`, [device_id]);
    }
    const driverInput = {
      ...baseInput,
      address: '',
      documents_submitted: false,
    };
    const newDriver = await DriverRepository.create(driverInput);
    return {
      id: newDriver.driverId,
      ...newDriver,
      role: UserRole.DRIVER,
      status: UserStatus.ACTIVE,
    };
  }

  if (role === 'customer') {
    if (device_id) {
      await query(`UPDATE users SET device_id = NULL WHERE device_id = $1`, [device_id]);
    }
    const newUser = await UserRepository.createUser(baseInput); // only common fields
    return {
      id: newUser?.id,
      ...newUser,
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
    };
  }

  throw { statusCode: 400, message: `Unsupported role: ${role}` };
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

  //****************************************************************************** 
  // ─── Request OTP Methods ─────────────────────────────────────────────────────
  //****************************************************************************** 

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

      if (isExistingUser && userData) {
        const userId = userData.id as string; // ✅ assert type

        if (!userId) {
          throw { statusCode: 500, message: 'User ID not found' };
        }

        // ✅ Pass userId (guaranteed string) and device_id
        const activeSession = await AuthRepository.getActiveSession(userId, device_id);

        if (activeSession) {
          if (!allow_new_device) {
            throw {
              statusCode: 409,
              code: 'DEVICE_CONFLICT',
              message: 'Account is active on another device. Log out from that device?',
            };
          }
          const oldDeviceId = activeSession.device_id;
        }
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
      if (userData?.fcm_token) {
        await UserNotifications.otpSent(userData.fcm_token);
      }

      return { expiresIn: TTL, userexists: isExistingUser, userData: userData?.full_name, otp: otp };
    } catch (err: any) {
      if (err.statusCode) throw err;
      throw {
        statusCode: 500,
        message: 'Failed to send OTP',
        detail: err,
      };
    }
  },

  //****************************************************************************** 
  // ─── Verify OTP Methods ─────────────────────────────────────────────────────
  //****************************************************************************** 

  async verifyOtp({ phone_number, role, otp, device_id, allow_new_device, fcm_token }: VerifyOtpUser) {
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


      // Verify existing user
      let userData = await AuthRepository.getUser(phone_number, role);
      let isExistingUser = !!userData;


      if (isExistingUser && role === 'driver') {
        const driverId = (userData as any).driverId || userData?.id;
        if (driverId) {
          const mappedDriver = await DriverRepository.findById(driverId);
          if (mappedDriver) userData = mappedDriver as any;
        }
      }
      // Check active session on another device
      // ✅ Device conflict check — only for DIFFERENT devices
      if (isExistingUser && userData) {
        const userId = userData.id as string || (userData as any).driverId;

        if (!userId) {
          throw { statusCode: 500, message: 'User ID not found' };
        }

        // ✅ Exclude current device — same device re-login won't conflict
        const activeSession = await AuthRepository.getActiveSession(userId, role, device_id);

        if (activeSession) {
          if (!allow_new_device) {
            throw {
              statusCode: 409,
              code: 'DEVICE_CONFLICT',
              message: 'Account is active on another device. Log out from that device?',
            };
          }
          const oldDeviceId = activeSession.device_id;
          const oldFcmToken = activeSession.fcm_token;

          await AuthRepository.invalidateAllSessions(userId, role, device_id);

          // ✅ Pass role
          await AuthService.notifyDeviceLogout(userId, oldDeviceId, role, oldFcmToken);
        }
      }


      // Clear otp record
      await AuthRepository.clearOtpRecord(phone_number, role);

      // Create new user/driver if not exists
      if (!isExistingUser) {
        userData = await createNewUser(role, phone_number, device_id) as any;
        if (!userData?.id) {
          throw { statusCode: 500, message: 'Failed to create user' };
        }
        isExistingUser = false;
      }

      // Generate tokens for ALL users (new and existing)
      let userId: string;
      if (role === 'customer') {
        userId = userData?.id as string;
        if (!userId) {
          throw { statusCode: 500, message: 'User ID missing' };
        }
      } else if (role === 'driver') {
        userId = (userData as any).driverId || userData?.id;
        if (!userId) {
          throw { statusCode: 500, message: 'Driver ID missing' };
        }
      }
      else {
        throw { statusCode: 500, message: 'Invalid role' };
      }

      const payload: JwtPayload & { id: string; deviceId: string; role: string } = {
        id: userId,
        deviceId: device_id,
        role,
      };
      const tokens = AuthService.generateTokens(payload);
      const accessToken = tokens.accessToken;
      const refreshToken = tokens.refreshToken;

      // ✅ Always save session — regardless of allow_new_device
      await AuthRepository.upsertSession(userId, device_id, role, refreshToken, fcm_token);

      // ✅ Always update device_id in users table
      await AuthRepository.userDeviceIDUpdate(userId, device_id, role, fcm_token);
      logger.info(`Device ID "${device_id}" updated for User ID "${userId}"`);

      return {
        verified: true,
        userData,
        isNewUser: !isExistingUser,
        accessToken,
        refreshToken,
      };
    } catch (error: any) {
      if (error.statusCode) throw error;
      throw {
        statusCode: 500,
        message: 'Failed to Verify OTP',
        detail: error,
      };
    }
  },

  generateTokens(payload: JwtPayload & { id: string; deviceId: string; role: string }) {
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
        role: string;
        deviceId: string;
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

      // ✅ Check session exists and is active for this role
      const session = await AuthRepository.getSessionByDevice(decoded.id, decoded.role, device_id);
      if (!session || !session.is_active) {
        throw { statusCode: 401, message: 'Session expired or invalidated' };
      }

      // ✅ Validate refresh token
      const isValid = await AuthRepository.validateRefreshToken(decoded.id, decoded.role, device_id, refreshToken);
      if (!isValid) {
        throw { statusCode: 401, message: 'Invalid refresh token' };
      }

      // Generate new access token
      const payload: JwtPayload & { id: string; deviceId: string; role: string } = {
        id: userData.id,
        deviceId: device_id,
        role: decoded.role,
      };
      const accessTokenOptions: SignOptions = { expiresIn: config.jwt.expiresIn };
      const newAccessToken = jwt.sign(payload, config.jwt.secret, accessTokenOptions);

      return newAccessToken;
    } catch (error) {
      throw { statusCode: 401, message: 'Invalid or expired refresh token' };
    }
  },

  async getMe(userId: string): Promise<User | null> {
    // return await UserRepository.findById(userId, UserStatus.DELETED);
    return await UserRepository.findById(userId, UserStatus.ACTIVE);

  },

  async verifyUser(phone_number: string, role: UserRole): Promise<boolean> {
    const user = await AuthRepository.getUser(phone_number, role);
    return !!user;
  },

  async signOutUser(id: string, device_id: string, role: string): Promise<boolean> {
    const signOut = await AuthRepository.signOutUser(id, device_id, role);
    return signOut;
  },



  //****************************************************************************** 
  // ─── Notify Device Logout Methods ─────────────────────────────────────────────
  //****************************************************************************** 

  async notifyDeviceLogout(userId: string, oldDeviceId: string, role: string, oldFcmToken: string) {

    try {
      if (oldFcmToken) {
        let result;

        // ✅ Send notification based on role
        if (role === 'driver') {
          result = await DriverNotifications.forceLogout(oldFcmToken);
        } else {
          result = await UserNotifications.forceLogout(oldFcmToken);
        }

        // ✅ If token is invalid — remove from DB
        if (!result.success && result.error === 'INVALID_TOKEN') {
          await AuthRepository.clearFcmToken(userId, role, oldDeviceId);
          logger.warn(`Cleared invalid FCM token for user: ${userId} device: ${oldDeviceId}`);
        }
      } else {
        logger.warn(`No FCM token found for user: ${userId} device: ${oldDeviceId}`);
      }

      // ✅ Always set force_logout flag as fallback
      await AuthRepository.setForceLogout(userId, role, oldDeviceId);
      logger.info(`Force logout set for user: ${userId} device: ${oldDeviceId}`);

    } catch (err) {
      logger.error(`notifyDeviceLogout failed: ${err}`);
    }
  },

};
