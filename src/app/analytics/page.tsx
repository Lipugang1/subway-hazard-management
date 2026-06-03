'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building2, 
  ShieldAlert,
  ArrowLeft,
  PieChart as PieChartIcon,
  Activity,
  Sparkles,
  Loader2
} from 'lucide-react';
import { authFetch } from '@/lib/api-client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

interface AnalyticsData {
  summary: {
    total: number;
    departments: number;
    inspectors: number;
    teams: number;
    avgPerDepartment: number;
  };
  departmentStats: Record<string, number>;
  departmentDetail: Array<{
    name: string;
    count: number;
    inspectors: number;
    inspectorNames: string[];
    byLevel: Record<string, number>;
  }>;
  lineStats: Record<string, number>;
  levelStats: Record<string, number>;
  statusStats: Record<string, number>;
  inspectorStats: Array<{
    name: string;
    employee_id: string;
    department: string;
    count: number;
  }>;
  teamStats: Record<string, number>;
  teamParticipation: Array<{
    team: string;
    members: Array<{ name: string; count: number; percentage: number }>;
  }>;
  monthlyTrend: Array<{ month: string; count: number }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const STATUS_COLORS: Record<string, string> = {
  '草稿': '#94a3b8',
  '已上报': '#3b82f6',
  '审核中': '#8b5cf6',
  '审核通过': '#10b981',
  '已驳回': '#ef4444',
  '治理中': '#f59e0b',
  '已关闭': '#6b7280',
};

export default function AnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'all' | 'month'>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await authFetch(`/api/analytics?period=${period}`);
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user, period]);

  const generateAiAnalysis = async () => {
    if (!user || aiLoading) return;
    setAiLoading(true);
    setAiGenerated(false);
    setAiAnalysis('');
    try {
      const response = await authFetch('/api/ai/monthly-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      if (result.success && result.data?.analysis) {
        setAiAnalysis(result.data.analysis);
      } else {
        setAiAnalysis(result.error || '分析生成失败，请稍后重试');
      }
    } catch (error) {
      console.error('Failed to generate AI analysis:', error);
      setAiAnalysis('分析生成失败，请稍后重试');
    } finally {
      setAiLoading(false);
      setAiGenerated(true);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">只有管理员才能查看数据分析</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard')}>
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const departmentChartData = Object.entries(data.departmentStats)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const levelChartData = Object.entries(data.levelStats).map(([name, value]) => ({ name, value }));
  const statusChartData = Object.entries(data.statusStats).map(([name, value]) => ({ name, value }));

  const periodLabel = period === 'month' ? '当月' : '全部';

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* 头部 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              隐患数据分析
            </h1>
            <p className="text-sm text-muted-foreground mt-1">数据统计与可视化分析</p>
          </div>
        </div>
        
        {/* 时间范围切换 */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as 'all' | 'month')}>
          <TabsList>
            <TabsTrigger value="all">全部数据</TabsTrigger>
            <TabsTrigger value="month">当月数据</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* AI 月度分析报告 */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-primary" />
            AI 月度隐患分析报告
          </CardTitle>
          <CardDescription>基于当月隐患数据，由AI智能生成整改情况分析</CardDescription>
        </CardHeader>
        <CardContent>
          {!aiGenerated && !aiLoading && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">点击下方按钮，AI将为您分析当月隐患整改情况</p>
              <Button onClick={generateAiAnalysis} className="gap-2">
                <Sparkles className="w-4 h-4" />
                生成月度分析报告
              </Button>
            </div>
          )}
          {aiLoading && (
            <div className="flex items-center justify-center py-8 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">AI正在分析隐患数据，请稍候...</span>
            </div>
          )}
          {aiGenerated && !aiLoading && (
            <div className="space-y-3">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {aiAnalysis.split('\n').map((line, i) => {
                  if (line.startsWith('## ')) {
                    return <h3 key={i} className="text-base font-semibold mt-4 mb-2 flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" />{line.replace('## ', '')}</h3>;
                  }
                  if (line.startsWith('# ')) {
                    return <h2 key={i} className="text-lg font-bold mt-4 mb-2">{line.replace('# ', '')}</h2>;
                  }
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={i} className="font-semibold text-foreground">{line.replace(/\*\*/g, '')}</p>;
                  }
                  if (line.trim() === '') return <br key={i} />;
                  return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</p>;
                })}
              </div>
              <div className="pt-3 border-t flex justify-end">
                <Button variant="outline" size="sm" onClick={generateAiAnalysis} className="gap-1">
                  <Sparkles className="w-3 h-3" />
                  重新生成
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">隐患总数</CardTitle>
            <ShieldAlert className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.total}</div>
            <p className="text-xs text-muted-foreground">{periodLabel}统计</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">参与部门</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.departments}</div>
            <p className="text-xs text-muted-foreground">{periodLabel}统计</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">排查班组</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.teams}</div>
            <p className="text-xs text-muted-foreground">{periodLabel}统计</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">排查人员</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.inspectors}</div>
            <p className="text-xs text-muted-foreground">{periodLabel}统计</p>
          </CardContent>
        </Card>
      </div>

      {/* 月度趋势 - 始终展示全部数据 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-emerald-600" />
            月度趋势
          </CardTitle>
          <CardDescription>最近6个月隐患上报趋势（全部数据）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="隐患数量" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 部门隐患分布 + 隐患等级分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-blue-600" />
              部门隐患分布
            </CardTitle>
            <CardDescription>{periodLabel}各部门隐患数量</CardDescription>
          </CardHeader>
          <CardContent>
            {departmentChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" name="隐患数量" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">暂无数据</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChartIcon className="w-5 h-5 mr-2 text-amber-600" />
              隐患等级分布
            </CardTitle>
            <CardDescription>{periodLabel}隐患等级占比</CardDescription>
          </CardHeader>
          <CardContent>
            {levelChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={levelChartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {levelChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">暂无数据</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 隐患状态分布 + 班组参与度 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2 text-purple-600" />
              隐患状态分布
            </CardTitle>
            <CardDescription>{periodLabel}各状态隐患数量</CardDescription>
          </CardHeader>
          <CardContent>
            {statusChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="数量">
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">暂无数据</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2 text-cyan-600" />
              班组隐患排查参与度
            </CardTitle>
            <CardDescription>{periodLabel}各班组隐患排查数量与成员参与情况</CardDescription>
          </CardHeader>
          <CardContent>
            {data.teamParticipation.length > 0 ? (
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {data.teamParticipation.map((team) => (
                  <div key={team.team} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{team.team}</span>
                      <Badge variant="secondary">{team.members.reduce((s, m) => s + m.count, 0)} 条</Badge>
                    </div>
                    <div className="space-y-1">
                      {team.members.map((member) => (
                        <div key={member.name} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-20 truncate">{member.name}</span>
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div 
                              className="bg-cyan-500 h-2 rounded-full transition-all" 
                              style={{ width: `${member.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-16 text-right">{member.count}条 ({member.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">暂无数据</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 排查人员排行榜 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-rose-600" />
            排查人员排行榜
          </CardTitle>
          <CardDescription>{periodLabel}排查隐患数量排行</CardDescription>
        </CardHeader>
        <CardContent>
          {data.inspectorStats.length > 0 ? (
            <div className="space-y-3">
              {data.inspectorStats.slice(0, 10).map((inspector, index) => (
                <div key={inspector.employee_id || inspector.name} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-100 text-gray-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{inspector.name}</span>
                      <Badge variant="secondary">{inspector.count} 条</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{inspector.department}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">暂无数据</p>
          )}
        </CardContent>
      </Card>

      {/* 部门详细数据 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
            部门详细数据
          </CardTitle>
          <CardDescription>点击部门查看详细信息</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.departmentDetail.map((dept) => (
              <div 
                key={dept.name}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  selectedDepartment === dept.name 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedDepartment(
                  selectedDepartment === dept.name ? null : dept.name
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{dept.name}</h3>
                  <Badge variant="secondary">{dept.count} 条</Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>排查人员：{dept.inspectors} 人</p>
                  <p>参与人员：{dept.inspectorNames.slice(0, 2).join('、')}{dept.inspectorNames.length > 2 ? '...' : ''}</p>
                </div>
                {selectedDepartment === dept.name && dept.byLevel && (
                  <div className="mt-3 pt-3 border-t space-y-1">
                    <p className="text-xs font-medium">隐患等级分布：</p>
                    {Object.entries(dept.byLevel).map(([level, count]) => (
                      <div key={level} className="flex justify-between text-xs">
                        <span>{level}</span>
                        <span className="font-medium">{count} 条</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
