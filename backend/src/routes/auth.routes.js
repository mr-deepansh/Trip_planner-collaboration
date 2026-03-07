import { Router } from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  handleOAuthLogin
} from '../controllers/auth.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import passport from 'passport';

const router = Router();

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);

// Secured routes
router.route('/logout').post(verifyJWT, logoutUser);
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
    failureRedirect: `${process.env.CORS_ORIGIN}/login`
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
    failureRedirect: `${process.env.CORS_ORIGIN}/login`
  }),
  handleOAuthLogin
);

// Password Reset Routes
import {
  forgotPassword,
  resetPassword
} from '../controllers/auth.controller.js';
router.route('/forgot-password').post(forgotPassword);
router.route('/reset-password/:token').patch(resetPassword).post(resetPassword);

export default router;
