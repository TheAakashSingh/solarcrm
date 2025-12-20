import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { reportsAPI } from '@/lib/api';
import { STATUS_LIST } from '@/types/crm';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { 
  TrendingUp, 
  IndianRupee, 
  Package, 
  Users,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

const COLORS = [
  'hsl(220, 70%, 50%)',
  'hsl(280, 70%, 50%)',
  'hsl(200, 70%, 50%)',
  'hsl(150, 70%, 40%)',
  'hsl(35, 90%, 50%)',
  'hsl(180, 60%, 45%)',
  'hsl(160, 70%, 40%)',
  'hsl(340, 70%, 50%)',
  'hsl(120, 60%, 40%)',
  'hsl(142, 70%, 35%)',
];

export default function Reports() {
  const [reportsData, setReportsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const response = await reportsAPI.getAll();
        if (response.success && response.data) {
          setReportsData(response.data);
        }
      } catch (error) {
        console.error('Error fetching reports:', error);
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading || !reportsData) {
    return (
      <MainLayout>
        <Header 
          title="Reports & Analytics"
          subtitle="Loading..."
          showNewEnquiry={false}
        />
        <div className="p-6">
          <div className="text-center py-12">Loading reports...</div>
        </div>
      </MainLayout>
    );
  }

  const metrics = reportsData.metrics || {};
  const statusDistribution = reportsData.statusDistribution || [];
  const materialTypeDistribution = reportsData.materialTypeDistribution || [];
  const monthlyTrend = reportsData.monthlyTrend || [];
  const topClients = reportsData.topClients || [];

  // Status distribution
  const statusData = STATUS_LIST.map((status, index) => {
    const statusItem = statusDistribution.find((s: any) => s.status === status);
    return {
      name: status.replace(/([A-Z])/g, ' $1').trim(),
      value: statusItem?.count || 0,
      fill: COLORS[index]
    };
  }).filter(d => d.value > 0);

  // Material type distribution
  const materialData = materialTypeDistribution.map((item: any) => ({
    name: item.materialType,
    count: item.count,
    value: item.value
  }));

  // Top clients by value
  const clientValues = topClients.map((client: any) => ({
    name: ((client as any).clientName || client.client_name || 'Unknown').split(' ')[0],
    value: client.totalValue || client.total_value || 0
  })).sort((a, b) => b.value - a.value);

  // Metrics
  const totalValue = metrics.totalValue || 0;
  const totalEnquiries = metrics.totalEnquiries || 0;
  const avgOrderValue = metrics.avgOrderValue || 0;
  const activeOrders = metrics.activeOrders || 0;
  const totalClients = metrics.totalClients || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
      notation: 'compact'
    }).format(amount);
  };

  const formatLakh = (value: number) => {
    return `₹${(value / 100000).toFixed(1)}L`;
  };

  return (
    <MainLayout>
      <Header 
        title="Reports & Analytics"
        subtitle="Business performance overview"
        showNewEnquiry={false}
      />

      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Total Pipeline Value</p>
                  <p className="text-3xl font-bold mt-1">{formatCurrency(totalValue)}</p>
                </div>
                <IndianRupee className="h-8 w-8 opacity-50" />
              </div>
              <div className="flex items-center gap-1 mt-4 text-sm opacity-80">
                <ArrowUp className="h-4 w-4" />
                <span>12% from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Enquiries</p>
                  <p className="text-3xl font-bold mt-1">{totalEnquiries || 0}</p>
                </div>
                <Package className="h-8 w-8 text-accent" />
              </div>
              <div className="flex items-center gap-1 mt-4 text-sm text-green-600">
                <ArrowUp className="h-4 w-4" />
                <span>8 new this month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Order Value</p>
                  <p className="text-3xl font-bold mt-1">{formatCurrency(avgOrderValue)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-accent" />
              </div>
              <div className="flex items-center gap-1 mt-4 text-sm text-green-600">
                <ArrowUp className="h-4 w-4" />
                <span>5% increase</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Clients</p>
                  <p className="text-3xl font-bold mt-1">{totalClients}</p>
                </div>
                <Users className="h-8 w-8 text-accent" />
              </div>
              <div className="flex items-center gap-1 mt-4 text-sm text-green-600">
                <ArrowUp className="h-4 w-4" />
                <span>2 new this month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Order Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} orders`, 'Count']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Material Type Value */}
          <Card>
            <CardHeader>
              <CardTitle>Value by Material Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={materialData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatLakh(value)} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Value']}
                  />
                  <Bar dataKey="value" fill="hsl(32, 95%, 44%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Enquiry Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `₹${v}L`} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="enquiries" 
                    stroke="hsl(222, 47%, 20%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(222, 47%, 20%)' }}
                    name="Enquiries"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(32, 95%, 44%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(32, 95%, 44%)' }}
                    name="Value (Lakhs)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Clients */}
          <Card>
            <CardHeader>
              <CardTitle>Top Clients by Order Value</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={clientValues} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(value) => formatLakh(value)} />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Total Value']}
                  />
                  <Bar dataKey="value" fill="hsl(222, 47%, 20%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
