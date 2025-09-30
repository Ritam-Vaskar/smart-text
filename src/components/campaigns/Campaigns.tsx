import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { 
  Send, 
  Plus, 
  Search, 
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
  Phone,
  ArrowLeft,
  TrendingUp,
  FileText,
  Download,
  MoreHorizontal,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Campaign {
  _id: string;
  name: string;
  channel: 'email' | 'sms' | 'whatsapp';
  status: 'draft' | 'queued' | 'sending' | 'sent' | 'paused' | 'cancelled' | 'failed' | 'completed';
  progress?: {
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
  };
  analytics?: {
    openRate: number;
    clickRate: number;
    bounceRate: number;
  };
  scheduling?: {
    type: 'immediate' | 'scheduled';
    scheduledAt?: string;
  };
  templateId?: {
    name: string;
  };
  sender?: {
    name: string;
    email: string;
  };
  createdAt: string;
  completedAt?: string;
}

// Helper functions
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

      const response = await axios.get(`/send/campaigns?${queryParams.toString()}`);
      setCampaigns(response.data.data.campaigns || []);
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
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : !campaigns || campaigns.length === 0 ? (
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

  const completionPercentage = campaign.progress && campaign.progress.total > 0 
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
            {(campaign.progress?.total || 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">Recipients</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600">
            {(campaign.progress?.delivered || 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">Delivered</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {(campaign.analytics?.openRate || 0).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600">Open Rate</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {(campaign.analytics?.clickRate || 0).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600">Click Rate</div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-sm text-gray-500 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-4">
          <span>Created {new Date(campaign.createdAt).toLocaleDateString()}</span>
          {campaign.scheduling?.type === 'scheduled' && campaign.scheduling?.scheduledAt && (
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
  onAction,
  showLabels = false
}: {
  campaign: Campaign;
  onAction: (id: string, action: 'start' | 'pause' | 'cancel') => void;
  showLabels?: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const canStart = ['draft', 'paused', 'queued'].includes(campaign.status);
  const canPause = campaign.status === 'sending';
  const canCancel = ['draft', 'queued', 'sending', 'paused'].includes(campaign.status);

  if (showLabels) {
    return (
      <div className="flex items-center space-x-2">
        {canStart && (
          <button
            onClick={() => onAction(campaign._id, 'start')}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Play className="h-4 w-4" />
            <span>Start</span>
          </button>
        )}
        
        {canPause && (
          <button
            onClick={() => onAction(campaign._id, 'pause')}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            <Pause className="h-4 w-4" />
            <span>Pause</span>
          </button>
        )}
        
        {canCancel && (
          <button
            onClick={() => onAction(campaign._id, 'cancel')}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Square className="h-4 w-4" />
            <span>Cancel</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <MoreHorizontal className="h-4 w-4" />
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
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [recipients, setRecipients] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    if (id) {
      fetchCampaignDetails();
    }
  }, [id]);

  const fetchCampaignDetails = async () => {
    try {
      setLoading(true);
      const [campaignRes, recipientsRes, analyticsRes] = await Promise.all([
        axios.get(`/send/${id}`),
        axios.get(`/send/${id}/recipients`),
        axios.get(`/analytics/campaigns/${id}`)
      ]);
      
      setCampaign(campaignRes.data.data.sendJob);
      setRecipients(recipientsRes.data.data.recipients || []);
      setAnalytics(analyticsRes.data.data || null);
    } catch (error) {
      console.error('Failed to fetch campaign details:', error);
      toast.error('Failed to load campaign details');
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignAction = async (action: string) => {
    try {
      await axios.post(`/send/${id}/${action}`);
      toast.success(`Campaign ${action}ed successfully`);
      fetchCampaignDetails();
    } catch (error) {
      console.error(`Failed to ${action} campaign:`, error);
      toast.error(`Failed to ${action} campaign`);
    }
  };

  const downloadRecipients = () => {
    if (!recipients.length) return;
    
    const csvContent = [
      ['Name', 'Email/Phone', 'Status', 'Delivered At', 'Opened At', 'Clicked At'].join(','),
      ...recipients.map((r: any) => [
        r.name,
        r.email || r.phone,
        r.status,
        r.deliveredAt ? new Date(r.deliveredAt).toLocaleString() : '',
        r.openedAt ? new Date(r.openedAt).toLocaleString() : '',
        r.clickedAt ? new Date(r.clickedAt).toLocaleString() : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${campaign?.name}-recipients.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign Not Found</h2>
        <p className="text-gray-600 mb-4">The requested campaign could not be found.</p>
        <button
          onClick={() => navigate('/campaigns')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Campaigns
        </button>
      </div>
    );
  }

  const StatusIcon = getStatusIcon(campaign.status);
  const ChannelIcon = getChannelIcon(campaign.channel);
  
  const completionPercentage = campaign.progress && campaign.progress.total > 0 
    ? Math.round((campaign.progress.sent / campaign.progress.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/campaigns')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="p-3 bg-blue-100 rounded-lg">
              <ChannelIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="capitalize">{campaign.channel} Campaign</span>
                <span>•</span>
                <span>Created {new Date(campaign.createdAt).toLocaleDateString()}</span>
                {campaign.templateId && (
                  <>
                    <span>•</span>
                    <span>Template: {campaign.templateId.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(campaign.status)}`}>
              <StatusIcon className="h-4 w-4 mr-2" />
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </span>
            <CampaignActions 
              campaign={campaign} 
              onAction={(_id: string, action: string) => handleCampaignAction(action)}
              showLabels={true}
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Campaign Progress</span>
            <span>{completionPercentage}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {(campaign.progress?.total || 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-600">Recipients</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {(campaign.progress?.delivered || 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-600">Delivered</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {(campaign.analytics?.openRate || 0).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">Open Rate</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {(campaign.analytics?.clickRate || 0).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">Click Rate</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {(campaign.analytics?.bounceRate || 0).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">Bounce Rate</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'recipients', label: 'Recipients', icon: Users },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'content', label: 'Content', icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <CampaignOverview campaign={campaign} analytics={analytics} />
          )}
          {activeTab === 'recipients' && (
            <CampaignRecipients 
              recipients={recipients} 
              onDownload={downloadRecipients}
            />
          )}
          {activeTab === 'analytics' && (
            <CampaignAnalytics campaign={campaign} analytics={analytics} />
          )}
          {activeTab === 'content' && (
            <CampaignContent campaign={campaign} />
          )}
        </div>
      </div>
    </div>
  );
}

// Campaign Creator Component (placeholder)
function CampaignCreator() {
  const [currentStep, setCurrentStep] = useState(1);
  const [campaignData, setCampaignData] = useState({
    name: '',
    channel: 'email' as 'email' | 'sms' | 'whatsapp',
    templateId: '',
    recipients: [] as any[],
    scheduling: {
      type: 'immediate' as 'immediate' | 'scheduled',
      scheduledAt: ''
    },
    settings: {
      trackOpens: true,
      trackClicks: true,
      unsubscribeLink: true
    }
  });
  
  const [templates, setTemplates] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const steps = [
    { id: 1, name: 'Basic Info', description: 'Campaign name and channel' },
    { id: 2, name: 'Template', description: 'Select message template' },
    { id: 3, name: 'Recipients', description: 'Upload recipient list' },
    { id: 4, name: 'Schedule', description: 'Set sending schedule' },
    { id: 5, name: 'Review', description: 'Review and create' }
  ];

  useEffect(() => {
    fetchTemplates();
  }, [campaignData.channel]);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`/templates?channel=${campaignData.channel}&limit=50`);
      setTemplates(response.data.data.templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json') && !file.name.endsWith('.csv')) {
      toast.error('Please upload a JSON or CSV file');
      return;
    }

    setUploading(true);
    try {
      const text = await file.text();
      let recipients = [];

      if (file.name.endsWith('.json')) {
        recipients = JSON.parse(text);
      } else if (file.name.endsWith('.csv')) {
        recipients = parseCSV(text);
      }

      // Validate recipients structure
      const validatedRecipients = validateRecipients(recipients);
      setCampaignData(prev => ({ ...prev, recipients: validatedRecipients }));
      toast.success(`Loaded ${validatedRecipients.length} recipients`);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to parse file. Please check the format.');
    } finally {
      setUploading(false);
    }
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV must have headers and at least one data row');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const recipients = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const recipient: any = {};
      
      headers.forEach((header, index) => {
        if (values[index]) {
          recipient[header] = values[index];
        }
      });
      
      recipients.push(recipient);
    }

    return recipients;
  };

  const validateRecipients = (recipients: any[]) => {
    const { channel } = campaignData;
    const validated = [];

    for (const recipient of recipients) {
      const validatedRecipient: any = {
        name: recipient.name || recipient.firstName || recipient.first_name || 'Unknown',
        customFields: {}
      };

      // Add channel-specific validation
      if (channel === 'email') {
        if (!recipient.email) continue;
        validatedRecipient.email = recipient.email;
      } else if (channel === 'sms' || channel === 'whatsapp') {
        if (!recipient.phone && !recipient.phoneNumber && !recipient.phone_number) continue;
        validatedRecipient.phone = recipient.phone || recipient.phoneNumber || recipient.phone_number;
      }

      // Add custom fields
      Object.keys(recipient).forEach(key => {
        if (!['name', 'email', 'phone', 'firstName', 'first_name', 'phoneNumber', 'phone_number'].includes(key)) {
          validatedRecipient.customFields[key] = recipient[key];
        }
      });

      validated.push(validatedRecipient);
    }

    return validated;
  };

  const createCampaign = async () => {
    setCreating(true);
    try {
      const payload = {
        name: campaignData.name,
        channel: campaignData.channel,
        templateId: campaignData.templateId,
        recipients: campaignData.recipients,
        scheduling: campaignData.scheduling,
        settings: campaignData.settings
      };

      const response = await axios.post('/send/campaign', payload);
      toast.success('Campaign created successfully!');
      navigate(`/campaigns/${response.data.data._id}`);
    } catch (error: any) {
      console.error('Failed to create campaign:', error);
      toast.error(error.response?.data?.message || 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <BasicInfoStep campaignData={campaignData} setCampaignData={setCampaignData} />;
      case 2:
        return <TemplateStep templates={templates} campaignData={campaignData} setCampaignData={setCampaignData} />;
      case 3:
        return <RecipientsStep 
          campaignData={campaignData} 
          setCampaignData={setCampaignData}
          onFileUpload={handleFileUpload}
          uploading={uploading}
        />;
      case 4:
        return <ScheduleStep campaignData={campaignData} setCampaignData={setCampaignData} />;
      case 5:
        return <ReviewStep campaignData={campaignData} templates={templates} />;
      default:
        return null;
    }
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!campaignData.name.trim() && !!campaignData.channel;
      case 2:
        return !!campaignData.templateId;
      case 3:
        return campaignData.recipients.length > 0;
      case 4:
        return campaignData.scheduling.type === 'immediate' || !!campaignData.scheduling.scheduledAt;
      case 5:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Campaign</h1>
          <p className="text-gray-600 mt-1">Set up a new message campaign</p>
        </div>
        <button
          onClick={() => navigate('/campaigns')}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
        >
          Cancel
        </button>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step.id 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : 'border-gray-300 text-gray-500'
              }`}>
                {currentStep > step.id ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <div className="ml-3">
                <div className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step.name}
                </div>
                <div className="text-xs text-gray-500">{step.description}</div>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-px mx-6 ${
                  currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          {currentStep < 5 ? (
            <button
              onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
              disabled={!isStepValid(currentStep)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              onClick={createCampaign}
              disabled={creating || !isStepValid(5)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Campaign'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Step Components
function BasicInfoStep({ campaignData, setCampaignData }: any) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Campaign Name *
        </label>
        <input
          type="text"
          value={campaignData.name}
          onChange={(e) => setCampaignData((prev: any) => ({ ...prev, name: e.target.value }))}
          placeholder="Enter campaign name"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Channel *
        </label>
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'email', label: 'Email', icon: Mail, desc: 'Email campaigns' },
            { id: 'sms', label: 'SMS', icon: MessageSquare, desc: 'Text messages' },
            { id: 'whatsapp', label: 'WhatsApp', icon: Phone, desc: 'WhatsApp messages' }
          ].map((channel) => (
            <button
              key={channel.id}
              onClick={() => setCampaignData((prev: any) => ({ ...prev, channel: channel.id, templateId: '' }))}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                campaignData.channel === channel.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <channel.icon className={`h-6 w-6 mb-2 ${
                campaignData.channel === channel.id ? 'text-blue-600' : 'text-gray-600'
              }`} />
              <div className="font-medium text-gray-900">{channel.label}</div>
              <div className="text-sm text-gray-500">{channel.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TemplateStep({ templates, campaignData, setCampaignData }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Select Template</h3>
        <div className="text-sm text-gray-500">
          {templates.length} templates available for {campaignData.channel}
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Found</h3>
          <p className="text-gray-600 mb-4">
            You don't have any templates for {campaignData.channel} channel yet.
          </p>
          <button 
            onClick={() => window.open('/templates/new', '_blank')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {templates.map((template: any) => (
            <div
              key={template._id}
              onClick={() => setCampaignData((prev: any) => ({ ...prev, templateId: template._id }))}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                campaignData.templateId === template._id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="font-medium text-gray-900">{template.name}</div>
                {campaignData.templateId === template._id && (
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                )}
              </div>
              <div className="text-sm text-gray-600 mb-2">{template.description}</div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="bg-gray-100 px-2 py-1 rounded">{template.category}</span>
                <span className="bg-gray-100 px-2 py-1 rounded">{template.tone}</span>
              </div>
              {template.content && (
                <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                  {template.content.subject && (
                    <div><strong>Subject:</strong> {template.content.subject}</div>
                  )}
                  <div><strong>Body:</strong> {template.content.body.substring(0, 100)}...</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecipientsStep({ campaignData, setCampaignData, onFileUpload, uploading }: any) {
  const getRequiredFormat = () => {
    const { channel } = campaignData;
    if (channel === 'email') {
      return {
        json: '[{"name": "John Doe", "email": "john@example.com", "company": "Acme Inc"}]',
        csv: 'name,email,company\\nJohn Doe,john@example.com,Acme Inc'
      };
    } else {
      return {
        json: '[{"name": "John Doe", "phone": "+1234567890", "company": "Acme Inc"}]',
        csv: 'name,phone,company\\nJohn Doe,+1234567890,Acme Inc'
      };
    }
  };

  const format = getRequiredFormat();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Recipients</h3>
        <p className="text-gray-600 mb-4">
          Upload a JSON or CSV file containing your recipients. Required fields vary by channel:
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-900 mb-2">
            Required format for {campaignData.channel.toUpperCase()}:
          </h4>
          <div className="text-sm text-blue-800">
            {campaignData.channel === 'email' ? (
              <>
                <strong>Required:</strong> name, email<br />
                <strong>Optional:</strong> Any custom fields (company, firstName, etc.)
              </>
            ) : (
              <>
                <strong>Required:</strong> name, phone<br />
                <strong>Optional:</strong> Any custom fields (company, firstName, etc.)
              </>
            )}
          </div>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".json,.csv"
            onChange={onFileUpload}
            disabled={uploading}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="text-lg font-medium text-gray-900 mb-2">
              {uploading ? 'Uploading...' : 'Choose file to upload'}
            </div>
            <div className="text-gray-600 mb-4">
              JSON or CSV file up to 10MB
            </div>
            <div className="px-4 py-2 bg-blue-600 text-white rounded-lg inline-block">
              Browse Files
            </div>
          </label>
        </div>

        {campaignData.recipients.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">
                Loaded Recipients ({campaignData.recipients.length})
              </h4>
              <button
                onClick={() => setCampaignData((prev: any) => ({ ...prev, recipients: [] }))}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                Clear All
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {campaignData.channel === 'email' ? 'Email' : 'Phone'}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Custom Fields</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campaignData.recipients.slice(0, 10).map((recipient: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-900">{recipient.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {recipient.email || recipient.phone}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {Object.keys(recipient.customFields || {}).length} fields
                      </td>
                    </tr>
                  ))}
                  {campaignData.recipients.length > 10 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-sm text-gray-500 text-center">
                        ... and {campaignData.recipients.length - 10} more
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Format Examples */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">JSON Format Example:</h4>
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
            {format.json}
          </pre>
        </div>
        <div>
          <h4 className="font-medium text-gray-900 mb-2">CSV Format Example:</h4>
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
            {format.csv}
          </pre>
        </div>
      </div>
    </div>
  );
}

function ScheduleStep({ campaignData, setCampaignData }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule Campaign</h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <input
              type="radio"
              id="immediate"
              name="scheduling"
              checked={campaignData.scheduling.type === 'immediate'}
              onChange={() => setCampaignData((prev: any) => ({
                ...prev,
                scheduling: { type: 'immediate' }
              }))}
              className="h-4 w-4 text-blue-600"
            />
            <label htmlFor="immediate" className="flex items-center space-x-2">
              <Play className="h-5 w-5 text-green-600" />
              <span className="font-medium">Send Immediately</span>
            </label>
          </div>

          <div className="flex items-center space-x-4">
            <input
              type="radio"
              id="scheduled"
              name="scheduling"
              checked={campaignData.scheduling.type === 'scheduled'}
              onChange={() => setCampaignData((prev: any) => ({
                ...prev,
                scheduling: { type: 'scheduled', scheduledAt: '' }
              }))}
              className="h-4 w-4 text-blue-600"
            />
            <label htmlFor="scheduled" className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Schedule for Later</span>
            </label>
          </div>

          {campaignData.scheduling.type === 'scheduled' && (
            <div className="ml-8 mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule Date & Time
              </label>
              <input
                type="datetime-local"
                value={campaignData.scheduling.scheduledAt}
                onChange={(e) => setCampaignData((prev: any) => ({
                  ...prev,
                  scheduling: { ...prev.scheduling, scheduledAt: e.target.value }
                }))}
                min={new Date().toISOString().slice(0, 16)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Campaign Settings</h3>
        <div className="space-y-4">
          {campaignData.channel === 'email' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">Track Opens</div>
                  <div className="text-sm text-gray-600">Track when recipients open emails</div>
                </div>
                <input
                  type="checkbox"
                  checked={campaignData.settings.trackOpens}
                  onChange={(e) => setCampaignData((prev: any) => ({
                    ...prev,
                    settings: { ...prev.settings, trackOpens: e.target.checked }
                  }))}
                  className="h-4 w-4 text-blue-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">Track Clicks</div>
                  <div className="text-sm text-gray-600">Track when recipients click links</div>
                </div>
                <input
                  type="checkbox"
                  checked={campaignData.settings.trackClicks}
                  onChange={(e) => setCampaignData((prev: any) => ({
                    ...prev,
                    settings: { ...prev.settings, trackClicks: e.target.checked }
                  }))}
                  className="h-4 w-4 text-blue-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">Include Unsubscribe Link</div>
                  <div className="text-sm text-gray-600">Required for compliance</div>
                </div>
                <input
                  type="checkbox"
                  checked={campaignData.settings.unsubscribeLink}
                  onChange={(e) => setCampaignData((prev: any) => ({
                    ...prev,
                    settings: { ...prev.settings, unsubscribeLink: e.target.checked }
                  }))}
                  className="h-4 w-4 text-blue-600"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewStep({ campaignData, templates }: any) {
  const selectedTemplate = templates.find((t: any) => t._id === campaignData.templateId);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Review Campaign</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-500">Campaign Name</div>
            <div className="text-gray-900">{campaignData.name}</div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-500">Channel</div>
            <div className="text-gray-900 capitalize">{campaignData.channel}</div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-500">Template</div>
            <div className="text-gray-900">{selectedTemplate?.name || 'Unknown'}</div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-500">Recipients</div>
            <div className="text-gray-900">{campaignData.recipients.length} recipients</div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-500">Scheduling</div>
            <div className="text-gray-900">
              {campaignData.scheduling.type === 'immediate' 
                ? 'Send immediately' 
                : `Scheduled for ${new Date(campaignData.scheduling.scheduledAt).toLocaleString()}`
              }
            </div>
          </div>
          
          {selectedTemplate && (
            <div>
              <div className="text-sm font-medium text-gray-500 mb-2">Message Preview</div>
              <div className="p-4 bg-gray-50 rounded-lg">
                {selectedTemplate.content.subject && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-gray-500">Subject:</div>
                    <div className="text-sm text-gray-900">{selectedTemplate.content.subject}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs font-medium text-gray-500">Body:</div>
                  <div className="text-sm text-gray-900 whitespace-pre-wrap">
                    {selectedTemplate.content.body.substring(0, 200)}
                    {selectedTemplate.content.body.length > 200 && '...'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <div className="font-medium text-yellow-900">Ready to send?</div>
            <div className="text-sm text-yellow-800 mt-1">
              Once you create this campaign, messages will be {campaignData.scheduling.type === 'immediate' ? 'sent immediately' : 'queued for sending'}. 
              Make sure all details are correct before proceeding.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Campaign Detail Tab Components
function CampaignOverview({ campaign }: any) {
  const deliveryRate = campaign.progress?.total > 0 
    ? ((campaign.progress.delivered / campaign.progress.total) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Campaign Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Campaign Information</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium ${
                campaign.status === 'completed' ? 'text-green-600' :
                campaign.status === 'failed' ? 'text-red-600' :
                campaign.status === 'sending' ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Channel:</span>
              <span className="font-medium capitalize">{campaign.channel}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Created:</span>
              <span className="font-medium">{new Date(campaign.createdAt).toLocaleString()}</span>
            </div>
            
            {campaign.completedAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Completed:</span>
                <span className="font-medium">{new Date(campaign.completedAt).toLocaleString()}</span>
              </div>
            )}
            
            {campaign.scheduling?.type === 'scheduled' && campaign.scheduling.scheduledAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Scheduled:</span>
                <span className="font-medium">{new Date(campaign.scheduling.scheduledAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Performance Summary</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery Rate:</span>
              <span className="font-medium text-green-600">{deliveryRate}%</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Open Rate:</span>
              <span className="font-medium text-blue-600">
                {(campaign.analytics?.openRate || 0).toFixed(1)}%
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Click Rate:</span>
              <span className="font-medium text-purple-600">
                {(campaign.analytics?.clickRate || 0).toFixed(1)}%
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Bounce Rate:</span>
              <span className="font-medium text-red-600">
                {(campaign.analytics?.bounceRate || 0).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings */}
      {campaign.settings && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Settings</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {campaign.channel === 'email' && (
              <>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${campaign.settings.trackOpens ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-gray-600">Track Opens</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${campaign.settings.trackClicks ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-gray-600">Track Clicks</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${campaign.settings.unsubscribeLink ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm text-gray-600">Unsubscribe Link</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignRecipients({ recipients, onDownload }: any) {
  const [filteredRecipients, setFilteredRecipients] = useState(recipients);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let filtered = recipients;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter((r: any) => r.status === statusFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter((r: any) => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.email && r.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.phone && r.phone.includes(searchTerm))
      );
    }
    
    setFilteredRecipients(filtered);
  }, [recipients, statusFilter, searchTerm]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'opened': return 'bg-blue-100 text-blue-800';
      case 'clicked': return 'bg-purple-100 text-purple-800';
      case 'bounced': return 'bg-red-100 text-red-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'sent': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const statusCounts = recipients.reduce((acc: any, recipient: any) => {
    acc[recipient.status] = (acc[recipient.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Stats and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="text-sm text-gray-600">
            Total: <span className="font-medium text-gray-900">{recipients.length}</span>
          </div>
          {Object.entries(statusCounts).map(([status, count]: [string, any]) => (
            <div key={status} className="text-sm text-gray-600">
              <span className="capitalize">{status}</span>: 
              <span className="font-medium text-gray-900 ml-1">{count}</span>
            </div>
          ))}
        </div>
        
        <button
          onClick={onDownload}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search recipients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="opened">Opened</option>
          <option value="clicked">Clicked</option>
          <option value="bounced">Bounced</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Recipients Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opened
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clicked
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecipients.map((recipient: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{recipient.name}</div>
                    {recipient.customFields && Object.keys(recipient.customFields).length > 0 && (
                      <div className="text-xs text-gray-500">
                        {Object.keys(recipient.customFields).length} custom field(s)
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {recipient.email || recipient.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(recipient.status)}`}>
                      {recipient.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {recipient.deliveredAt ? new Date(recipient.deliveredAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {recipient.openedAt ? new Date(recipient.openedAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {recipient.clickedAt ? new Date(recipient.clickedAt).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredRecipients.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Recipients Found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters to see more recipients.'
                : 'This campaign has no recipients.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CampaignAnalytics({ campaign }: any) {
  const [timeRange, setTimeRange] = useState('24h');

  // Mock data for charts - in real app, this would come from analytics API
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    opens: Math.floor(Math.random() * 50),
    clicks: Math.floor(Math.random() * 20),
    deliveries: Math.floor(Math.random() * 100)
  }));

  const deviceData = [
    { name: 'Desktop', value: 45, icon: Monitor },
    { name: 'Mobile', value: 40, icon: Smartphone },
    { name: 'Tablet', value: 15, icon: Tablet }
  ];

  const locationData = [
    { country: 'United States', opens: 245, clicks: 89 },
    { country: 'United Kingdom', opens: 156, clicks: 67 },
    { country: 'Canada', opens: 98, clicks: 34 },
    { country: 'Australia', opens: 78, clicks: 23 },
    { country: 'Germany', opens: 65, clicks: 19 }
  ];

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Campaign Analytics</h3>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="1h">Last Hour</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Opens</p>
              <p className="text-2xl font-bold text-blue-900">
                {campaign.progress?.opened || 0}
              </p>
            </div>
            <Eye className="h-8 w-8 text-blue-600" />
          </div>
          <p className="text-xs text-blue-600 mt-1">
            +12% from yesterday
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Total Clicks</p>
              <p className="text-2xl font-bold text-purple-900">
                {campaign.progress?.clicked || 0}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
          <p className="text-xs text-purple-600 mt-1">
            +8% from yesterday
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Engagement Rate</p>
              <p className="text-2xl font-bold text-green-900">
                {((campaign.progress?.opened || 0) / (campaign.progress?.delivered || 1) * 100).toFixed(1)}%
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-xs text-green-600 mt-1">
            Above average
          </p>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Avg. Open Time</p>
              <p className="text-2xl font-bold text-orange-900">2.3s</p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
          <p className="text-xs text-orange-600 mt-1">
            -0.5s from yesterday
          </p>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Activity Over Time</h4>
        <div className="h-64 flex items-end space-x-1">
          {hourlyData.map((data, index) => (
            <div
              key={index}
              className="flex-1 bg-blue-200 rounded-t"
              style={{ height: `${(data.opens / 50) * 100}%` }}
              title={`${data.hour}:00 - ${data.opens} opens`}
            ></div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:59</span>
        </div>
      </div>

      {/* Device Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Device Breakdown</h4>
          <div className="space-y-3">
            {deviceData.map((device) => (
              <div key={device.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <device.icon className="h-5 w-5 text-gray-600" />
                  <span className="text-sm text-gray-900">{device.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${device.value}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{device.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Top Locations</h4>
          <div className="space-y-3">
            {locationData.map((location, index) => (
              <div key={location.country} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">{index + 1}</span>
                  </div>
                  <span className="text-sm text-gray-900">{location.country}</span>
                </div>
                <div className="flex space-x-4 text-sm">
                  <span className="text-blue-600">{location.opens} opens</span>
                  <span className="text-purple-600">{location.clicks} clicks</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CampaignContent({ campaign }: any) {
  const [showRawContent, setShowRawContent] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Campaign Content</h3>
        <button
          onClick={() => setShowRawContent(!showRawContent)}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          {showRawContent ? 'Show Rendered' : 'Show Raw'}
        </button>
      </div>

      {campaign.templateId ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <div className="font-medium text-blue-900">Template: {campaign.templateId.name}</div>
              <div className="text-sm text-blue-700">This campaign uses a saved template</div>
            </div>
          </div>

          {campaign.templateId.content && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {campaign.channel === 'email' && campaign.templateId.content.subject && (
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="text-sm font-medium text-gray-700">Subject Line</div>
                  <div className="mt-1 text-gray-900">
                    {showRawContent 
                      ? campaign.templateId.content.subject
                      : campaign.templateId.content.subject.replace(/\{\{(\w+)\}\}/g, '[Variable: $1]')
                    }
                  </div>
                </div>
              )}
              
              <div className="p-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Message Body</div>
                <div className="prose max-w-none">
                  {showRawContent ? (
                    <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded border">
                      {campaign.templateId.content.body}
                    </pre>
                  ) : (
                    <div className="text-gray-900 whitespace-pre-wrap">
                      {campaign.templateId.content.body.replace(/\{\{(\w+)\}\}/g, '[Variable: $1]')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : campaign.customContent ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg">
            <FileText className="h-5 w-5 text-purple-600" />
            <div>
              <div className="font-medium text-purple-900">Custom Content</div>
              <div className="text-sm text-purple-700">This campaign uses custom content</div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {campaign.channel === 'email' && campaign.customContent.subject && (
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="text-sm font-medium text-gray-700">Subject Line</div>
                <div className="mt-1 text-gray-900">{campaign.customContent.subject}</div>
              </div>
            )}
            
            <div className="p-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Message Body</div>
              <div className="prose max-w-none">
                <div className="text-gray-900 whitespace-pre-wrap">
                  {campaign.customContent.body}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Available</h3>
          <p className="text-gray-600">Campaign content could not be loaded.</p>
        </div>
      )}

      {/* Variables Used */}
      <div className="border-t pt-6">
        <h4 className="font-medium text-gray-900 mb-3">Variables & Personalization</h4>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-2">Available variables for personalization:</div>
          <div className="flex flex-wrap gap-2">
            {['name', 'email', 'phone', 'company', 'firstName', 'lastName'].map((variable) => (
              <span
                key={variable}
                className="inline-flex px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono text-gray-700"
              >
                {`{{${variable}}}`}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}