const common_messages = {
  phoneNumber: {
    'string.empty': 'Phone number is required.',
    'string.pattern.base': 'Phone number must contain only digits (6–15 digits).',
    'any.required': 'Phone number is required.',
  },

  role: {
    'any.only': 'Role must be one of: customer, driver.',
    'any.required': 'Role is required.',
  },

  name: {
    'string.pattern.base': 'Name can contain letters, numbers, and spaces only',
    'string.empty': 'Name cannot be empty',
    'any.required': 'Role is required.',
  },

  email: {
    'string.base': 'Email must be a valid string',
    'string.email': 'Please enter a valid email address',
    'string.empty': 'Email cannot be empty',
  },

  gender: {
    'string.base': 'Gender must be a string',
    'any.only': 'Gender must be one of: male, female, other',
    'string.empty': 'Gender cannot be empty',
  },

  alternateNumber: {
    'string.base': 'Alternate number must be a string',
    'string.empty': 'Alternate number cannot be empty',
    'string.pattern.base': 'Alternate number must contain 6–15 digits',
  },

  dateOfBirth: {
    'string.base': 'Date of birth must be a string',
    'string.empty': 'Date of birth cannot be empty',
    'string.pattern.base': 'Date of birth must be in DD-MM-YYYY format',
  },

  status: {
    'string.base': 'Status must be a string',
    'any.only': 'Status must be one of: pending_verification, active, inactive, blocked, deleted',
    'string.empty': 'Status cannot be empty',
  },

  userId: {
    'string.base': 'User ID must be a string',
    'string.uuid': 'User ID must be a valid UUID v4',
    'string.empty': 'User ID cannot be empty',
    'any.required': 'User ID is required',
  },
};

export default common_messages;
