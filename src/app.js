require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');

const app = express();

connectDB();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, '../public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const store = new MongoDBStore({
  uri: process.env.MONGO_URI,
  collection: 'sessions',
});

store.on('error', (err) => console.error('Session store error:', err));

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store,
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
  },
});

app.use(sessionMiddleware);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;

  next();
});

app.get('/', (req, res, next) => {
  return res.send('welcome to chat app. please visit /auth/login to start !');
});

app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).send(err.message || 'Server Error');
});

module.exports = { app, sessionMiddleware };
