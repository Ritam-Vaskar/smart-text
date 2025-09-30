import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize, checkLimits } from '../middleware/auth.js';
import { validate, sanitizeInput, schemas } from '../middleware/validation.js';
import SendJob from '../models/SendJob.js';
import Template from '../models/Template.js';
import GeneratedMessage from '../models/GeneratedMessage.js';
import User from '../models/User.js';
import messagingService from '../services/messagingService.js';

const router = express.Router();

// Rate limiting for send requests
const sendLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_SEND) || 5,
  message: {
    success: false,
    message: 'Too many send requests. Please try again later.',
    retryAfter: 60
  }
});

// Create send job
router.post('/',
  sendLimiter,
  authenticate,
  authorize('marketing', 'admin'),
  checkLimits('send'),
  sanitizeInput,
  validate(schemas.createSendJob),
  async (req, res, next) => {
    try {
      const {
        name,
        templateId,
        generatedMessageId,
        customContent,
        channel,
        recipients,
        scheduling = { type: 'immediate' },
        settings = {}
      } = req.body;

      // Validate that we have content source
      if (!templateId && !generatedMessageId && !customContent) {
        return res.status(400).json({
          success: false,
          message: 'Either templateId, generatedMessageId, or customContent is required'
        });
      }

      let content = null;
      let sourceTemplate = null;
      let sourceGenerated = null;

      // Get content based on source
      if (templateId) {
        sourceTemplate = await Template.findById(templateId);
        if (!sourceTemplate) {
          return res.status(404).json({
            success: false,
            message: 'Template not found'
          });
        }

        // Check template access
        const hasAccess = 
          sourceTemplate.owner.toString() === req.user._id.toString() ||
          sourceTemplate.isPublic ||
          sourceTemplate.collaborators.some(c => c.user.toString() === req.user._id.toString());

        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to template'
          });
        }

        content = sourceTemplate.content;
        await sourceTemplate.incrementUsage();
      } else if (generatedMessageId) {
        sourceGenerated = await GeneratedMessage.findOne({
          _id: generatedMessageId,
          user: req.user._id
        });

        if (!sourceGenerated) {
          return res.status(404).json({
            success: false,
            message: 'Generated message not found'
          });
        }

        content = sourceGenerated.selectedResult?.content;
        if (!content) {
          return res.status(400).json({
            success: false,
            message: 'No candidate selected in generated message'
          });
        }

        await sourceGenerated.recordAction('sent');
      } else {
        content = customContent;
      }

      // Validate recipients
      const validation = await messagingService.validateRecipients(recipients, channel);
      
      if (validation.errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Recipient validation failed',
          errors: validation.errors
        });
      }

      // Check recipient limits
      if (validation.validRecipients.length > 10000) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 10,000 recipients allowed per send job'
        });
      }

      // Create send job
      const sendJobData = {
        name: name.trim(),
        templateId,
        generatedMessageId,
        customContent,
        channel,
        sender: req.user._id,
        recipients: validation.validRecipients.map(recipient => ({
          ...recipient,
          status: 'pending'
        })),
        scheduling,
        settings: {
          trackOpens: true,
          trackClicks: true,
          unsubscribeLink: true,
          ...settings
        },
        status: scheduling.type === 'scheduled' ? 'queued' : 'draft',
        progress: {
          total: validation.validRecipients.length,
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          failed: 0
        },
        provider: {
          name: getProviderName(channel),
          config: {}
        }
      };

      const sendJob = new SendJob(sendJobData);
      await sendJob.save();

      // If immediate send, start processing
      if (scheduling.type === 'immediate') {
        setImmediate(() => processSendJob(sendJob._id));
      }

      await sendJob.populate('sender', 'name email');

      res.status(201).json({
        success: true,
        message: 'Send job created successfully',
        data: {
          sendJob: {
            id: sendJob._id,
            name: sendJob.name,
            channel: sendJob.channel,
            status: sendJob.status,
            recipientCount: sendJob.progress.total,
            scheduling: sendJob.scheduling,
            createdAt: sendJob.createdAt
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

// Get send jobs for user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const query = { sender: req.user._id };
    
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    if (req.query.channel) {
      query.channel = req.query.channel;
    }

    const total = await SendJob.countDocuments(query);
    const sendJobs = await SendJob.find(query)
      .populate('templateId', 'name')
      .populate('sender', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name channel status progress scheduling analytics cost createdAt completedAt')
      .lean();

    res.json({
      success: true,
      data: {
        sendJobs,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: sendJobs.length,
          totalCount: total
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get send job by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const sendJob = await SendJob.findOne({
      _id: req.params.id,
      sender: req.user._id
    })
    .populate('templateId', 'name content')
    .populate('generatedMessageId', 'prompt results')
    .populate('sender', 'name email');

    if (!sendJob) {
      return res.status(404).json({
        success: false,
        message: 'Send job not found'
      });
    }

    res.json({
      success: true,
      data: { sendJob }
    });

  } catch (error) {
    next(error);
  }
});

// Start/resume send job
router.post('/:id/start', authenticate, async (req, res, next) => {
  try {
    const sendJob = await SendJob.findOne({
      _id: req.params.id,
      sender: req.user._id
    });

    if (!sendJob) {
      return res.status(404).json({
        success: false,
        message: 'Send job not found'
      });
    }

    if (!['draft', 'paused', 'queued'].includes(sendJob.status)) {
      return res.status(400).json({
        success: false,
        message: 'Send job cannot be started in current status'
      });
    }

    // Check if scheduled job is ready
    if (sendJob.scheduling.type === 'scheduled' && 
        sendJob.scheduling.scheduledAt > new Date()) {
      sendJob.status = 'queued';
    } else {
      sendJob.status = 'sending';
      sendJob.startedAt = new Date();
    }

    await sendJob.save();

    // Start processing if not scheduled
    if (sendJob.status === 'sending') {
      setImmediate(() => processSendJob(sendJob._id));
    }

    res.json({
      success: true,
      message: 'Send job started successfully',
      data: {
        status: sendJob.status,
        startedAt: sendJob.startedAt
      }
    });

  } catch (error) {
    next(error);
  }
});

// Pause send job
router.post('/:id/pause', authenticate, async (req, res, next) => {
  try {
    const sendJob = await SendJob.findOne({
      _id: req.params.id,
      sender: req.user._id
    });

    if (!sendJob) {
      return res.status(404).json({
        success: false,
        message: 'Send job not found'
      });
    }

    if (sendJob.status !== 'sending') {
      return res.status(400).json({
        success: false,
        message: 'Only sending jobs can be paused'
      });
    }

    sendJob.status = 'paused';
    await sendJob.save();
    await sendJob.addLog('info', 'Send job paused by user');

    res.json({
      success: true,
      message: 'Send job paused successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Cancel send job
router.post('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const sendJob = await SendJob.findOne({
      _id: req.params.id,
      sender: req.user._id
    });

    if (!sendJob) {
      return res.status(404).json({
        success: false,
        message: 'Send job not found'
      });
    }

    if (['completed', 'cancelled'].includes(sendJob.status)) {
      return res.status(400).json({
        success: false,
        message: 'Send job is already completed or cancelled'
      });
    }

    sendJob.status = 'cancelled';
    await sendJob.save();
    await sendJob.addLog('info', 'Send job cancelled by user');

    res.json({
      success: true,
      message: 'Send job cancelled successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Get send job logs
router.get('/:id/logs', authenticate, async (req, res, next) => {
  try {
    const sendJob = await SendJob.findOne({
      _id: req.params.id,
      sender: req.user._id
    }).select('logs');

    if (!sendJob) {
      return res.status(404).json({
        success: false,
        message: 'Send job not found'
      });
    }

    res.json({
      success: true,
      data: { logs: sendJob.logs }
    });

  } catch (error) {
    next(error);
  }
});

// Get recipients status
router.get('/:id/recipients', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const sendJob = await SendJob.findOne({
      _id: req.params.id,
      sender: req.user._id
    });

    if (!sendJob) {
      return res.status(404).json({
        success: false,
        message: 'Send job not found'
      });
    }

    const recipients = sendJob.recipients.slice(skip, skip + limit);
    const total = sendJob.recipients.length;

    res.json({
      success: true,
      data: {
        recipients,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: recipients.length,
          totalCount: total
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Delete send job
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const sendJob = await SendJob.findOne({
      _id: req.params.id,
      sender: req.user._id
    });

    if (!sendJob) {
      return res.status(404).json({
        success: false,
        message: 'Send job not found'
      });
    }

    if (['sending'].includes(sendJob.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete job that is currently sending'
      });
    }

    await SendJob.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Send job deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Helper functions
function getProviderName(channel) {
  switch (channel) {
    case 'email':
      return 'sendgrid';
    case 'sms':
    case 'whatsapp':
      return 'twilio';
    default:
      return 'unknown';
  }
}

// Background job processing
async function processSendJob(sendJobId) {
  try {
    const sendJob = await SendJob.findById(sendJobId)
      .populate('templateId')
      .populate('generatedMessageId');

    if (!sendJob || sendJob.status !== 'sending') {
      return;
    }

    await sendJob.addLog('info', 'Starting send job processing');

    // Get content
    let content;
    if (sendJob.templateId) {
      content = sendJob.templateId.content;
    } else if (sendJob.generatedMessageId) {
      content = sendJob.generatedMessageId.selectedResult?.content;
    } else {
      content = sendJob.customContent;
    }

    if (!content) {
      throw new Error('No content available for sending');
    }

    // Process recipients in batches
    const batchSize = 100;
    const pendingRecipients = sendJob.recipients.filter(r => r.status === 'pending');
    
    for (let i = 0; i < pendingRecipients.length; i += batchSize) {
      // Check if job is still active
      const currentJob = await SendJob.findById(sendJobId);
      if (!currentJob || currentJob.status !== 'sending') {
        break;
      }

      const batch = pendingRecipients.slice(i, i + batchSize);
      
      // Process batch
      const batchPromises = batch.map(async (recipient) => {
        try {
          const result = await messagingService.sendMessage(sendJob, recipient, content);
          
          // Update recipient status
          const recipientIndex = sendJob.recipients.findIndex(r => 
            (r.email && r.email === recipient.email) || 
            (r.phone && r.phone === recipient.phone)
          );
          
          if (recipientIndex !== -1) {
            sendJob.recipients[recipientIndex].status = 'sent';
            sendJob.recipients[recipientIndex].messageId = result.messageId;
          }
          
          return { success: true, recipient };
        } catch (error) {
          console.error('Send error for recipient:', error);
          
          const recipientIndex = sendJob.recipients.findIndex(r => 
            (r.email && r.email === recipient.email) || 
            (r.phone && r.phone === recipient.phone)
          );
          
          if (recipientIndex !== -1) {
            sendJob.recipients[recipientIndex].status = 'failed';
            sendJob.recipients[recipientIndex].errorMessage = error.message;
          }
          
          return { success: false, recipient, error: error.message };
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Update progress
      await sendJob.updateProgress();
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < pendingRecipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Final status update
    await sendJob.updateProgress();
    sendJob.status = 'completed';
    sendJob.completedAt = new Date();
    await sendJob.save();
    
    await sendJob.addLog('info', 'Send job completed successfully');

  } catch (error) {
    console.error('Send job processing error:', error);
    
    const sendJob = await SendJob.findById(sendJobId);
    if (sendJob) {
      sendJob.status = 'failed';
      await sendJob.save();
      await sendJob.addLog('error', `Send job failed: ${error.message}`);
    }
  }
}

export default router;