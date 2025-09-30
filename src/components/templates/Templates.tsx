import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
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
  Tag
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
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

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
      const response = await axios.post(`/templates/${templateId}/duplicate`, {
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
  const [showActions, setShowActions] = useState(false);

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

// Template Detail Component (placeholder)
function TemplateDetail() {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-900">Template Detail</h2>
      <p className="text-gray-600">Template detail view coming soon...</p>
    </div>
  );
}

// Template Editor Component (placeholder)
function TemplateEditor() {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-900">Template Editor</h2>
      <p className="text-gray-600">Template editor coming soon...</p>
    </div>
  );
}