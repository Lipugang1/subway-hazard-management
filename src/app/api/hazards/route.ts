import { NextRequest, NextResponse } from 'next/server';
import { getHazards, addHazard } from '@/lib/local-db';
import { getUserById } from '@/lib/local-db';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import type { HazardQueryParams } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const userId = getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    // 获取当前用户信息
    const user = await getUserById(userId);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const inspectionCenter = searchParams.get('inspectionCenter');
    const inspectionDepartment = searchParams.get('inspectionDepartment');
    const inspectionTeam = searchParams.get('inspectionTeam');
    const inspectorName = searchParams.get('inspectorName');
    const inspectionLocation = searchParams.get('inspectionLocation');
    const hazardLevel = searchParams.get('hazardLevel');
    const status = searchParams.get('status');
    const governanceDepartment = searchParams.get('governanceDepartment');
    const keyword = searchParams.get('keyword');
    
    let hazards = await getHazards();
    console.log('[Hazards List] 总记录数:', hazards.length);
    
    // 非管理员用户只能查看自己部门的隐患，或自己上报的隐患
    if (user && user.role !== 'admin') {
      hazards = hazards.filter((h: any) => 
        h.inspection_department === user.inspection_department ||
        h.inspector_id === user.employee_id ||
        h.inspector_name === user.name
      );
      console.log('[Hazards List] 用户部门:', user.inspection_department, '筛选后记录数:', hazards.length);
    }
    
    // 应用筛选条件
    if (startDate) {
      hazards = hazards.filter((h: any) => h.inspection_date >= startDate);
    }
    if (endDate) {
      hazards = hazards.filter((h: any) => h.inspection_date <= endDate);
    }
    if (inspectionCenter) {
      hazards = hazards.filter((h: any) => h.inspection_center === inspectionCenter);
    }
    // 管理员可以筛选特定部门，非管理员只能看自己部门（忽略前端传递的部门参数）
    if (inspectionDepartment && user && user.role === 'admin') {
      hazards = hazards.filter((h: any) => h.inspection_department === inspectionDepartment);
    }
    // 按班组筛选
    if (inspectionTeam && inspectionTeam !== 'all') {
      hazards = hazards.filter((h: any) => h.inspection_team === inspectionTeam);
    }
    // 按人员筛选（兼容 inspector_name 和 inspector，使用精确匹配避免误匹配）
    if (inspectorName && inspectorName !== 'all') {
      hazards = hazards.filter((h: any) => 
        h.inspector_name === inspectorName || 
        h.inspector === inspectorName ||
        h.inspector_name?.includes(inspectorName) || 
        h.inspector?.includes(inspectorName)
      );
    }
    if (inspectionLocation) {
      hazards = hazards.filter((h: any) => 
        h.inspection_location?.toLowerCase().includes(inspectionLocation.toLowerCase())
      );
    }
    if (hazardLevel) {
      hazards = hazards.filter((h: any) => h.hazard_level === hazardLevel);
    }
    if (status) {
      hazards = hazards.filter((h: any) => h.status === status);
    }
    if (governanceDepartment) {
      hazards = hazards.filter((h: any) => h.governance_department === governanceDepartment);
    }
    if (keyword) {
      const kw = keyword.toLowerCase();
      hazards = hazards.filter((h: any) => 
        h.hazard_description?.toLowerCase().includes(kw) ||
        h.inspection_location?.toLowerCase().includes(kw)
      );
    }
    
    // 按创建时间降序
    hazards.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    // 分页
    const total = hazards.length;
    const totalPages = Math.ceil(total / pageSize);
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    const items = hazards.slice(from, to);
    
    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get hazards error:', error);
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
    
    // 验证必填字段（班组和岗位改为非必填）
    const requiredFields = [
      'inspection_center', 'inspection_department',
      'inspector_id', 'inspector',
      'inspection_date', 'inspection_location', 'hazard_description',
      'hazard_level', 'hazard_category', 'status',
      'governance_department', 'governance_person', 'governance_deadline', 'governance_measure'
    ];
    
    // 兼容 inspector_name 和 inspector 字段
    if (body.inspector_name && !body.inspector) {
      body.inspector = body.inspector_name;
    }
    
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `缺少必填字段: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // 班组和岗位改为可选
    if (!body.inspection_team) {
      body.inspection_team = '';
    }
    if (!body.inspection_position) {
      body.inspection_position = '';
    }
    
    // 获取当前用户信息用于审计
    const user = await getUserById(userId);
    
    const hazardData = {
      ...body,
      id: Date.now().toString(),
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const success = await addHazard(hazardData);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: '创建隐患记录失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: hazardData
    });
  } catch (error) {
    console.error('Create hazard error:', error);
    return NextResponse.json(
      { success: false, error: '创建记录失败' },
      { status: 500 }
    );
  }
}
