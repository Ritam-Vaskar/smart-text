import nodemailer from 'nodemailer';
import twilio from 'twilio';

class MessagingService {
  constructor() {
    this.initializeProviders();
  }

  initializeProviders() {
    // Email provider (SendGrid/Nodemailer)
    this.emailTransporter = nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });

    // SMS/WhatsApp provider (Twilio)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  async sendMessage(sendJob, recipient, content) {
    try {
      switch (sendJob.channel) {
        case 'email':
          return await this.sendEmail(sendJob, recipient, content);
        case 'sms':
          return await this.sendSMS(sendJob, recipient, content);
        case 'whatsapp':
          return await this.sendWhatsApp(sendJob, recipient, content);
        default:
          throw new Error(`Unsupported channel: ${sendJob.channel}`);
      }
    } catch (error) {
      console.error(`Message send error for ${sendJob.channel}:`, error);
      throw error;
    }
  }

  async sendEmail(sendJob, recipient, content) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured');
    }

    const personalizedContent = this.personalizeContent(content, recipient);
    
    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: recipient.email,
      subject: personalizedContent.subject || 'Message from ' + process.env.FROM_NAME,
      html: this.formatEmailHTML(personalizedContent.body),
      text: this.stripHTML(personalizedContent.body),
      replyTo: sendJob.settings.replyTo || process.env.FROM_EMAIL,
      headers: {
        'List-Unsubscribe': `<${this.generateUnsubscribeLink(recipient, sendJob)}>`,
        'X-Campaign-ID': sendJob._id.toString(),
        'X-Recipient-ID': recipient._id?.toString() || recipient.email
      }
    };

    // Add tracking pixels if enabled
    if (sendJob.settings.trackOpens) {
      mailOptions.html += this.generateTrackingPixel(sendJob._id, recipient.email);
    }

    const result = await this.emailTransporter.sendMail(mailOptions);
    
    return {
      messageId: result.messageId,
      provider: 'sendgrid',
      status: 'sent',
      timestamp: new Date()
    };
  }

  async sendSMS(sendJob, recipient, content) {
    if (!this.twilioClient) {
      throw new Error('SMS service not configured - Twilio client not initialized');
    }

    if (!recipient.phone) {
      throw new Error('Recipient phone number is required');
    }

    // Validate Twilio configuration
    if (!process.env.TWILIO_PHONE_NUMBER) {
      throw new Error('TWILIO_PHONE_NUMBER not configured');
    }

    let personalizedContent = this.personalizeContent(content, recipient);
    
    // Ensure SMS content is a string and within limits
    const smsBody = typeof personalizedContent === 'object' 
      ? personalizedContent.body 
      : personalizedContent;
    
    if (!smsBody || smsBody.trim().length === 0) {
      throw new Error('SMS message body is empty');
    }
    
    // Truncate if too long
    const truncatedBody = smsBody.substring(0, 160);
    
    // Add opt-out instructions if it's a marketing message
    const finalBody = sendJob.campaign?.type === 'marketing' 
      ? `${truncatedBody} Reply STOP to opt out.`
      : truncatedBody;

    // Format phone number - ensure it has country code
    let formattedPhone = recipient.phone.trim();
    if (!formattedPhone.startsWith('+')) {
      // Assume US number if no country code
      formattedPhone = formattedPhone.startsWith('1') ? `+${formattedPhone}` : `+1${formattedPhone}`;
    }

    console.log(`Sending SMS to ${formattedPhone}:`, {
      body: finalBody,
      from: process.env.TWILIO_PHONE_NUMBER,
      originalPhone: recipient.phone
    });

    try {
      const message = await this.twilioClient.messages.create({
        body: finalBody,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone,
        statusCallback: `http://localhost:5000/api/webhooks/sms/${sendJob._id}`
      });

      console.log(`SMS sent successfully to ${formattedPhone}, SID: ${message.sid}, Status: ${message.status}`);

      return {
        messageId: message.sid,
        provider: 'twilio',
        status: 'sent',
        timestamp: new Date(),
        twilioStatus: message.status
      };
    } catch (error) {
      console.error(`SMS send error to ${formattedPhone}:`, {
        error: error.message,
        code: error.code,
        moreInfo: error.moreInfo,
        details: error.details
      });
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.code === 21211) {
        errorMessage = 'Invalid phone number format';
      } else if (error.code === 21608) {
        errorMessage = 'Phone number is not a mobile number';
      } else if (error.code === 21614) {
        errorMessage = 'Phone number is invalid or not reachable';
      }
      
      throw new Error(`Twilio SMS Error: ${errorMessage}`);
    }
  }

  async sendWhatsApp(sendJob, recipient, content) {
    if (!this.twilioClient) {
      throw new Error('WhatsApp service not configured');
    }

    const personalizedContent = this.personalizeContent(content, recipient);
    
    const whatsappBody = typeof personalizedContent === 'object' 
      ? personalizedContent.body 
      : personalizedContent;

    console.log(`Sending WhatsApp to ${recipient.phone}:`, {
      body: whatsappBody,
      from: process.env.TWILIO_WHATSAPP_NUMBER
    });

    try {
      const message = await this.twilioClient.messages.create({
        body: whatsappBody,
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${recipient.phone}`,
        statusCallback: `http://localhost:5000/api/webhooks/whatsapp/${sendJob._id}`
      });

      console.log(`WhatsApp sent successfully to ${recipient.phone}, SID: ${message.sid}`);

      return {
        messageId: message.sid,
        provider: 'twilio',
        status: 'sent',
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`WhatsApp send error to ${recipient.phone}:`, error);
      throw error;
    }
  }

  personalizeContent(content, recipient) {
    if (!content) return content;

    let personalizedContent;
    
    if (typeof content === 'object') {
      personalizedContent = JSON.parse(JSON.stringify(content)); // Deep clone
    } else {
      personalizedContent = content;
    }

    // Combine recipient data with custom fields
    const data = {
      name: recipient.name || 'Valued Customer',
      first_name: recipient.name?.split(' ')[0] || 'Valued Customer',
      email: recipient.email || '',
      phone: recipient.phone || '',
      ...recipient.customFields,
      // Add system tokens
      company: process.env.FROM_NAME || 'Our Company',
      unsubscribe_link: this.generateUnsubscribeLink(recipient),
      current_year: new Date().getFullYear(),
      current_date: new Date().toLocaleDateString()
    };

    // Replace tokens
    const replaceTokens = (text) => {
      if (!text || typeof text !== 'string') return text;
      
      return text.replace(/\{([^}]+)\}/g, (match, token) => {
        return data[token] || match; // Keep original if no replacement found
      });
    };

    if (typeof personalizedContent === 'object') {
      // Handle email object with subject/body
      Object.keys(personalizedContent).forEach(key => {
        personalizedContent[key] = replaceTokens(personalizedContent[key]);
      });
    } else {
      personalizedContent = replaceTokens(personalizedContent);
    }

    return personalizedContent;
  }

  formatEmailHTML(body) {
    if (!body) return '';
    
    // Convert line breaks to HTML breaks
    return body
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  stripHTML(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
  }

  generateTrackingPixel(sendJobId, recipientEmail) {
    const trackingUrl = `${process.env.FRONTEND_URL}/api/tracking/open/${sendJobId}?email=${encodeURIComponent(recipientEmail)}`;
    return `<img src="${trackingUrl}" width="1" height="1" style="display:none;" />`;
  }

  generateUnsubscribeLink(recipient, sendJob) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/unsubscribe?email=${encodeURIComponent(recipient.email)}&job=${sendJob?._id || ''}`;
  }

  async validateRecipients(recipients, channel) {
    const validRecipients = [];
    const errors = [];

    for (const recipient of recipients) {
      const validation = this.validateRecipient(recipient, channel);
      
      if (validation.valid) {
        validRecipients.push(recipient);
      } else {
        errors.push({
          recipient: recipient.email || recipient.phone,
          errors: validation.errors
        });
      }
    }

    return { validRecipients, errors };
  }

  validateRecipient(recipient, channel) {
    const errors = [];

    switch (channel) {
      case 'email':
        if (!recipient.email) {
          errors.push('Email address is required');
        } else if (!this.isValidEmail(recipient.email)) {
          errors.push('Invalid email format');
        }
        break;
        
      case 'sms':
      case 'whatsapp':
        if (!recipient.phone) {
          errors.push('Phone number is required');
        } else if (!this.isValidPhone(recipient.phone)) {
          errors.push('Invalid phone number format');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone) {
    const phoneRegex = /^\+?[1-9]\d{10,14}$/;
    return phoneRegex.test(phone.replace(/\s|-|\(|\)/g, ''));
  }

  // Webhook handlers for delivery status updates
  async handleEmailWebhook(data, sendJob) {
    // Handle SendGrid webhook events
    const events = Array.isArray(data) ? data : [data];
    
    for (const event of events) {
      await sendJob.updateRecipientStatus(event.email, this.mapEmailEventToStatus(event.event), {
        messageId: event.sg_message_id,
        timestamp: new Date(event.timestamp * 1000)
      });
    }
  }

  async handleSMSWebhook(data, sendJob) {
    // Handle Twilio SMS webhook events
    const status = this.mapSMSStatusToStatus(data.MessageStatus);
    const recipient = sendJob.recipients.find(r => r.messageId === data.MessageSid);
    
    if (recipient) {
      await sendJob.updateRecipientStatus(recipient.phone, status, {
        timestamp: new Date(),
        errorMessage: data.ErrorCode ? `Error ${data.ErrorCode}: ${data.ErrorMessage}` : null
      });
    }
  }

  mapEmailEventToStatus(event) {
    const statusMap = {
      'delivered': 'delivered',
      'open': 'opened',
      'click': 'clicked',
      'bounce': 'bounced',
      'dropped': 'failed',
      'deferred': 'pending',
      'unsubscribe': 'unsubscribed'
    };
    
    return statusMap[event] || 'pending';
  }

  mapSMSStatusToStatus(status) {
    const statusMap = {
      'queued': 'pending',
      'sent': 'sent',
      'delivered': 'delivered',
      'undelivered': 'failed',
      'failed': 'failed'
    };
    
    return statusMap[status] || 'pending';
  }
}

export default new MessagingService();