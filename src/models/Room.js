const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isPrivate: { type: Boolean, default: false },
  inviteToken: { type: String, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now },
});

// roomSchema.pre('save', function (next) {
//   if (this.isPrivate && !this.inviteToken) {
//     this.inviteToken = uuidv4();
//   }
//   next();
// });

module.exports = mongoose.model('Room', roomSchema);
