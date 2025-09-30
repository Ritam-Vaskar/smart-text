import express from 'express';
import SendJob from '../models/SendJob.js';
import messagingService from '../services/messagingService.js';

const router = express.Router();

// SMS Status Webhook (Twilio)
router.post('/sms/:sendJobId', async (req, res) => {
  try {
    const { sendJobId } = req.params;
    const webhookData = req.body;

    console.log('SMS Webhook received:', { sendJobId, webhookData });

    const sendJob = await SendJob.findById(sendJobId);
    if (!sendJob) {
      console.error('SendJob not found:', sendJobId);
      return res.status(404).json({ error: 'SendJob not found' });
    }

    // Update recipient status based on Twilio webhook
    const messageId = webhookData.MessageSid || webhookData.SmsSid;
    const status = webhookData.MessageStatus || webhookData.SmsStatus;
    const errorCode = webhookData.ErrorCode;
    const errorMessage = webhookData.ErrorMessage;

    if (messageId) {
      const recipientIndex = sendJob.recipients.findIndex(r => r.messageId === messageId);
      
      if (recipientIndex !== -1) {
        const recipient = sendJob.recipients[recipientIndex];
        
        // Map Twilio status to our status
        switch (status) {
          case 'delivered':
            recipient.status = 'delivered';
            recipient.deliveredAt = new Date();
            break;
          case 'failed':
          case 'undelivered':
            recipient.status = 'failed';
            recipient.errorMessage = errorMessage || `Twilio error: ${errorCode}`;
            break;
          case 'sent':
            recipient.status = 'sent';
            recipient.sentAt = new Date();
            break;
          default:
            // For other statuses like 'queued', 'sending', keep existing status
            break;
        }

        // Store webhook data for debugging
        if (!recipient.webhookData) {
          recipient.webhookData = [];
        }
        recipient.webhookData.push({
          timestamp: new Date(),
          status: status,
          data: webhookData
        });

        await sendJob.save();
        
        // Update job statistics
        await sendJob.updateStatistics();
        
        console.log(`Updated recipient ${recipient.phone} status to ${status}`);
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('SMS Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// WhatsApp Status Webhook (Twilio)
router.post('/whatsapp/:sendJobId', async (req, res) => {
  try {
    const { sendJobId } = req.params;
    const webhookData = req.body;

    console.log('WhatsApp Webhook received:', { sendJobId, webhookData });

    const sendJob = await SendJob.findById(sendJobId);
    if (!sendJob) {
      console.error('SendJob not found:', sendJobId);
      return res.status(404).json({ error: 'SendJob not found' });
    }

    // Similar logic to SMS webhook
    const messageId = webhookData.MessageSid || webhookData.SmsSid;
    const status = webhookData.MessageStatus || webhookData.SmsStatus;
    const errorCode = webhookData.ErrorCode;
    const errorMessage = webhookData.ErrorMessage;

    if (messageId) {
      const recipientIndex = sendJob.recipients.findIndex(r => r.messageId === messageId);
      
      if (recipientIndex !== -1) {
        const recipient = sendJob.recipients[recipientIndex];
        
        switch (status) {
          case 'delivered':
            recipient.status = 'delivered';
            recipient.deliveredAt = new Date();
            break;
          case 'failed':
          case 'undelivered':
            recipient.status = 'failed';
            recipient.errorMessage = errorMessage || `WhatsApp error: ${errorCode}`;
            break;
          case 'sent':
            recipient.status = 'sent';
            recipient.sentAt = new Date();
            break;
          case 'read':
            recipient.status = 'delivered';
            recipient.deliveredAt = new Date();
            recipient.readAt = new Date();
            break;
        }

        if (!recipient.webhookData) {
          recipient.webhookData = [];
        }
        recipient.webhookData.push({
          timestamp: new Date(),
          status: status,
          data: webhookData
        });

        await sendJob.save();
        await sendJob.updateStatistics();
        
        console.log(`Updated WhatsApp recipient ${recipient.phone} status to ${status}`);
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('WhatsApp Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Email Status Webhook (SendGrid)
router.post('/email/:sendJobId', async (req, res) => {
  try {
    const { sendJobId } = req.params;
    const webhookData = req.body;

    console.log('Email Webhook received:', { sendJobId, webhookData });

    const sendJob = await SendJob.findById(sendJobId);
    if (!sendJob) {
      return res.status(404).json({ error: 'SendJob not found' });
    }

    // Process SendGrid webhook events
    if (Array.isArray(webhookData)) {
      for (const event of webhookData) {
        await processEmailEvent(sendJob, event);
      }
    } else {
      await processEmailEvent(sendJob, webhookData);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Email Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function processEmailEvent(sendJob, event) {
  const { email, event: eventType, sg_message_id, reason } = event;
  
  if (!email || !sg_message_id) return;
  
  const recipientIndex = sendJob.recipients.findIndex(r => r.email === email);
  
  if (recipientIndex !== -1) {
    const recipient = sendJob.recipients[recipientIndex];
    
    switch (eventType) {
      case 'delivered':
        recipient.status = 'delivered';
        recipient.deliveredAt = new Date();
        break;
      case 'bounce':
      case 'blocked':
      case 'dropped':
        recipient.status = 'failed';
        recipient.errorMessage = reason || `Email ${eventType}`;
        break;
      case 'open':
        if (recipient.status === 'delivered' || recipient.status === 'sent') {
          recipient.openedAt = new Date();
        }
        break;
      case 'click':
        if (recipient.status === 'delivered' || recipient.status === 'sent') {
          recipient.clickedAt = new Date();
        }
        break;
    }

    if (!recipient.webhookData) {
      recipient.webhookData = [];
    }
    recipient.webhookData.push({
      timestamp: new Date(),
      event: eventType,
      data: event
    });

    await sendJob.save();
    await sendJob.updateStatistics();
  }
}

export default router;