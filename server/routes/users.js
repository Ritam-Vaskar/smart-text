import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role, isActive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      query.role = role;
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password -apiKey')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: users.length,
          totalCount: total
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get user by ID (admin only)
router.get('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    next(error);
  }
});

// Update user (admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { name, email, role, isActive, settings } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (settings !== undefined) updateData.settings = settings;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });

  } catch (error) {
    next(error);
  }
});

// Delete user (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // TODO: Handle cleanup of user's data (templates, send jobs, etc.)
    // This should be done in a background job for better performance

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Activate/Deactivate user (admin only)
router.patch('/:id/status', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user }
    });

  } catch (error) {
    next(error);
  }
});

// Reset user's API key (admin only)
router.post('/:id/reset-api-key', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.generateApiKey();

    res.json({
      success: true,
      message: 'API key reset successfully',
      data: {
        apiKey: user.apiKey
      }
    });

  } catch (error) {
    next(error);
  }
});

// Update user limits (admin only)
router.put('/:id/limits', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { generatePerHour, sendPerHour, templatesLimit } = req.body;
    
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (generatePerHour !== undefined) {
      user.settings.limits.generatePerHour = Math.max(0, parseInt(generatePerHour));
    }
    
    if (sendPerHour !== undefined) {
      user.settings.limits.sendPerHour = Math.max(0, parseInt(sendPerHour));
    }
    
    if (templatesLimit !== undefined) {
      user.settings.limits.templatesLimit = Math.max(0, parseInt(templatesLimit));
    }

    await user.save();

    res.json({
      success: true,
      message: 'User limits updated successfully',
      data: {
        limits: user.settings.limits
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get user statistics
router.get('/:id/stats', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { timeRange = '30d' } = req.query;
    
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000));

    const Template = (await import('../models/Template.js')).default;
    const GeneratedMessage = (await import('../models/GeneratedMessage.js')).default;
    const SendJob = (await import('../models/SendJob.js')).default;

    const [user, templates, generations, sendJobs] = await Promise.all([
      User.findById(userId).select('-password -apiKey'),
      
      Template.countDocuments({
        owner: userId,
        isArchived: { $ne: true }
      }),
      
      GeneratedMessage.aggregate([
        {
          $match: {
            user: mongoose.Types.ObjectId(userId),
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalTokens: { $sum: '$aiProvider.usage.totalTokens' },
            totalCost: { $sum: '$aiProvider.usage.cost' }
          }
        }
      ]),
      
      SendJob.aggregate([
        {
          $match: {
            sender: mongoose.Types.ObjectId(userId),
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            sends: { $sum: 1 },
            recipients: { $sum: '$progress.total' },
            delivered: { $sum: '$progress.delivered' },
            opened: { $sum: '$progress.opened' },
            clicked: { $sum: '$progress.clicked' },
            cost: { $sum: '$cost.actual' }
          }
        }
      ])
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const generationStats = generations[0] || {
      count: 0,
      totalTokens: 0,
      totalCost: 0
    };

    const sendStats = sendJobs[0] || {
      sends: 0,
      recipients: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      cost: 0
    };

    const stats = {
      user,
      templates,
      generations: generationStats.count,
      sends: sendStats.sends,
      recipients: sendStats.recipients,
      delivered: sendStats.delivered,
      opened: sendStats.opened,
      clicked: sendStats.clicked,
      tokensUsed: generationStats.totalTokens,
      totalCost: (generationStats.totalCost || 0) + (sendStats.cost || 0),
      deliveryRate: sendStats.recipients > 0 ? (sendStats.delivered / sendStats.recipients) * 100 : 0,
      openRate: sendStats.delivered > 0 ? (sendStats.opened / sendStats.delivered) * 100 : 0,
      clickRate: sendStats.opened > 0 ? (sendStats.clicked / sendStats.opened) * 100 : 0,
      timeRange
    };

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    next(error);
  }
});

export default router;