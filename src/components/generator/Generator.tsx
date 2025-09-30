import React, { useState, useEffect } from 'react';
import { 
  Wand2, 
  Settings, 
  Copy, 
  Save, 
  Send, 
  RefreshCw,
  ChevronDown,
  MessageSquare,
  Mail,
  Phone,
  Check,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface GenerationSettings {
  channel: 'email' | 'sms' | 'whatsapp';
  tone: 'casual' | 'formal' | 'friendly' | 'professional' | 'urgent' | 'warm';
  language: string;
  length: 'short' | 'medium' | 'long';
  audience: 'customers' | 'staff' | 'partners' | 'general';

}

interface MessageCandidate {
  id: number;
  content: any;
  tokens: string[];
  metadata: {
    tone: string;
    length: string;
    wordCount: number;
    charCount: number;
  };
  selected: boolean;
}

interface GenerationResult {
  id: string;
  candidates: MessageCandidate[];
  prompt: string;
  settings: GenerationSettings;
  model_meta: {
    model: string;
    provider: string;
    usage: {
      totalTokens: number;
      cost: string;
    };
  };
}

export default function Generator() {
  const [prompt, setPrompt] = useState('');
  const [settings, setSettings] = useState<GenerationSettings>({
    channel: 'email',
    tone: 'friendly',
    language: 'en',
    length: 'medium',
    audience: 'customers',
  
  });
  
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [editingContent, setEditingContent] = useState<any>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState<number | null>(null);

  const channelIcons = {
    email: Mail,
    sms: MessageSquare,
    whatsapp: Phone
  };

  const generateMessages = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt for message generation');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/generate', {
        prompt: prompt.trim(),
        channel: settings.channel,
        tone: settings.tone,
        language: settings.language,
        length: settings.length,
        audience: settings.audience
      });

      setResult(response.data.data);
      setSelectedCandidate(0);
      setEditingContent(null);
      
      toast.success('Messages generated successfully!');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to generate messages';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const regenerateWithSettings = async (newSettings: Partial<GenerationSettings>) => {
    if (!result) return;

    setLoading(true);
    try {
      const response = await axios.post(`/generate/${result.id}/regenerate`, {
        ...settings,
        ...newSettings
      });

      setResult(response.data.data);
      setSelectedCandidate(0);
      setEditingContent(null);
      
      toast.success('Messages regenerated!');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to regenerate messages';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (content: any) => {
    const text = typeof content === 'object' 
      ? `${content.subject ? `Subject: ${content.subject}\n\n` : ''}${content.body || content}`
      : content;
    
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard!');
    });
  };

  const saveAsTemplate = async () => {
    if (!result || !result.candidates[selectedCandidate]) {
      toast.error('No message selected to save');
      return;
    }

    setSaveDialogOpen(true);
  };

  const handleSaveTemplate = async (templateData: any) => {
    if (!result) return;

    try {
      await axios.post(`/templates/from-generated/${result.id}`, templateData);
      toast.success('Template saved successfully!');
      setSaveDialogOpen(false);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save template';
      toast.error(message);
    }
  };

  const ChannelIcon = channelIcons[settings.channel];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Wand2 className="h-8 w-8 text-blue-600 mr-3" />
            AI Message Generator
          </h1>
          <p className="text-gray-600 mt-1">
            Create personalized messages with AI for any channel and audience
          </p>
        </div>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Channel
              </label>
              <select
                value={settings.channel}
                onChange={(e) => setSettings(prev => ({ ...prev, channel: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tone
              </label>
              <select
                value={settings.tone}
                onChange={(e) => setSettings(prev => ({ ...prev, tone: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="friendly">Friendly</option>
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
                <option value="warm">Warm</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Length
              </label>
              <select
                value={settings.length}
                onChange={(e) => setSettings(prev => ({ ...prev, length: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audience
              </label>
              <select
                value={settings.audience}
                onChange={(e) => setSettings(prev => ({ ...prev, audience: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="customers">Customers</option>
                <option value="staff">Staff</option>
                <option value="partners">Partners</option>
                <option value="general">General</option>
              </select>
            </div>



            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                value={settings.language}
                onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="hi">Hindi</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Input */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <ChannelIcon className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700 capitalize">
            {settings.channel} • {settings.tone} • {settings.length}
          </span>
        </div>
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the message you want to generate... 
          
Examples:
• Diwali wishes for customers, warm and festive
• Black Friday sale announcement, exciting and urgent  
• Order confirmation for recent purchase
• Welcome message for new subscribers"
          className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
        />
        
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-500">
            {prompt.length}/500 characters
          </div>
          
          <button
            onClick={generateMessages}
            disabled={loading || !prompt.trim()}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg hover:from-blue-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>{loading ? 'Generating...' : 'Generate Messages'}</span>
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Generated Messages */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Generated Messages ({result.candidates.length})
              </h2>
              <div className="text-sm text-gray-500">
                Model: {result.model_meta.model} • Tokens: {result.model_meta.usage.totalTokens}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.candidates.map((candidate, index) => (
                <CandidateCard
                  key={candidate.id || index}
                  candidate={candidate}
                  index={index}
                  isSelected={selectedCandidate === index}
                  onSelect={() => setSelectedCandidate(index)}
                  onCopy={() => copyToClipboard(candidate.content)}
                  onSaveAsTemplate={() => setSaveDialogOpen(index)}
                  channel={settings.channel}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-600 flex items-center">
                <Sparkles className="h-4 w-4 mr-2" />
                Select message variations above to save as templates
              </div>
              
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => copyToClipboard(result.candidates[selectedCandidate]?.content)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy Selected</span>
                </button>

                <button
                  onClick={() => regenerateWithSettings({ tone: settings.tone === 'friendly' ? 'professional' : 'friendly' })}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>
          </div>

          {/* Message Analysis */}
          {result.candidates[selectedCandidate] && (
            <MessageAnalysis 
              candidate={result.candidates[selectedCandidate]} 
              channel={settings.channel}
            />
          )}
        </div>
      )}

      {/* Save Template Dialog */}
      {saveDialogOpen !== null && result && (
        <SaveTemplateDialog
          candidate={result.candidates[saveDialogOpen]}
          candidateIndex={saveDialogOpen}
          onSave={handleSaveTemplate}
          onClose={() => setSaveDialogOpen(null)}
        />
      )}
    </div>
  );
}

// Candidate Card Component
function CandidateCard({ 
  candidate, 
  index, 
  isSelected, 
  onSelect, 
  onCopy, 
  onSaveAsTemplate,
  channel 
}: {
  candidate: MessageCandidate;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onCopy: () => void;
  onSaveAsTemplate: () => void;
  channel: string;
}) {
  return (
    <div 
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            Candidate {index + 1}
          </span>
          {isSelected && <Check className="h-4 w-4 text-blue-600" />}
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
            {candidate.metadata.tone}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopy();
            }}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {channel === 'email' && typeof candidate.content === 'object' ? (
          <>
            {candidate.content.subject && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Subject:</div>
                <div className="text-sm text-gray-900 font-medium">
                  {candidate.content.subject}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Body:</div>
              <div className="text-sm text-gray-900 whitespace-pre-wrap">
                {candidate.content.body}
              </div>
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-900 whitespace-pre-wrap">
            {typeof candidate.content === 'object' ? candidate.content.body : candidate.content}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          {candidate.metadata.charCount} chars • {candidate.metadata.wordCount} words
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-xs text-gray-500">
            {candidate.tokens.length > 0 ? `${candidate.tokens.length} tokens` : 'No tokens'}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSaveAsTemplate();
            }}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
          >
            <Save className="h-3 w-3" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Message Analysis Component
function MessageAnalysis({ candidate, channel }: { candidate: MessageCandidate; channel: string }) {
  const getChannelLimits = () => {
    switch (channel) {
      case 'sms': return { chars: 160, recommendation: 'Keep it concise for better deliverability' };
      case 'whatsapp': return { chars: 1000, recommendation: 'Use emojis and conversational tone' };
      case 'email': return { chars: 2000, recommendation: 'Include clear subject and call-to-action' };
      default: return { chars: 1000, recommendation: 'Optimize for your channel' };
    }
  };

  const limits = getChannelLimits();
  const isOverLimit = candidate.metadata.charCount > limits.chars;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Analysis</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {candidate.metadata.charCount}
          </div>
          <div className="text-sm text-gray-600">Characters</div>
          <div className={`text-xs mt-1 ${isOverLimit ? 'text-red-600' : 'text-emerald-600'}`}>
            {limits.chars} limit for {channel.toUpperCase()}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {candidate.metadata.wordCount}
          </div>
          <div className="text-sm text-gray-600">Words</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {candidate.tokens.length}
          </div>
          <div className="text-sm text-gray-600">Placeholders</div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <div className="font-medium text-gray-900 mb-1">Recommendations</div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• {limits.recommendation}</p>
              {candidate.tokens.length > 0 && (
                <p>• Placeholders found: {candidate.tokens.join(', ')}</p>
              )}
              {isOverLimit && (
                <p className="text-red-600">• Message exceeds {channel.toUpperCase()} character limit</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Save Template Dialog Component
function SaveTemplateDialog({ 
  candidate, 
  candidateIndex,
  onSave, 
  onClose 
}: {
  candidate: MessageCandidate;
  candidateIndex: number;
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    category: 'other',
    tags: '',
    folder: 'Generated'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    onSave({
      ...templateData,
      tags: templateData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Save Message Variation {candidateIndex + 1} as Template
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name *
              </label>
              <input
                type="text"
                value={templateData.name}
                onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter template name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={templateData.description}
                onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={templateData.category}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="marketing">Marketing</option>
                  <option value="transactional">Transactional</option>
                  <option value="notification">Notification</option>
                  <option value="seasonal">Seasonal</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Folder
                </label>
                <input
                  type="text"
                  value={templateData.folder}
                  onChange={(e) => setTemplateData(prev => ({ ...prev, folder: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Folder name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <input
                type="text"
                value={templateData.tags}
                onChange={(e) => setTemplateData(prev => ({ ...prev, tags: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter tags separated by commas"
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Save Template
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}