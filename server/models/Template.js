import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  description: {
    type: String,
    trim: true,
    maxLength: 500
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['view', 'edit', 'admin'],
      default: 'view'
    }
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    enum: ['marketing', 'transactional', 'notification', 'seasonal', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  channel: [{
    type: String,
    enum: ['email', 'sms', 'whatsapp'],
    required: true
  }],
  language: {
    type: String,
    default: 'en'
  },
  tone: {
    type: String,
    enum: ['casual', 'formal', 'friendly', 'professional', 'urgent', 'warm'],
    default: 'friendly'
  },
  audience: {
    type: String,
    enum: ['customers', 'staff', 'partners', 'general'],
    default: 'customers'
  },
  content: {
    subject: {
      type: String,
      trim: true
    },
    body: {
      type: String,
      required: true,
      trim: true
    },
    preheader: {
      type: String,
      trim: true
    }
  },
  placeholders: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    required: {
      type: Boolean,
      default: false
    },
    defaultValue: {
      type: String
    }
  }],
  metadata: {
    originalPrompt: String,
    generationSettings: {
      temperature: Number,
      maxTokens: Number,
      model: String
    },
    aiGenerated: {
      type: Boolean,
      default: false
    },
    version: {
      type: Number,
      default: 1
    },
    parentTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template'
    }
  },
  usage: {
    timesUsed: {
      type: Number,
      default: 0
    },
    lastUsed: Date,
    averageRating: {
      type: Number,
      min: 1,
      max: 5
    },
    totalRatings: {
      type: Number,
      default: 0
    }
  },
  abTesting: {
    isVariant: {
      type: Boolean,
      default: false
    },
    variantOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template'
    },
    variantName: String,
    testResults: {
      impressions: {
        type: Number,
        default: 0
      },
      opens: {
        type: Number,
        default: 0
      },
      clicks: {
        type: Number,
        default: 0
      },
      conversions: {
        type: Number,
        default: 0
      }
    }
  },
  folder: {
    type: String,
    default: 'General'
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  scheduledDelete: Date,
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

// Indexes for better performance
templateSchema.index({ owner: 1, createdAt: -1 });
templateSchema.index({ tags: 1 });
templateSchema.index({ category: 1 });
templateSchema.index({ channel: 1 });
templateSchema.index({ isPublic: 1, isArchived: 1 });
templateSchema.index({ 'usage.lastUsed': -1 });
// Text search index - using simple indexing to avoid language issues
templateSchema.index({ name: 1 });
templateSchema.index({ description: 1 });

// Middleware to update usage stats
templateSchema.methods.incrementUsage = function() {
  this.usage.timesUsed += 1;
  this.usage.lastUsed = new Date();
  return this.save();
};

// Method to add rating
templateSchema.methods.addRating = function(rating) {
  const currentTotal = this.usage.averageRating * this.usage.totalRatings;
  this.usage.totalRatings += 1;
  this.usage.averageRating = (currentTotal + rating) / this.usage.totalRatings;
  return this.save();
};

// Virtual for computed fields
templateSchema.virtual('openRate').get(function() {
  if (this.abTesting.testResults.impressions === 0) return 0;
  return (this.abTesting.testResults.opens / this.abTesting.testResults.impressions) * 100;
});

templateSchema.virtual('clickRate').get(function() {
  if (this.abTesting.testResults.opens === 0) return 0;
  return (this.abTesting.testResults.clicks / this.abTesting.testResults.opens) * 100;
});

// Ensure virtuals are included in JSON output
templateSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Template', templateSchema);