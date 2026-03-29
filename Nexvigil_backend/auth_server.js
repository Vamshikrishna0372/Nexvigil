require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

// Environment Configuration
const isProduction = process.env.ENVIRONMENT === 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';
const FRONTEND_DASHBOARD = process.env.FRONTEND_DASHBOARD_URL || `${FRONTEND_URL}/dashboard`;
const FRONTEND_LOGIN = process.env.FRONTEND_LOGIN_URL || `${FRONTEND_URL}/login`;

// Critical Credential Check
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('CRITICAL ERROR: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in .env');
  console.error('Looking for .env in:', path.join(__dirname, '.env'));
  process.exit(1);
}

const User = require('./models/User');
const app = express();

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Auth MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Standardize proxy settings for local vs production
if (isProduction) {
  app.set('trust proxy', 1); // Required for secure cookies on Render/Railway/Vercel
}

// Middleware
app.use(express.json());

// CORS configuration - allowing origins from .env or defaults
let allowedOrigins = ["http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:3000", "http://localhost:5173"];
try {
  if (process.env.CORS_ORIGINS) {
    const extraOrigins = JSON.parse(process.env.CORS_ORIGINS);
    allowedOrigins = [...new Set([...allowedOrigins, ...extraOrigins])];
  }
} catch (e) {
  console.warn("⚠️ Could not parse CORS_ORIGINS as JSON. Adding as strings.");
}

// Add specifically defined production URLs
if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);
if (process.env.NGROK_URL) allowedOrigins.push(process.env.NGROK_URL);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      console.warn("🚫 CORS Blocked Origin:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Root Health Check
app.get('/', (req, res) => {
  res.send('<h1>NexVigil Auth Server is UP and RUNNING on Port 8081</h1><p>Initiate Login: <a href="/auth/google">/auth/google</a></p>');
});

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret_session',
  resave: false,
  saveUninitialized: false,
  proxy: isProduction,
  cookie: {
    secure: isProduction, // TRUE in production (requires HTTPS)
    sameSite: isProduction ? 'none' : 'lax', // Required for cross-site cookies in Chrome
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

// Passport Initialization
app.use(passport.initialize());
app.use(passport.session());

// Passport Strategy Configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL || "http://localhost:8081/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('🚀 [OAuth] Verifying Profile:', profile.emails[0].value);
      
      const email = profile.emails[0].value.toLowerCase();
      const photo = (profile.photos && profile.photos.length > 0) ? profile.photos[0].value : '';

      // Standardize approach: Use findOneAndUpdate with upsert
      // This solves the E11000 error AND provision for mandatory fields (status/role)
      const user = await User.findOneAndUpdate(
        { $or: [{ googleId: profile.id }, { email: email }] }, // Find by ID or Email
        {
          $set: {
            googleId: profile.id,
            displayName: profile.displayName,
            name: profile.displayName, // PYTHON SYNC: Ensure 'name' exists in Mongo
            email: email,
            profilePicture: photo,
            status: "active",
            // ROLE LOGIC: Only admin@nexvigil.com is admin
            role: email === "admin@nexvigil.com" ? "admin" : "user"
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      console.log('✅ [OAuth] Session Valid for:', user.displayName);
      return done(null, user);
    } catch (err) {
      console.error('❌ [OAuth] Critical Strategy Error:', err);
      return done(err, null);
    }
  }
));

// Serialization
passport.serializeUser((user, done) => {
  done(null, user._id || user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    if (!user) return done(null, null);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Simple Auth Routes (Port 8081)

// 1. Initiate Google login
app.get('/auth/google', (req, res, next) => {
  console.log('🚀 Route: /auth/google HIT');
  passport.authenticate('google', { 
    scope: ['profile', 'email']
  })(req, res, next);
});

// 2. Handle Google callback
app.get('/auth/google/callback', (req, res, next) => {
  console.log('🔄 Route: /auth/google/callback HIT');
  passport.authenticate('google', (err, user, info) => {
    if (err) {
      console.error('❌ Passport Auth Error (err):', err);
      return res.redirect(`${FRONTEND_LOGIN}?error=auth_failed`);
    }
    if (!user) {
      console.error('❌ Passport Auth Failure (no user):', info);
      return res.redirect(`${FRONTEND_LOGIN}?error=no_user`);
    }
      req.logIn(user, (err) => {
        if (err) {
          console.error('❌ req.logIn Error:', err);
          return res.redirect(`${FRONTEND_LOGIN}?error=session_failed`);
        }
        
        console.log('✨ Session established. Handing over to frontend...');
        
        // 3. Generate a JWT that the Python backend (Port 8000) will accept
        const tokenPayload = {
          sub: user._id.toString(),
          email: user.email, 
          role: user.role || "user", 
          type: "access"
        };
        
        const authToken = jwt.sign(
          tokenPayload, 
          process.env.SECRET_KEY || 'supersecretkey_change_in_production', 
          { algorithm: 'HS256', expiresIn: '24h' }
        );

        if (!authToken) {
          return res.redirect(`${FRONTEND_LOGIN}?error=token_gen_failed`);
        }

        const responseData = encodeURIComponent(JSON.stringify({
          token: authToken,
          user: {
            id: user._id,
            displayName: user.displayName,
            email: user.email,
            profilePicture: user.profilePicture || '',
            role: user.role || "user"
          }
        }));
        
        return res.redirect(`${FRONTEND_DASHBOARD}?auth_success=true&data=${responseData}`);
      });
  })(req, res, next);
});

// 3. User profile check
app.get('/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false });
  }
});

// 4. Logout functionality
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: 'Logout failed' });
    res.redirect(FRONTEND_LOGIN);
  });
});

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('SERVER ERROR LOG:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start Server
const PORT = process.env.AUTH_PORT || 8081;
app.listen(PORT, () => {
  console.log(`\n🚀 NexVigil Auth Node Server [${process.env.ENVIRONMENT || 'dev'}]`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔑 Callback: ${process.env.CALLBACK_URL || `http://localhost:${PORT}/auth/google/callback`}`);
  console.log(`🚪 Client Login: ${process.env.FRONTEND_LOGIN_URL || 'http://localhost:8080/login'}\n`);
});
