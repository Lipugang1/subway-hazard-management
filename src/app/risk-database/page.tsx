'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Train, Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight, Eye, FileText } from 'lucide-react';
import { authFetch } from '@/lib/api-client';
import type { RiskItem } from '@/types';

export default function RiskDatabasePage() {
  const { user } = useAuth();
  const [riskItems, setRiskItems] = useState<RiskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [keyword, setKeyword] = useState('');
  const [businessModule, setBusinessModule] = useState('');
  
  const [selectedItem, setSelectedItem] = useState<RiskItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<RiskItem>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addData, setAddData] = useState<Partial<RiskItem>>({
    business_module: '',
    specific_location: '',
    risk_point_description: '',
    risk_level: 'general',
    risk_control_measures: '',
    hazard_inspection_method: '',
    hazard_inspection_cycle: '',
    hazard_inspection_position: '',
    control_responsibility_unit: '',
    control_responsibility_position: '',
    remarks: '',
  });

  const businessModules = [
    '仓储管理',
    '设备设施',
    '运行环境',
    '安全管理',
    '人员管理',
    '车辆段管理',
    '应急管理'
  ];

  useEffect(() => {
    fetchRiskItems();
  }, [keyword, businessModule, pagination.page]);

  const fetchRiskItems = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('pageSize', pagination.pageSize.toString());
      if (keyword) params.set('keyword', keyword);
      if (businessModule) params.set('businessModule', businessModule);

      const res = await authFetch(`/api/risk-database?${params.toString()}`);
      const data = await res.json();
      
      if (data.success) {
        setRiskItems(data.data.items);
        setPagination(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch risk items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetail = (item: RiskItem) => {
    setSelectedItem(item);
    setShowDetail(true);
  };

  const handleEdit = (item: RiskItem) => {
    setSelectedItem(item);
    setEditData({ ...item });
    setIsEditing(true);
    setShowDetail(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    
    setIsSaving(true);
    try {
      const res = await authFetch(`/api/risk-database/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });
      
      const data = await res.json();
      
      if (data.success) {
        setIsEditing(false);
        fetchRiskItems();
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

  const handleDelete = async (item: RiskItem) => {
    if (!confirm(`确定要删除风险项 #${item.serial_number} 吗？`)) return;
    
    try {
      const res = await authFetch(`/api/risk-database/${item.id}`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      
      if (data.success) {
        fetchRiskItems();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('删除失败');
    }
  };

  const handleAddRiskItem = async () => {
    if (!addData.business_module || !addData.risk_point_description) {
      alert('请填写业务板块和风险点描述');
      return;
    }

    setIsSaving(true);
    try {
      const res = await authFetch('/api/risk-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addData)
      });

      const data = await res.json();

      if (data.success) {
        setShowAddDialog(false);
        setAddData({
          business_module: '',
          specific_location: '',
          risk_point_description: '',
          risk_level: 'general',
          risk_control_measures: '',
          hazard_inspection_method: '',
          hazard_inspection_cycle: '',
          hazard_inspection_position: '',
          control_responsibility_unit: '',
          control_responsibility_position: '',
          remarks: '',
        });
        fetchRiskItems();
      } else {
        alert(data.error || '新增失败');
      }
    } catch (error) {
      console.error('Add error:', error);
      alert('新增失败');
    } finally {
      setIsSaving(false);
    }
  };

  const getRiskLevelBadge = (level: string) => {
    const colorMap: Record<string, string> = {
      'large': 'bg-red-100 text-red-800',
      'general': 'bg-orange-100 text-orange-800',
      'small': 'bg-yellow-100 text-yellow-800'
    };
    const labelMap: Record<string, string> = {
      'large': '重大',
      'general': '较大',
      'small': '一般/较小'
    };
    return (
      <Badge className={colorMap[level] || 'bg-gray-100 text-gray-800'}>
        {labelMap[level] || level}
      </Badge>
    );
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
            <Link href="/hazards" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600">
              隐患管理
            </Link>
            <Link href="/risk-database" className="px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">风险数据库</h2>
              <p className="text-sm text-muted-foreground">管理物资后勤中心风险隐患数据库</p>
            </div>
          </div>
          {(user?.role === 'admin') && (
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              新增风险项
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">关键词搜索</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="位置、风险点描述..."
                    value={keyword}
                    onChange={(e) => {
                      setKeyword(e.target.value);
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">业务板块</Label>
                <Select value={businessModule} onValueChange={(v) => {
                  setBusinessModule(v);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部板块" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部板块</SelectItem>
                    {businessModules.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="secondary" onClick={fetchRiskItems}>
                  <Search className="w-4 h-4 mr-2" />
                  搜索
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">加载中...</div>
            ) : riskItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                暂无数据
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">序号</TableHead>
                      <TableHead>业务板块</TableHead>
                      <TableHead>具体位置/设备</TableHead>
                      <TableHead>风险点描述</TableHead>
                      <TableHead>风险等级</TableHead>
                      <TableHead>隐患排查周期</TableHead>
                      <TableHead className="w-32">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riskItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.serial_number}</TableCell>
                        <TableCell>{item.business_module}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.specific_location}</TableCell>
                        <TableCell className="max-w-[250px] truncate">{item.risk_point_description}</TableCell>
                        <TableCell>{getRiskLevelBadge(item.risk_level || '')}</TableCell>
                        <TableCell>{item.hazard_inspection_cycle}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetail(item)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {(user?.role === 'admin') && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(item)}>
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

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
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
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
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
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
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>风险项详情 - #{selectedItem?.serial_number}</DialogTitle>
            <DialogDescription>
              {selectedItem?.business_module}
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">具体位置/设备/步骤</Label>
                <p className="font-medium">{selectedItem.specific_location}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">风险点描述</Label>
                  <p className="text-sm">{selectedItem.risk_point_description}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">风险点位</Label>
                  <p className="text-sm">{selectedItem.risk_point_location}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">风险等级</Label>
                  <div className="mt-1">{getRiskLevelBadge(selectedItem.risk_level || '')}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">隐患排查周期</Label>
                  <p className="text-sm">{selectedItem.hazard_inspection_cycle}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">风险管控措施</Label>
                <p className="mt-1 p-3 bg-slate-50 rounded-md text-sm">{selectedItem.risk_control_measures}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">隐患排查方法</Label>
                <p className="mt-1 p-3 bg-blue-50 rounded-md text-sm">{selectedItem.hazard_inspection_method}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">隐患排查岗位</Label>
                <p className="text-sm">{selectedItem.hazard_inspection_position}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">管控责任单位</Label>
                  <p className="text-sm">{selectedItem.control_responsibility_unit}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">管控责任岗位</Label>
                  <p className="text-sm">{selectedItem.control_responsibility_position}</p>
                </div>
              </div>
              {selectedItem.remarks && (
                <div>
                  <Label className="text-xs text-muted-foreground">备注</Label>
                  <p className="text-sm">{selectedItem.remarks}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑风险项 - #{editData.serial_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>业务板块</Label>
                <Select value={editData.business_module} onValueChange={(v) => setEditData(prev => ({ ...prev, business_module: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {businessModules.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>风险等级</Label>
                <Select value={editData.risk_level} onValueChange={(v) => setEditData(prev => ({ ...prev, risk_level: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="large">重大</SelectItem>
                    <SelectItem value="general">较大</SelectItem>
                    <SelectItem value="small">一般/较小</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>具体位置/设备/步骤</Label>
              <Input value={editData.specific_location || ''} onChange={(e) => setEditData(prev => ({ ...prev, specific_location: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>风险点描述</Label>
                <Input value={editData.risk_point_description || ''} onChange={(e) => setEditData(prev => ({ ...prev, risk_point_description: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>风险点位</Label>
                <Input value={editData.risk_point_location || ''} onChange={(e) => setEditData(prev => ({ ...prev, risk_point_location: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>风险管控措施</Label>
              <Textarea rows={3} value={editData.risk_control_measures || ''} onChange={(e) => setEditData(prev => ({ ...prev, risk_control_measures: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>隐患排查方法</Label>
                <Input value={editData.hazard_inspection_method || ''} onChange={(e) => setEditData(prev => ({ ...prev, hazard_inspection_method: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>隐患排查周期</Label>
                <Input value={editData.hazard_inspection_cycle || ''} onChange={(e) => setEditData(prev => ({ ...prev, hazard_inspection_cycle: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>管控责任单位</Label>
                <Input value={editData.control_responsibility_unit || ''} onChange={(e) => setEditData(prev => ({ ...prev, control_responsibility_unit: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>管控责任岗位</Label>
                <Input value={editData.control_responsibility_position || ''} onChange={(e) => setEditData(prev => ({ ...prev, control_responsibility_position: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea rows={2} value={editData.remarks || ''} onChange={(e) => setEditData(prev => ({ ...prev, remarks: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>取消</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新增风险项对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增风险项</DialogTitle>
            <DialogDescription>添加新的风险数据库条目</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>业务板块 *</Label>
              <Select value={addData.business_module} onValueChange={(v) => setAddData(prev => ({ ...prev, business_module: v }))}>
                <SelectTrigger><SelectValue placeholder="选择板块" /></SelectTrigger>
                <SelectContent>
                  {businessModules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>具体位置/设备</Label>
              <Input value={addData.specific_location || ''} onChange={(e) => setAddData(prev => ({ ...prev, specific_location: e.target.value }))} placeholder="如：物资总库杂品库" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>风险点描述 *</Label>
              <Textarea rows={2} value={addData.risk_point_description || ''} onChange={(e) => setAddData(prev => ({ ...prev, risk_point_description: e.target.value }))} placeholder="描述风险点..." />
            </div>
            <div className="space-y-2">
              <Label>风险等级</Label>
              <Select value={addData.risk_level} onValueChange={(v) => setAddData(prev => ({ ...prev, risk_level: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="large">重大</SelectItem>
                  <SelectItem value="general">较大</SelectItem>
                  <SelectItem value="small">一般/较小</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>风险点位</Label>
              <Input value={addData.risk_point_location || ''} onChange={(e) => setAddData(prev => ({ ...prev, risk_point_location: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>风险管控措施</Label>
              <Textarea rows={2} value={addData.risk_control_measures || ''} onChange={(e) => setAddData(prev => ({ ...prev, risk_control_measures: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>排查方法</Label>
              <Input value={addData.hazard_inspection_method || ''} onChange={(e) => setAddData(prev => ({ ...prev, hazard_inspection_method: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>排查周期</Label>
              <Input value={addData.hazard_inspection_cycle || ''} onChange={(e) => setAddData(prev => ({ ...prev, hazard_inspection_cycle: e.target.value }))} placeholder="如：月度、季度" />
            </div>
            <div className="space-y-2">
              <Label>排查岗位</Label>
              <Input value={addData.hazard_inspection_position || ''} onChange={(e) => setAddData(prev => ({ ...prev, hazard_inspection_position: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>管控责任单位</Label>
              <Input value={addData.control_responsibility_unit || ''} onChange={(e) => setAddData(prev => ({ ...prev, control_responsibility_unit: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>管控责任岗位</Label>
              <Input value={addData.control_responsibility_position || ''} onChange={(e) => setAddData(prev => ({ ...prev, control_responsibility_position: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>备注</Label>
              <Textarea rows={2} value={addData.remarks || ''} onChange={(e) => setAddData(prev => ({ ...prev, remarks: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button onClick={handleAddRiskItem} disabled={isSaving}>
              {isSaving ? '提交中...' : '提交'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
