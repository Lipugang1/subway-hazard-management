import { NextRequest, NextResponse } from 'next/server';
import { getUsers, createUser, getUserById, hashPassword } from '@/lib/local-db';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = getAuthenticatedUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }
    
    const users = await getUsers();
    const usersWithoutPassword = users.map((u: any) => {
      const { password_hash, ...rest } = u;
      return rest;
    });
    
    return NextResponse.json({
      success: true,
      data: usersWithoutPassword
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getAuthenticatedUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }
    
    // 验证是否为管理员
    const currentUser = await getUserById(userId);
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '无权限创建用户' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { password, ...userData } = body;
    
    if (!password) {
      return NextResponse.json(
        { success: false, error: '密码不能为空' },
        { status: 400 }
      );
    }
    
    const newUser = await createUser({
      ...userData,
      password: password  // 传入原始密码，让 createUser 内部处理哈希
    });
    
    if (!newUser) {
      return NextResponse.json(
        { success: false, error: '创建用户失败，用户名可能已存在' },
        { status: 500 }
      );
    }
    
    const { password_hash, ...userWithoutPassword } = newUser;
    
    return NextResponse.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, error: '创建用户失败' },
      { status: 500 }
    );
  }
}
