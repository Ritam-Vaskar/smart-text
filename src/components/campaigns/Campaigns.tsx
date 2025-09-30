import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { 
  Send, 
  Plus, 
  Search, 
  Filter,
  Play,
  Pause,
  Square,
  Eye,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Mail,
  MessageSquare,
  Phone
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Campaign {
  _id: string;
  name: string;
  channel: 'email' | 'sms' | 'whatsapp';
  status: 'draft' | 'queued' | 'sending' | 'sent' | 'paused' | 'cancelled' | 'failed' | 'completed';
  progress: {
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
  };
  analytics: {
    openRate: number;
    clickRate: number;
    bounceRate: number;
  };
  scheduling: {
    type: 'immediate' | 'scheduled';
    scheduledAt?: string;
  };
  templateId?: {
    name: string;
  };
  sender: {
    name: string;
    email: string;
  };
  createdAt: string;
  completedAt?: string;
}

export default function Campaigns() {
  return (
    <Routes>
      <Route path="/" element={<CampaignsList />} />
      <Route path="/:id" element={<CampaignDetail />} />
      <Route path="/new" element={<CampaignCreator />} />
    </Routes>
  );
}

function CampaignsList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    channel: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchCampaigns();
  }, [filters]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.set(key, value);
      });

      const response = await axios.get(`/send?${queryParams.toString()}`);
      setCampaigns(response.data.data.sendJobs);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignAction = async (campaignId: string, action: 'start' | 'pause' | 'cancel') => {
    try {
      await axios.post(`/send/${campaignId}/${action}`);
      toast.success(`Campaign ${action}ed successfully!`);
      fetchCampaigns();
    } catch (error: any) {
      const message = error.response?.data?.message || `Failed to ${action} campaign`;
      toast.error(message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'sending': return 'bg-blue-100 text-blue-700';
      case 'queued': return 'bg-amber-100 text-amber-700';
      case 'paused': return 'bg-gray-100 text-gray-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'sending': return Play;
      case 'queued': return Clock;
      case 'paused': return Pause;
      case 'cancelled': return XCircle;
      case 'failed': return AlertCircle;
      default: return Clock;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return Mail;
      case 'sms': return MessageSquare;
      case 'whatsapp': return Phone;
      default: return Mail;
    }
  };

  if (loading) {
    return <CampaignsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Send className="h-8 w-8 text-blue-600 mr-3" />
            Campaigns
          </h1>
          <p className="text-gray-600 mt-1">
            Manage and monitor your message campaigns
          </p>
        </div>
        
        <button
          onClick={() => navigate('/campaigns/new')}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search campaigns..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="queued">Queued</option>
            <option value="sending">Sending</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
            <option value="failed">Failed</option>
          </select>

          {/* Channel Filter */}
          <select
            value={filters.channel}
            onChange={(e) => setFilters(prev => ({ ...prev, channel: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Channels</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {campaigns.map(campaign => (
            <CampaignCard
              key={campaign._id}
              campaign={campaign}
              onAction={handleCampaignAction}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
              getChannelIcon={getChannelIcon}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCard({ 
  campaign, 
  onAction,
  getStatusColor,
  getStatusIcon,
  getChannelIcon
}: {
  campaign: Campaign;
  onAction: (id: string, action: 'start' | 'pause' | 'cancel') => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => any;
  getChannelIcon: (channel: string) => any;
}) {
  const navigate = useNavigate();
  const StatusIcon = getStatusIcon(campaign.status);
  const ChannelIcon = getChannelIcon(campaign.channel);

  const completionPercentage = campaign.progress.total > 0 
    ? Math.round((campaign.progress.sent / campaign.progress.total) * 100)
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ChannelIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 
              className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
              onClick={() => navigate(`/campaigns/${campaign._id}`)}
            >
              {campaign.name}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className="capitalize">{campaign.channel}</span>
              {campaign.templateId && (
                <>
                  <span>•</span>
                  <span>{campaign.templateId.name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
          </span>
          
          <CampaignActions campaign={campaign} onAction={onAction} />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{completionPercentage}% complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {campaign.progress.total.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">Recipients</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600">
            {campaign.progress.delivered.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">Delivered</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {campaign.analytics.openRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600">Open Rate</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {campaign.analytics.clickRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600">Click Rate</div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-sm text-gray-500 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-4">
          <span>Created {new Date(campaign.createdAt).toLocaleDateString()}</span>
          {campaign.scheduling.type === 'scheduled' && campaign.scheduling.scheduledAt && (
            <>
              <span>•</span>
              <span>Scheduled for {new Date(campaign.scheduling.scheduledAt).toLocaleString()}</span>
            </>
          )}
        </div>
        
        <button
          onClick={() => navigate(`/campaigns/${campaign._id}`)}
          className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
        >
          <Eye className="h-4 w-4" />
          <span>View Details</span>
        </button>
      </div>
    </div>
  );
}

function CampaignActions({ 
  campaign, 
  onAction 
}: {
  campaign: Campaign;
  onAction: (id: string, action: 'start' | 'pause' | 'cancel') => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const canStart = ['draft', 'paused', 'queued'].includes(campaign.status);
  const canPause = campaign.status === 'sending';
  const canCancel = ['draft', 'queued', 'sending', 'paused'].includes(campaign.status);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
          {canStart && (
            <button
              onClick={() => {
                onAction(campaign._id, 'start');
                setShowMenu(false);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Campaign
            </button>
          )}
          
          {canPause && (
            <button
              onClick={() => {
                onAction(campaign._id, 'pause');
                setShowMenu(false);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause Campaign
            </button>
          )}
          
          {canCancel && (
            <button
              onClick={() => {
                onAction(campaign._id, 'cancel');
                setShowMenu(false);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              <Square className="h-4 w-4 mr-2" />
              Cancel Campaign
            </button>
          )}
          
          <div className="border-t border-gray-200 my-1"></div>
          
          <button
            onClick={() => {
              // Navigate to analytics
              window.location.href = `/analytics?campaign=${campaign._id}`;
              setShowMenu(false);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            View Analytics
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  const navigate = useNavigate();

  return (
    <div className="text-center py-12">
      <Send className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns found</h3>
      <p className="text-gray-600 mb-6">
        Create your first campaign to start sending messages
      </p>
      <button
        onClick={() => navigate('/campaigns/new')}
        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span>Create Campaign</span>
      </button>
    </div>
  );
}

function CampaignsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-32"></div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="h-10 bg-gray-200 rounded mb-4"></div>
      </div>
      
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="animate-pulse">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                  <div>
                    <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="h-2 bg-gray-200 rounded mb-4"></div>
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="text-center">
                    <div className="h-8 bg-gray-200 rounded mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Campaign Detail Component (placeholder)
function CampaignDetail() {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-900">Campaign Detail</h2>
      <p className="text-gray-600">Campaign detail view coming soon...</p>
    </div>
  );
}

// Campaign Creator Component (placeholder)
function CampaignCreator() {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-900">Campaign Creator</h2>
      <p className="text-gray-600">Campaign creator coming soon...</p>
    </div>
  );
}