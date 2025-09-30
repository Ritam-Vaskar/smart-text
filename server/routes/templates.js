import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, validateQuery, sanitizeInput, profanityFilter, schemas } from '../middleware/validation.js';
import Template from '../models/Template.js';
import GeneratedMessage from '../models/GeneratedMessage.js';
import Joi from 'joi';

const router = express.Router();

// Get all templates for user
router.get('/', authenticate, validateQuery(Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().max(200),
  category: Joi.string().valid('marketing', 'transactional', 'notification', 'seasonal', 'other'),
  channel: Joi.string().valid('email', 'sms', 'whatsapp'),
  tags: Joi.string(),
  folder: Joi.string(),
  isPublic: Joi.boolean(),
  sortBy: Joi.string().valid('name', 'createdAt', 'updatedAt', 'usage.timesUsed').default('updatedAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
})), async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      channel,
      tags,
      folder,
      isPublic,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {
      $or: [
        { owner: req.user._id },
        { isPublic: true },
        { 'collaborators.user': req.user._id }
      ],
      isArchived: { $ne: true }
    };

    if (search) {
      query.$text = { $search: search };
    }

    if (category) {
      query.category = category;
    }

    if (channel) {
      query.channel = { $in: [channel] };
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      query.tags = { $in: tagArray };
    }

    if (folder) {
      query.folder = folder;
    }

    if (isPublic !== undefined) {
      query.isPublic = isPublic === 'true';
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get total count
    const total = await Template.countDocuments(query);

    // Get templates
    const templates = await Template.find(query)
      .populate('owner', 'name email')
      .populate('collaborators.user', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: {
        templates,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: templates.length,
          totalCount: total
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get template by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('collaborators.user', 'name email')
      .lean();

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check access permissions
    const hasAccess = 
      template.owner._id.toString() === req.user._id.toString() ||
      template.isPublic ||
      template.collaborators.some(c => c.user._id.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { template }
    });

  } catch (error) {
    next(error);
  }
});

// Create template
router.post('/',
  authenticate,
  sanitizeInput,
  profanityFilter,
  validate(schemas.createTemplate),
  async (req, res, next) => {
    try {
      const templateData = {
        ...req.body,
        owner: req.user._id
      };

      // Extract placeholders from content
      const placeholders = extractPlaceholders(req.body.content);
      templateData.placeholders = placeholders;

      const template = new Template(templateData);
      await template.save();

      // Populate owner info
      await template.populate('owner', 'name email');

      res.status(201).json({
        success: true,
        message: 'Template created successfully',
        data: { template }
      });

    } catch (error) {
      next(error);
    }
  }
);

// Create template from generated message
router.post('/from-generated/:generatedId',
  authenticate,
  sanitizeInput,
  profanityFilter,
  async (req, res, next) => {
    try {
      const { generatedId } = req.params;
      const { name, description, category, tags, folder } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Template name is required'
        });
      }

      // Get generated message
      const generatedMessage = await GeneratedMessage.findOne({
        _id: generatedId,
        user: req.user._id
      });

      if (!generatedMessage) {
        return res.status(404).json({
          success: false,
          message: 'Generated message not found'
        });
      }

      const selectedResult = generatedMessage.selectedResult;
      if (!selectedResult) {
        return res.status(400).json({
          success: false,
          message: 'No candidate selected in generated message'
        });
      }

      // Create template from selected result
      const templateData = {
        name: name.trim(),
        description: description?.trim() || '',
        owner: req.user._id,
        category: category || 'other',
        tags: tags || [],
        folder: folder || 'Generated',
        channel: [generatedMessage.settings.channel],
        language: generatedMessage.settings.language,
        tone: generatedMessage.settings.tone,
        audience: generatedMessage.settings.audience,
        content: selectedResult.content,
        placeholders: selectedResult.tokens.map(token => ({
          name: token,
          required: false
        })),
        metadata: {
          originalPrompt: generatedMessage.prompt,
          generationSettings: {
            temperature: generatedMessage.aiProvider?.temperature,
            model: generatedMessage.aiProvider?.model
          },
          aiGenerated: true,
          version: 1
        }
      };

      const template = new Template(templateData);
      await template.save();

      // Record action in generated message
      await generatedMessage.recordAction('saved', { templateId: template._id });

      // Populate owner info
      await template.populate('owner', 'name email');

      res.status(201).json({
        success: true,
        message: 'Template created from generated message successfully',
        data: { template }
      });

    } catch (error) {
      next(error);
    }
  }
);

// Update template
router.put('/:id',
  authenticate,
  sanitizeInput,
  profanityFilter,
  validate(schemas.updateTemplate),
  async (req, res, next) => {
    try {
      const template = await Template.findById(req.params.id);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      // Check permissions
      const canEdit = 
        template.owner.toString() === req.user._id.toString() ||
        template.collaborators.some(c => 
          c.user.toString() === req.user._id.toString() && 
          ['edit', 'admin'].includes(c.permission)
        );

      if (!canEdit) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied'
        });
      }

      // Update placeholders if content changed
      if (req.body.content) {
        req.body.placeholders = extractPlaceholders(req.body.content);
      }

      // Update version if content changed
      if (req.body.content && req.body.content !== template.content) {
        req.body['metadata.version'] = (template.metadata.version || 1) + 1;
      }

      Object.assign(template, req.body);
      await template.save();

      await template.populate('owner', 'name email');

      res.json({
        success: true,
        message: 'Template updated successfully',
        data: { template }
      });

    } catch (error) {
      next(error);
    }
  }
);

