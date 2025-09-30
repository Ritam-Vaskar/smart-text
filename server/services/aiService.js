import axios from 'axios';

class AIService {
  constructor() {
    this.apiKey = process.env.AI_API_KEY;
    this.model = process.env.AI_MODEL || 'gemini-pro';
    this.baseURL = process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
  }

  generateSystemPrompt(settings) {
    const { channel, tone, language, audience, length } = settings;
    
        const jsonStructure = channel === 'email' ?
      '"subject": "The email subject line",\n"body": "The full message content",\n"preheader": "Preview text for email"' :
      '"body": "The full message content"';

    const basePrompt = [
      'You are an expert marketing message generator. Create high-quality ' + channel + ' messages that are ' + tone + ' in tone, written in ' + language + ', targeting ' + audience + ', with ' + length + ' length.',
      '',
      'CRITICAL REQUIREMENTS:',
      '1. Output valid JSON with this exact structure:',
      '{',
      '  "candidates": [',
      '    {',
      '      "content": {',
      '        ' + jsonStructure,
      '      },',
      '      "tokens": ["name", "company"],',
      '      "tone": "' + tone + '",',
      '      "length": "' + length + '"',
      '    }',
      '  ]',
      '}'    
    ];

    const channelRules = channel === 'email' ?
      '2. EMAIL FORMAT:\n- Subject line: Clear, engaging, under 100 characters\n- Body: Professional format with greeting, content, signature\n- Must include {unsubscribe_link} at the bottom\n- Max 2000 characters for body' :
      channel === 'sms' ?
      '2. SMS FORMAT:\n- Single text string, no HTML\n- Max 160 characters\n- Clear and concise message\n- Include opt-out instructions' :
      '2. WHATSAPP FORMAT:\n- Conversational and personal tone\n- Can include emojis when appropriate\n- Clear call to action\n- Max 1000 characters';

    basePrompt.push(channelRules);
    return basePrompt.join('\n');
  }


  getFewShotExamples() {
    return [
      {
        role: 'user',
        content: 'Generate 3 short Diwali wishes for customers, friendly, English, SMS'
      },
      {
        role: 'assistant',
        content: JSON.stringify({
          candidates: [
            {
              content: "Hello {name}, Wishing you a bright and joyous Diwali! Enjoy the festivities from all of us at {company}.",
              tokens: ["name", "company"],
              tone: "friendly",
              length: "short"
            },
            {
              content: "Hi {name}, Happy Diwali! May your home be filled with light and smiles — {company}",
              tokens: ["name", "company"],
              tone: "warm",
              length: "short"
            },
            {
              content: "Dear {name}, Warm Diwali wishes from {company}! Celebrate safely and happily.",
              tokens: ["name", "company"],
              tone: "formal",
              length: "short"
            }
          ]
        })
      },
      {
        role: 'user',
        content: 'Generate an email for Black Friday sale, professional, medium length'
      },
      {
        role: 'assistant',
        content: JSON.stringify({
          candidates: [
            {
              content: {
                subject: "Black Friday Exclusive: {discount}% Off Everything at {company}",
                body: "Dear {name},\n\nOur biggest sale of the year is here! Enjoy {discount}% off your entire purchase this Black Friday.\n\nUse code: BLACKFRIDAY{year} at checkout\nOffer valid until {expiry_date}\n\nShop now: {link}\n\nBest regards,\nThe {company} Team\n\nUnsubscribe: {unsubscribe_link}"
              },
              tokens: ["name", "company", "discount", "year", "expiry_date", "link", "unsubscribe_link"],
              tone: "professional",
              length: "medium"
            }
          ]
        })
      }
    ];
  }

