import { celebrate, Segments, Joi } from 'celebrate';
import { User } from '../modules/users/user.model';
import { UserStatus } from '../enums/user.enums';

export const validateBody = (schema: ReturnType<typeof Joi.object>) =>
  celebrate({
    [Segments.BODY]: schema,
  });

export const validateParams = (schema: ReturnType<typeof Joi.object>) =>
  celebrate({
    [Segments.PARAMS]: schema,
  });

export const isInvalidUser = (user?: User | null): boolean => {
  if (!user?.id) return true;
  const inactiveStatuses = [UserStatus.DELETED, UserStatus.BLOCKED];
  return inactiveStatuses.includes(user.status);
};
