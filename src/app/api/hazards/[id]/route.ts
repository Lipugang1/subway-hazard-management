import { NextRequest, NextResponse } from 'next/server';
import { getHazards, updateHazard, deleteHazard, getUserById } from '@/lib/local-db';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

// 从URL路径中提取ID
function extractIdFromUrl(request: NextRequest): string | null {
  const url = request.url;
  const match = url.match(/\/api\/hazards\/([^/]+)/);
  return match ? match[1] : null;
}

// 权限检查：管理员可操作所有隐患，其他用户只能操作自己的
async function checkPermission(request: NextRequest, hazardId: string, action: 'update' | 'delete'): Promise<{ allowed: boolean; error?: string }> {
  const userId = getAuthenticatedUserId(request);
  
  if (!userId) {
    return { allowed: false, error: '未登录' };
  }
  
  // 获取当前用户
  const user = await getUserById(userId);
  if (!user) {
    return { allowed: false, error: '用户不存在' };
  }
  
  // 管理员可以操作所有隐患
  if (user.role === 'admin') {
    return { allowed: true };
  }
  
  // 获取隐患记录
  const hazards = await getHazards();
  const hazard = hazards.find((h: any) => h.id === hazardId);
  
  if (!hazard) {
    return { allowed: false, error: '记录不存在' };
  }
  
  // 排查员（上报人）可以操作自己上报的隐患
  if (hazard.inspector_id === user.employee_id) {
    return { allowed: true };
  }
  
  // 治理人可以填写治理信息
  if (hazard.governance_person === user.name) {
    return { allowed: true };
  }
  
  // 审核员可以操作所有隐患（审核流程）
  if (user.role === 'reviewer') {
    return { allowed: true };
  }
  
  return { allowed: false, error: '您没有权限操作此记录' };
}

export async function GET(
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
    
    // 优先使用URL解析获取ID，作为params的备选
    let id = extractIdFromUrl(request);
    if (!id) {
      const resolvedParams = await params;
      id = resolvedParams.id;
    }
    
    const hazards = await getHazards();
    console.log('[Get Hazard] id:', id, '总记录数:', hazards.length);
    const hazard = hazards.find((h: any) => h.id === id);
    
    if (!hazard) {
      console.log('[Get Hazard] 记录不存在:', id);
      return NextResponse.json(
        { success: false, error: '记录不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: hazard
    });
  } catch (error) {
    console.error('Get hazard error:', error);
    return NextResponse.json(
      { success: false, error: '获取记录失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 优先使用URL解析获取ID，作为params的备选
    let id = extractIdFromUrl(request);
    if (!id) {
      const resolvedParams = await params;
      id = resolvedParams.id;
    }
    
    if (!id) {
      console.log('[Update Hazard] 无法获取ID');
      return NextResponse.json(
        { success: false, error: '无效的记录ID' },
        { status: 400 }
      );
    }
    
    // 权限检查
    const permission = await checkPermission(request, id, 'update');
    if (!permission.allowed) {
      const status = permission.error === '未登录' || permission.error === '用户不存在' ? 401 : 403;
      return NextResponse.json(
        { success: false, error: permission.error },
        { status }
      );
    }
    
    const body = await request.json();
    console.log('[Update Hazard] id:', id, 'body:', JSON.stringify(body).slice(0, 200));
    
    // 先检查记录是否存在
    const hazards = await getHazards();
    const existing = hazards.find((h: any) => h.id === id);
    if (!existing) {
      console.log('[Update Hazard] 记录不存在:', id, '当前记录数:', hazards.length);
      return NextResponse.json(
        { success: false, error: '记录不存在' },
        { status: 404 }
      );
    }
    
    const updated = await updateHazard(id, body);
    
    if (!updated) {
      return NextResponse.json(
        { success: false, error: '更新失败' },
        { status: 500 }
      );
    }
    
    // 返回更新后的完整记录
    const updatedHazards = await getHazards();
    const updatedRecord = updatedHazards.find((h: any) => h.id === id);
    
    return NextResponse.json({
      success: true,
      data: updatedRecord
    });
  } catch (error) {
    console.error('Update hazard error:', error);
    return NextResponse.json(
      { success: false, error: '更新记录失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 优先使用URL解析获取ID，作为params的备选
    let id = extractIdFromUrl(request);
    if (!id) {
      const resolvedParams = await params;
      id = resolvedParams.id;
    }
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '无效的记录ID' },
        { status: 400 }
      );
    }
    
    // 权限检查
    const permission = await checkPermission(request, id, 'delete');
    if (!permission.allowed) {
      const status = permission.error === '未登录' || permission.error === '用户不存在' ? 401 : 403;
      return NextResponse.json(
        { success: false, error: permission.error },
        { status }
      );
    }
    
    await deleteHazard(id);
    
    return NextResponse.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('Delete hazard error:', error);
    return NextResponse.json(
      { success: false, error: '删除记录失败' },
      { status: 500 }
    );
  }
}
