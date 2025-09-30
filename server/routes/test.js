import express from 'express';
import twilio from 'twilio';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Test Twilio configuration
router.post('/twilio-test', authenticate, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ 
        error: 'Phone number and message are required' 
      });
    }

    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return res.status(500).json({ 
        error: 'Twilio credentials not configured' 
      });
    }

    if (!process.env.TWILIO_PHONE_NUMBER) {
      return res.status(500).json({ 
        error: 'Twilio phone number not configured' 
      });
    }

    console.log('Testing Twilio with:', {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Validate phone number format
    const cleanPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber}`;

    const messageResult = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: cleanPhone
    });

    console.log('Test SMS sent:', messageResult.sid);

    res.json({
      success: true,
      messageId: messageResult.sid,
      status: messageResult.status,
      to: messageResult.to,
      from: messageResult.from
    });

  } catch (error) {
    console.error('Twilio test error:', error);
    
    // Provide more detailed error information
    let errorMessage = error.message;
    if (error.code) {
      errorMessage = `Twilio Error ${error.code}: ${error.message}`;
    }

    res.status(500).json({ 
      error: errorMessage,
      details: error.moreInfo || error.details
    });
  }
});

// Get Twilio account info
router.get('/twilio-info', authenticate, async (req, res) => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return res.status(500).json({ 
        error: 'Twilio credentials not configured' 
      });
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Get account info
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    
    res.json({
      accountSid: account.sid,
      friendlyName: account.friendlyName,
      status: account.status,
      type: account.type,
      configuredPhone: process.env.TWILIO_PHONE_NUMBER
    });

  } catch (error) {
    console.error('Twilio info error:', error);
    res.status(500).json({ 
      error: error.message,
      code: error.code 
    });
  }
});

export default router;