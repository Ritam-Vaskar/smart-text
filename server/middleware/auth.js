import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token or user inactive.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token.',
      error: error.message 
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. Authentication required.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

export const checkLimits = (type) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // For now, we'll implement basic rate limiting
      // In production, you'd want to track actual usage in Redis or a separate collection
      
      let limitCheck = true;
      
      switch (type) {
        case 'generate':
          // Check generation limits
          limitCheck = user.settings.limits.generatePerHour > 0;
          break;
        case 'send':
          // Check sending limits
          limitCheck = user.settings.limits.sendPerHour > 0;
          break;
      }

      if (!limitCheck) {
        return res.status(429).json({
          success: false,
          message: `Rate limit exceeded for ${type} operations.`,
          retryAfter: 3600 // 1 hour
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.header('X-API-Key');
    
    if (!apiKey) {
      return next(); // Fall through to regular auth
    }

    const user = await User.findOne({ apiKey, isActive: true }).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid API key.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};