const authMessages = {
  otp: {
    'string.empty': 'OTP is required.',
    'string.length': 'OTP must be exactly 6 digits.',
    'string.pattern.base': 'OTP must be numbers only.',
    'any.required': 'OTP is required.',
  },

  refreshToken: {
    'string.empty': 'Refresh token is required.',
    'any.required': 'Refresh token is required.',
  },

  allowNewDevice: {
    'boolean.base': 'allowNewDevice must be a boolean value',
    'any.required': 'Allow New Device is required.',
  },
};

export default authMessages;
