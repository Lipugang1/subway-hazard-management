import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUser, deleteUser } from '@/lib/local-db';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

// PUT /api/admin/users/[id] - 更新用户
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { success: false, error: '无权限修改用户' },
        { status: 403 }
      );
    }
    
    const { id } = await params;
    const body = await request.json();
    
    const success = await updateUser(id, body);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: '更新用户失败，用户名可能已存在' },
        { status: 500 }
      );
    }
    
    const updatedUser = await getUserById(id);
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }
    
    // 移除密码字段后返回
    const userWithoutPassword: Record<string, any> = {};
    const userObj = updatedUser as any;
    for (const key in userObj) {
      if (key !== 'password_hash') {
        userWithoutPassword[key] = userObj[key];
      }
    }
    
    return NextResponse.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: '更新用户失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { success: false, error: '无权限删除用户' },
        { status: 403 }
      );
    }
    
    const { id } = await params;
    
    // 不允许删除自己
    if (id === userId) {
      return NextResponse.json(
        { success: false, error: '不能删除当前登录用户' },
        { status: 400 }
      );
    }
    
    const success = await deleteUser(id);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: '删除用户失败，用户可能不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, error: '删除用户失败' },
      { status: 500 }
    );
  }
}