// Delete template
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check permissions (only owner can delete)
    if (template.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only template owner can delete templates'
      });
    }

    await Template.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Archive/unarchive template
router.patch('/:id/archive', authenticate, async (req, res, next) => {
  try {
    const { archived = true } = req.body;
    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check permissions
    if (template.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    template.isArchived = archived;
    await template.save();

    res.json({
      success: true,
      message: `Template ${archived ? 'archived' : 'unarchived'} successfully`
    });

  } catch (error) {
    next(error);
  }
});

// Duplicate template
router.post('/:id/duplicate', authenticate, async (req, res, next) => {
  try {
    const { name } = req.body;
    const originalTemplate = await Template.findById(req.params.id);

    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check access permissions
    const hasAccess = 
      originalTemplate.owner.toString() === req.user._id.toString() ||
      originalTemplate.isPublic ||
      originalTemplate.collaborators.some(c => c.user.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Create duplicate
    const duplicateData = originalTemplate.toObject();
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    
    duplicateData.name = name || `${originalTemplate.name} (Copy)`;
    duplicateData.owner = req.user._id;
    duplicateData.collaborators = [];
    duplicateData.isPublic = false;
    duplicateData.usage = {
      timesUsed: 0,
      totalRatings: 0
    };

    if (duplicateData.metadata) {
      duplicateData.metadata.version = 1;
      duplicateData.metadata.parentTemplate = originalTemplate._id;
    }

    const duplicateTemplate = new Template(duplicateData);
    await duplicateTemplate.save();
    await duplicateTemplate.populate('owner', 'name email');

    res.status(201).json({
      success: true,
      message: 'Template duplicated successfully',
      data: { template: duplicateTemplate }
    });

  } catch (error) {
    next(error);
  }
});

// Add collaborator
router.post('/:id/collaborators', authenticate, async (req, res, next) => {
  try {
    const { email, permission = 'view' } = req.body;
    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check permissions (only owner or admin collaborators can add)
    const canAddCollaborator = 
      template.owner.toString() === req.user._id.toString() ||
      template.collaborators.some(c => 
        c.user.toString() === req.user._id.toString() && c.permission === 'admin'
      );

    if (!canAddCollaborator) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    // Find user by email
    const User = (await import('../models/User.js')).default;
    const collaborator = await User.findOne({ email: email.toLowerCase() });

    if (!collaborator) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }

    // Check if already a collaborator
    const existingCollaborator = template.collaborators.find(c => 
      c.user.toString() === collaborator._id.toString()
    );

    if (existingCollaborator) {
      existingCollaborator.permission = permission;
    } else {
      template.collaborators.push({
        user: collaborator._id,
        permission
      });
    }

    await template.save();
    await template.populate('collaborators.user', 'name email');

    res.json({
      success: true,
      message: 'Collaborator added successfully',
      data: { collaborators: template.collaborators }
    });

  } catch (error) {
    next(error);
  }
});

// Remove collaborator
router.delete('/:id/collaborators/:userId', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check permissions
    const canRemove = 
      template.owner.toString() === req.user._id.toString() ||
      req.user._id.toString() === userId; // Users can remove themselves

    if (!canRemove) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied'
      });
    }

    template.collaborators = template.collaborators.filter(c => 
      c.user.toString() !== userId
    );

    await template.save();

    res.json({
      success: true,
      message: 'Collaborator removed successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Rate template
router.post('/:id/rate', authenticate, async (req, res, next) => {
  try {
    const { rating } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    await template.addRating(rating);

    res.json({
      success: true,
      message: 'Rating added successfully',
      data: {
        averageRating: template.usage.averageRating,
        totalRatings: template.usage.totalRatings
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get template folders
router.get('/folders/list', authenticate, async (req, res, next) => {
  try {
    const folders = await Template.distinct('folder', {
      owner: req.user._id,
      isArchived: { $ne: true }
    });

    res.json({
      success: true,
      data: { folders }
    });

  } catch (error) {
    next(error);
  }
});

// Get template tags
router.get('/tags/list', authenticate, async (req, res, next) => {
  try {
    const tags = await Template.distinct('tags', {
      $or: [
        { owner: req.user._id },
        { isPublic: true },
        { 'collaborators.user': req.user._id }
      ],
      isArchived: { $ne: true }
    });

    res.json({
      success: true,
      data: { tags }
    });

  } catch (error) {
    next(error);
  }
});

// Helper function to extract placeholders from content
function extractPlaceholders(content) {
  const placeholders = [];
  const tokenRegex = /\{([^}]+)\}/g;
  let match;

  const contentStr = typeof content === 'object' 
    ? JSON.stringify(content) 
    : String(content);

  while ((match = tokenRegex.exec(contentStr)) !== null) {
    const tokenName = match[1];
    if (!placeholders.some(p => p.name === tokenName)) {
      placeholders.push({
        name: tokenName,
        description: `Placeholder for ${tokenName}`,
        required: false
      });
    }
  }

  return placeholders;
}

export default router;