import { Joi } from 'celebrate';
import Common from './common.messages';
import Auth from './auth.messages';

const allMessages = {
  ...Common,
  ...Auth,
};

export const validationMessages = (
  schema: ReturnType<typeof Joi.any>,
  messageGroup: keyof typeof allMessages
) => schema.messages(allMessages[messageGroup]);
