import { User } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendEmail } from '../utils/email.js';
import { invalidateCachedUser } from '../utils/userCache.js';
import crypto from 'crypto';
import { passwordSchema } from '../validations/auth.validation.js';

export const handleOAuthLogin = asyncHandler((req, res) => {
  if (!req.user) {
    return res.redirect(`${process.env.CORS_ORIGIN}/login?error=OAuthFailed`);
  }
  // req.user is already the Sequelize User instance from passport — no extra DB hit
  const accessToken = req.user.generateAccessToken();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };
  res.cookie('accessToken', accessToken, options);
  res.redirect(`${process.env.CORS_ORIGIN}/`);
});

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'All fields are required');
  }
  const passwordValidation = passwordSchema.safeParse(password);
  if (!passwordValidation.success) {
    const errorMessage =
      passwordValidation.error?.errors?.[0]?.message ||
      'Invalid password format. Please choose a stronger password.';
    throw new ApiError(400, errorMessage);
  }
  const existedUser = await User.findOne({ where: { email } });
  if (existedUser) {
    throw new ApiError(409, 'User with email already exists');
  }
  const user = await User.create({
    name,
    email,
    password
  });
  const createdUser = await User.findByPk(user.id, {
    attributes: { exclude: ['password'] }
  });
  if (!createdUser) {
    throw new ApiError(500, 'Something went wrong while registering the user');
  }
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, 'User registered successfully'));
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new ApiError(404, 'User does not exist');
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid user credentials');
  }
  // Generate token from the already-loaded user — skip redundant findByPk
  const accessToken = user.generateAccessToken();
  // Return user without password (destructure to avoid sending sensitive fields)
  const {
    password: _pwd,
    passwordResetToken: _prt,
    passwordResetExpires: _pre,
    ...safeUser
  } = user.toJSON();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };
  return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: safeUser,
          accessToken
        },
        'User logged in successfully'
      )
    );
});

export const logoutUser = asyncHandler((req, res) => {
  if (req.user?.id) {
    invalidateCachedUser(req.user.id);
  }
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };
  return res
    .status(200)
    .clearCookie('accessToken', options)
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
});

export const getMe = asyncHandler((req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, 'User details fetched successfully'));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ where: { email: req.body.email } });
  if (!user) {
    throw new ApiError(404, 'There is no user with email address.');
  }
  const resetToken = user.createPasswordResetToken();
  await user.save({ validate: false });
  const resetURL = `${process.env.CORS_ORIGIN}/reset-password/${resetToken}`;
  const message = `Forgot your password? Please use the following link to reset your password:\n${resetURL}\nIf you didn't forget your password, please ignore this email!`;
  const htmlMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #f8fafc;">
      <h2 style="color: #0f172a; text-align: center;">Reset Your Password</h2>
      <p style="color: #475569; font-size: 16px; line-height: 1.5;">We received a request to reset your password for your Trip Planner account. If you didn't make this request, you can safely ignore this email.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetURL}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Securely Reset Password</a>
      </div>
      <p style="color: #475569; font-size: 14px; text-align: center;">Or copy and paste this link into your browser:</p>
      <p style="color: #2563eb; font-size: 14px; text-align: center; word-break: break-all;">${resetURL}</p>
      <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
      <p style="color: #64748b; font-size: 12px; text-align: center;">For security reasons, this link will expire in 15 minutes.</p>
    </div>
  `;
  try {
    await sendEmail({
      email: user.email,
      subject: 'Trip Planner - Secure Password Reset Link',
      text: message,
      html: htmlMessage
    });
    return res
      .status(200)
      .json(new ApiResponse(200, null, 'Token sent to email!'));
  } catch {
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save({ validate: false });
    throw new ApiError(
      500,
      'There was an error sending the email. Try again later!'
    );
  }
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    throw new ApiError(400, 'Please provide the new password');
  }
  const passwordValidation = passwordSchema.safeParse(password);
  if (!passwordValidation.success) {
    const errorMessage =
      passwordValidation.error?.errors?.[0]?.message ||
      'Invalid password format. Please choose a stronger password.';
    throw new ApiError(400, errorMessage);
  }
  // 1) Get user based on the token
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    where: {
      passwordResetToken: hashedToken
    }
  });
  if (!user || Date.now() > new Date(user.passwordResetExpires).getTime()) {
    throw new ApiError(
      400,
      'This secure link has either expired or already been used. Please request a new one.'
    );
  }
  // 2) If token has not expired, and there is user, set the new password
  user.password = password; // The hook in User model will hash it
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();
  // 3) Update changedPasswordAt property for the user (optional, if exists)
  // 4) Log the user in, send JWT — use already-loaded user instance, no extra DB hit
  const accessToken = user.generateAccessToken();
  invalidateCachedUser(user.id);
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };
  return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .json(
      new ApiResponse(200, { accessToken }, 'Password restored successfully')
    );
});
