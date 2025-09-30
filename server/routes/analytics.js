import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import SendJob from '../models/SendJob.js';
import Template from '../models/Template.js';
import GeneratedMessage from '../models/GeneratedMessage.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

const router = express.Router();

// Get dashboard analytics
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { timeRange = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // Get overview stats
    const [
      totalTemplates,
      totalGenerations,
      totalSends,
      recentSendJobs
    ] = await Promise.all([
      Template.countDocuments({
        owner: userId,
        isArchived: { $ne: true }
      }),
      
      GeneratedMessage.countDocuments({
        user: userId,
        createdAt: { $gte: startDate }
      }),
      
      SendJob.countDocuments({
        sender: userId,
        createdAt: { $gte: startDate }
      }),
      
      SendJob.find({
        sender: userId,
        createdAt: { $gte: startDate }
      })
      .select('progress analytics cost createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
    ]);

    // Calculate aggregated metrics
    const totalRecipients = recentSendJobs.reduce((sum, job) => sum + job.progress.total, 0);
    const totalDelivered = recentSendJobs.reduce((sum, job) => sum + job.progress.delivered, 0);
    const totalOpened = recentSendJobs.reduce((sum, job) => sum + job.progress.opened, 0);
    const totalClicked = recentSendJobs.reduce((sum, job) => sum + job.progress.clicked, 0);
    const totalCost = recentSendJobs.reduce((sum, job) => sum + (job.cost?.actual || 0), 0);

    // Calculate rates
    const deliveryRate = totalRecipients > 0 ? (totalDelivered / totalRecipients) * 100 : 0;
    const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
    const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;

    // Generate daily stats for chart
    const dailyStats = await generateDailyStats(userId, startDate, now);

    const dashboard = {
      overview: {
        totalTemplates,
        totalGenerations,
        totalSends,
        totalRecipients,
        totalCost: parseFloat(totalCost.toFixed(2))
      },
      performance: {
        deliveryRate: parseFloat(deliveryRate.toFixed(2)),
        openRate: parseFloat(openRate.toFixed(2)),
        clickRate: parseFloat(clickRate.toFixed(2))
      },
      trends: dailyStats,
      timeRange
    };

    res.json({
      success: true,
      data: { dashboard }
    });

  } catch (error) {
    next(error);
  }
});

// Get template analytics
router.get('/templates', authenticate, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { timeRange = '30d', templateId } = req.query;
    
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000));

    let query = { sender: userId, createdAt: { $gte: startDate } };
    if (templateId) {
      query.templateId = templateId;
    }

    const sendJobs = await SendJob.find(query)
      .populate('templateId', 'name category channel')
      .select('templateId progress analytics cost channel createdAt')
      .lean();

    // Group by template
    const templateStats = {};
    
    sendJobs.forEach(job => {
      if (!job.templateId) return;
      
      const templateIdStr = job.templateId._id.toString();
      if (!templateStats[templateIdStr]) {
        templateStats[templateIdStr] = {
          template: job.templateId,
          sends: 0,
          recipients: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          cost: 0,
          channels: new Set()
        };
      }
      
      const stats = templateStats[templateIdStr];
      stats.sends += 1;
      stats.recipients += job.progress.total;
      stats.delivered += job.progress.delivered;
      stats.opened += job.progress.opened;
      stats.clicked += job.progress.clicked;
      stats.cost += job.cost?.actual || 0;
      stats.channels.add(job.channel);
    });

    // Convert to array and calculate rates
    const templates = Object.values(templateStats).map(stats => ({
      ...stats,
      channels: Array.from(stats.channels),
      deliveryRate: stats.recipients > 0 ? (stats.delivered / stats.recipients) * 100 : 0,
      openRate: stats.delivered > 0 ? (stats.opened / stats.delivered) * 100 : 0,
      clickRate: stats.opened > 0 ? (stats.clicked / stats.opened) * 100 : 0,
      costPerSend: stats.sends > 0 ? stats.cost / stats.sends : 0
    }));

    // Sort by performance
    templates.sort((a, b) => b.sends - a.sends);

    res.json({
      success: true,
      data: { templates, timeRange }
    });

  } catch (error) {
    next(error);
  }
});

