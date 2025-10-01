import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Grid3X3,
  List,
  Star,
  Eye,
  Edit,
  Trash2,
  Copy,
  Send,
  Archive,
  Folder,
  Tag,
  X
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Template {
  _id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  channel: string[];
  language: string;
  tone: string;
  audience: string;
  content: {
    subject?: string;
    body: string;
    preheader?: string;
  };
  placeholders: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
  folder: string;
  usage: {
    timesUsed: number;
    lastUsed?: string;
    averageRating: number;
    totalRatings: number;
  };
  owner: {
    name: string;
    email: string;
  };
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateFilters {
  search: string;
  category: string;
  channel: string;
  folder: string;
  tags: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export default function Templates() {
  return (
    <Routes>
      <Route path="/" element={<TemplatesList />} />
      <Route path="/:id" element={<TemplateDetail />} />
      <Route path="/new" element={<TemplateEditor />} />
      <Route path="/:id/edit" element={<TemplateEditor />} />
    </Routes>
  );
}

function TemplatesList() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<TemplateFilters>({
    search: '',
    category: '',
    channel: '',
    folder: '',
    tags: '',
    sortBy: 'updatedAt',
    sortOrder: 'desc'
  });
  const [folders, setFolders] = useState<string[]>([]);
  const [_availableTags, setAvailableTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [_selectedTemplates, _setSelectedTemplates] = useState<string[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    fetchTemplates();
    fetchFolders();
    fetchTags();
  }, [filters]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.set(key, value);
      });

      const response = await axios.get(`/templates?${queryParams.toString()}`);
      setTemplates(response.data.data.templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const response = await axios.get('/templates/folders/list');
      setFolders(response.data.data.folders);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await axios.get('/templates/tags/list');
      setAvailableTags(response.data.data.tags);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const handleFilterChange = (key: keyof TemplateFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const duplicateTemplate = async (templateId: string, name?: string) => {
    try {
      await axios.post(`/templates/${templateId}/duplicate`, {
        name: name || `${templates.find(t => t._id === templateId)?.name} (Copy)`
      });
      toast.success('Template duplicated successfully!');
      fetchTemplates();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to duplicate template';
      toast.error(message);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await axios.delete(`/templates/${templateId}`);
      toast.success('Template deleted successfully!');
      fetchTemplates();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete template';
      toast.error(message);
    }
  };

  const archiveTemplate = async (templateId: string) => {
    try {
      await axios.patch(`/templates/${templateId}/archive`);
      toast.success('Template archived successfully!');
      fetchTemplates();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to archive template';
      toast.error(message);
    }
  };

  if (loading) {
    return <TemplatesSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FileText className="h-8 w-8 text-blue-600 mr-3" />
            Templates
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your message templates and create reusable content
          </p>
        </div>
        
        <button
          onClick={() => navigate('/templates/new')}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Template</span>
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
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search templates by name or description..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'} rounded-l-lg transition-colors`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'} rounded-r-lg transition-colors`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="marketing">Marketing</option>
              <option value="transactional">Transactional</option>
              <option value="notification">Notification</option>
              <option value="seasonal">Seasonal</option>
              <option value="other">Other</option>
            </select>

            <select
              value={filters.channel}
              onChange={(e) => handleFilterChange('channel', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Channels</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>

            <select
              value={filters.folder}
              onChange={(e) => handleFilterChange('folder', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Folders</option>
              {folders.map(folder => (
                <option key={folder} value={folder}>{folder}</option>
              ))}
            </select>

            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="updatedAt">Last Modified</option>
              <option value="createdAt">Created Date</option>
              <option value="name">Name</option>
              <option value="usage.timesUsed">Usage</option>
            </select>
          </div>
        )}
      </div>

      {/* Templates Grid/List */}
      {templates.length === 0 ? (
        <EmptyState />
      ) : (
        <div className={`${
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }`}>
          {templates.map(template => (
            <TemplateCard
              key={template._id}
              template={template}
              viewMode={viewMode}
              onDuplicate={duplicateTemplate}
              onDelete={deleteTemplate}
              onArchive={archiveTemplate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateCard({ 
  template, 
  viewMode,
  onDuplicate, 
  onDelete, 
  onArchive 
}: {
  template: Template;
  viewMode: 'grid' | 'list';
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [_showActions, _setShowActions] = useState(false);

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'email': return 'bg-blue-100 text-blue-700';
      case 'sms': return 'bg-emerald-100 text-emerald-700';
      case 'whatsapp': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'marketing': return 'bg-purple-100 text-purple-700';
      case 'transactional': return 'bg-amber-100 text-amber-700';
      case 'notification': return 'bg-red-100 text-red-700';
      case 'seasonal': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <h3 
                className="text-lg font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600"
                onClick={() => navigate(`/templates/${template._id}`)}
              >
                {template.name}
              </h3>
              <div className="flex items-center space-x-2">
                {template.channel.map(channel => (
                  <span key={channel} className={`text-xs px-2 py-1 rounded ${getChannelColor(channel)}`}>
                    {channel.toUpperCase()}
                  </span>
                ))}
                <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(template.category)}`}>
                  {template.category}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-1 truncate">{template.description}</p>
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
              <span>Used {template.usage.timesUsed} times</span>
              <span>•</span>
              <span>Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
              {template.folder && (
                <>
                  <span>•</span>
                  <span className="flex items-center">
                    <Folder className="h-3 w-3 mr-1" />
                    {template.folder}
                  </span>
                </>
              )}
            </div>
          </div>
          
          <TemplateActions
            template={template}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onArchive={onArchive}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-2">
          {template.channel.map(channel => (
            <span key={channel} className={`text-xs px-2 py-1 rounded ${getChannelColor(channel)}`}>
              {channel.toUpperCase()}
            </span>
          ))}
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <TemplateActions
            template={template}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onArchive={onArchive}
          />
        </div>
      </div>

      <h3 
        className="text-lg font-semibold text-gray-900 mb-2 cursor-pointer hover:text-blue-600"
        onClick={() => navigate(`/templates/${template._id}`)}
      >
        {template.name}
      </h3>
      
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
        {template.description || 'No description provided'}
      </p>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(template.category)}`}>
            {template.category}
          </span>
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <span className="text-gray-600">
              {template.usage.averageRating?.toFixed(1) || '0.0'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Used {template.usage.timesUsed} times</span>
          <span>{new Date(template.updatedAt).toLocaleDateString()}</span>
        </div>

        {template.tags.length > 0 && (
          <div className="flex items-center space-x-1">
            <Tag className="h-3 w-3 text-gray-400" />
            <div className="flex flex-wrap gap-1">
              {template.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-1 py-0.5 rounded">
                  {tag}
                </span>
              ))}
              {template.tags.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{template.tags.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateActions({ 
  template, 
  onDuplicate, 
  onDelete, 
  onArchive 
}: {
  template: Template;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

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
          <button
            onClick={() => {
              navigate(`/templates/${template._id}`);
              setShowMenu(false);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </button>
          
          <button
            onClick={() => {
              navigate(`/templates/${template._id}/edit`);
              setShowMenu(false);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </button>
          
          <button
            onClick={() => {
              onDuplicate(template._id);
              setShowMenu(false);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </button>
          
          <button
            onClick={() => {
              // Navigate to send campaign with template
              navigate(`/campaigns/new?templateId=${template._id}`);
              setShowMenu(false);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Campaign
          </button>
          
          <div className="border-t border-gray-200 my-1"></div>
          
          <button
            onClick={() => {
              onArchive(template._id);
              setShowMenu(false);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </button>
          
          <button
            onClick={() => {
              onDelete(template._id);
              setShowMenu(false);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
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
      <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No templates found</h3>
      <p className="text-gray-600 mb-6">
        Get started by creating your first message template
      </p>
      <button
        onClick={() => navigate('/templates/new')}
        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span>Create Template</span>
      </button>
    </div>
  );
}

function TemplatesSkeleton() {
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Template Detail Component
function TemplateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTemplate();
    }
  }, [id]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/templates/${id}`);
      setTemplate(response.data.data.template);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch template';
      toast.error(message);
      navigate('/templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!template) return;
    
    try {
      setDuplicating(true);
      const response = await axios.post(`/templates/${template._id}/duplicate`, {
        name: `${template.name} (Copy)`
      });
      toast.success('Template duplicated successfully!');
      navigate(`/templates/${response.data.data.template._id}/edit`);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to duplicate template';
      toast.error(message);
    } finally {
      setDuplicating(false);
    }
  };

  const handleRateTemplate = async () => {
    if (!template || rating === 0) return;

    try {
      await axios.post(`/templates/${template._id}/rate`, {
        rating,
        comment: ratingComment
      });
      toast.success('Rating submitted successfully!');
      setShowRatingDialog(false);
      setRating(0);
      setRatingComment('');
      fetchTemplate(); // Refresh to get updated rating
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to submit rating';
      toast.error(message);
    }
  };

  const handleUseTemplate = () => {
    navigate(`/campaigns/new?templateId=${template?._id}`);
  };

  if (loading) {
    return <TemplateDetailSkeleton />;
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Template Not Found</h2>
        <p className="text-gray-600 mt-2">The template you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/templates')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Templates
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'content', name: 'Content' },
    { id: 'usage', name: 'Usage & Analytics' },
    { id: 'settings', name: 'Settings' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <button
            onClick={() => navigate('/templates')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mt-1"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{template.name}</h1>
              <div className="flex items-center space-x-2">
                {template.channel.map(channel => (
                  <span key={channel} className={`text-xs px-2 py-1 rounded ${
                    channel === 'email' ? 'bg-blue-100 text-blue-700' :
                    channel === 'sms' ? 'bg-emerald-100 text-emerald-700' :
                    channel === 'whatsapp' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {channel.toUpperCase()}
                  </span>
                ))}
                <span className={`text-xs px-2 py-1 rounded ${
                  template.category === 'marketing' ? 'bg-purple-100 text-purple-700' :
                  template.category === 'transactional' ? 'bg-blue-100 text-blue-700' :
                  template.category === 'notification' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {template.category}
                </span>
              </div>
            </div>
            
            <p className="text-gray-600 mb-2">{template.description}</p>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>By {template.owner.name}</span>
              <span>•</span>
              <span>Created {new Date(template.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span>Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
              {template.usage.averageRating > 0 && (
                <>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span>{template.usage.averageRating.toFixed(1)} ({template.usage.totalRatings} reviews)</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowRatingDialog(true)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Star className="h-4 w-4" />
            <span>Rate</span>
          </button>
          
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <Copy className="h-4 w-4" />
            <span>{duplicating ? 'Duplicating...' : 'Duplicate'}</span>
          </button>
          
          <button
            onClick={() => navigate(`/templates/${template._id}/edit`)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </button>
          
          <button
            onClick={handleUseTemplate}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Send className="h-4 w-4" />
            <span>Use Template</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && <TemplateOverview template={template} />}
          {activeTab === 'content' && <TemplateContent template={template} />}
          {activeTab === 'usage' && <TemplateUsage template={template} />}
          {activeTab === 'settings' && <TemplateSettings template={template} onUpdate={fetchTemplate} />}
        </div>
      </div>

      {/* Rating Dialog */}
      {showRatingDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate Template</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment (Optional)
                </label>
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Share your thoughts about this template..."
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRatingDialog(false);
                  setRating(0);
                  setRatingComment('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRateTemplate}
                disabled={rating === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Template Editor Component
function TemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>({});
  
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    category: 'marketing',
    channel: [] as string[],
    language: 'en',
    tone: 'professional',
    audience: 'general',
    folder: '',
    tags: [] as string[],
    isPublic: false,
    content: {
      subject: '',
      body: '',
      preheader: ''
    },
    placeholders: [] as Array<{
      name: string;
      description: string;
      required: boolean;
    }>
  });

  const [folders, setFolders] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [newPlaceholder, setNewPlaceholder] = useState({
    name: '',
    description: '',
    required: false
  });

  const isEditMode = Boolean(id);

  useEffect(() => {
    if (isEditMode && id) {
      fetchTemplate();
    } else {
      setLoading(false);
    }
    fetchFolders();
    fetchTags();
  }, [id, isEditMode]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/templates/${id}`);
      const template = response.data.data.template;
      
      setTemplateData({
        name: template.name,
        description: template.description,
        category: template.category,
        channel: template.channel,
        language: template.language,
        tone: template.tone,
        audience: template.audience,
        folder: template.folder,
        tags: template.tags,
        isPublic: template.isPublic,
        content: template.content,
        placeholders: template.placeholders || []
      });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch template';
      toast.error(message);
      navigate('/templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const response = await axios.get('/templates/folders');
      setFolders(response.data.data.folders);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await axios.get('/templates/tags');
      setAvailableTags(response.data.data.tags);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const handleSave = async () => {
    if (!templateData.name.trim() || !templateData.content.body.trim()) {
      toast.error('Template name and content body are required');
      return;
    }

    if (templateData.channel.length === 0) {
      toast.error('Please select at least one channel');
      return;
    }

    try {
      setSaving(true);
      
      if (isEditMode) {
        await axios.put(`/templates/${id}`, templateData);
        toast.success('Template updated successfully!');
      } else {
        const response = await axios.post('/templates', templateData);
        toast.success('Template created successfully!');
        navigate(`/templates/${response.data.data.template._id}`);
        return;
      }
    } catch (error: any) {
      const message = error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} template`;
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !templateData.tags.includes(newTag.trim())) {
      setTemplateData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTemplateData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAddPlaceholder = () => {
    if (newPlaceholder.name.trim()) {
      setTemplateData(prev => ({
        ...prev,
        placeholders: [...prev.placeholders, { ...newPlaceholder }]
      }));
      setNewPlaceholder({ name: '', description: '', required: false });
    }
  };

  const handleRemovePlaceholder = (index: number) => {
    setTemplateData(prev => ({
      ...prev,
      placeholders: prev.placeholders.filter((_, i) => i !== index)
    }));
  };

  const handlePreview = () => {
    setPreviewData({
      name: previewData.name || 'John Doe',
      email: previewData.email || 'john@example.com',
      company: previewData.company || 'Acme Corp'
    });
    setShowPreview(true);
  };

  if (loading) {
    return <TemplateEditorSkeleton />;
  }

  const tabs = [
    { id: 'basic', name: 'Basic Info' },
    { id: 'content', name: 'Content' },
    { id: 'placeholders', name: 'Placeholders' },
    { id: 'settings', name: 'Settings' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/templates')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditMode ? 'Edit Template' : 'Create Template'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditMode ? 'Make changes to your template' : 'Create a new reusable template'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePreview}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Eye className="h-4 w-4" />
            <span>Preview</span>
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : (isEditMode ? 'Update' : 'Create')}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'basic' && (
            <TemplateBasicInfo
              data={templateData}
              onChange={setTemplateData}
              folders={folders}
              tags={availableTags}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              newTag={newTag}
              setNewTag={setNewTag}
            />
          )}
          {activeTab === 'content' && (
            <TemplateContentEditor
              data={templateData}
              onChange={setTemplateData}
            />
          )}
          {activeTab === 'placeholders' && (
            <TemplatePlaceholders
              placeholders={templateData.placeholders}
              onAdd={handleAddPlaceholder}
              onRemove={handleRemovePlaceholder}
              newPlaceholder={newPlaceholder}
              setNewPlaceholder={setNewPlaceholder}
            />
          )}
          {activeTab === 'settings' && (
            <TemplateAdvancedSettings
              data={templateData}
              onChange={setTemplateData}
            />
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <TemplatePreviewModal
          template={templateData}
          previewData={previewData}
          onClose={() => setShowPreview(false)}
          onUpdatePreviewData={setPreviewData}
        />
      )}
    </div>
  );
}

// Supporting Components for Template Detail
function TemplateOverview({ template }: { template: Template }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Basic Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Template Info</h4>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Category:</span> <span className="ml-1 capitalize">{template.category}</span></div>
            <div><span className="text-gray-500">Language:</span> <span className="ml-1">{template.language.toUpperCase()}</span></div>
            <div><span className="text-gray-500">Tone:</span> <span className="ml-1 capitalize">{template.tone}</span></div>
            <div><span className="text-gray-500">Audience:</span> <span className="ml-1 capitalize">{template.audience}</span></div>
            {template.folder && (
              <div><span className="text-gray-500">Folder:</span> <span className="ml-1">{template.folder}</span></div>
            )}
          </div>
        </div>

        {/* Usage Stats */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Usage Statistics</h4>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Times Used:</span> <span className="ml-1 font-medium">{template.usage.timesUsed}</span></div>
            <div><span className="text-gray-500">Last Used:</span> <span className="ml-1">{template.usage.lastUsed ? new Date(template.usage.lastUsed).toLocaleDateString() : 'Never'}</span></div>
            <div><span className="text-gray-500">Average Rating:</span> <span className="ml-1">{template.usage.averageRating?.toFixed(1) || 'N/A'}</span></div>
            <div><span className="text-gray-500">Total Ratings:</span> <span className="ml-1">{template.usage.totalRatings}</span></div>
          </div>
        </div>

        {/* Metadata */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Metadata</h4>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Visibility:</span> <span className="ml-1">{template.isPublic ? 'Public' : 'Private'}</span></div>
            <div><span className="text-gray-500">Owner:</span> <span className="ml-1">{template.owner.name}</span></div>
            <div><span className="text-gray-500">Created:</span> <span className="ml-1">{new Date(template.createdAt).toLocaleDateString()}</span></div>
            <div><span className="text-gray-500">Updated:</span> <span className="ml-1">{new Date(template.updatedAt).toLocaleDateString()}</span></div>
          </div>
        </div>
      </div>

      {/* Tags */}
      {template.tags.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Tags</h4>
          <div className="flex flex-wrap gap-2">
            {template.tags.map((tag: string) => (
              <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Placeholders */}
      {template.placeholders.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Available Placeholders</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {template.placeholders.map((placeholder: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    {`{{${placeholder.name}}}`}
                  </code>
                  {placeholder.required && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Required</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{placeholder.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateContent({ template }: { template: Template }) {
  const [activeContentTab, setActiveContentTab] = useState('formatted');

  return (
    <div className="space-y-6">
      {/* Content Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveContentTab('formatted')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeContentTab === 'formatted'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Formatted View
          </button>
          <button
            onClick={() => setActiveContentTab('raw')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeContentTab === 'raw'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Raw Content
          </button>
        </nav>
      </div>

      {activeContentTab === 'formatted' ? (
        <div className="space-y-4">
          {/* Subject */}
          {template.content.subject && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Subject</h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-900">{template.content.subject}</p>
              </div>
            </div>
          )}

          {/* Preheader */}
          {template.content.preheader && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Preheader</h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-600 text-sm">{template.content.preheader}</p>
              </div>
            </div>
          )}

          {/* Body */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Body</h4>
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: template.content.body.replace(/\n/g, '<br>') }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Raw Content Display */}
          {template.content.subject && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Subject (Raw)</h4>
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto">
                {template.content.subject}
              </pre>
            </div>
          )}
          
          {template.content.preheader && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Preheader (Raw)</h4>
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto">
                {template.content.preheader}
              </pre>
            </div>
          )}
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Body (Raw)</h4>
            <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
              {template.content.body}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateUsage({ template }: { template: Template }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Usage Metrics */}
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Send className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">Total Uses</p>
              <p className="text-2xl font-bold text-blue-900">{template.usage.timesUsed}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-yellow-600">Avg Rating</p>
              <p className="text-2xl font-bold text-yellow-900">
                {template.usage.averageRating?.toFixed(1) || '0.0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Eye className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">Total Ratings</p>
              <p className="text-2xl font-bold text-green-900">{template.usage.totalRatings}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Usage History</h4>
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Usage analytics coming soon</p>
          <p className="text-sm">Track template performance and usage patterns</p>
        </div>
      </div>
    </div>
  );
}

function TemplateSettings({ template, onUpdate }: { template: Template; onUpdate: () => void }) {
  const [settings, setSettings] = useState({
    isPublic: template.isPublic,
    allowComments: true,
    allowRatings: true
  });
  const [saving, setSaving] = useState(false);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await axios.patch(`/templates/${template._id}`, settings);
      toast.success('Settings updated successfully!');
      onUpdate();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update settings';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">Public Template</h4>
            <p className="text-sm text-gray-600">Make this template visible to other users</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.isPublic}
              onChange={(e) => setSettings(prev => ({ ...prev, isPublic: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">Allow Ratings</h4>
            <p className="text-sm text-gray-600">Let users rate this template</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.allowRatings}
              onChange={(e) => setSettings(prev => ({ ...prev, allowRatings: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      <button
        onClick={handleSaveSettings}
        disabled={saving}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

// Supporting Components for Template Editor
function TemplateBasicInfo({ 
  data, 
  onChange, 
  folders, 
  onAddTag, 
  onRemoveTag, 
  newTag, 
  setNewTag 
}: any) {
  const channels = ['email', 'sms', 'whatsapp'];
  const categories = ['marketing', 'transactional', 'notification', 'newsletter'];
  const tones = ['professional', 'casual', 'friendly', 'formal', 'urgent', 'empathetic'];
  const audiences = ['general', 'customers', 'prospects', 'employees', 'partners'];
  const languages = ['en', 'es', 'fr', 'de', 'hi', 'zh'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Template Name */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Template Name *
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange((prev: any) => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter template name"
            required
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={data.description}
            onChange={(e) => onChange((prev: any) => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe what this template is used for"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            value={data.category}
            onChange={(e) => onChange((prev: any) => ({ ...prev, category: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Language
          </label>
          <select
            value={data.language}
            onChange={(e) => onChange((prev: any) => ({ ...prev, language: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {languages.map(lang => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Tone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tone
          </label>
          <select
            value={data.tone}
            onChange={(e) => onChange((prev: any) => ({ ...prev, tone: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {tones.map(tone => (
              <option key={tone} value={tone}>
                {tone.charAt(0).toUpperCase() + tone.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Audience */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Audience
          </label>
          <select
            value={data.audience}
            onChange={(e) => onChange((prev: any) => ({ ...prev, audience: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {audiences.map(audience => (
              <option key={audience} value={audience}>
                {audience.charAt(0).toUpperCase() + audience.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Channels */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Channels *
        </label>
        <div className="flex flex-wrap gap-3">
          {channels.map(channel => (
            <label key={channel} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.channel.includes(channel)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange((prev: any) => ({
                      ...prev,
                      channel: [...prev.channel, channel]
                    }));
                  } else {
                    onChange((prev: any) => ({
                      ...prev,
                      channel: prev.channel.filter((c: string) => c !== channel)
                    }));
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm capitalize">{channel}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Folder */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Folder
        </label>
        <select
          value={data.folder}
          onChange={(e) => onChange((prev: any) => ({ ...prev, folder: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">No folder</option>
          {folders.map((folder: string) => (
            <option key={folder} value={folder}>{folder}</option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <div className="space-y-3">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onAddTag()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a tag"
            />
            <button
              type="button"
              onClick={onAddTag}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => onRemoveTag(tag)}
                    className="ml-2 text-blue-500 hover:text-blue-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateContentEditor({ data, onChange }: any) {
  return (
    <div className="space-y-6">
      {/* Subject (for email templates) */}
      {data.channel.includes('email') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject Line
          </label>
          <input
            type="text"
            value={data.content.subject}
            onChange={(e) => onChange((prev: any) => ({
              ...prev,
              content: { ...prev.content, subject: e.target.value }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter email subject"
          />
        </div>
      )}

      {/* Preheader (for email templates) */}
      {data.channel.includes('email') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preheader Text (Optional)
          </label>
          <input
            type="text"
            value={data.content.preheader}
            onChange={(e) => onChange((prev: any) => ({
              ...prev,
              content: { ...prev.content, preheader: e.target.value }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Short preview text that appears after subject line"
          />
        </div>
      )}

      {/* Content Body */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Message Content *
        </label>
        <textarea
          value={data.content.body}
          onChange={(e) => onChange((prev: any) => ({
            ...prev,
            content: { ...prev.content, body: e.target.value }
          }))}
          rows={12}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder="Enter your message content here. Use {{variable}} for placeholders."
          required
        />
        <p className="text-sm text-gray-500 mt-2">
          Use double curly braces for placeholders: {"{{name}}, {{company}}, {{date}}"}
        </p>
      </div>

      {/* Character count for SMS */}
      {data.channel.includes('sms') && (
        <div className="text-sm text-gray-500">
          Character count: {data.content.body.length}/160
          {data.content.body.length > 160 && (
            <span className="text-red-500 ml-2">
              Message will be split into multiple SMS
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function TemplatePlaceholders({ placeholders, onAdd, onRemove, newPlaceholder, setNewPlaceholder }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Manage Placeholders</h3>
        <p className="text-sm text-gray-600 mb-4">
          Define variables that can be replaced with actual values when using this template.
        </p>
      </div>

      {/* Add New Placeholder */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Add New Placeholder</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Placeholder Name *
            </label>
            <input
              type="text"
              value={newPlaceholder.name}
              onChange={(e) => setNewPlaceholder((prev: any) => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., name, company, date"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={newPlaceholder.description}
              onChange={(e) => setNewPlaceholder((prev: any) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What this placeholder represents"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newPlaceholder.required}
                onChange={(e) => setNewPlaceholder((prev: any) => ({ ...prev, required: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Required placeholder</span>
            </label>
          </div>
          
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={onAdd}
              disabled={!newPlaceholder.name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Add Placeholder
            </button>
          </div>
        </div>
      </div>

      {/* Existing Placeholders */}
      {placeholders.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Current Placeholders</h4>
          <div className="space-y-3">
            {placeholders.map((placeholder: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {`{{${placeholder.name}}}`}
                    </code>
                    {placeholder.required && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Required</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{placeholder.description}</p>
                </div>
                <button
                  onClick={() => onRemove(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateAdvancedSettings({ data, onChange }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h3>
      </div>

      <div className="space-y-4">
        {/* Public Template */}
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">Public Template</h4>
            <p className="text-sm text-gray-600">Make this template available to other users</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={data.isPublic}
              onChange={(e) => onChange((prev: any) => ({ ...prev, isPublic: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
}

// Additional Supporting Components
function TemplateDetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
      <div className="h-4 bg-gray-300 rounded w-1/2 mb-6"></div>
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-300 rounded"></div>
        ))}
      </div>
    </div>
  );
}

function TemplateEditorSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            <div className="h-4 bg-gray-300 rounded w-1/5 mb-2"></div>
            <div className="h-10 bg-gray-300 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplatePreviewModal({ isOpen, onClose, template }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Template Preview</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">{template.name}</h3>
              <p className="text-gray-600 text-sm">{template.description}</p>
            </div>
            
            {template.content?.subject && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <div className="p-3 bg-gray-50 rounded border">{template.content.subject}</div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <div className="p-3 bg-gray-50 rounded border whitespace-pre-wrap">
                {template.content?.body || 'No content'}
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Category: {template.category}</span>
              <span>Language: {template.language?.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}