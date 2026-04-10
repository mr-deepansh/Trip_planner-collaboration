import { User } from '../models/index.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendEmail } from '../utils/email.js';
import { invalidateCachedUser } from '../utils/userCache.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';
import { passwordSchema } from '../validations/auth.validation.js';

const FRONTEND_URL = (process.env.CORS_ORIGIN || '').split(',')[0].trim();
const cookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    domain: isProduction ? undefined : 'localhost',
    path: '/'
  };
};

export const handleOAuthLogin = asyncHandler((req, res) => {
  const provider = req.path.includes('google') ? 'Google' : 'GitHub';

  logger.debug(`[OAuth handleOAuthLogin] Triggered for provider: ${provider}`);
  logger.debug(
    `[OAuth handleOAuthLogin] req.user: ${JSON.stringify(req.user)}`
  );

  if (!req.user) {
    logger.warn(
      `[OAuth handleOAuthLogin] req.user is null — OAuth strategy failed for ${provider}`
    );
    return res.redirect(`${FRONTEND_URL}/login?error=OAuthFailed`);
  }

  const accessToken = req.user.generateAccessToken();
  logger.debug(
    `[OAuth handleOAuthLogin] Token generated for userId=${req.user.id} (first 30): ${accessToken.slice(0, 30)}...`
  );

  const opts = cookieOptions();
  logger.debug(
    `[OAuth handleOAuthLogin] Setting cookie with options: ${JSON.stringify(opts)}`
  );

  res.cookie('accessToken', accessToken, opts);

  logger.debug(`[OAuth handleOAuthLogin] Redirecting to ${FRONTEND_URL}/`);
  res.redirect(`${FRONTEND_URL}/`);
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
  const accessToken = user.generateAccessToken();
  const {
    password: _pwd,
    passwordResetToken: _prt,
    passwordResetExpires: _pre,
    ...safeUser
  } = user.toJSON();
  return res
    .status(200)
    .cookie('accessToken', accessToken, cookieOptions())
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
  return res
    .status(200)
    .clearCookie('accessToken', cookieOptions())
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
});

export const getMe = asyncHandler((req, res) => {
  // DEBUG: inspect what verifyJWT attached
  logger.debug(`[GET /me] req.user: ${JSON.stringify(req.user)}`);
  logger.debug(`[GET /me] Cookies: ${JSON.stringify(req.cookies)}`);
  logger.debug(`[GET /me] Origin: ${req.headers?.origin || 'none'}`);

  if (!req.user) {
    logger.warn(
      '[GET /me] req.user is undefined — verifyJWT may have failed silently'
    );
    throw new ApiError(401, 'User not authenticated');
  }

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
      from: `${process.env.EMAIL_FROM_NAME || 'Trip Planner'} <${process.env.EMAIL_FROM || process.env.EMAIL_USERNAME}>`,
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
  return res
    .status(200)
    .cookie('accessToken', accessToken, cookieOptions())
    .json(
      new ApiResponse(200, { accessToken }, 'Password restored successfully')
    );
});