// Get campaign analytics
router.get('/campaigns', authenticate, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { timeRange = '30d', campaignId } = req.query;
    
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000));

    let matchQuery = {
      sender: new mongoose.Types.ObjectId(userId),
      createdAt: { $gte: startDate }
    };

    if (campaignId) {
      matchQuery._id = new mongoose.Types.ObjectId(campaignId);
    }

    const campaigns = await SendJob.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            id: '$_id',
            name: '$name',
            channel: '$channel',
            type: '$campaign.type'
          },
          sends: { $sum: 1 },
          recipients: { $sum: '$progress.total' },
          delivered: { $sum: '$progress.delivered' },
          opened: { $sum: '$progress.opened' },
          clicked: { $sum: '$progress.clicked' },
          bounced: { $sum: '$progress.bounced' },
          failed: { $sum: '$progress.failed' },
          cost: { $sum: '$cost.actual' },
          createdAt: { $first: '$createdAt' },
          completedAt: { $first: '$completedAt' },
          status: { $first: '$status' }
        }
      },
      {
        $addFields: {
          deliveryRate: {
            $cond: [
              { $gt: ['$recipients', 0] },
              { $multiply: [{ $divide: ['$delivered', '$recipients'] }, 100] },
              0
            ]
          },
          openRate: {
            $cond: [
              { $gt: ['$delivered', 0] },
              { $multiply: [{ $divide: ['$opened', '$delivered'] }, 100] },
              0
            ]
          },
          clickRate: {
            $cond: [
              { $gt: ['$opened', 0] },
              { $multiply: [{ $divide: ['$clicked', '$opened'] }, 100] },
              0
            ]
          },
          bounceRate: {
            $cond: [
              { $gt: ['$recipients', 0] },
              { $multiply: [{ $divide: ['$bounced', '$recipients'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    res.json({
      success: true,
      data: { campaigns, timeRange }
    });

  } catch (error) {
    next(error);
  }
});

// Get A/B test results
router.get('/ab-tests', authenticate, async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Find A/B test campaigns
    const abTests = await SendJob.find({
      sender: userId,
      'campaign.abTest.isTest': true
    })
    .populate('campaign.abTest.parentCampaign')
    .select('name campaign progress analytics cost createdAt')
    .sort({ createdAt: -1 })
    .lean();

    // Group by parent campaign
    const testGroups = {};
    
    abTests.forEach(test => {
      const parentId = test.campaign.abTest.parentCampaign?.toString() || test._id.toString();
      
      if (!testGroups[parentId]) {
        testGroups[parentId] = {
          parentCampaign: test.campaign.abTest.parentCampaign || test,
          variants: []
        };
      }
      
      testGroups[parentId].variants.push({
        ...test,
        variantName: test.campaign.abTest.variantName,
        splitPercentage: test.campaign.abTest.splitPercentage,
        deliveryRate: test.progress.total > 0 ? (test.progress.delivered / test.progress.total) * 100 : 0,
        openRate: test.progress.delivered > 0 ? (test.progress.opened / test.progress.delivered) * 100 : 0,
        clickRate: test.progress.opened > 0 ? (test.progress.clicked / test.progress.opened) * 100 : 0
      });
    });

    // Determine winners
    const testResults = Object.values(testGroups).map(group => {
      const variants = group.variants.sort((a, b) => b.openRate - a.openRate);
      const winner = variants[0];
      const confidence = calculateStatisticalSignificance(variants);
      
      return {
        ...group,
        variants,
        winner: winner ? {
          name: winner.variantName,
          openRate: winner.openRate,
          clickRate: winner.clickRate,
          improvement: variants[1] ? 
            ((winner.openRate - variants[1].openRate) / variants[1].openRate) * 100 : 0
        } : null,
        confidence
      };
    });

    res.json({
      success: true,
      data: { testResults }
    });

  } catch (error) {
    next(error);
  }
});

// Get user usage analytics (admin only)
router.get('/usage', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000));

    const usageStats = await User.aggregate([
      {
        $lookup: {
          from: 'generatedmessages',
          localField: '_id',
          foreignField: 'user',
          as: 'generations',
          pipeline: [
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: null, count: { $sum: 1 }, tokens: { $sum: '$aiProvider.usage.totalTokens' } } }
          ]
        }
      },
      {
        $lookup: {
          from: 'sendjobs',
          localField: '_id',
          foreignField: 'sender',
          as: 'sendJobs',
          pipeline: [
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: null, count: { $sum: 1 }, recipients: { $sum: '$progress.total' } } }
          ]
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          createdAt: 1,
          'usage.lastActivity': 1,
          generations: { $arrayElemAt: ['$generations', 0] },
          sendJobs: { $arrayElemAt: ['$sendJobs', 0] }
        }
      },
      { $sort: { 'usage.lastActivity': -1 } }
    ]);

    const summary = {
      totalUsers: usageStats.length,
      activeUsers: usageStats.filter(u => 
        u.usage?.lastActivity && 
        new Date(u.usage.lastActivity) >= startDate
      ).length,
      totalGenerations: usageStats.reduce((sum, u) => sum + (u.generations?.count || 0), 0),
      totalSends: usageStats.reduce((sum, u) => sum + (u.sendJobs?.count || 0), 0),
      totalTokensUsed: usageStats.reduce((sum, u) => sum + (u.generations?.tokens || 0), 0)
    };

    res.json({
      success: true,
      data: {
        summary,
        users: usageStats,
        timeRange
      }
    });

  } catch (error) {
    next(error);
  }
});

