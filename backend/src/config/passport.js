import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { User } from '../models/index.js';
import { logger } from '../utils/logger.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/v1/auth/google/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
      logger.debug('[Google OAuth] Strategy callback triggered');
      logger.debug(
        `[Google OAuth] Profile id=${profile.id}, displayName="${profile.displayName}"`
      );
      logger.debug(
        `[Google OAuth] Emails from profile: ${JSON.stringify(profile.emails)}`
      );

      try {
        // Step 1: look up by google_id
        logger.debug(
          `[Google OAuth] Looking up user by google_id=${profile.id}`
        );
        let user = await User.findOne({ where: { google_id: profile.id } });

        if (user) {
          logger.debug(
            `[Google OAuth] Existing user found by google_id — id=${user.id}, email=${user.email}`
          );
        } else {
          logger.debug(
            '[Google OAuth] No user found by google_id — checking by email'
          );

          const email =
            profile.emails && profile.emails.length > 0
              ? profile.emails[0].value
              : null;

          logger.debug(
            `[Google OAuth] Resolved email: ${email || 'none (will use fallback)'}`
          );

          if (email) {
            user = await User.findOne({ where: { email } });
          }

          if (user) {
            // Step 2a: existing email-based account — link it to Google
            logger.debug(
              `[Google OAuth] Found existing account by email (id=${user.id}) — linking google_id`
            );
            user.google_id = profile.id;
            user.auth_provider = 'GOOGLE';
            await user.save();
            logger.debug(
              `[Google OAuth] google_id linked to user id=${user.id}`
            );
          } else {
            // Step 2b: brand new user — create account
            const newEmail = email || `${profile.id}@google.com`;
            logger.debug(
              `[Google OAuth] No existing account — creating new user with email=${newEmail}`
            );
            user = await User.create({
              name: profile.displayName,
              email: newEmail,
              google_id: profile.id,
              auth_provider: 'GOOGLE'
            });
            logger.debug(
              `[Google OAuth] New user created — id=${user.id}, email=${user.email}`
            );
          }
        }

        logger.debug(`[Google OAuth] done() called with user id=${user.id}`);
        return done(null, user);
      } catch (error) {
        logger.error(`[Google OAuth] Strategy error: ${error.message}`);
        logger.debug(`[Google OAuth] Error stack: ${error.stack}`);
        return done(error, null);
      }
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/v1/auth/github/callback`,
      scope: ['user:email']
    },
    async (accessToken, refreshToken, profile, done) => {
      logger.debug('[GitHub OAuth] Strategy callback triggered');
      logger.debug(
        `[GitHub OAuth] Profile id=${profile.id}, username="${profile.username}", displayName="${profile.displayName}"`
      );
      logger.debug(
        `[GitHub OAuth] Emails from profile: ${JSON.stringify(profile.emails)}`
      );

      try {
        // Step 1: look up by github_id
        logger.debug(
          `[GitHub OAuth] Looking up user by github_id=${profile.id}`
        );
        let user = await User.findOne({ where: { github_id: profile.id } });

        if (user) {
          logger.debug(
            `[GitHub OAuth] Existing user found by github_id — id=${user.id}, email=${user.email}`
          );
        } else {
          logger.debug(
            '[GitHub OAuth] No user found by github_id — checking by email'
          );

          let email = null;
          if (profile.emails && profile.emails.length > 0) {
            email = profile.emails[0].value;
          }

          logger.debug(
            `[GitHub OAuth] Resolved email: ${email || 'none (will use fallback)'}`
          );

          if (email) {
            user = await User.findOne({ where: { email } });
          }

          if (user) {
            // Step 2a: existing email-based account — link it to GitHub
            logger.debug(
              `[GitHub OAuth] Found existing account by email (id=${user.id}) — linking github_id`
            );
            user.github_id = profile.id;
            user.auth_provider = 'GITHUB';
            await user.save();
            logger.debug(
              `[GitHub OAuth] github_id linked to user id=${user.id}`
            );
          } else {
            // Step 2b: brand new user — create account
            const newEmail = email || `${profile.username}@github.com`;
            const newName = profile.displayName || profile.username;
            logger.debug(
              `[GitHub OAuth] No existing account — creating new user name="${newName}", email=${newEmail}`
            );
            user = await User.create({
              name: newName,
              email: newEmail,
              github_id: profile.id,
              auth_provider: 'GITHUB'
            });
            logger.debug(
              `[GitHub OAuth] New user created — id=${user.id}, email=${user.email}`
            );
          }
        }

        logger.debug(`[GitHub OAuth] done() called with user id=${user.id}`);
        return done(null, user);
      } catch (error) {
        logger.error(`[GitHub OAuth] Strategy error: ${error.message}`);
        logger.debug(`[GitHub OAuth] Error stack: ${error.stack}`);
        return done(error, null);
      }
    }
  )
);

export default passport;
