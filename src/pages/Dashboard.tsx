import { useEffect, useState } from "react";
import { User, UsersRound, Table2, CalendarClock, Database, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import DashboardCard from "@/components/DashboardCard";
import { 
  CartesianGrid, 
  Line, 
  LineChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts";
import { getDashboardStats } from '@/services/dashboardService';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, admin! Here's what's happening.
          </p>
        </div>
        <div className="animated-bg p-4 rounded-lg">
          <div className="relative z-10 flex items-center gap-3 text-white">
            <div>
              <p className="text-sm font-semibold">CCS CAMPUS</p>
              <p className="text-xs">Sonipat</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Students"
          value={stats?.totalStudents ?? "-"}
          description={`${stats?.activeStudents ?? 0} active students`}
          icon={<UsersRound className="h-4 w-4 text-primary" />}
        />
        <DashboardCard
          title="Active Courses"
          value={stats?.activeCourses ?? "-"}
          description="Currently running courses"
          icon={<Table2 className="h-4 w-4 text-accent" />}
        />
        <DashboardCard
          title="Total Fees Collected"
          value={stats?.totalFeesCollected ? `₹${stats.totalFeesCollected.toLocaleString('en-IN')}` : "-"}
          description={`₹${stats?.totalFeesDue.toLocaleString('en-IN')} due`}
          icon={<Database className="h-4 w-4 text-green-500" />}
        />
        <DashboardCard
          title="Due Payments"
          value={stats?.duePayments ? `₹${stats.duePayments.toLocaleString('en-IN')}` : "-"}
          description={stats?.dueStudents ? `From ${stats.dueStudents} students` : ""}
          icon={<FileText className="h-4 w-4 text-destructive" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium">Monthly Attendance</h3>
              <p className="text-sm text-muted-foreground">
                Average attendance over the past 7 months
              </p>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats?.attendanceHistory}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="attendance"
                    stroke="hsl(var(--primary))"
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium">Quick Stats</h3>
              <p className="text-sm text-muted-foreground">Current semester overview</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Overall Attendance</span>
                  <span className="text-sm font-medium">{loading ? "Loading..." : `${stats?.overallAttendance ?? 0}%`}</span>
                </div>
                <Progress 
                  value={stats?.overallAttendance ?? 0} 
                  className={cn("h-2", loading && "animate-pulse")}
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Fee Collection</span>
                  <span className="text-sm font-medium">{loading ? "Loading..." : `${stats?.feeCollection ?? 0}%`}</span>
                </div>
                <Progress 
                  value={stats?.feeCollection ?? 0} 
                  className={cn("h-2", loading && "animate-pulse")}
                />
              </div>

              <div className="pt-4">
                <h4 className="text-sm font-medium mb-3">Recent Activities</h4>
                <div className="space-y-3">
                  {loading ? (
                    Array(3).fill(0).map((_, i) => (
                      <div key={i} className="flex items-start gap-3 animate-pulse">
                        <div className="bg-muted p-2 rounded-full h-7 w-7" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    ))
                  ) : stats?.recentActivities?.length > 0 ? (
                    stats.recentActivities.map((activity: any, index: number) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          activity.type === 'student' && "bg-primary/10",
                          activity.type === 'attendance' && "bg-accent/10",
                          activity.type === 'payment' && "bg-green-500/10"
                        )}>
                          {activity.type === 'student' && <User className="h-3 w-3 text-primary" />}
                          {activity.type === 'attendance' && <CalendarClock className="h-3 w-3 text-accent" />}
                          {activity.type === 'payment' && <Database className="h-3 w-3 text-green-500" />}
                        </div>
                        <div>
                          <p className="text-sm">{activity.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent activities</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