// Helper functions
async function generateDailyStats(userId, startDate, endDate) {
  const dailyStats = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayStart = new Date(currentDate);
    const dayEnd = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    
    const [generations, sends] = await Promise.all([
      GeneratedMessage.countDocuments({
        user: userId,
        createdAt: { $gte: dayStart, $lt: dayEnd }
      }),
      
      SendJob.aggregate([
        {
          $match: {
            sender: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: dayStart, $lt: dayEnd }
          }
        },
        {
          $group: {
            _id: null,
            sends: { $sum: 1 },
            recipients: { $sum: '$progress.total' },
            delivered: { $sum: '$progress.delivered' },
            opened: { $sum: '$progress.opened' },
            clicked: { $sum: '$progress.clicked' }
          }
        }
      ])
    ]);

    const sendStats = sends[0] || {
      sends: 0,
      recipients: 0,
      delivered: 0,
      opened: 0,
      clicked: 0
    };

    dailyStats.push({
      date: dayStart.toISOString().split('T')[0],
      generations,
      sends: sendStats.sends,
      recipients: sendStats.recipients,
      delivered: sendStats.delivered,
      opened: sendStats.opened,
      clicked: sendStats.clicked,
      deliveryRate: sendStats.recipients > 0 ? (sendStats.delivered / sendStats.recipients) * 100 : 0,
      openRate: sendStats.delivered > 0 ? (sendStats.opened / sendStats.delivered) * 100 : 0
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dailyStats;
}

function calculateStatisticalSignificance(variants) {
  if (variants.length < 2) return 0;
  
  const [variantA, variantB] = variants;
  
  const nA = variantA.progress.delivered;
  const nB = variantB.progress.delivered;
  const xA = variantA.progress.opened;
  const xB = variantB.progress.opened;
  
  if (nA === 0 || nB === 0) return 0;
  
  const pA = xA / nA;
  const pB = xB / nB;
  
  if (pA === pB) return 0;
  
  // Simple z-test approximation
  const pPool = (xA + xB) / (nA + nB);
  const se = Math.sqrt(pPool * (1 - pPool) * (1/nA + 1/nB));
  
  if (se === 0) return 0;
  
  const z = Math.abs(pA - pB) / se;
  
  // Convert z-score to confidence percentage (simplified)
  if (z >= 1.96) return 95;
  if (z >= 1.645) return 90;
  if (z >= 1.28) return 80;
  
  return Math.round(z * 50); // Rough approximation
}

// Get analytics for a specific campaign
router.get('/campaigns/:id', authenticate, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const campaignId = req.params.id;

    // Get campaign details
    const campaign = await SendJob.findOne({
      _id: campaignId,
      sender: userId
    }).select('name channel progress analytics recipients createdAt completedAt');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Calculate time-based analytics (mock data for now)
    const hourlyActivity = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      opens: Math.floor(Math.random() * (campaign.progress.opened / 4)),
      clicks: Math.floor(Math.random() * (campaign.progress.clicked / 4)),
      deliveries: Math.floor(Math.random() * (campaign.progress.delivered / 4))
    }));

    // Device breakdown (mock data)
    const deviceBreakdown = {
      desktop: Math.floor(Math.random() * 60) + 20,
      mobile: Math.floor(Math.random() * 50) + 30,
      tablet: Math.floor(Math.random() * 30) + 10
    };

    // Top locations (mock data based on recipients)
    const topLocations = [
      { country: 'United States', opens: Math.floor(campaign.progress.opened * 0.4), clicks: Math.floor(campaign.progress.clicked * 0.4) },
      { country: 'United Kingdom', opens: Math.floor(campaign.progress.opened * 0.2), clicks: Math.floor(campaign.progress.clicked * 0.2) },
      { country: 'Canada', opens: Math.floor(campaign.progress.opened * 0.15), clicks: Math.floor(campaign.progress.clicked * 0.15) },
      { country: 'Australia', opens: Math.floor(campaign.progress.opened * 0.1), clicks: Math.floor(campaign.progress.clicked * 0.1) },
      { country: 'Germany', opens: Math.floor(campaign.progress.opened * 0.1), clicks: Math.floor(campaign.progress.clicked * 0.1) }
    ];

    // Engagement metrics
    const engagementRate = campaign.progress.delivered > 0 
      ? ((campaign.progress.opened + campaign.progress.clicked) / campaign.progress.delivered * 100)
      : 0;

    const avgOpenTime = '2.3s'; // Mock data
    const peakActivityHour = hourlyActivity.reduce((max, curr) => 
      curr.opens > max.opens ? curr : max
    ).hour;

    res.json({
      success: true,
      data: {
        campaign: {
          id: campaign._id,
          name: campaign.name,
          channel: campaign.channel,
          createdAt: campaign.createdAt,
          completedAt: campaign.completedAt
        },
        overview: {
          totalRecipients: campaign.progress.total,
          delivered: campaign.progress.delivered,
          opened: campaign.progress.opened,
          clicked: campaign.progress.clicked,
          bounced: campaign.progress.bounced,
          failed: campaign.progress.failed,
          deliveryRate: campaign.progress.total > 0 ? (campaign.progress.delivered / campaign.progress.total * 100) : 0,
          openRate: campaign.analytics.openRate,
          clickRate: campaign.analytics.clickRate,
          bounceRate: campaign.analytics.bounceRate,
          engagementRate
        },
        timelineData: {
          hourly: hourlyActivity,
          peakActivityHour,
          avgOpenTime
        },
        demographics: {
          devices: deviceBreakdown,
          locations: topLocations
        }
      }
    });

  } catch (error) {
    console.error('Campaign analytics error:', error);
    next(error);
  }
});

export default router;