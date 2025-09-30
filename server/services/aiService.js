import axios from 'axios';

class AIService {
  constructor() {
    this.apiKey = process.env.AI_API_KEY;
    this.model = process.env.AI_MODEL || 'gemini-pro';
    this.baseURL = process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
    
    // Warn if API key is not configured
    if (!this.apiKey) {
      console.warn('⚠️  AI_API_KEY not configured. Falling back to template-based generation.');
    } else {
      console.log('✅ AI Service initialized with model:', this.model);
    }
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
    
    console.log('🚀 Generating messages for prompt:', prompt.substring(0, 100) + '...');
    console.log('📝 Settings:', settings);
    
    // If no API key, immediately use fallback
    if (!this.apiKey) {
      console.log('⚡ Using fallback generation (no API key)');
      return this.generateSmartFallbackMessages(prompt, settings);
    }
    
    try {
      const systemPrompt = this.generateSystemPrompt(settings);
      const examples = this.getFewShotExamples();
      
      // Build prompt parts for Gemini
      const fullPrompt = [
        systemPrompt,
        ...examples.map(ex => ex.role + ': ' + ex.content),
        this.buildUserPrompt(prompt, settings)
      ].join('\n\n');
      
      console.log('📤 Sending request to AI service...');

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
      
      console.log('📨 AI API Response status:', response.status);
      console.log('📝 Response structure:', JSON.stringify(response.data, null, 2));
      
      const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        console.error('❌ No content in AI response:', response.data);
        throw new Error('No content generated');
      }
      
      console.log('✨ Generated content length:', content.length);

      let candidates;
      try {
        const parsed = JSON.parse(content);
        candidates = parsed.candidates || [parsed];
        console.log('✅ Successfully parsed', candidates.length, 'candidates from AI response');
      } catch (parseError) {
        console.log('⚠️ Failed to parse JSON, treating as raw content');
        // Generate multiple variations from the single AI response
        candidates = this.createVariationsFromContent(content, settings);
      }
      
      // Ensure we always have multiple options (3-4 candidates)
      if (candidates.length < 3) {
        console.log('📝 Generating additional variations to reach minimum of 3 options');
        const additionalVariations = this.generateAdditionalVariations(candidates[0], settings, 4 - candidates.length);
        candidates = candidates.concat(additionalVariations);
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
      console.error('❌ AI Service Error:', error.response?.data || error.message);
      console.log('⚡ Falling back to smart template generation');
      
      // Fallback to smart template-based generation
      return this.generateSmartFallbackMessages(prompt, settings);
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

  generateSmartFallbackMessages(prompt, settings) {
    console.log('🧠 Generating smart fallback messages based on prompt...');
    
    // Always generate 4 message variations for user choice
    const candidates = [];
    const numVariations = 4;
    
    for (let i = 0; i < numVariations; i++) {
      let content = this.generateContentBasedOnPrompt(prompt, settings, i);
      
      candidates.push({
        content,
        tokens: this.extractTokens(content),
        metadata: {
          tone: settings.tone,
          length: settings.length,
          wordCount: this.countWords(content),
          charCount: this.countChars(content),
          estimatedReadTime: this.estimateReadTime(content)
        },
        fallback: true,
        promptBased: true,
        variation: i + 1
      });
    }

    return {
      candidates,
      model_meta: {
        model: 'smart-fallback',
        provider: 'internal',
        usage: { totalTokens: 0, cost: 0 },
        responseTime: 0,
        fallback: true,
        promptBased: true
      }
    };
  }

  generateContentBasedOnPrompt(prompt, settings, variation = 0) {
    const { channel, tone, length, audience } = settings;
    const promptLower = prompt.toLowerCase();
    
    // Analyze prompt for keywords and intent
    const isMarketing = promptLower.includes('sale') || promptLower.includes('offer') || 
                       promptLower.includes('discount') || promptLower.includes('promo');
    const isWelcome = promptLower.includes('welcome') || promptLower.includes('onboard');
    const isReminder = promptLower.includes('remind') || promptLower.includes('follow');
    const isThankYou = promptLower.includes('thank') || promptLower.includes('appreciate');
    const isEvent = promptLower.includes('event') || promptLower.includes('webinar') || 
                   promptLower.includes('meeting') || promptLower.includes('conference');
    
    // Generate greeting based on tone
    const greetings = {
      casual: ['Hey {name}!', 'Hi {name}!', 'Hello {name}!'],
      formal: ['Dear {name},', 'Good day {name},', 'Greetings {name},'],
      friendly: ['Hi {name}!', 'Hello {name}!', 'Hey there {name}!'],
      professional: ['Dear {name},', 'Hello {name},', 'Good day {name},'],
      urgent: ['Urgent: {name}', 'Important for {name}:', 'Action Required {name}:'],
      warm: ['Dear {name},', 'Hello {name}!', 'Hi lovely {name}!']
    };
    
    const greeting = greetings[tone][variation % greetings[tone].length];
    
    // Generate main content based on prompt and context
    let mainContent = '';
    
    if (isMarketing) {
      const marketingMessages = [
        `We have an exciting ${prompt.includes('sale') ? 'sale' : 'offer'} just for you! ${prompt}`,
        `Don't miss out on this special opportunity: ${prompt}`,
        `Exclusive for you: ${prompt}. Limited time only!`
      ];
      mainContent = marketingMessages[variation % marketingMessages.length];
    } else if (isWelcome) {
      const welcomeMessages = [
        `Welcome to {company}! ${prompt}`,
        `We're thrilled to have you with us. ${prompt}`,
        `Thank you for joining us! ${prompt}`
      ];
      mainContent = welcomeMessages[variation % welcomeMessages.length];
    } else if (isThankYou) {
      const thankYouMessages = [
        `Thank you so much! ${prompt}`,
        `We appreciate you. ${prompt}`,
        `Your support means everything to us. ${prompt}`
      ];
      mainContent = thankYouMessages[variation % thankYouMessages.length];
    } else if (isEvent) {
      const eventMessages = [
        `Join us for an amazing event: ${prompt}`,
        `You're invited! ${prompt}`,
        `Don't miss this opportunity: ${prompt}`
      ];
      mainContent = eventMessages[variation % eventMessages.length];
    } else {
      // Generic message based on prompt
      const genericMessages = [
        `Here's what we wanted to share: ${prompt}`,
        `Important update: ${prompt}`,
        `We thought you'd like to know: ${prompt}`
      ];
      mainContent = genericMessages[variation % genericMessages.length];
    }
    
    // Generate closing based on tone and channel
    const closings = {
      casual: ['Cheers!', 'Talk soon!', 'Best!'],
      formal: ['Best regards,\\n{company}', 'Sincerely,\\n{company}', 'Kind regards,\\n{company}'],
      friendly: ['Best wishes!', 'Have a great day!', 'Cheers!'],
      professional: ['Best regards,\\n{company}', 'Thank you,\\n{company}', 'Sincerely,\\n{company}'],
      urgent: ['Act now!', 'Time sensitive!', 'Don\'t wait!'],
      warm: ['With love,\n{company}', 'Warmly,\n{company}', 'With best wishes,\n{company}']
    };
    
    const closing = closings[tone][variation % closings[tone].length];
    
    // Adjust length
    if (length === 'short') {
      mainContent = mainContent.split('.')[0] + '.';
    } else if (length === 'long') {
      mainContent += ' We\'d love to hear from you and answer any questions you might have.';
    }
    
    // Format based on channel
    if (channel === 'email') {
      const subjects = [
        prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''),
        `Important: ${prompt.substring(0, 40)}`,
        `From {company}: ${prompt.substring(0, 35)}`
      ];
      
      return {
        subject: subjects[variation % subjects.length],
        body: greeting + '\n\n' + mainContent + '\n\n' + closing + (isMarketing ? '\n\n{unsubscribe_link}' : ''),
        preheader: mainContent.substring(0, 100)
      };
    } else if (channel === 'sms') {
      // SMS needs to be concise
      let smsContent = `${greeting} ${mainContent}`;
      if (smsContent.length > 140) {
        smsContent = smsContent.substring(0, 137) + '...';
      }
      return {
        body: smsContent + ' Reply STOP to opt out.'
      };
    } else { // WhatsApp
      const emoji = isMarketing ? '🎉' : isWelcome ? '👋' : isThankYou ? '🙏' : isEvent ? '📅' : '💌';
      return {
        body: emoji + ' ' + greeting + '\n\n' + mainContent + '\n\n' + closing
      };
    }
  }

  createVariationsFromContent(content, settings) {
    // Create 3-4 variations from a single AI response
    const baseContent = content.trim();
    const variations = [];
    
    // Original content as first variation
    variations.push({
      content: this.formatContentForChannel(baseContent, settings),
      tokens: this.extractTokens(baseContent),
      metadata: {
        tone: settings.tone,
        length: settings.length,
        wordCount: this.countWords(baseContent),
        charCount: this.countChars(baseContent),
        estimatedReadTime: this.estimateReadTime(baseContent)
      },
      variation: 1
    });
    
    // Generate additional variations by modifying the base content
    for (let i = 1; i < 4; i++) {
      const modifiedContent = this.createContentVariation(baseContent, settings, i);
      variations.push({
        content: this.formatContentForChannel(modifiedContent, settings),
        tokens: this.extractTokens(modifiedContent),
        metadata: {
          tone: settings.tone,
          length: settings.length,
          wordCount: this.countWords(modifiedContent),
          charCount: this.countChars(modifiedContent),
          estimatedReadTime: this.estimateReadTime(modifiedContent)
        },
        variation: i + 1
      });
    }
    
    return variations;
  }

  generateAdditionalVariations(baseCandidate, settings, count) {
    const variations = [];
    const baseContent = typeof baseCandidate.content === 'string' ? 
      baseCandidate.content : 
      baseCandidate.content.body || JSON.stringify(baseCandidate.content);
    
    for (let i = 0; i < count; i++) {
      const modifiedContent = this.createContentVariation(baseContent, settings, i + 2);
      variations.push({
        content: this.formatContentForChannel(modifiedContent, settings),
        tokens: this.extractTokens(modifiedContent),
        metadata: {
          tone: settings.tone,
          length: settings.length,
          wordCount: this.countWords(modifiedContent),
          charCount: this.countChars(modifiedContent),
          estimatedReadTime: this.estimateReadTime(modifiedContent)
        },
        variation: i + 2
      });
    }
    
    return variations;
  }

  createContentVariation(baseContent, settings, variationIndex) {
    const { tone, channel } = settings;
    
    // Different approaches for creating variations
    const variations = [
      // Variation 1: Add enthusiasm
      (content) => {
        const exclamations = tone === 'formal' ? '.' : '!';
        return content.replace(/\./g, exclamations);
      },
      // Variation 2: Change opening
      (content) => {
        const openings = {
          casual: ['Hey there!', 'Hi!', 'Hello!'],
          formal: ['Dear valued customer,', 'Good day,', 'Greetings,'],
          friendly: ['Hi friend!', 'Hello!', 'Hey there!'],
          professional: ['Dear sir/madam,', 'Good day,', 'Hello,'],
          urgent: ['Important:', 'Urgent notice:', 'Time-sensitive:'],
          warm: ['Dear friend,', 'Hello there,', 'Warm greetings,']
        };
        
        const opening = openings[tone][variationIndex % openings[tone].length];
        
        // Replace first sentence with new opening
        const sentences = content.split(/[.!?]+/);
        if (sentences.length > 1) {
          sentences[0] = opening;
          return sentences.join('. ').replace(/\. \./g, '.');
        }
        return opening + ' ' + content;
      },
      // Variation 3: Adjust length and add call-to-action
      (content) => {
        const ctas = {
          email: ['Learn more →', 'Get started today', 'Contact us for details'],
          sms: ['Reply for more info', 'Call us now', 'Visit our store'],
          whatsapp: ['Let us know if you need help!', 'Feel free to ask questions', 'We are here to help!']
        };
        
        const cta = ctas[channel][variationIndex % ctas[channel].length];
        return content + '\\n\\n' + cta;
      }
    ];
    
    // Apply the variation function
    const variationFn = variations[variationIndex % variations.length];
    return variationFn(baseContent);
  }

  formatContentForChannel(content, settings) {
    const { channel } = settings;
    
    if (channel === 'email') {
      // Generate subject if not present
      const firstSentence = content.split(/[.!?]/)[0];
      const subject = firstSentence.length > 50 ? 
        firstSentence.substring(0, 47) + '...' : 
        firstSentence;
      
      return {
        subject: subject || 'Message from {company}',
        body: content + (content.includes('{unsubscribe_link}') ? '' : '\\n\\n{unsubscribe_link}'),
        preheader: firstSentence
      };
    } else if (channel === 'sms') {
      // Truncate for SMS if needed
      let smsContent = content.length > 140 ? content.substring(0, 137) + '...' : content;
      return {
        body: smsContent + (smsContent.includes('STOP') ? '' : ' Reply STOP to opt out.')
      };
    } else { // WhatsApp
      return {
        body: content
      };
    }
  }

  // Legacy fallback for backward compatibility
  generateFallbackMessages(prompt, settings) {
    return this.generateSmartFallbackMessages(prompt, settings);
  }
}

export default new AIService();