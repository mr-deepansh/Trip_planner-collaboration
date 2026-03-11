import { Router } from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  handleOAuthLogin,
  forgotPassword,
  resetPassword
} from '../controllers/auth.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import passport from 'passport';

const router = Router();
// Use first CORS origin as PRIMARY frontend URL
const FRONTEND_URL = (process.env.CORS_ORIGIN || '').split(',')[0].trim();

// Public routes
router.route('/register').post(registerUser);
router.route('/login').post(loginUser);

// Logout: does NOT require a valid token — always clears the cookie
router.route('/logout').post(logoutUser);

// Secured routes
router.route('/me').get(verifyJWT, getMe);

// OAuth Routes
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login`
  }),
  handleOAuthLogin
);

router.get(
  '/github',
  passport.authenticate('github', { scope: ['user:email'] })
);
router.get(
  '/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login`
  }),
  handleOAuthLogin
);

// Password Reset Routes (public — user is not logged in)
router.route('/forgot-password').post(forgotPassword);
router.route('/reset-password/:token').patch(resetPassword).post(resetPassword);

export default router;
