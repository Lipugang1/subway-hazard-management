'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Train,
  Users,
  FileCheck,
  Plus,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  UserPlus,
  Trash2,
  Search
} from 'lucide-react';
import { formatDate, formatDateTime, getStatusLabel, getStatusColor, getHazardLevelLabel, getHazardLevelColor } from '@/lib/helpers';
import { authFetch } from '@/lib/api-client';
import type { User, HazardRecord } from '@/types';

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('review');
  
  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserData, setEditUserData] = useState({
    username: '',
    password: '',
    name: '',
    employee_id: '',
    role: 'inspector',
    inspection_center: '',
    inspection_department: '',
    inspection_team: '',
    inspection_position: ''
  });
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    employee_id: '',
    role: 'inspector' as const,
    inspection_center: '',
    inspection_department: '',
    inspection_team: '',
    inspection_position: ''
  });

  // 用户筛选
  const [userDeptFilter, setUserDeptFilter] = useState('all');
  const [userNameSearch, setUserNameSearch] = useState('');

  // 部门列表
  const adminDepartments = [
    { value: 'all', label: '全部部门' },
    { value: '安全生产部', label: '安全生产部' },
    { value: '物资仓储部', label: '物资仓储部' },
    { value: '后勤场段部', label: '后勤场段部' },
    { value: '综合部', label: '综合部' }
  ];

  // 筛选后的用户列表
  const filteredUsers = users.filter(u => {
    // 部门筛选
    if (userDeptFilter !== 'all' && u.inspection_department !== userDeptFilter) return false;
    // 姓名搜索
    if (userNameSearch && !u.name?.includes(userNameSearch) && !u.username?.includes(userNameSearch) && !u.employee_id?.includes(userNameSearch)) return false;
    return true;
  });

  // Review state
  const [pendingHazards, setPendingHazards] = useState<HazardRecord[]>([]);
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const [selectedHazard, setSelectedHazard] = useState<HazardRecord | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewData, setReviewData] = useState<{
    hazard_level?: string;
    governance_department?: string;
    governance_person?: string;
    governance_deadline?: string;
    rejection_reason?: string;
  }>({});

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'reviewer') {
      fetchUsers();
      fetchPendingHazards();
    }
  }, [user]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await authFetch('/api/admin/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchPendingHazards = async () => {
    setIsLoadingReview(true);
    try {
      const res = await authFetch('/api/hazards?status=submitted&pageSize=50');
      const data = await res.json();
      if (data.success) {
        setPendingHazards(data.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch pending hazards:', error);
    } finally {
      setIsLoadingReview(false);
    }
  };

  const handleAddUser = async () => {
    // 验证必填字段
    if (!newUser.username) {
      alert('请输入用户名');
      return;
    }
    if (!newUser.password) {
      alert('请输入密码');
      return;
    }
    if (!newUser.name) {
      alert('请输入姓名');
      return;
    }
    if (!newUser.employee_id) {
      alert('请输入工号');
      return;
    }

    try {
      const payload = {
        ...newUser,
        role: newUser.role || 'inspector'
      };
      
      const res = await authFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      console.log('添加用户响应:', data);
      
      if (data.success) {
        setShowAddUser(false);
        setNewUser({
          username: '',
          password: '',
          name: '',
          employee_id: '',
          role: 'inspector',
          inspection_center: '',
          inspection_department: '',
          inspection_team: '',
          inspection_position: ''
        });
        fetchUsers();
      } else {
        alert(data.error || '创建用户失败');
      }
    } catch (error) {
      console.error('Failed to add user:', error);
      alert('创建用户失败，请稍后重试');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserData({
      username: user.username,
      password: '',
      name: user.name,
      employee_id: user.employee_id,
      role: user.role as 'admin' | 'reviewer' | 'inspector',
      inspection_center: user.inspection_center || '',
      inspection_department: user.inspection_department || '',
      inspection_team: user.inspection_team || '',
      inspection_position: user.inspection_position || ''
    });
    setShowEditUser(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      // 只发送有变化的字段
      const updates: any = {};
      if (editUserData.name !== editingUser.name) updates.name = editUserData.name;
      if (editUserData.employee_id !== editingUser.employee_id) updates.employee_id = editUserData.employee_id;
      if (editUserData.role !== editingUser.role) updates.role = editUserData.role;
      if (editUserData.inspection_center !== editingUser.inspection_center) updates.inspection_center = editUserData.inspection_center;
      if (editUserData.inspection_department !== editingUser.inspection_department) updates.inspection_department = editUserData.inspection_department;
      if (editUserData.inspection_team !== editingUser.inspection_team) updates.inspection_team = editUserData.inspection_team;
      if (editUserData.inspection_position !== editingUser.inspection_position) updates.inspection_position = editUserData.inspection_position;
      if (editUserData.password) updates.password = editUserData.password;

      if (Object.keys(updates).length === 0) {
        setShowEditUser(false);
        return;
      }

      const res = await authFetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      const data = await res.json();
      if (data.success) {
        setShowEditUser(false);
        setEditingUser(null);
        fetchUsers();
      } else {
        alert(data.error || '更新用户失败');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('更新用户失败');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`确定要删除用户 "${user.name}" 吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const res = await authFetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.error || '删除用户失败');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('删除用户失败');
    }
  };

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!selectedHazard) return;

    try {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const updateData: any = { status: newStatus };
      
      if (action === 'approve') {
        updateData.hazard_level = reviewData.hazard_level || selectedHazard.hazard_level;
        updateData.governance_department = reviewData.governance_department || selectedHazard.governance_department;
        updateData.governance_person = reviewData.governance_person || selectedHazard.governance_person;
        updateData.governance_deadline = reviewData.governance_deadline || selectedHazard.governance_deadline;
      } else {
        updateData.rejection_reason = reviewData.rejection_reason;
      }

      const res = await authFetch(`/api/hazards/${selectedHazard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const data = await res.json();
      if (data.success) {
        setShowReview(false);
        fetchPendingHazards();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('Review error:', error);
      alert('操作失败');
    }
  };

  const getRoleBadge = (role: string) => {
    const config: Record<string, { label: string; color: string }> = {
      admin: { label: '管理员', color: 'bg-purple-100 text-purple-800' },
      reviewer: { label: '审核员', color: 'bg-blue-100 text-blue-800' },
      inspector: { label: '排查员', color: 'bg-green-100 text-green-800' }
    };
    const { label, color } = config[role] || { label: role, color: 'bg-gray-100 text-gray-800' };
    return <Badge className={color}>{label}</Badge>;
  };
  return (

    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">系统管理</h2>
          <p className="text-sm text-muted-foreground">用户管理与隐患审核</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="review">
              <FileCheck className="w-4 h-4 mr-2" />
              待审核隐患 ({pendingHazards.length})
            </TabsTrigger>
            {user?.role === 'admin' && (
              <TabsTrigger value="users">
                <Users className="w-4 h-4 mr-2" />
                用户管理
              </TabsTrigger>
            )}
          </TabsList>

          {/* Review Tab */}
          <TabsContent value="review" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">待审核隐患列表</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingReview ? (
                  <div className="text-center py-12 text-muted-foreground">加载中...</div>
                ) : pendingHazards.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    暂无待审核隐患
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
                        <TableHead>排查人员</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingHazards.map((hazard) => (
                        <TableRow key={hazard.id}>
                          <TableCell className="font-medium">{hazard.serial_number}</TableCell>
                          <TableCell>{formatDate(hazard.inspection_date)}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{hazard.inspection_location}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{hazard.hazard_description}</TableCell>
                          <TableCell>
                            <Badge className={getHazardLevelColor(hazard.hazard_level)}>
                              {getHazardLevelLabel(hazard.hazard_level)}
                            </Badge>
                          </TableCell>
                          <TableCell>{hazard.inspector_name}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setSelectedHazard(hazard);
                              setReviewData({
                                hazard_level: hazard.hazard_level,
                                governance_department: hazard.governance_department,
                                governance_person: hazard.governance_person,
                                governance_deadline: hazard.governance_deadline
                              });
                              setShowReview(true);
                            }}>
                              <Eye className="w-4 h-4 mr-1" />
                              审核
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          {user?.role === 'admin' && (
            <TabsContent value="users" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">用户列表</CardTitle>
                    <Button onClick={() => setShowAddUser(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      添加用户
                    </Button>
                  </div>
                  {/* 筛选栏 */}
                  <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">部门：</span>
                      <select
                        value={userDeptFilter}
                        onChange={(e) => setUserDeptFilter(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {adminDepartments.map(d => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-[320px]">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">搜索：</span>
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="输入姓名/用户名/工号搜索..."
                          value={userNameSearch}
                          onChange={(e) => setUserNameSearch(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      共 {filteredUsers.length} 人
                      {userDeptFilter !== 'all' && ` · ${userDeptFilter}`}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoadingUsers ? (
                    <div className="text-center py-12 text-muted-foreground">加载中...</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>用户名</TableHead>
                          <TableHead>姓名</TableHead>
                          <TableHead>工号</TableHead>
                          <TableHead>角色</TableHead>
                          <TableHead>部门</TableHead>
                          <TableHead>岗位</TableHead>
                          <TableHead>创建时间</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              {userNameSearch || userDeptFilter !== 'all' ? '未找到匹配的用户' : '暂无用户数据'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((u) => (
                            <TableRow key={u.id}>
                              <TableCell className="font-medium">{u.username}</TableCell>
                              <TableCell>{u.name}</TableCell>
                              <TableCell>{u.employee_id}</TableCell>
                              <TableCell>{getRoleBadge(u.role)}</TableCell>
                              <TableCell>{u.inspection_department}</TableCell>
                              <TableCell>{u.inspection_position}</TableCell>
                              <TableCell>{formatDate(u.created_at)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEditUser(u)}
                                    disabled={u.id === user?.id}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDeleteUser(u)}
                                    disabled={u.id === user?.id}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Review Dialog */}
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>审核隐患 - #{selectedHazard?.serial_number}</DialogTitle>
            <DialogDescription>
              排查日期: {formatDate(selectedHazard?.inspection_date || '')}
            </DialogDescription>
          </DialogHeader>
          {selectedHazard && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">排查地点</Label>
                    <p className="font-medium">{selectedHazard.inspection_location}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">隐患分类</Label>
                    <p className="font-medium">{selectedHazard.hazard_category}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <Label className="text-xs text-muted-foreground">隐患描述</Label>
                  <p className="mt-1 text-sm">{selectedHazard.hazard_description}</p>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">审核调整</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>隐患等级</Label>
                    <Select 
                      value={reviewData.hazard_level} 
                      onValueChange={(v) => setReviewData(prev => ({ ...prev, hazard_level: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general_i">一般隐患I级</SelectItem>
                        <SelectItem value="general_ii">一般隐患II级</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>治理时限</Label>
                    <Input
                      type="date"
                      value={reviewData.governance_deadline || ''}
                      onChange={(e) => setReviewData(prev => ({ ...prev, governance_deadline: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>治理责任部门</Label>
                    <Input
                      value={reviewData.governance_department || ''}
                      onChange={(e) => setReviewData(prev => ({ ...prev, governance_department: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>治理责任人</Label>
                    <Input
                      value={reviewData.governance_person || ''}
                      onChange={(e) => setReviewData(prev => ({ ...prev, governance_person: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>驳回原因（仅驳回时填写）</Label>
                  <Input
                    placeholder="请输入驳回原因..."
                    value={reviewData.rejection_reason || ''}
                    onChange={(e) => setReviewData(prev => ({ ...prev, rejection_reason: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => handleReview('reject')}>
              <XCircle className="w-4 h-4 mr-2" />
              驳回
            </Button>
            <Button onClick={() => handleReview('approve')}>
              <CheckCircle className="w-4 h-4 mr-2" />
              通过审核
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加用户</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>用户名 <span className="text-red-500">*</span></Label>
                <Input
                  value={newUser.username}
                  onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>密码 <span className="text-red-500">*</span></Label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>姓名 <span className="text-red-500">*</span></Label>
                <Input
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>工号 <span className="text-red-500">*</span></Label>
                <Input
                  value={newUser.employee_id}
                  onChange={(e) => setNewUser(prev => ({ ...prev, employee_id: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>角色</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(v) => setNewUser(prev => ({ ...prev, role: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspector">排查员</SelectItem>
                    <SelectItem value="reviewer">审核员</SelectItem>
                    <SelectItem value="admin">管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>排查中心</Label>
                <Input
                  value={newUser.inspection_center}
                  onChange={(e) => setNewUser(prev => ({ ...prev, inspection_center: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>排查部门</Label>
                <Input
                  value={newUser.inspection_department}
                  onChange={(e) => setNewUser(prev => ({ ...prev, inspection_department: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>排查班组</Label>
                <Input
                  value={newUser.inspection_team}
                  onChange={(e) => setNewUser(prev => ({ ...prev, inspection_team: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>排查岗位</Label>
              <Input
                value={newUser.inspection_position}
                onChange={(e) => setNewUser(prev => ({ ...prev, inspection_position: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUser(false)}>取消</Button>
            <Button onClick={handleAddUser}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑用户 - {editingUser?.name}</DialogTitle>
            <DialogDescription>
              用户名: {editingUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>姓名 <span className="text-red-500">*</span></Label>
                <Input
                  value={editUserData.name}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>工号 <span className="text-red-500">*</span></Label>
                <Input
                  value={editUserData.employee_id}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, employee_id: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>新密码 <span className="text-xs text-muted-foreground">(留空则不修改)</span></Label>
                <Input
                  type="password"
                  value={editUserData.password}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="留空保持原密码"
                />
              </div>
              <div className="space-y-2">
                <Label>角色</Label>
                <Select
                  value={editUserData.role}
                  onValueChange={(v) => setEditUserData(prev => ({ ...prev, role: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspector">排查员</SelectItem>
                    <SelectItem value="reviewer">审核员</SelectItem>
                    <SelectItem value="admin">管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>排查中心</Label>
                <Input
                  value={editUserData.inspection_center}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, inspection_center: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>排查部门</Label>
                <Input
                  value={editUserData.inspection_department}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, inspection_department: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>排查班组</Label>
                <Input
                  value={editUserData.inspection_team}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, inspection_team: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>排查岗位</Label>
                <Input
                  value={editUserData.inspection_position}
                  onChange={(e) => setEditUserData(prev => ({ ...prev, inspection_position: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditUser(false)}>取消</Button>
            <Button onClick={handleUpdateUser}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
  );
}
