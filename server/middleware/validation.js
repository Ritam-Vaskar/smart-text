import Joi from 'joi';
import Filter from 'bad-words';

const filter = new Filter();

// Add custom words to filter
filter.addWords('spam', 'scam', 'phishing');

export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    next();
  };
};

export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Query validation failed',
        errors
      });
    }
    
    next();
  };
};

export const profanityFilter = (req, res, next) => {
  try {
    const contentFields = ['prompt', 'content', 'body', 'subject', 'description', 'name'];
    
    for (const field of contentFields) {
      const value = getNestedValue(req.body, field);
      
      if (value && typeof value === 'string') {
        if (filter.isProfane(value)) {
          return res.status(400).json({
            success: false,
            message: `Inappropriate content detected in ${field}. Please review and modify your text.`,
            field
          });
        }
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

export const sanitizeInput = (req, res, next) => {
  try {
    // Basic HTML/script tag removal
    const sanitize = (str) => {
      if (typeof str !== 'string') return str;
      return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    };

    const recursiveSanitize = (obj) => {
      for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
          recursiveSanitize(obj[key]);
        } else if (typeof obj[key] === 'string') {
          obj[key] = sanitize(obj[key]);
        }
      }
    };

    if (req.body && typeof req.body === 'object') {
      recursiveSanitize(req.body);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Helper function to get nested values
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

// Validation schemas
export const schemas = {
  generateMessage: Joi.object({
    prompt: Joi.string().required().min(3).max(500),
    channel: Joi.string().valid('email', 'sms', 'whatsapp').required(),
    tone: Joi.string().valid('casual', 'formal', 'friendly', 'professional', 'urgent', 'warm').default('friendly'),
    language: Joi.string().default('en'),
    length: Joi.string().valid('short', 'medium', 'long').default('medium'),
    audience: Joi.string().valid('customers', 'staff', 'partners', 'general').default('customers'),
    nCandidates: Joi.number().integer().min(1).max(10).default(3)
  }),

  createTemplate: Joi.object({
    name: Joi.string().required().min(1).max(200),
    description: Joi.string().max(500),
    category: Joi.string().valid('marketing', 'transactional', 'notification', 'seasonal', 'other').default('other'),
    tags: Joi.array().items(Joi.string().max(50)).max(10),
    channel: Joi.array().items(Joi.string().valid('email', 'sms', 'whatsapp')).min(1),
    language: Joi.string().default('en'),
    tone: Joi.string().valid('casual', 'formal', 'friendly', 'professional', 'urgent', 'warm').default('friendly'),
    audience: Joi.string().valid('customers', 'staff', 'partners', 'general').default('customers'),
    content: Joi.object({
      subject: Joi.string().max(200),
      body: Joi.string().required().min(1).max(10000),
      preheader: Joi.string().max(200)
    }).required(),
    isPublic: Joi.boolean().default(false),
    folder: Joi.string().default('General')
  }),

  updateTemplate: Joi.object({
    name: Joi.string().min(1).max(200),
    description: Joi.string().max(500),
    category: Joi.string().valid('marketing', 'transactional', 'notification', 'seasonal', 'other'),
    tags: Joi.array().items(Joi.string().max(50)).max(10),
    channel: Joi.array().items(Joi.string().valid('email', 'sms', 'whatsapp')).min(1),
    language: Joi.string(),
    tone: Joi.string().valid('casual', 'formal', 'friendly', 'professional', 'urgent', 'warm'),
    audience: Joi.string().valid('customers', 'staff', 'partners', 'general'),
    content: Joi.object({
      subject: Joi.string().max(200),
      body: Joi.string().min(1).max(10000),
      preheader: Joi.string().max(200)
    }),
    isPublic: Joi.boolean(),
    folder: Joi.string(),
    isArchived: Joi.boolean()
  }),

  createSendJob: Joi.object({
    name: Joi.string().required().min(1).max(200),
    templateId: Joi.string().hex().length(24),
    generatedMessageId: Joi.string().hex().length(24),
    customContent: Joi.object({
      subject: Joi.string().max(200),
      body: Joi.string().min(1).max(10000),
      preheader: Joi.string().max(200)
    }),
    channel: Joi.string().valid('email', 'sms', 'whatsapp').required(),
    recipients: Joi.array().items(
      Joi.object({
        name: Joi.string(),
        email: Joi.string().email(),
        phone: Joi.string(),
        customFields: Joi.object()
      })
    ).min(1).max(10000).required(),
    scheduling: Joi.object({
      type: Joi.string().valid('immediate', 'scheduled').default('immediate'),
      scheduledAt: Joi.date().when('type', {
        is: 'scheduled',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      timezone: Joi.string()
    }).default({ type: 'immediate' }),
    settings: Joi.object({
      trackOpens: Joi.boolean().default(true),
      trackClicks: Joi.boolean().default(true),
      unsubscribeLink: Joi.boolean().default(true),
      replyTo: Joi.string().email()
    })
  }).or('templateId', 'generatedMessageId', 'customContent'),

  userRegistration: Joi.object({
    name: Joi.string().required().min(2).max(100),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(100).required(),
    role: Joi.string().valid('user', 'marketing', 'admin').default('user')
  }),

  userLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  })
};