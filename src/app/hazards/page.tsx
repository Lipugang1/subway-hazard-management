'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Train, Plus, Search, Download, ChevronLeft, ChevronRight, ChevronDown, Edit3, CheckCircle, AlertTriangle, Check, ChevronsUpDown } from 'lucide-react';
import { formatDate, getStatusLabel, getStatusColor, getHazardLevelLabel, getHazardLevelColor } from '@/lib/helpers';
import { authFetch } from '@/lib/api-client';
import { calculateDeadlineWarning, getDaysUntilDeadline, WARNING_BEFORE_DEADLINE } from '@/lib/utils';
import { toast } from 'sonner';
import type { HazardRecord, HazardLevel, HazardQueryParams } from '@/types';

export default function HazardsPage() {
  const { user } = useAuth();
  const [hazards, setHazards] = useState<HazardRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 0 });
  
  // Filters
  const [filters, setFilters] = useState<HazardQueryParams>({
    page: 1,
    pageSize: 10,
    startDate: '',
    endDate: '',
    inspectionDepartment: '',
    status: undefined,
    hazardLevel: undefined,
    keyword: '',
    inspectionTeam: 'all',
    inspectorName: 'all'
  });

  // 部门列表
  const departments = [
    { value: 'all', label: '全部部门' },
    { value: '安全生产部', label: '安全生产部' },
    { value: '物资仓储部', label: '物资仓储部' },
    { value: '后勤场段部', label: '后勤场段部' },
    { value: '综合部', label: '综合部' }
  ];

  // 班组-部门映射
  const TEAMS_BY_DEPARTMENT: Record<string, string[]> = {
    '物资仓储部': ['东部储运工班', '西部储运工班', '南部储运工班'],
    '后勤场段部': ['场段管理一组', '场段管理二组', '场段管理三组', '场段管理四组', '场段管理五组', '场段管理六组', '场段管理七组', '场段管理八组'],
  };

  // 班组列表（从数据中动态获取）
  const [teamOptions, setTeamOptions] = useState<{ value: string; label: string }[]>([]);
  // 人员列表（从用户API获取）
  const [personOptions, setPersonOptions] = useState<{ value: string; label: string }[]>([]);
  const [personPopoverOpen, setPersonPopoverOpen] = useState(false);
  const [teamPopoverOpen, setTeamPopoverOpen] = useState(false);

  const [selectedHazard, setSelectedHazard] = useState<HazardRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // 治理信息编辑表单
  const [editForm, setEditForm] = useState({
    governance_result: '',
    governance_details: '',
    reviewer_name: ''
  });
  
  // 确认复核复选框
  const [confirmReview, setConfirmReview] = useState(false);
  
  // 完整编辑表单
  const [fullEditForm, setFullEditForm] = useState({
    inspection_location: '',
    line: '',
    hazard_description: '',
    hazard_level: 'general_i' as HazardLevel,
    hazard_category: '',
    temporary_measures: '',
    governance_department: '',
    cooperating_department: '',
    governance_person: '',
    governance_measure: '',
    governance_deadline: '',
    governance_result: '',
    governance_details: '',
    reviewer_name: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [isFullEditMode, setIsFullEditMode] = useState(false);

  const fetchHazards = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', filters.page.toString());
      params.set('pageSize', filters.pageSize.toString());
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.inspectionDepartment && filters.inspectionDepartment !== 'all') {
        params.set('inspectionDepartment', filters.inspectionDepartment);
      }
      if (filters.inspectionTeam && filters.inspectionTeam !== 'all') {
        params.set('inspectionTeam', filters.inspectionTeam);
      }
      if (filters.inspectorName && filters.inspectorName !== 'all') {
        params.set('inspectorName', filters.inspectorName);
      }
      if (filters.status) params.set('status', filters.status);
      if (filters.hazardLevel) params.set('hazardLevel', filters.hazardLevel);
      if (filters.keyword) params.set('keyword', filters.keyword);

      const res = await authFetch(`/api/hazards?${params.toString()}`);
      const data = await res.json();
      
      if (data.success) {
        setHazards(data.data.items);
        setPagination(data.data);
        
        // 人员选项从用户API获取，班组也从用户API获取
      }
    } catch (error) {
      console.error('Failed to fetch hazards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHazards();
  }, [filters]);

  const handleFilterChange = (key: keyof HazardQueryParams, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  // 从用户API获取人员和班组选项
  const [allUsers, setAllUsers] = useState<any[]>([]);
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await authFetch('/api/admin/users?pageSize=999');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            const users = Array.isArray(data.data) ? data.data : (data.data.users || []);
            setAllUsers(users);
            setPersonOptions(
              users.map((u: any) => ({ 
                value: u.name, 
                label: `${u.name}${u.inspection_department ? ' (' + u.inspection_department + ')' : ''}`
              }))
            );
            // 从用户数据中提取班组列表
            const teamSet = new Set<string>();
            users.forEach((u: { inspection_team?: string }) => {
              if (u.inspection_team) teamSet.add(u.inspection_team);
            });
            setTeamOptions([
              { value: 'all', label: '全部班组' },
              ...Array.from(teamSet).map(t => ({ value: t, label: t }))
            ]);
          }
        }
      } catch {
        // 静默失败
      }
    };
    fetchUsers();
  }, []);

  // 当部门筛选变化时，更新人员选项
  useEffect(() => {
    if (allUsers.length === 0) return;
    const currentDept = filters.inspectionDepartment;
    const filtered = currentDept && currentDept !== 'all'
      ? allUsers.filter((u: any) => u.inspection_department === currentDept)
      : allUsers;
    setPersonOptions(
      filtered.map((u: { name: string; employee_id: string; inspection_department?: string }) => ({ 
        value: u.name, 
        label: currentDept && currentDept !== 'all' ? u.name : `${u.name}${u.inspection_department ? ' (' + u.inspection_department + ')' : ''}`
      }))
    );
    // 如果当前选中的人员不在筛选后的列表中，重置为全部人员
    if (filters.inspectorName && filters.inspectorName !== 'all') {
      const exists = filtered.some((u: any) => u.name === filters.inspectorName);
      if (!exists) {
        handleFilterChange('inspectorName', 'all');
      }
    }
  }, [filters.inspectionDepartment, allUsers]);

  // 当部门筛选变化时，更新班组选项
  useEffect(() => {
    const currentDept = filters.inspectionDepartment;
    if (currentDept && currentDept !== 'all' && TEAMS_BY_DEPARTMENT[currentDept]) {
      setTeamOptions([
        { value: 'all', label: '全部班组' },
        ...TEAMS_BY_DEPARTMENT[currentDept].map(t => ({ value: t, label: t }))
      ]);
    } else {
      // 显示所有部门的班组
      const allTeams: string[] = [];
      Object.values(TEAMS_BY_DEPARTMENT).forEach(teams => {
        teams.forEach(t => {
          if (!allTeams.includes(t)) allTeams.push(t);
        });
      });
      // 也加上用户数据中的班组（避免遗漏）
      allUsers.forEach((u: any) => {
        if (u.inspection_team && !allTeams.includes(u.inspection_team)) {
          allTeams.push(u.inspection_team);
        }
      });
      setTeamOptions([
        { value: 'all', label: '全部班组' },
        ...allTeams.map(t => ({ value: t, label: t }))
      ]);
    }
    // 如果当前选中的班组不在筛选后的列表中，重置
    if (filters.inspectionTeam && filters.inspectionTeam !== 'all') {
      const currentOptions = currentDept && currentDept !== 'all' && TEAMS_BY_DEPARTMENT[currentDept]
        ? TEAMS_BY_DEPARTMENT[currentDept]
        : [];
      if (currentOptions.length > 0 && !currentOptions.includes(filters.inspectionTeam)) {
        handleFilterChange('inspectionTeam', 'all');
      }
    }
  }, [filters.inspectionDepartment, allUsers]);

  const handleExport = async () => {
    try {
      const res = await authFetch('/api/hazards/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });
      
      if (!res.ok) { const ed = await res.json().catch(()=>({})); toast.error(ed?.error||'导出失败，请重试'); return; } const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `隐患排查治理记录_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);toast.success('导出成功');
    } catch (error) {
      console.error('Export failed:', error);toast.error('导出失败，请检查网络连接后重试');
    }
  };

  const handleViewDetail = (hazard: HazardRecord) => {
    setSelectedHazard(hazard);
    // 初始化编辑表单
    setEditForm({
      governance_result: hazard.governance_result || '',
      governance_details: hazard.governance_details || '',
      reviewer_name: hazard.reviewer_name || ''
    });
    setConfirmReview(false); // 重置确认复选框
    setShowDetail(true);
  };

  // 编辑隐患（打开详情页面编辑模式）
  const handleEdit = (hazard: HazardRecord) => {
    setSelectedHazard(hazard);
    // 初始化完整编辑表单
    setFullEditForm({
      inspection_location: hazard.inspection_location || '',
      line: hazard.line || '',
      hazard_description: hazard.hazard_description || '',
      hazard_level: hazard.hazard_level || 'general_i',
      hazard_category: hazard.hazard_category || '',
      temporary_measures: hazard.temporary_measures || '',
      governance_department: hazard.governance_department || '',
      cooperating_department: hazard.cooperating_department || '',
      governance_person: hazard.governance_person || '',
      governance_measure: hazard.governance_measure || '',
      governance_deadline: hazard.governance_deadline || '',
      governance_result: hazard.governance_result || '',
      governance_details: hazard.governance_details || '',
      reviewer_name: hazard.reviewer_name || ''
    });
    // 初始化治理信息表单
    setEditForm({
      governance_result: hazard.governance_result || '',
      governance_details: hazard.governance_details || '',
      reviewer_name: hazard.reviewer_name || ''
    });
    setConfirmReview(false); // 重置确认复选框
    setIsFullEditMode(true);
    setShowDetail(true);
  };
  
  // 保存完整编辑
  const handleSaveFullEdit = async () => {
    if (!selectedHazard) return;
    
    setIsSaving(true);
    try {
      const res = await authFetch(`/api/hazards/${selectedHazard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullEditForm)
      });
      
      const data = await res.json();
      
      if (data.success) {
        // 更新列表中的数据
        setHazards(prev => prev.map(h => 
          h.id === selectedHazard.id ? { ...h, ...fullEditForm } : h
        ));
        // 更新详情中的数据
        setSelectedHazard(prev => prev ? { ...prev, ...fullEditForm } : null);
        setIsFullEditMode(false);
      } else {
        alert(data.error || '保存失败');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 删除隐患
  const handleDelete = async (hazard: HazardRecord) => {
    // 确认删除
    const confirmed = window.confirm(`确定要删除这条隐患记录吗？\n\n排查地点：${hazard.inspection_location}\n隐患描述：${hazard.hazard_description?.substring(0, 50)}...`);
    
    if (!confirmed) return;
    
    try {
      const res = await authFetch(`/api/hazards/${hazard.id}`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      
      if (data.success) {
        // 从列表中移除
        setHazards(prev => prev.filter(h => h.id !== hazard.id));
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('删除失败');
    }
  };

  // 判断是否可以编辑治理信息
  const canEditGovernance = (hazard: HazardRecord | null): boolean => {
    if (!hazard) return false;
    
    // 已关闭的不能编辑
    if (hazard.status === 'closed') return false;
    
    // 上报人或管理员可以编辑
    const isReporter = hazard.inspector_id === user?.employee_id;
    const isAdmin = user?.role === 'admin';
    
    // 检查是否在时限内（上报人需要在时限内）
    if (!isAdmin && hazard.governance_deadline) {
      const deadline = new Date(hazard.governance_deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deadline < today) {
        return false;
      }
    }
    
    return isReporter || isAdmin;
  };
  
  // 判断是否可以完整编辑（管理员可编辑所有，上报人可编辑自己未关闭的隐患）
  const canFullEdit = (hazard: HazardRecord | null): boolean => {
    if (!hazard) return false;
    
    // 已关闭的不能编辑
    if (hazard.status === 'closed') return false;
    
    // 管理员可以编辑所有
    if (user?.role === 'admin') return true;
    
    // 上报人可以编辑自己未关闭的隐患
    if (hazard.inspector_id === user?.employee_id) {
      return true;
    }
    
    return false;
  };

  // 保存治理信息
  const handleSaveGovernance = async () => {
    if (!selectedHazard) return;
    
    setIsSaving(true);
    try {
      // 构建更新数据
      const updateData: any = {
        governance_result: editForm.governance_result,
        governance_details: editForm.governance_details,
        reviewer_name: editForm.reviewer_name
      };
      
      // 如果治理结果为"已整改"，自动更新状态为"已关闭"
      if (editForm.governance_result === '已整改' && selectedHazard.status !== 'closed') {
        updateData.status = 'closed';
      }
      
      const res = await authFetch(`/api/hazards/${selectedHazard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      const data = await res.json();
      
      if (data.success) {
        // 更新列表中的数据
        setHazards(prev => prev.map(h => 
          h.id === selectedHazard.id ? { ...h, ...updateData } : h
        ));
        // 更新详情中的数据
        setSelectedHazard(prev => prev ? { ...prev, ...updateData } : null);
        setShowDetail(false);
      } else {
        alert(data.error || '保存失败');
      }
    } catch (error) {
      console.error('Save governance error:', error);
      alert('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Train className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-semibold">隐患排查治理系统</h1>
                <p className="text-xs text-muted-foreground">物资后勤中心</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">
                {user?.inspection_department} / {user?.inspection_position}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1 h-12">
            <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600">
              首页
            </Link>
            <Link href="/hazards" className="px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
              隐患管理
            </Link>
            <Link href="/risk-database" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600">
              风险数据库
            </Link>
            {(user?.role === 'admin' || user?.role === 'reviewer') && (
              <Link href="/admin" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600">
                管理
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Mobile Filter Toggle */}
        <div className="md:hidden mb-4">
          <Button 
            variant="outline" 
            className="w-full justify-between"
            onClick={() => setShowFilters(!showFilters)}
          >
            <span>筛选条件</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className={`grid grid-cols-1 md:grid-cols-6 gap-4 ${showFilters ? '' : 'hidden md:grid'}`}>
            {/* 管理员可以按部门筛选，非管理员只显示本部门 */}
            {user?.role === 'admin' ? (
              <div className="space-y-2">
                <Label className="text-xs">排查部门</Label>
                <Select 
                  value={filters.inspectionDepartment || 'all'} 
                  onValueChange={(v) => handleFilterChange('inspectionDepartment', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部部门" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs">排查部门</Label>
                <div className="p-2 bg-slate-100 rounded-md text-sm font-medium">
                  {user?.inspection_department}
                </div>
              </div>
            )}
              {/* 班组筛选 */}
              <div className="space-y-2">
                <Label className="text-xs">排查班组</Label>
                <Popover open={teamPopoverOpen} onOpenChange={setTeamPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={teamPopoverOpen}
                      className="w-full justify-between text-sm font-normal"
                    >
                      {filters.inspectionTeam && filters.inspectionTeam !== 'all'
                        ? teamOptions.find(t => t.value === filters.inspectionTeam)?.label || '选择班组'
                        : '全部班组'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="搜索班组..." />
                      <CommandList>
                        <CommandEmpty>未找到班组</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              handleFilterChange('inspectionTeam', 'all');
                              setTeamPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", (!filters.inspectionTeam || filters.inspectionTeam === 'all') ? "opacity-100" : "opacity-0")} />
                            全部班组
                          </CommandItem>
                          {teamOptions.filter(t => t.value !== 'all').map(team => (
                            <CommandItem
                              key={team.value}
                              value={team.label}
                              onSelect={() => {
                                handleFilterChange('inspectionTeam', team.value);
                                setTeamPopoverOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", filters.inspectionTeam === team.value ? "opacity-100" : "opacity-0")} />
                              {team.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {/* 人员筛选 */}
              <div className="space-y-2">
                <Label className="text-xs">排查人员</Label>
                <Popover open={personPopoverOpen} onOpenChange={setPersonPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={personPopoverOpen}
                      className="w-full justify-between font-normal"
                    >
                      {filters.inspectorName && filters.inspectorName !== 'all'
                        ? personOptions.find(p => p.value === filters.inspectorName)?.label || '全部人员'
                        : '全部人员'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={true}>
                      <CommandInput placeholder="搜索人员..." />
                      <CommandList>
                        <CommandEmpty>未找到人员</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              handleFilterChange('inspectorName', 'all');
                              setPersonPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", (!filters.inspectorName || filters.inspectorName === 'all') ? "opacity-100" : "opacity-0")} />
                            全部人员
                          </CommandItem>
                          {personOptions.map(person => (
                            <CommandItem
                              key={person.value}
                              value={person.label}
                              onSelect={() => {
                                handleFilterChange('inspectorName', person.value);
                                setPersonPopoverOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", filters.inspectorName === person.value ? "opacity-100" : "opacity-0")} />
                              {person.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">开始日期</Label>
                <Input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">结束日期</Label>
                <Input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">隐患等级</Label>
                <Select onValueChange={(v) => handleFilterChange('hazardLevel', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部等级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部等级</SelectItem>
                    <SelectItem value="general_i">一般隐患I级</SelectItem>
                    <SelectItem value="general_ii">一般隐患II级</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">处理状态</Label>
                <Select onValueChange={(v) => handleFilterChange('status', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="submitted">已上报</SelectItem>
                    <SelectItem value="approved">审核通过</SelectItem>
                    <SelectItem value="rejected">驳回</SelectItem>
                    <SelectItem value="processing">治理中</SelectItem>
                    <SelectItem value="closed">已关闭</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs">关键词搜索</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="排查地点、隐患描述..."
                    value={filters.keyword || ''}
                    onChange={(e) => handleFilterChange('keyword', e.target.value)}
                  />
                  <Button variant="secondary" onClick={() => fetchHazards()}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link href="/hazards/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                上报隐患
              </Button>
            </Link>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            导出Excel
          </Button>
        </div>

        {/* Table - Mobile Card / Desktop Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">加载中...</div>
            ) : hazards.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                暂无数据
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">序号</TableHead>
                        <TableHead>排查日期</TableHead>
                        <TableHead>上报人</TableHead>
                        <TableHead>部门</TableHead>
                        <TableHead>隐患地点</TableHead>
                        <TableHead>隐患描述</TableHead>
                        <TableHead>隐患等级</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="w-28">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hazards.map((hazard) => {
                        const warningStatus = calculateDeadlineWarning(
                          hazard.status,
                          hazard.governance_deadline,
                          hazard.governance_result,
                          hazard.inspection_date
                        );
                        const daysLeft = getDaysUntilDeadline(hazard.governance_deadline);
                        
                        return (
                        <TableRow key={hazard.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1">
                              {hazard.serial_number}
                              {warningStatus === 'warning' && (
                                <span title={`还剩${daysLeft}天超期`} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-600">
                                  <AlertTriangle className="w-3 h-3" />
                                </span>
                              )}
                              {warningStatus === 'expired' && (
                                <span title="已超期" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600">
                                  <AlertTriangle className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(hazard.inspection_date)}</TableCell>
                          <TableCell className="whitespace-nowrap">{hazard.inspector_name || '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{hazard.inspection_department || '-'}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{hazard.inspection_location}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={hazard.hazard_description}>{hazard.hazard_description || '-'}</TableCell>
                          <TableCell>
                            <Badge className={getHazardLevelColor(hazard.hazard_level)}>
                              {getHazardLevelLabel(hazard.hazard_level)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Badge className={getStatusColor(hazard.status)}>
                                {getStatusLabel(hazard.status)}
                              </Badge>
                              {warningStatus === 'warning' && (
                                <span className="text-xs text-orange-600 font-medium">
                                  {daysLeft}天
                                </span>
                              )}
                              {warningStatus === 'expired' && (
                                <span className="text-xs text-red-600 font-medium">
                                  超期
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleViewDetail(hazard)} className="text-xs h-7 px-2">
                                治理详情
                              </Button>
                              {(user?.role === 'admin' || hazard.inspector_id === user?.employee_id) && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleEdit(hazard)}
                                    className="text-xs h-7 px-2 text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                                  >
                                    编辑
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleDelete(hazard)}
                                    className="text-xs h-7 px-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                                  >
                                    删除
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card List */}
                <div className="md:hidden divide-y">
                  {hazards.map((hazard) => (
                    <div key={hazard.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="font-medium text-sm truncate">{hazard.inspection_location}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {hazard.serial_number} · {formatDate(hazard.inspection_date)} · {hazard.inspector_name || '-'} · {hazard.inspection_department || '-'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={getHazardLevelColor(hazard.hazard_level)}>
                            {getHazardLevelLabel(hazard.hazard_level)}
                          </Badge>
                          <Badge className={getStatusColor(hazard.status)}>
                            {getStatusLabel(hazard.status)}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {hazard.hazard_description}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {hazard.governance_department}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => handleViewDetail(hazard)}>
                            治理详情
                          </Button>
                          {(user?.role === 'admin' || hazard.inspector_id === user?.employee_id) && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 px-2 text-xs text-blue-600 border-blue-200 hover:border-blue-300"
                                onClick={() => handleEdit(hazard)}
                              >
                                编辑
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 px-2 text-xs text-red-600 border-red-200 hover:border-red-300"
                                onClick={() => handleDelete(hazard)}
                              >
                                删除
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm px-2">
                      {pagination.page} / {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={(open) => {
        setShowDetail(open);
        if (!open) setIsFullEditMode(false);
      }}>
        <DialogContent className="max-w-3xl max-w-[95vw] max-h-[90vh] overflow-y-auto mx-auto">
          <DialogHeader>
            <DialogTitle>
              <span>{isFullEditMode ? '编辑隐患' : '隐患详情'} - #{selectedHazard?.serial_number}</span>
            </DialogTitle>
            <DialogDescription>
              排查日期: {formatDate(selectedHazard?.inspection_date || '')}
            </DialogDescription>
          </DialogHeader>
          {selectedHazard && (
            <div className="space-y-4">
              {/* 基础信息（只读） */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">排查中心</Label>
                  <p className="font-medium">{selectedHazard.inspection_center}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">排查部门</Label>
                  <p className="font-medium">{selectedHazard.inspection_department}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">排查班组</Label>
                  <p className="font-medium">{selectedHazard.inspection_team}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">排查岗位</Label>
                  <p className="font-medium">{selectedHazard.inspection_position}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">排查人员</Label>
                  <p className="font-medium">{selectedHazard.inspector_name || selectedHazard.inspector || '暂无'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">隐患等级</Label>
                  <Badge className={getHazardLevelColor(selectedHazard.hazard_level)}>
                    {getHazardLevelLabel(selectedHazard.hazard_level)}
                  </Badge>
                </div>
              </div>

              {/* 隐患图片 */}
              {selectedHazard.images && selectedHazard.images.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">隐患图片</Label>
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    {selectedHazard.images.map((img: string, idx: number) => (
                      <a 
                        key={idx} 
                        href={img} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img 
                          src={img} 
                          alt={`隐患图片 ${idx + 1}`}
                          className="w-full h-24 object-cover rounded-lg border hover:ring-2 hover:ring-blue-500 transition-all"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden text-xs text-red-500 text-center p-2 bg-red-50 rounded-lg">
                          图片加载失败
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* 可编辑字段 */}
              <div>
                <Label className="text-xs text-muted-foreground flex items-center justify-between">
                  排查地点
                  {canFullEdit(selectedHazard) && !isFullEditMode && (
                    <span className="text-xs text-blue-600 cursor-pointer" onClick={() => setIsFullEditMode(true)}>
                      [编辑]
                    </span>
                  )}
                </Label>
                {isFullEditMode ? (
                  <Input 
                    className="mt-1"
                    value={fullEditForm.inspection_location}
                    onChange={(e) => setFullEditForm(prev => ({ ...prev, inspection_location: e.target.value }))}
                  />
                ) : (
                  <p className="font-medium">{selectedHazard.inspection_location}</p>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">所属线别</Label>
                {isFullEditMode ? (
                  <Select
                    value={fullEditForm.line}
                    onValueChange={(v) => setFullEditForm(prev => ({ ...prev, line: v }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="请选择线别" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1号线">1号线</SelectItem>
                      <SelectItem value="2号线">2号线</SelectItem>
                      <SelectItem value="3号线">3号线</SelectItem>
                      <SelectItem value="4号线">4号线</SelectItem>
                      <SelectItem value="6号线">6号线</SelectItem>
                      <SelectItem value="8号线">8号线</SelectItem>
                      <SelectItem value="蓝谷快线">蓝谷快线</SelectItem>
                      <SelectItem value="西海岸快线">西海岸快线</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium">{selectedHazard.line || '暂无'}</p>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">隐患描述</Label>
                {isFullEditMode ? (
                  <Textarea 
                    className="mt-1"
                    rows={3}
                    value={fullEditForm.hazard_description}
                    onChange={(e) => setFullEditForm(prev => ({ ...prev, hazard_description: e.target.value }))}
                  />
                ) : (
                  <p className="mt-1 p-3 bg-slate-50 rounded-md">{selectedHazard.hazard_description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">隐患分类</Label>
                  {isFullEditMode ? (
                    <Select
                      value={fullEditForm.hazard_category}
                      onValueChange={(v) => setFullEditForm(prev => ({ ...prev, hazard_category: v }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="请选择隐患分类" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="仓储管理">仓储管理</SelectItem>
                        <SelectItem value="设施监测养护">设施监测养护</SelectItem>
                        <SelectItem value="设备运行维修">设备运行维修</SelectItem>
                        <SelectItem value="行车组织">行车组织</SelectItem>
                        <SelectItem value="客运组织">客运组织</SelectItem>
                        <SelectItem value="运营环境">运营环境</SelectItem>
                        <SelectItem value="人员管理">人员管理</SelectItem>
                        <SelectItem value="施工管理">施工管理</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium mt-1">{selectedHazard.hazard_category || '暂无'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">隐患等级</Label>
                  {isFullEditMode ? (
                    <Select value={fullEditForm.hazard_level} onValueChange={(v) => setFullEditForm(prev => ({ ...prev, hazard_level: v as HazardLevel }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general_i">一般隐患I级</SelectItem>
                        <SelectItem value="general_ii">一般隐患II级</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-1">
                      <Badge className={getHazardLevelColor(selectedHazard.hazard_level)}>
                        {getHazardLevelLabel(selectedHazard.hazard_level)}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">临时管控措施</Label>
                {isFullEditMode ? (
                  <Textarea 
                    className="mt-1"
                    rows={2}
                    placeholder="请输入临时管控措施..."
                    value={fullEditForm.temporary_measures}
                    onChange={(e) => setFullEditForm(prev => ({ ...prev, temporary_measures: e.target.value }))}
                  />
                ) : (
                  <p className="mt-1 p-3 bg-yellow-50 rounded-md text-sm">{selectedHazard.temporary_measures || '暂无'}</p>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">治理措施</Label>
                {isFullEditMode ? (
                  <Textarea 
                    className="mt-1"
                    rows={2}
                    placeholder="请输入治理措施..."
                    value={fullEditForm.governance_measure}
                    onChange={(e) => setFullEditForm(prev => ({ ...prev, governance_measure: e.target.value }))}
                  />
                ) : (
                  <p className="mt-1 p-3 bg-blue-50 rounded-md text-sm">{selectedHazard.governance_measure || '暂无'}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">治理责任部门</Label>
                  {isFullEditMode ? (
                    <Input 
                      className="mt-1"
                      placeholder="如：物资后勤中心-物资仓储部"
                      value={fullEditForm.governance_department}
                      onChange={(e) => setFullEditForm(prev => ({ ...prev, governance_department: e.target.value }))}
                    />
                  ) : (
                    <p className="font-medium">{selectedHazard.governance_department || '暂无'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">配合部门</Label>
                  {isFullEditMode ? (
                    <Input 
                      className="mt-1"
                      placeholder="配合部门"
                      value={fullEditForm.cooperating_department}
                      onChange={(e) => setFullEditForm(prev => ({ ...prev, cooperating_department: e.target.value }))}
                    />
                  ) : (
                    <p className="font-medium">{selectedHazard.cooperating_department || '暂无'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">治理责任人</Label>
                  {isFullEditMode ? (
                    <Input 
                      className="mt-1"
                      placeholder="责任人姓名"
                      value={fullEditForm.governance_person}
                      onChange={(e) => setFullEditForm(prev => ({ ...prev, governance_person: e.target.value }))}
                    />
                  ) : (
                    <p className="font-medium">{selectedHazard.governance_person || '暂无'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">治理时限</Label>
                  {isFullEditMode ? (
                    <Input 
                      type="date"
                      className="mt-1"
                      value={fullEditForm.governance_deadline}
                      onChange={(e) => setFullEditForm(prev => ({ ...prev, governance_deadline: e.target.value }))}
                    />
                  ) : (
                    <p className="font-medium">{formatDate(selectedHazard.governance_deadline)}</p>
                  )}
                </div>
              </div>

              {/* 治理结果 */}
              <div>
                <Label className="text-xs text-muted-foreground">治理结果</Label>
                {isFullEditMode ? (
                  <Select value={fullEditForm.governance_result} onValueChange={(v) => setFullEditForm(prev => ({ ...prev, governance_result: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="选择治理结果" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="已整改">已整改</SelectItem>
                      <SelectItem value="部分整改">部分整改</SelectItem>
                      <SelectItem value="无法整改">无法整改</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium">{selectedHazard.governance_result || '暂无'}</p>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">具体治理情况</Label>
                {isFullEditMode ? (
                  <Textarea 
                    className="mt-1"
                    rows={2}
                    placeholder="请详细描述治理过程和结果..."
                    value={fullEditForm.governance_details}
                    onChange={(e) => setFullEditForm(prev => ({ ...prev, governance_details: e.target.value }))}
                  />
                ) : (
                  <p className="mt-1 p-3 bg-slate-50 rounded-md text-sm">{selectedHazard.governance_details || '暂无'}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <Label className="text-xs text-muted-foreground">复查人</Label>
                  {isFullEditMode ? (
                    <Input 
                      className="mt-1"
                      placeholder="输入复查人姓名"
                      value={fullEditForm.reviewer_name}
                      onChange={(e) => setFullEditForm(prev => ({ ...prev, reviewer_name: e.target.value }))}
                    />
                  ) : (
                    <p className="font-medium">{selectedHazard.reviewer_name || '待指派'}</p>
                  )}
                </div>
                <Badge className={getStatusColor(selectedHazard.status)}>
                  {getStatusLabel(selectedHazard.status)}
                </Badge>
              </div>

              {/* 完整编辑模式的保存按钮 */}
              {isFullEditMode && canFullEdit(selectedHazard) && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsFullEditMode(false)}
                    className="flex-1"
                  >
                    取消
                  </Button>
                  <Button 
                    onClick={handleSaveFullEdit}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    {isSaving ? '保存中...' : '保存修改'}
                  </Button>
                </div>
              )}



              {/* 治理信息编辑区域 - 上报人可在时限内填写 */}
              {!isFullEditMode && canEditGovernance(selectedHazard) && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 text-green-800 font-medium">
                    <Edit3 className="w-4 h-4" />
                    <span>填写治理信息</span>
                    <span className="text-xs font-normal text-green-600">
                      （上报人可在治理时限内填写）
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-green-700">治理结果</Label>
                      <Select value={editForm.governance_result} onValueChange={(v) => setEditForm(prev => ({ ...prev, governance_result: v }))}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="选择治理结果" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="已整改">已整改</SelectItem>
                          <SelectItem value="部分整改">部分整改</SelectItem>
                          <SelectItem value="无法整改">无法整改</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-green-700">复查人</Label>
                      <Input 
                        placeholder="输入复查人姓名"
                        className="bg-white"
                        value={editForm.reviewer_name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, reviewer_name: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-green-700">具体治理情况</Label>
                    <Textarea 
                      placeholder="请详细描述治理过程和结果..."
                      className="bg-white"
                      rows={3}
                      value={editForm.governance_details}
                      onChange={(e) => setEditForm(prev => ({ ...prev, governance_details: e.target.value }))}
                    />
                  </div>

                  {editForm.governance_result === '已整改' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700">填写完治理信息后将提交至待复查状态，等待审核员确认后关闭</span>
                      </div>
                      
                      {/* 复核提醒 */}
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800 mb-3">
                          <strong>复核提醒：</strong>一般隐患治理结束后，原则上I级一般隐患由部门负责人负责复核确认销号，Ⅱ级一般隐患由技术、职能序列岗位人员复核确认销号。
                        </p>
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={confirmReview}
                            onChange={(e) => setConfirmReview(e.target.checked)}
                            className="mt-1 w-4 h-4 accent-green-600"
                          />
                          <span className="text-sm text-gray-700">
                            我已确认以上复核要求，并将如实填写治理信息
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setShowDetail(false);
                        setConfirmReview(false);
                      }}
                      className="flex-1"
                    >
                      取消
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleSaveGovernance}
                      disabled={isSaving || (editForm.governance_result === '已整改' && !confirmReview)}
                      className="flex-1"
                    >
                      {isSaving ? '保存中...' : '保存'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
