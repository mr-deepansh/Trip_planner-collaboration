import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { User } from '../models/index.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/v1/auth/google/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({
          where: { google_id: profile.id }
        });
        if (!user) {
          const email =
            profile.emails && profile.emails.length > 0
              ? profile.emails[0].value
              : null;
          if (email) {
            user = await User.findOne({ where: { email } });
          }
          if (user) {
            user.google_id = profile.id;
            user.auth_provider = 'GOOGLE';
            await user.save();
          } else {
            user = await User.create({
              name: profile.displayName,
              email: email || `${profile.id}@google.com`,
              google_id: profile.id,
              auth_provider: 'GOOGLE'
            });
          }
        }
        return done(null, user);
      } catch (error) {
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
      try {
        let user = await User.findOne({
          where: { github_id: profile.id }
        });
        if (!user) {
          let email = null;
          if (profile.emails && profile.emails.length > 0) {
            email = profile.emails[0].value;
          }
          if (email) {
            user = await User.findOne({ where: { email } });
          }
          if (user) {
            user.github_id = profile.id;
            user.auth_provider = 'GITHUB';
            await user.save();
          } else {
            user = await User.create({
              name: profile.displayName || profile.username,
              email: email || `${profile.username}@github.com`,
              github_id: profile.id,
              auth_provider: 'GITHUB'
            });
          }
        }
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

export default passport;
