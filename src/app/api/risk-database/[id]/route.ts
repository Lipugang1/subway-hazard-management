import { NextRequest, NextResponse } from 'next/server';
import { getRiskItems, updateRiskItem, deleteRiskItem } from '@/lib/local-db';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

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
    
    const { id } = await params;
    const items = await getRiskItems();
    const item = items.find((i: any) => i.id === id);
    
    if (!item) {
      return NextResponse.json(
        { success: false, error: '风险项不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Get risk item error:', error);
    return NextResponse.json(
      { success: false, error: '获取风险项失败' },
      { status: 500 }
    );
  }
}

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
    
    const { id } = await params;
    const body = await request.json();
    const { reason, ...updateData } = body;
    
    const updated = await updateRiskItem(id, updateData);
    
    if (!updated) {
      return NextResponse.json(
        { success: false, error: '风险项不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Update risk item error:', error);
    return NextResponse.json(
      { success: false, error: '更新风险项失败' },
      { status: 500 }
    );
  }
}

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
    
    const { id } = await params;
    await deleteRiskItem(id);
    
    return NextResponse.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('Delete risk item error:', error);
    return NextResponse.json(
      { success: false, error: '删除风险项失败' },
      { status: 500 }
    );
  }
}
