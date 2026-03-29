const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  displayName: String,
  name: String,
  email: {
    type: String,
    required: true,
    unique: true
  },
  profilePicture: String,
  status: {
    type: String,
    default: 'active'
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
