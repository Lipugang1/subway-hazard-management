import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, createUser, hashPassword } from '@/lib/local-db';
import type { UserRole } from '@/types';

// 角色列表（注册默认为排查员）
const ROLES = [
  { value: 'inspector', label: '排查员' },
  { value: 'reviewer', label: '审核员' },
  { value: 'admin', label: '管理员' }
];

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      roles: ROLES
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, name, employee_id, role, inspection_center, inspection_department, inspection_team, inspection_position } = body;

    // 验证必填字段
    if (!username || !password || !name || !employee_id) {
      return NextResponse.json(
        { success: false, error: '请填写所有必填字段（用户名、密码、姓名、工号）' },
        { status: 400 }
      );
    }

    // 验证用户名格式（4-20位字母数字）
    if (!/^[a-zA-Z0-9]{4,20}$/.test(username)) {
      return NextResponse.json(
        { success: false, error: '用户名必须为4-20位字母或数字' },
        { status: 400 }
      );
    }

    // 验证密码格式（至少6位）
    if (!/^.{6,}$/.test(password)) {
      return NextResponse.json(
        { success: false, error: '密码至少6位' },
        { status: 400 }
      );
    }

    // 验证工号格式（非空）
    if (!employee_id || employee_id.trim() === '') {
      return NextResponse.json(
        { success: false, error: '请输入工号' },
        { status: 400 }
      );
    }

    // 验证角色
    const validRoles = ['inspector', 'reviewer', 'admin'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: '请选择有效的角色' },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: '用户名已存在' },
        { status: 400 }
      );
    }

    // 创建新用户
    console.log('[Register] 开始创建用户:', username);
    
    const newUser = await createUser({
      username,
      password,  // 传入原始密码，让 createUser 内部处理哈希
      name, // 真实姓名
      employee_id, // 工号
      role: (role as UserRole) || 'inspector', // 默认为排查员
      inspection_center: inspection_center || '物资后勤中心',
      inspection_department: inspection_department || '',
      inspection_team: inspection_team || '',
      inspection_position: inspection_position || ''
    });
    
    console.log('[Register] 创建结果:', newUser ? '成功' : '失败');

    if (!newUser) {
      return NextResponse.json(
        { success: false, error: '用户名已存在' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '注册成功，请登录',
      data: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        name: newUser.name,
        employee_id: newUser.employee_id,
        inspection_center: newUser.inspection_center,
        inspection_department: newUser.inspection_department,
        inspection_team: newUser.inspection_team,
        inspection_position: newUser.inspection_position
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: '注册失败' },
      { status: 500 }
    );
  }
}
