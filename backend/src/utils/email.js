import nodemailer from 'nodemailer';
import { logger } from './logger.js';

export const sendEmail = async ({ from, email, subject, text, html }) => {
  try {
    const user = process.env.EMAIL_USERNAME || process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
    const host = process.env.EMAIL_HOST || 'smtp.ethereal.email';
    const port = parseInt(process.env.EMAIL_PORT || '587', 10);
    const secure = process.env.EMAIL_SECURE === 'true' || port === 465;

    let transporter;

    if (!user || !pass) {
      // Local Dev Fallback: Create ethereal test account dynamically if no credentials provided
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    } else {
      // Production: Gmail SMTP
      transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        connectionTimeout: 60000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
        pool: true,
        tls: {
          rejectUnauthorized: false
        }
      });
    }

    const senderName = process.env.EMAIL_FROM_NAME || 'Trip Planner';
    const senderAddr = process.env.EMAIL_FROM || user;
    const fromAddress = from || `${senderName} <${senderAddr}>`;

    const mailOptions = {
      from: fromAddress,
      to: email,
      subject,
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${email} — messageId: ${info.messageId}`);

    if (host === 'smtp.ethereal.email') {
      logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
  } catch (error) {
    logger.error(`Error sending email to ${email}: ${error.message}`);
    throw new Error('There was an error sending the email. Try again later!', {
      cause: error
    });
  }
};
