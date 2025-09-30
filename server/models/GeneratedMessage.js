import mongoose from 'mongoose';

const generatedMessageSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: true,
    trim: true
  },
  settings: {
    channel: {
      type: String,
      enum: ['email', 'sms', 'whatsapp'],
      required: true
    },
    tone: {
      type: String,
      enum: ['casual', 'formal', 'friendly', 'professional', 'urgent', 'warm'],
      default: 'friendly'
    },
    language: {
      type: String,
      default: 'en'
    },
    length: {
      type: String,
      enum: ['short', 'medium', 'long'],
      default: 'medium'
    },
    audience: {
      type: String,
      enum: ['customers', 'staff', 'partners', 'general'],
      default: 'customers'
    },
    nCandidates: {
      type: Number,
      min: 1,
      max: 10,
      default: 3
    }
  },
  results: [{
    content: {
      subject: String,
      body: {
        type: String,
        required: true
      },
      preheader: String
    },
    tokens: [{
      type: String
    }],
    metadata: {
      tone: String,
      length: String,
      wordCount: Number,
      charCount: Number,
      estimatedReadTime: Number
    },
    score: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    selected: {
      type: Boolean,
      default: false
    }
  }],
  selectedIndex: {
    type: Number,
    default: 0
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  aiProvider: {
    model: {
      type: String,
      required: true
    },
    provider: {
      type: String,
      required: true
    },
    usage: {
      promptTokens: Number,
      completionTokens: Number,
      totalTokens: Number,
      cost: Number
    },
    requestId: String,
    responseTime: Number
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    helpful: Boolean,
    reportedIssue: {
      type: String,
      enum: ['inappropriate', 'inaccurate', 'poor-quality', 'other']
    }
  },
  actions: [{
    action: {
      type: String,
      enum: ['saved', 'sent', 'edited', 'deleted', 'shared']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: {
      templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Template'
      },
      sendJobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SendJob'
      },
      recipientCount: Number
    }
  }],
  retention: {
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    },
    archived: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
generatedMessageSchema.index({ user: 1, createdAt: -1 });
generatedMessageSchema.index({ 'settings.channel': 1 });
generatedMessageSchema.index({ 'aiProvider.model': 1 });
generatedMessageSchema.index({ 'retention.expiresAt': 1 }, { expireAfterSeconds: 0 });

// Methods
generatedMessageSchema.methods.addFeedback = function(rating, comment, helpful) {
  this.feedback.rating = rating;
  this.feedback.comment = comment;
  this.feedback.helpful = helpful;
  return this.save();
};

generatedMessageSchema.methods.recordAction = function(action, details = {}) {
  this.actions.push({
    action,
    timestamp: new Date(),
    details
  });
  return this.save();
};

generatedMessageSchema.methods.selectCandidate = function(index) {
  // Reset all selections
  this.results.forEach(result => result.selected = false);
  
  // Set new selection
  if (index >= 0 && index < this.results.length) {
    this.results[index].selected = true;
    this.selectedIndex = index;
  }
  
  return this.save();
};

// Virtual for selected result
generatedMessageSchema.virtual('selectedResult').get(function() {
  return this.results[this.selectedIndex];
});

// Virtual for total cost calculation
generatedMessageSchema.virtual('totalCost').get(function() {
  return this.aiProvider.usage?.cost || 0;
});

export default mongoose.model('GeneratedMessage', generatedMessageSchema);