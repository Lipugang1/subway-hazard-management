'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Train, Shield, FileText, Users, UserPlus, CheckCircle } from 'lucide-react';

// 部门选项
const DEPARTMENTS = [
  '综合部',
  '安全生产部',
  '物资仓储部',
  '后勤场段部'
];

// 班组选项（按部门分组）
const TEAMS_BY_DEPARTMENT: Record<string, string[]> = {
  '综合部': [],
  '安全生产部': [],
  '物资仓储部': ['东部储运工班', '西部储运工班', '南部储运工班'],
  '后勤场段部': [
    '场段管理一组', '场段管理二组', '场段管理三组', '场段管理四组',
    '场段管理五组', '场段管理六组', '场段管理七组', '场段管理八组'
  ]
};

// 岗位选项（按部门分组）
const POSITIONS_BY_DEPARTMENT: Record<string, string[]> = {
  '综合部': ['综合事务岗', '文秘岗', '行政岗'],
  '安全生产部': ['安全工作岗', '安全监督岗', '安全技术岗'],
  '物资仓储部': ['安全工作岗', '仓管员', '仓储工班长', '储运工作岗', '综合事务岗'],
  '后勤场段部': [
    '安全工作岗', '风水电技术岗', '房建技术岗', '场段工作岗',
    '物业委外项目经理', '食堂委外项目经理', '风水电委外项目经理', '房建委外项目经理',
    '物业委外项目主管', '食宿委外项目主管', '风水电检修工班长', '房建检修工班长',
    '风水电检修工', '房建检修工', '车队工作岗', '后勤服务岗'
  ]
};

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  // 注册相关状态
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  // 注册表单
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmployeeId, setRegEmployeeId] = useState('');
  const [regInspectionCenter, setRegInspectionCenter] = useState('物资后勤中心');
  const [regInspectionDepartment, setRegInspectionDepartment] = useState('物资仓储部');
  const [regInspectionTeam, setRegInspectionTeam] = useState('');
  const [regInspectionPosition, setRegInspectionPosition] = useState('');

  // 根据部门获取班组选项
  const availableTeams = TEAMS_BY_DEPARTMENT[regInspectionDepartment] || [];
  // 根据部门获取岗位选项
  const availablePositions = POSITIONS_BY_DEPARTMENT[regInspectionDepartment] || ['综合事务岗'];

  // 处理部门变化，重置班组和岗位选择
  const handleDepartmentChange = (value: string) => {
    setRegInspectionDepartment(value);
    setRegInspectionTeam(''); // 重置班组选择
    setRegInspectionPosition(''); // 重置岗位选择
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || '登录失败');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          name: regName,
          employee_id: regEmployeeId,
          role: 'inspector', // 默认注册为排查员
          inspection_center: regInspectionCenter,
          inspection_department: regInspectionDepartment,
          inspection_team: regInspectionTeam,
          inspection_position: regInspectionPosition
        })
      });

      const data = await res.json();

      if (data.success) {
        setRegisterSuccess(true);
        // 2秒后自动关闭弹窗并填充登录表单
        setTimeout(() => {
          setIsRegisterOpen(false);
          setRegisterSuccess(false);
          setUsername(regUsername);
          setPassword(regPassword);
          // 清空注册表单
          setRegUsername('');
          setRegPassword('');
          setRegName('');
          setRegEmployeeId('');
          setRegInspectionCenter('物资后勤中心');
          setRegInspectionDepartment('物资仓储部');
          setRegInspectionTeam('');
          setRegInspectionPosition('');
        }, 2000);
      } else {
        setRegisterError(data.error || '注册失败');
      }
    } catch (err) {
      setRegisterError('注册失败，请稍后重试');
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Train className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-lg">城市轨道交通</h1>
            <p className="text-xs text-muted-foreground">运营风险隐患排查与治理系统</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Info */}
          <div className="hidden lg:block space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-slate-800">
                智能化隐患排查<br />闭环治理管理
              </h2>
              <p className="text-lg text-slate-600">
                基于AI视觉分析的智能隐患识别，结合标准化流程管理，实现隐患从发现到治理的全流程管控。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="border-0 shadow-md">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">智能识别</h3>
                  <p className="text-sm text-muted-foreground">AI自动分析现场图片，识别安全隐患</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">风险数据库</h3>
                  <p className="text-sm text-muted-foreground">联动风险数据库，智能匹配管控措施</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold mb-2">流程管理</h3>
                  <p className="text-sm text-muted-foreground">上报、审核、治理、复查闭环管理</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <AlertCircle className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">数据导出</h3>
                  <p className="text-sm text-muted-foreground">符合标准格式的数据导出存档上报</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <Card className="w-full max-w-md mx-auto shadow-xl border-0">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">用户登录</CardTitle>
              <CardDescription className="text-center">
                输入您的账号信息登录系统
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username">用户名</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? '登录中...' : '登录'}
                </Button>
              </form>

              {/* 注册按钮 */}
              <div className="mt-4">
                <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <UserPlus className="w-4 h-4 mr-2" />
                      注册账号
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>注册账号</DialogTitle>
                      <DialogDescription>
                        填写以下信息创建新账号。注册成功后可使用该账号登录系统。
                      </DialogDescription>
                    </DialogHeader>

                    {registerSuccess ? (
                      <div className="flex flex-col items-center justify-center py-8 space-y-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-green-600">注册成功！</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            账号信息已自动填充，请点击登录
                          </p>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleRegister} className="space-y-4 mt-4">
                        {registerError && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{registerError}</AlertDescription>
                          </Alert>
                        )}

                        {/* 基本信息 */}
                        <div className="bg-slate-50 -mx-6 px-6 py-3 border-b">
                          <p className="text-sm font-medium text-slate-700">基本信息</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="reg-username">用户名 <span className="text-red-500">*</span></Label>
                            <Input
                              id="reg-username"
                              placeholder="4-20位字母或数字"
                              value={regUsername}
                              onChange={(e) => setRegUsername(e.target.value)}
                              pattern="[a-zA-Z0-9]{4,20}"
                              required
                              disabled={registerLoading}
                            />
                            <p className="text-xs text-muted-foreground">4-20位字母或数字组合</p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="reg-password">密码 <span className="text-red-500">*</span></Label>
                            <Input
                              id="reg-password"
                              type="password"
                              placeholder="至少6位"
                              value={regPassword}
                              onChange={(e) => setRegPassword(e.target.value)}
                              minLength={6}
                              required
                              disabled={registerLoading}
                            />
                            <p className="text-xs text-muted-foreground">至少6位字符</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="reg-name">姓名 <span className="text-red-500">*</span></Label>
                            <Input
                              id="reg-name"
                              placeholder="请输入真实姓名"
                              value={regName}
                              onChange={(e) => setRegName(e.target.value)}
                              required
                              disabled={registerLoading}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="reg-employee-id">工号 <span className="text-red-500">*</span></Label>
                            <Input
                              id="reg-employee-id"
                              placeholder="请输入工号"
                              value={regEmployeeId}
                              onChange={(e) => setRegEmployeeId(e.target.value)}
                              required
                              disabled={registerLoading}
                            />
                          </div>
                        </div>

                        {/* 排查信息 */}
                        <div className="bg-slate-50 -mx-6 px-6 py-3 border-b">
                          <p className="text-sm font-medium text-slate-700">排查信息</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="reg-center">排查中心</Label>
                            <Input
                              id="reg-center"
                              placeholder="如：物资后勤中心"
                              value={regInspectionCenter}
                              onChange={(e) => setRegInspectionCenter(e.target.value)}
                              disabled={registerLoading}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="reg-department">排查部门</Label>
                            <Select value={regInspectionDepartment} onValueChange={handleDepartmentChange} disabled={registerLoading}>
                              <SelectTrigger id="reg-department">
                                <SelectValue placeholder="请选择部门" />
                              </SelectTrigger>
                              <SelectContent>
                                {DEPARTMENTS.map((dept) => (
                                  <SelectItem key={dept} value={dept}>
                                    {dept}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="reg-team">排查班组</Label>
                            {availableTeams.length > 0 ? (
                              <Select value={regInspectionTeam} onValueChange={setRegInspectionTeam} disabled={registerLoading}>
                                <SelectTrigger id="reg-team">
                                  <SelectValue placeholder="请选择班组" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableTeams.map((team) => (
                                    <SelectItem key={team} value={team}>
                                      {team}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                id="reg-team"
                                placeholder="该部门无班组"
                                value=""
                                disabled
                              />
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="reg-position">排查岗位</Label>
                            <Input
                              id="reg-position"
                              list={`position-list-${regInspectionDepartment}`}
                              placeholder="请选择或输入岗位"
                              value={regInspectionPosition}
                              onChange={(e) => setRegInspectionPosition(e.target.value)}
                              disabled={registerLoading}
                            />
                            <datalist id={`position-list-${regInspectionDepartment}`}>
                              {availablePositions.map((pos) => (
                                <option key={pos} value={pos} />
                              ))}
                            </datalist>
                          </div>
                        </div>

                        <div className="pt-4">
                          <Button type="submit" className="w-full" disabled={registerLoading}>
                            {registerLoading ? '注册中...' : '注册'}
                          </Button>
                        </div>
                      </form>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/50">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          物资后勤中心 © 2026
        </div>
      </footer>
    </div>
  );
}
