import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Users, 
  CreditCard, 
  Banknote, 
  AlertTriangle,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight
} from 'lucide-react';

export default function Dashboard() {
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api().get('/dashboard/stats');
        setStats(res.data);
      } catch (err) {
        toast.error('Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [api]);

  const statCards = [
    {
      title: 'Total Customers',
      value: stats?.total_customers || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100'
    },
    {
      title: 'Open Loans',
      value: stats?.open_loans || 0,
      icon: CreditCard,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-100'
    },
    {
      title: 'Total Outstanding',
      value: `R${(stats?.total_outstanding || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      icon: Banknote,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100'
    },
    {
      title: 'Paid Loans',
      value: stats?.paid_loans || 0,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100'
    }
  ];

  const fraudAlerts = [
    {
      title: 'Quick-Close Alerts',
      count: stats?.quick_close_alerts || 0,
      description: 'Loans created and paid same day',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    },
    {
      title: 'Duplicate Customers',
      count: stats?.duplicate_customer_alerts || 0,
      description: 'Customers with multiple loans',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome back, {user?.full_name}
          </p>
        </div>
        <Button 
          onClick={() => navigate('/loans/new')}
          className="bg-red-600 hover:bg-red-700 gap-2"
          data-testid="new-loan-btn"
        >
          <Plus className="w-4 h-4" />
          New Loan
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className={`border ${stat.borderColor} shadow-sm`} data-testid={`stat-card-${index}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className={`text-2xl font-heading font-bold mt-1 ${stat.color}`}>
                    {loading ? '...' : stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} strokeWidth={1.5} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fraud Alerts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fraud Alerts */}
        <Card className="lg:col-span-2 border-gray-200 shadow-sm" data-testid="fraud-alerts-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-heading flex items-center gap-2 text-gray-900">
              <AlertTriangle className="w-5 h-5 text-amber-500" strokeWidth={1.5} />
              Fraud Detection Alerts
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/fraud-alerts')}
              className="text-gray-500"
              data-testid="view-all-alerts-btn"
            >
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fraudAlerts.map((alert, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border ${alert.bgColor} ${alert.borderColor} ${alert.count > 0 ? 'animate-shake' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center border ${alert.borderColor}`}>
                      <span className={`text-lg font-bold font-mono ${alert.color}`}>{alert.count}</span>
                    </div>
                    <div>
                      <p className={`font-medium ${alert.color}`}>{alert.title}</p>
                      <p className="text-xs text-gray-500">{alert.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-gray-200 shadow-sm" data-testid="quick-actions-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-heading flex items-center gap-2 text-gray-900">
              <Clock className="w-5 h-5 text-red-500" strokeWidth={1.5} />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 border-gray-200 hover:bg-gray-50"
              onClick={() => navigate('/customers')}
              data-testid="quick-new-customer-btn"
            >
              <Users className="w-4 h-4 text-blue-600" /> New Customer
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 border-gray-200 hover:bg-gray-50"
              onClick={() => navigate('/loans/new')}
              data-testid="quick-new-loan-btn"
            >
              <CreditCard className="w-4 h-4 text-red-600" /> New Loan
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 border-gray-200 hover:bg-gray-50"
              onClick={() => navigate('/loans')}
              data-testid="quick-view-loans-btn"
            >
              <Banknote className="w-4 h-4 text-amber-600" /> Loan Register
            </Button>
            {['manager', 'admin'].includes(user?.role) && (
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 border-gray-200 hover:bg-gray-50"
                onClick={() => navigate('/export')}
                data-testid="quick-export-btn"
              >
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Export Data
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
