import { NextRequest, NextResponse } from 'next/server';
import { getRiskItems, addRiskItem } from '@/lib/local-db';
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
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const keyword = searchParams.get('keyword');
    const businessModule = searchParams.get('businessModule');
    
    let items = await getRiskItems();
    
    if (keyword) {
      const kw = keyword.toLowerCase();
      items = items.filter((i: any) => 
        i.specific_location?.toLowerCase().includes(kw) ||
        i.risk_point_description?.toLowerCase().includes(kw) ||
        i.risk_point_location?.toLowerCase().includes(kw)
      );
    }
    
    if (businessModule) {
      items = items.filter((i: any) => i.business_module === businessModule);
    }
    
    // 按序号排序
    items.sort((a: any, b: any) => 
      (a.serial_number || '').localeCompare(b.serial_number || '', undefined, { numeric: true })
    );
    
    // 分页
    const total = items.length;
    const totalPages = Math.ceil(total / pageSize);
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    const paginatedItems = items.slice(from, to);
    
    return NextResponse.json({
      success: true,
      data: {
        items: paginatedItems,
        total,
        page,
        pageSize,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get risk items error:', error);
    return NextResponse.json(
      { success: false, error: '获取数据失败' },
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
    
    const body = await request.json();
    
    if (!body.serial_number) {
      return NextResponse.json(
        { success: false, error: '序号不能为空' },
        { status: 400 }
      );
    }
    
    const itemWithId = { ...body, id: Date.now().toString() };
    const ok = await addRiskItem(itemWithId);
    
    if (!ok) {
      return NextResponse.json(
        { success: false, error: '创建风险项失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: itemWithId
    });
  } catch (error) {
    console.error('Create risk item error:', error);
    return NextResponse.json(
      { success: false, error: '创建风险项失败' },
      { status: 500 }
    );
  }
}
