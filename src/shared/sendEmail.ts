import nodemailer from 'nodemailer';
import { logger } from './logger';
import config from '../config';

// Create transporter once and reuse
const transporter = nodemailer.createTransport({
  service: config.email.service,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

type MailData = {
  to: string | string[];
  subject: string;
  body: string;
};

export const sendMail = async (data: MailData): Promise<void> => {
  try {
    const mailOptions = {
      from: config.email.from,
      to: data.to,
      subject: data.subject,
      html: data.body,
    };

    await transporter.sendMail(mailOptions);

    logger.info(`✅ Email sent to ${data.to} with subject: ${data.subject}`);
  } catch (error: any) {
    logger.error(`❌ Failed to send email to ${data.to}: ${error.message}`);
  }
};
