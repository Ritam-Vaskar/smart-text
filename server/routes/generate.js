import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, apiKeyAuth, checkLimits } from '../middleware/auth.js';
import { validate, profanityFilter, sanitizeInput, schemas } from '../middleware/validation.js';
import GeneratedMessage from '../models/GeneratedMessage.js';
import User from '../models/User.js';
import aiService from '../services/aiService.js';

const router = express.Router();

// Rate limiting for generation requests
const generateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_GENERATE) || 60,
  message: {
    success: false,
    message: 'Too many generation requests. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Generate messages from prompt
router.post('/', 
  generateLimiter,
  apiKeyAuth,
  authenticate,
  checkLimits('generate'),
  sanitizeInput,
  profanityFilter,
  validate(schemas.generateMessage),
  async (req, res, next) => {
    try {
      const { prompt, channel, tone, language, length, audience, nCandidates } = req.body;
      const userId = req.user._id;

      // Prepare settings for AI service
      const settings = {
        channel,
        tone,
        language,
        length,
        audience,
        nCandidates: Math.min(nCandidates || 3, 10) // Cap at 10 candidates
      };

      // Generate messages using AI service
      const generationResult = await aiService.generateMessages(prompt, settings);
      
      if (!generationResult.candidates || generationResult.candidates.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'No messages could be generated. Please try a different prompt.'
        });
      }

      // Create GeneratedMessage record
      const generatedMessage = new GeneratedMessage({
        prompt: prompt.trim(),
        settings,
        results: generationResult.candidates.map((candidate, index) => {
          // Ensure proper content structure based on channel
          const content = {
            body: '',  // Will be set below
            subject: undefined,  // Only for email
            preheader: undefined  // Only for email
          };

          if (typeof candidate.content === 'string') {
            content.body = candidate.content;
          } else if (typeof candidate.content === 'object') {
            content.body = candidate.content.body || candidate.content.text || '';
            if (settings.channel === 'email') {
              content.subject = candidate.content.subject;
              content.preheader = candidate.content.preheader;
            }
          }

          return {
            content,
            tokens: candidate.tokens || [],
            metadata: {
              tone: settings.tone,
              length: settings.length,
              wordCount: content.body.length || 0,
              charCount: content.body.length || 0
            },
            score: candidate.score || 0.8,
            selected: index === 0 // First one is selected by default
          };
        }),
        selectedIndex: 0,
        user: userId,
        aiProvider: {
          model: generationResult.model_meta.model,
          provider: generationResult.model_meta.provider,
          usage: generationResult.model_meta.usage,
          requestId: generationResult.model_meta.requestId,
          responseTime: generationResult.model_meta.responseTime
        }
      });

      await generatedMessage.save();

      // Update user usage statistics
      await User.findByIdAndUpdate(userId, {
        $inc: {
          'usage.totalGenerations': 1,
          'usage.tokensUsed': generationResult.model_meta.usage.totalTokens
        },
        'usage.lastActivity': new Date()
      });

      // Prepare response
      const response = {
        success: true,
        data: {
          id: generatedMessage._id,
          candidates: generatedMessage.results.map((result, index) => ({
            id: index,
            content: result.content,
            tokens: result.tokens,
            metadata: result.metadata,
            selected: result.selected
          })),
          prompt,
          settings,
          model_meta: generationResult.model_meta
        }
      };

      res.json(response);

    } catch (error) {
      console.error('Generation error:', error);
      
      // Provide user-friendly error messages
      if (error.message?.includes('rate limit') || error.status === 429) {
        return res.status(429).json({
          success: false,
          message: 'AI service rate limit reached. Please try again in a few minutes.',
          retryAfter: 300
        });
      }

      if (error.message?.includes('quota') || error.message?.includes('billing')) {
        return res.status(503).json({
          success: false,
          message: 'AI service temporarily unavailable. Please try again later.'
        });
      }

      next(error);
    }
  }
);

// Get generated message by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const generatedMessage = await GeneratedMessage.findOne({
      _id: id,
      user: userId
    });

    if (!generatedMessage) {
      return res.status(404).json({
        success: false,
        message: 'Generated message not found'
      });
    }

    res.json({
      success: true,
      data: generatedMessage
    });

  } catch (error) {
    next(error);
  }
});

