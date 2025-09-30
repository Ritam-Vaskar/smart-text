import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minLength: 6
  },
  role: {
    type: String,
    enum: ['user', 'marketing', 'admin'],
    default: 'user'
  },
  apiKey: {
    type: String,
    unique: true,
    sparse: true
  },
  settings: {
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    },
    limits: {
      generatePerHour: {
        type: Number,
        default: 100
      },
      sendPerHour: {
        type: Number,
        default: 10
      },
      templatesLimit: {
        type: Number,
        default: 100
      }
    }
  },
  usage: {
    totalGenerations: {
      type: Number,
      default: 0
    },
    totalSends: {
      type: Number,
      default: 0
    },
    tokensUsed: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'usage.lastActivity': -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update lastActivity on login
userSchema.methods.updateLastActivity = function() {
  this.usage.lastActivity = new Date();
  this.lastLogin = new Date();
  return this.save();
};

// Compare password method
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Generate API key
userSchema.methods.generateApiKey = function() {
  const crypto = require('crypto');
  this.apiKey = crypto.randomBytes(32).toString('hex');
  return this.save();
};

// Check if user has reached limits
userSchema.methods.checkLimits = function(type) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  // This would need to be implemented with actual usage tracking
  // For now, we'll just check against the settings
  return this.usage.totalGenerations < this.settings.limits.generatePerHour;
};

// Add indexes
userSchema.index({ email: 1 }, { unique: true });

export default mongoose.model('User', userSchema);