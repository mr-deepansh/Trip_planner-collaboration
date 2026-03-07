import nodemailer from 'nodemailer';
import { logger } from './logger.js';

export const sendEmail = async ({ email, subject, text, html }) => {
  try {
    // 1) Create a transporter
    let user = process.env.EMAIL_USERNAME || process.env.EMAIL_USER;
    let pass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
    let host = process.env.EMAIL_HOST;
    let port = process.env.EMAIL_PORT;

    // Local Dev Fallback: Create ethereal test account dynamically if no credentials provided
    if (!user || !pass) {
      const testAccount = await nodemailer.createTestAccount();
      user = testAccount.user;
      pass = testAccount.pass;
      host = 'smtp.ethereal.email';
      port = 587;
    }

    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      auth: {
        user: user,
        pass: pass
      }
    });

    // 2) Define the email options
    const mailOptions = {
      from: 'Trip Planner Support <support@tripplanner.com>',
      to: email,
      subject: subject,
      text: text,
      html: html
    };

    // 3) Actually send the email
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Message sent: ${info.messageId}`);

    // Preview URL used when using ethereal
    if (process.env.EMAIL_HOST === 'smtp.ethereal.email') {
      logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
  } catch (error) {
    logger.error(`Error sending email: ${error}`);
    throw new Error('There was an error sending the email. Try again later!', {
      cause: error
    });
  }
};