  async generateMessages(prompt, settings) {
    const startTime = Date.now();
    
    try {
      const systemPrompt = this.generateSystemPrompt(settings);
      const examples = this.getFewShotExamples();
      
      // Build prompt parts for Gemini
      const fullPrompt = [
        systemPrompt,
        ...examples.map(ex => ex.role + ': ' + ex.content),
        this.buildUserPrompt(prompt, settings)
      ].join('\n\n');

      const requestConfig = {
        url: this.baseURL + '/models/' + this.model + ':generateContent?key=' + this.apiKey,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }],
          generationConfig: {
            temperature: this.getTemperature(settings),
            maxOutputTokens: this.getMaxTokens(settings.channel, settings.length),
            topP: 0.9
          }
        }
      };

      const response = await axios(requestConfig);
      const responseTime = Date.now() - startTime;
      
      const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        throw new Error('No content generated');
      }

      let candidates;
      try {
        const parsed = JSON.parse(content);
        candidates = parsed.candidates || [parsed];
      } catch (parseError) {
        // Fallback: treat as single message
        candidates = [{
          content: content,
          tokens: this.extractTokens(content),
          tone: settings.tone,
          length: settings.length
        }];
      }

      // Validate and enhance candidates
      candidates = candidates
        .filter(candidate => candidate.content)
        .map(candidate => {
          // Prepare the content structure
          let messageContent;

          // Handle different input formats
          if (typeof candidate.content === 'string') {
            // If content is a direct string
            messageContent = {
              body: candidate.content
            };
            if (settings.channel === 'email') {
              messageContent.subject = 'Message from {company}';
              messageContent.preheader = candidate.content.split('\n')[0];
            }
          } else if (typeof candidate.content === 'object') {
            // If content is an object
            messageContent = {
              body: candidate.content.body || candidate.content.text || 'No content provided'
            };
            if (settings.channel === 'email') {
              messageContent.subject = candidate.content.subject || 'Message from {company}';
              messageContent.preheader = candidate.content.preheader || messageContent.body.split('\n')[0];
            }
          } else {
            // Fallback for unexpected content type
            messageContent = {
              body: 'No content provided'
            };
            if (settings.channel === 'email') {
              messageContent.subject = 'Message from {company}';
              messageContent.preheader = 'No content provided';
            }
          }

          // Add channel-specific enhancements
          if (settings.channel === 'email' && !messageContent.body.includes('{unsubscribe_link}')) {
            messageContent.body += '\n\n{unsubscribe_link}';
          }

          return {
            ...candidate,
            content: messageContent
          };
        })
        .map(candidate => this.enhanceCandidate(candidate, settings))
        .slice(0, settings.nCandidates || 3);

      // Estimate token usage based on character count since Gemini doesn't provide token counts
      const promptChars = fullPrompt.length;
      const completionChars = content.length;
      const estimatedPromptTokens = Math.ceil(promptChars / 4);
      const estimatedCompletionTokens = Math.ceil(completionChars / 4);
      
      return {
        candidates,
        model_meta: {
          model: this.model,
          provider: 'google',
          usage: {
            promptTokens: estimatedPromptTokens,
            completionTokens: estimatedCompletionTokens,
            totalTokens: estimatedPromptTokens + estimatedCompletionTokens,
            cost: this.calculateCost(estimatedPromptTokens + estimatedCompletionTokens)
          },
          responseTime,
          requestId: response.data.candidates?.[0]?.safetyRatings?.[0]?.requestId || Date.now().toString()
        }
      };

    } catch (error) {
      console.error('AI Service Error:', error.response?.data || error.message);
      
      // Fallback to template-based generation
      return this.generateFallbackMessages(prompt, settings);
    }
  }

  buildUserPrompt(prompt, settings) {
    const { channel, tone, language, length, nCandidates } = settings;
    
    const constraints = this.getChannelConstraints(channel);
    return ['Generate ' + nCandidates + ' ' + length + ' ' + channel + ' messages for: "' + prompt + '"',
            '- Tone: ' + tone,
            '- Language: ' + language,
            '- Channel constraints: ' + constraints,
            '- Include appropriate tokens for personalization',
            '- Ensure messages are ready to use with proper formatting'
           ].join('\n');
  }

  getChannelConstraints(channel) {
    switch (channel) {
      case 'sms':
        return 'Max 160 characters, plain text only, no HTML';
      case 'whatsapp':
        return 'Max 1000 characters, emojis allowed, conversational tone';
      case 'email':
        return 'Include subject and body, HTML formatting allowed, professional structure';
      default:
        return 'Standard formatting';
    }
  }

  getTemperature(settings) {
    const baseTemp = 0.7;
    
    // Adjust based on tone
    switch (settings.tone) {
      case 'professional':
      case 'formal':
        return baseTemp - 0.1;
      case 'casual':
      case 'friendly':
        return baseTemp + 0.1;
      default:
        return baseTemp;
    }
  }

  getMaxTokens(channel, length) {
    const baseTokens = {
      short: 150,
      medium: 300,
      long: 600
    };

    const channelMultiplier = {
      sms: 0.5,
      whatsapp: 0.8,
      email: 1.5
    };

    return Math.round(baseTokens[length] * (channelMultiplier[channel] || 1));
  }

  enhanceCandidate(candidate, settings) {
    const enhanced = {
      ...candidate,
      tokens: candidate.tokens || this.extractTokens(candidate.content),
      metadata: {
        tone: candidate.tone || settings.tone,
        length: candidate.length || settings.length,
        wordCount: this.countWords(candidate.content),
        charCount: this.countChars(candidate.content),
        estimatedReadTime: this.estimateReadTime(candidate.content)
      }
    };

    // Validate channel constraints
    if (!this.validateChannelConstraints(enhanced, settings.channel)) {
      enhanced.warnings = enhanced.warnings || [];
      enhanced.warnings.push(`Content may exceed ${settings.channel} limits`);
    }

    return enhanced;
  }

  extractTokens(content) {
    const tokenRegex = /\{([^}]+)\}/g;
    const tokens = [];
    let match;
    
    const contentStr = typeof content === 'object' 
      ? JSON.stringify(content) 
      : String(content);
    
    while ((match = tokenRegex.exec(contentStr)) !== null) {
      if (!tokens.includes(match[1])) {
        tokens.push(match[1]);
      }
    }
    
    return tokens;
  }

  countWords(content) {
    const text = typeof content === 'object' 
      ? Object.values(content).join(' ') 
      : String(content);
    return text.trim().split(/\s+/).length;
  }

  countChars(content) {
    const text = typeof content === 'object' 
      ? Object.values(content).join(' ') 
      : String(content);
    return text.length;
  }

  estimateReadTime(content) {
    const wordsPerMinute = 200;
    const words = this.countWords(content);
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  }

  validateChannelConstraints(candidate, channel) {
    const charCount = this.countChars(candidate.content);
    
    switch (channel) {
      case 'sms':
        return charCount <= 160;
      case 'whatsapp':
        return charCount <= 1000;
      case 'email':
        return charCount <= 10000;
      default:
        return true;
    }
  }

  calculateCost(totalTokens) {
    // Gemini Pro has a free tier, so cost is 0
    return 0;
  }

  generateFallbackMessages(prompt, settings) {
    const templates = {
      marketing: {
        sms: "Hi {name}! Special offer from {company}: {discount}% off. Use code: {code}. Reply STOP to opt out.",
        email: {
          subject: "Special Offer Just for You, {name}!",
          body: "Dear {name},\n\nWe have an exclusive offer for you: {discount}% off your next purchase.\n\nUse code: {code}\nValid until: {expiry_date}\n\nShop now: {link}\n\nBest regards,\n{company}\n\nUnsubscribe: {unsubscribe_link}"
        },
        whatsapp: "Hello {name}! 🎉 Special offer from {company}: {discount}% off your next order. Use code: {code}. Valid until {expiry_date}. Shop now: {link}"
      },
      notification: {
        sms: "Hi {name}, your order #{order_id} has been {status}. Track: {link}",
        email: {
          subject: "Order Update: #{order_id}",
          body: "Dear {name},\n\nYour order #{order_id} has been {status}.\n\nTrack your order: {link}\n\nQuestions? Contact us at {support_email}\n\nBest regards,\n{company}"
        },
        whatsapp: "Hi {name}! Your order #{order_id} has been {status} ✅ Track it here: {link}"
      }
    };

    const category = prompt.toLowerCase().includes('offer') || prompt.toLowerCase().includes('sale') ? 'marketing' : 'notification';
    const template = templates[category][settings.channel];

    const candidates = [{
      content: template,
      tokens: this.extractTokens(template),
      metadata: {
        tone: settings.tone,
        length: settings.length,
        wordCount: this.countWords(template),
        charCount: this.countChars(template),
        estimatedReadTime: this.estimateReadTime(template)
      },
      fallback: true
    }];

    return {
      candidates,
      model_meta: {
        model: 'fallback',
        provider: 'internal',
        usage: { totalTokens: 0, cost: 0 },
        responseTime: 0,
        fallback: true
      }
    };
  }
}

export default new AIService();