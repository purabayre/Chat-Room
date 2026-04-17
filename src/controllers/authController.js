const User = require('../models/User');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

exports.getRegister = (req, res, next) => {
  res.render('auth/register');
};

exports.registerUser = (req, res, next) => {
  const { name, email, password } = req.body;
  const avatarPath = req.file
    ? '/uploads/' + req.file.filename
    : '/img/default-avatar.png';

  User.findOne({ email })
    .then((existing) => {
      if (existing) {
        return res.render('auth/register', {
          error: 'Email already registered',
          formData: { name, email },
        });
      }

      return bcrypt.hash(password, 12).then((hash) => {
        const user = new User({
          name,
          email,
          passwordHash: hash,
          avatarPath,
        });

        return user.save();
      });
    })
    .then((user) => {
      if (!user) {
        return;
      }
      res.render('auth/login', {
        success: 'Registration successful.',
        email: user.email,
      });
    })
    .catch((err) => {
      console.error('Register Error:', err.message);
      res.status(500).send('Server Error');
    });
};

exports.getLogin = (req, res, next) => {
  res.render('auth/login');
};

exports.loginUser = (req, res, next) => {
  const { email, password } = req.body;

  User.findOne({ email })
    .then((user) => {
      if (!user) return res.send('Invalid email');

      return bcrypt.compare(password, user.passwordHash).then((isMatch) => {
        if (!isMatch) return res.send('Invalid password');

        req.session.user = {
          id: user._id.toString(),
          name: user.name,
          avatar: user.avatarPath || '/img/default-avatar.png',
        };

        res.redirect('/chat');
      });
    })
    .catch((err) => {
      console.error('Login Error:', err.message);
      res.status(500).send('Server Error');
    });
};

exports.logoutUser = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout Error:', err.message);
    res.redirect('login');
  });
};

exports.getProfile = (req, res, next) => {
  if (!req.session.user) return res.redirect('/auth/login');
  res.render('auth/profile', { user: req.session.user });
};

exports.updateProfile = (req, res, next) => {
  if (!req.session.user) return res.status(401).send('Login required');

  const { name } = req.body;
  const userId = req.session.user.id;

  User.findById(userId)
    .then((user) => {
      if (!user) return res.status(404).send('User not found');

      if (name && name.trim()) {
        user.name = name.trim();
      }

      if (req.file) {
        if (user.avatarPath && user.avatarPath !== '/img/default-avatar.png') {
          const oldPath = path.join(__dirname, '..', 'public', user.avatarPath);

          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }

        user.avatarPath = '/uploads/' + req.file.filename;
      }

      return user.save().then(() => user);
    })
    .then((updatedUser) => {
      if (!updatedUser) return;

      req.session.user.name = updatedUser.name;
      req.session.user.avatar = updatedUser.avatarPath;

      res.redirect('/chat');
    })
    .catch((err) => {
      console.error('Profile Update Error:', err.message);
      res.status(500).send('Server Error');
    });
};