// Select a specific candidate
router.put('/:id/select', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { candidateIndex } = req.body;
    const userId = req.user._id;

    const generatedMessage = await GeneratedMessage.findOne({
      _id: id,
      user: userId
    });

    if (!generatedMessage) {
      return res.status(404).json({
        success: false,
        message: 'Generated message not found'
      });
    }

    if (candidateIndex < 0 || candidateIndex >= generatedMessage.results.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate index'
      });
    }

    await generatedMessage.selectCandidate(candidateIndex);

    res.json({
      success: true,
      message: 'Candidate selected successfully',
      data: {
        selectedIndex: generatedMessage.selectedIndex,
        selectedResult: generatedMessage.selectedResult
      }
    });

  } catch (error) {
    next(error);
  }
});

// Add feedback to generated message
router.post('/:id/feedback', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment, helpful, reportedIssue } = req.body;
    const userId = req.user._id;

    const generatedMessage = await GeneratedMessage.findOne({
      _id: id,
      user: userId
    });

    if (!generatedMessage) {
      return res.status(404).json({
        success: false,
        message: 'Generated message not found'
      });
    }

    // Validate rating
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Update feedback
    if (rating !== undefined) generatedMessage.feedback.rating = rating;
    if (comment !== undefined) generatedMessage.feedback.comment = comment;
    if (helpful !== undefined) generatedMessage.feedback.helpful = helpful;
    if (reportedIssue !== undefined) generatedMessage.feedback.reportedIssue = reportedIssue;

    await generatedMessage.save();

    res.json({
      success: true,
      message: 'Feedback added successfully',
      data: {
        feedback: generatedMessage.feedback
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get user's generation history
router.get('/history/list', authenticate, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query = { user: userId };
    
    if (req.query.channel) {
      query['settings.channel'] = req.query.channel;
    }
    
    if (req.query.tone) {
      query['settings.tone'] = req.query.tone;
    }

    if (req.query.search) {
      query.prompt = { $regex: req.query.search, $options: 'i' };
    }

    // Get total count
    const total = await GeneratedMessage.countDocuments(query);

    // Get messages
    const messages = await GeneratedMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('prompt settings results selectedIndex aiProvider.model createdAt')
      .lean();

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: messages.length,
          totalCount: total
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Delete generated message
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const result = await GeneratedMessage.findOneAndDelete({
      _id: id,
      user: userId
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Generated message not found'
      });
    }

    res.json({
      success: true,
      message: 'Generated message deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Regenerate with different settings
router.post('/:id/regenerate', 
  generateLimiter,
  authenticate,
  checkLimits('generate'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { tone, length, nCandidates } = req.body;
      const userId = req.user._id;

      const originalMessage = await GeneratedMessage.findOne({
        _id: id,
        user: userId
      });

      if (!originalMessage) {
        return res.status(404).json({
          success: false,
          message: 'Original message not found'
        });
      }

      // Use original prompt with new settings
      const newSettings = {
        ...originalMessage.settings,
        ...(tone && { tone }),
        ...(length && { length }),
        nCandidates: Math.min(nCandidates || 3, 10)
      };

      const generationResult = await aiService.generateMessages(
        originalMessage.prompt,
        newSettings
      );

      // Create new GeneratedMessage
      const newGeneratedMessage = new GeneratedMessage({
        prompt: originalMessage.prompt,
        settings: newSettings,
        results: generationResult.candidates.map((candidate, index) => ({
          content: candidate.content,
          tokens: candidate.tokens || [],
          metadata: candidate.metadata,
          score: candidate.score || 0.8,
          selected: index === 0
        })),
        selectedIndex: 0,
        user: userId,
        aiProvider: {
          model: generationResult.model_meta.model,
          provider: generationResult.model_meta.provider,
          usage: generationResult.model_meta.usage,
          requestId: generationResult.model_meta.requestId,
          responseTime: generationResult.model_meta.responseTime
        }
      });

      await newGeneratedMessage.save();

      // Update user usage
      await User.findByIdAndUpdate(userId, {
        $inc: {
          'usage.totalGenerations': 1,
          'usage.tokensUsed': generationResult.model_meta.usage.totalTokens
        },
        'usage.lastActivity': new Date()
      });

      res.json({
        success: true,
        message: 'Message regenerated successfully',
        data: {
          id: newGeneratedMessage._id,
          candidates: newGeneratedMessage.results,
          settings: newSettings,
          model_meta: generationResult.model_meta
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

export default router;