'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Train,
  LogOut,
  Plus,
  Search,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Settings
} from 'lucide-react';
import { formatDate, getStatusLabel, getStatusColor } from '@/lib/helpers';
import { authFetch } from '@/lib/api-client';
import { AppHeader } from '@/components/app-header';
import type { HazardRecord } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [recentHazards, setRecentHazards] = useState<HazardRecord[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    closed: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await authFetch('/api/hazards?pageSize=5');
      const data = await res.json();
      if (data.success) {
        setRecentHazards(data.data.items);
      }

      const statsRes = await authFetch('/api/hazards/stats');
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats({
          total: statsData.data.total,
          pending: statsData.data.pending,
          processing: statsData.data.inProgress,
          closed: statsData.data.closed
        });
      }
    } catch (error) {
      console.error('获取首页数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="container mx-auto px-4 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">隐患总数</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">待审核</p>
                  <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">治理中</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.processing}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">已关闭</p>
                  <p className="text-3xl font-bold text-green-600">{stats.closed}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 快捷操作 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Link href="/hazards/new">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6 flex flex-col items-center justify-center h-32">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-3">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <p className="font-medium">上报隐患</p>
                <p className="text-sm text-muted-foreground">智能识别 + AI辅助</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/hazards">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6 flex flex-col items-center justify-center h-32">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mb-3">
                  <Search className="w-6 h-6 text-white" />
                </div>
                <p className="font-medium">查询隐患</p>
                <p className="text-sm text-muted-foreground">多维度筛选导出</p>
              </CardContent>
            </Card>
          </Link>

          {(user?.role === 'admin' || user?.role === 'reviewer') && (
            <Link href="/admin">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="pt-6 flex flex-col items-center justify-center h-32">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-medium">审核管理</p>
                  <p className="text-sm text-muted-foreground">隐患审核与派发</p>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>

        {/* 最近隐患记录 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>最近隐患记录</CardTitle>
              <Link href="/hazards">
                <Button variant="ghost" size="sm">查看全部</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : recentHazards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无隐患记录，点击上方「上报隐患」开始排查
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>序号</TableHead>
                    <TableHead>排查日期</TableHead>
                    <TableHead>排查地点</TableHead>
                    <TableHead>隐患描述</TableHead>
                    <TableHead>隐患等级</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentHazards.map((hazard) => (
                    <TableRow key={hazard.id}>
                      <TableCell className="font-medium">{hazard.serial_number}</TableCell>
                      <TableCell>{formatDate(hazard.inspection_date)}</TableCell>
                      <TableCell className="max-w-xs truncate">{hazard.inspection_location}</TableCell>
                      <TableCell className="max-w-xs truncate">{hazard.hazard_description}</TableCell>
                      <TableCell>
                        <Badge variant={hazard.hazard_level === 'general_i' ? 'destructive' : 'secondary'}>
                          {hazard.hazard_level === 'general_i' ? 'I级' : 'II级'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(hazard.status)}>
                          {getStatusLabel(hazard.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
