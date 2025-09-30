import { useState, useEffect } from 'react';
import { 
  Wand2, 
  FileText, 
  Send, 
  TrendingUp, 
  Users, 
  Mail, 
  ArrowUp,
  ArrowDown,
  Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

interface DashboardStats {
  overview: {
    totalTemplates: number;
    totalGenerations: number;
    totalSends: number;
    totalRecipients: number;
    totalCost: number;
  };
  performance: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  };
  trends: Array<{
    date: string;
    generations: number;
    sends: number;
    recipients: number;
    delivered: number;
    opened: number;
    clicked: number;
    deliveryRate: number;
    openRate: number;
  }>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchDashboardStats();
  }, [timeRange]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/analytics/dashboard?timeRange=${timeRange}`);
      setStats(response.data.data.dashboard);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, trendLabel, color }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: number;
    trendLabel?: string;
    color: string;
  }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center mt-2">
              {trend > 0 ? (
                <ArrowUp className="h-4 w-4 text-emerald-500 mr-1" />
              ) : trend < 0 ? (
                <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
              ) : null}
              <span className={`text-sm ${
                trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trend > 0 ? '+' : ''}{trend}% {trendLabel}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  const QuickAction = ({ title, description, icon: Icon, color, onClick }: {
    title: string;
    description: string;
    icon: any;
    color: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all transform hover:scale-[1.02] text-left w-full"
    >
      <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </button>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your message campaigns
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Templates"
          value={stats?.overview.totalTemplates || 0}
          icon={FileText}
          color="bg-blue-500"
        />
        
        <StatCard
          title="Messages Generated"
          value={stats?.overview.totalGenerations || 0}
          icon={Wand2}
          color="bg-emerald-500"
        />
        
        <StatCard
          title="Campaigns Sent"
          value={stats?.overview.totalSends || 0}
          icon={Send}
          color="bg-purple-500"
        />
        
        <StatCard
          title="Total Recipients"
          value={stats?.overview.totalRecipients?.toLocaleString() || 0}
          icon={Users}
          color="bg-amber-500"
        />
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Performance Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats?.performance.deliveryRate?.toFixed(1) || '0.0'}%
            </div>
            <p className="text-sm text-gray-600">Delivery Rate</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats?.performance.openRate?.toFixed(1) || '0.0'}%
            </div>
            <p className="text-sm text-gray-600">Open Rate</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats?.performance.clickRate?.toFixed(1) || '0.0'}%
            </div>
            <p className="text-sm text-gray-600">Click Rate</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickAction
            title="Generate New Message"
            description="Create AI-powered messages for your campaigns"
            icon={Wand2}
            color="bg-gradient-to-r from-blue-500 to-emerald-500"
            onClick={() => window.location.href = '/generator'}
          />
          
          <QuickAction
            title="Browse Templates"
            description="Manage your message templates and create new ones"
            icon={FileText}
            color="bg-gradient-to-r from-purple-500 to-pink-500"
            onClick={() => window.location.href = '/templates'}
          />
          
          <QuickAction
            title="Send Campaign"
            description="Launch a new message campaign to your audience"
            icon={Send}
            color="bg-gradient-to-r from-amber-500 to-orange-500"
            onClick={() => window.location.href = '/campaigns'}
          />
          
          <QuickAction
            title="View Analytics"
            description="Track performance and insights for your campaigns"
            icon={TrendingUp}
            color="bg-gradient-to-r from-emerald-500 to-teal-500"
            onClick={() => window.location.href = '/analytics'}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
        
        <div className="space-y-4">
          {stats?.trends?.slice(-5).reverse().map((day, index) => (
            <div key={day.date} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(day.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {day.generations} generations, {day.sends} sends
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {day.recipients.toLocaleString()} recipients
                </p>
                <p className="text-xs text-gray-500">
                  {day.openRate.toFixed(1)}% open rate
                </p>
              </div>
            </div>
          ))}
          
          {(!stats?.trends || stats.trends.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No recent activity to display</p>
              <p className="text-sm">Start generating messages to see your activity here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}