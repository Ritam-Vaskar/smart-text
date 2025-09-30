import mongoose from 'mongoose';

const sendJobSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template'
  },
  generatedMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GeneratedMessage'
  },
  customContent: {
    subject: String,
    body: String,
    preheader: String
  },
  channel: {
    type: String,
    enum: ['email', 'sms', 'whatsapp'],
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipients: [{
    name: String,
    email: String,
    phone: String,
    customFields: {
      type: Map,
      of: String
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed'],
      default: 'pending'
    },
    messageId: String, // Provider message ID
    deliveredAt: Date,
    openedAt: Date,
    clickedAt: Date,
    errorMessage: String
  }],
  campaign: {
    type: {
      type: String,
      enum: ['broadcast', 'triggered', 'ab-test', 'drip'],
      default: 'broadcast'
    },
    abTest: {
      isTest: {
        type: Boolean,
        default: false
      },
      variantName: String,
      parentCampaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SendJob'
      },
      splitPercentage: {
        type: Number,
        min: 0,
        max: 100
      }
    }
  },
  scheduling: {
    type: {
      type: String,
      enum: ['immediate', 'scheduled', 'recurring'],
      default: 'immediate'
    },
    scheduledAt: Date,
    timezone: String,
    recurring: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly']
      },
      interval: Number,
      endDate: Date,
      daysOfWeek: [Number], // 0-6, Sunday to Saturday
      dayOfMonth: Number
    }
  },
  status: {
    type: String,
    enum: ['draft', 'queued', 'sending', 'sent', 'paused', 'cancelled', 'failed', 'completed'],
    default: 'draft'
  },
  progress: {
    total: {
      type: Number,
      required: true
    },
    sent: {
      type: Number,
      default: 0
    },
    delivered: {
      type: Number,
      default: 0
    },
    opened: {
      type: Number,
      default: 0
    },
    clicked: {
      type: Number,
      default: 0
    },
    bounced: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    },
    unsubscribed: {
      type: Number,
      default: 0
    }
  },
  settings: {
    trackOpens: {
      type: Boolean,
      default: true
    },
    trackClicks: {
      type: Boolean,
      default: true
    },
    unsubscribeLink: {
      type: Boolean,
      default: true
    },
    replyTo: String,
    sendRate: {
      type: Number,
      default: 100 // messages per minute
    },
    retryFailures: {
      type: Boolean,
      default: true
    },
    maxRetries: {
      type: Number,
      default: 3
    }
  },
  provider: {
    name: {
      type: String,
      enum: ['sendgrid', 'twilio', 'ses', 'mailgun'],
      required: true
    },
    config: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    },
    batchId: String,
    webhookData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  },
  analytics: {
    openRate: {
      type: Number,
      default: 0
    },
    clickRate: {
      type: Number,
      default: 0
    },
    bounceRate: {
      type: Number,
      default: 0
    },
    unsubscribeRate: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    }
  },
  cost: {
    estimated: {
      type: Number,
      default: 0
    },
    actual: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  logs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    level: {
      type: String,
      enum: ['info', 'warning', 'error'],
      default: 'info'
    },
    message: String,
    details: mongoose.Schema.Types.Mixed
  }],
  startedAt: Date,
  completedAt: Date,
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

// Indexes
sendJobSchema.index({ sender: 1, createdAt: -1 });
sendJobSchema.index({ status: 1, 'scheduling.scheduledAt': 1 });
sendJobSchema.index({ channel: 1 });
sendJobSchema.index({ 'campaign.type': 1 });

// Methods
sendJobSchema.methods.updateProgress = function() {
  // Calculate progress from recipients
  this.progress.total = this.recipients.length;
  this.progress.sent = this.recipients.filter(r => ['sent', 'delivered', 'opened', 'clicked'].includes(r.status)).length;
  this.progress.delivered = this.recipients.filter(r => ['delivered', 'opened', 'clicked'].includes(r.status)).length;
  this.progress.opened = this.recipients.filter(r => ['opened', 'clicked'].includes(r.status)).length;
  this.progress.clicked = this.recipients.filter(r => r.status === 'clicked').length;
  this.progress.bounced = this.recipients.filter(r => r.status === 'bounced').length;
  this.progress.failed = this.recipients.filter(r => r.status === 'failed').length;
  this.progress.unsubscribed = this.recipients.filter(r => r.status === 'unsubscribed').length;

  // Update analytics
  if (this.progress.sent > 0) {
    this.analytics.openRate = (this.progress.opened / this.progress.sent) * 100;
    this.analytics.clickRate = this.progress.opened > 0 ? (this.progress.clicked / this.progress.opened) * 100 : 0;
    this.analytics.bounceRate = (this.progress.bounced / this.progress.sent) * 100;
    this.analytics.unsubscribeRate = (this.progress.unsubscribed / this.progress.sent) * 100;
  }

  return this.save();
};

sendJobSchema.methods.addLog = function(level, message, details = null) {
  this.logs.push({
    timestamp: new Date(),
    level,
    message,
    details
  });
  
  // Keep only last 100 logs
  if (this.logs.length > 100) {
    this.logs = this.logs.slice(-100);
  }
  
  return this.save();
};

sendJobSchema.methods.updateRecipientStatus = function(recipientEmail, status, data = {}) {
  const recipient = this.recipients.find(r => r.email === recipientEmail);
  if (recipient) {
    recipient.status = status;
    
    if (data.messageId) recipient.messageId = data.messageId;
    if (data.deliveredAt) recipient.deliveredAt = data.deliveredAt;
    if (data.openedAt) recipient.openedAt = data.openedAt;
    if (data.clickedAt) recipient.clickedAt = data.clickedAt;
    if (data.errorMessage) recipient.errorMessage = data.errorMessage;
    
    this.updateProgress();
  }
};

// Virtual for completion percentage
sendJobSchema.virtual('completionPercentage').get(function() {
  if (this.progress.total === 0) return 0;
  return Math.round((this.progress.sent / this.progress.total) * 100);
});

export default mongoose.model('SendJob', sendJobSchema);