// src/modules/users/user.service.ts
import { AuthRepository } from './auth.repository';
import * as bcrypt from 'bcrypt';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import config from '../../config';
import { sendMail } from '../../shared/sendEmail';
import { User } from '../users/user.model';

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
  }: {
    phone_number: string;
    role: string;
  }): Promise<{ expiresIn: number }> {
    const TTL = Number(process.env.OTP_TTL_MINUTES || 5);
    const MaxAttempt = Number(process.env.MAX_ATTEMPT || 3);

    try {
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
      const otp = AuthService.genNumericOTP(6);
      const otpHash = await AuthService.hashValue(otp);

      console.log(`otp for ${phone_number} is ${otp}`);
      const expires_at = new Date(Date.now() + TTL * 60 * 1000);

      // Save otp hash
      await AuthRepository.saveHashedOtp(phone_number, role, otpHash, expires_at, attempt_count);

      return { expiresIn: TTL };
    } catch (err) {
      throw {
        statusCode: 500,
        message: 'Failed to send OTP',
        detail: err,
      };
    }
  },

  async verifyOtp({
    phone_number,
    role,
    otp,
  }: {
    phone_number: string;
    role: string;
    otp: string;
  }) {
    try {
      // Get otp data
      const otpData = await AuthRepository.getOtpData(phone_number, role);
      if (!otpData) {
        throw {
          statusCode: 400,
          message: 'OTP not found or not requested',
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

      if (isExistingUser && userData) {
        // Generate access token and refresh token
        const payload: JwtPayload & { id: string } = { id: userData.id };
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

  generateTokens(payload: JwtPayload & { id: string }) {
    const accessTokenOptions: SignOptions = { expiresIn: config.jwt.expiresIn };
    const refreshTokenOptions: SignOptions = { expiresIn: config.jwt.refreshExpiresIn };

    const accessToken = jwt.sign(payload, config.jwt.secret, accessTokenOptions);
    const refreshToken = jwt.sign(
      { id: payload.id },
      config.jwt.refreshSecret,
      refreshTokenOptions
    );

    return {
      accessToken,
      refreshToken,
    };
  },

  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as JwtPayload & {
        id: string;
      };

      if (!decoded?.id) {
        throw { statusCode: 401, message: 'Invalid refresh token' };
      }

      // Check if user exists
      const userData = await AuthRepository.getUserDataById(decoded.id);
      if (!userData) {
        throw { statusCode: 401, message: 'User not found' };
      }

      // Generate new access token
      const payload: JwtPayload & { id: string } = { id: userData.id };
      const accessTokenOptions: SignOptions = { expiresIn: config.jwt.expiresIn };
      const newAccessToken = jwt.sign(payload, config.jwt.secret, accessTokenOptions);

      return newAccessToken;
    } catch (error) {
      throw { statusCode: 401, message: 'Invalid or expired refresh token' };
    }
  },

  async getMe(userId: string): Promise<User | null> {
    return await AuthRepository.getUserProfileById(userId);
  },
};
