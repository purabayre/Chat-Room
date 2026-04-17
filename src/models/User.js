const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    avatarPath: {
      type: String,
      default: '/img/default-avatar.png',
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('User', userSchema);
