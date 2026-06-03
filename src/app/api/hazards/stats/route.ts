import { NextRequest, NextResponse } from 'next/server';
import { getHazards, getUserById } from '@/lib/local-db';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const user = await getUserById(userId);
    let hazards = await getHazards();

    // 非管理员只能看自己部门的隐患
    if (user && user.role !== 'admin') {
      hazards = hazards.filter((h: any) =>
        h.inspection_department === user.inspection_department ||
        h.inspector_id === user.employee_id ||
        h.inspector_name === user.name
      );
    }

    // 统计各状态数量
    const stats = {
      total: hazards.length,
      draft: hazards.filter((h: any) => h.status === 'draft').length,
      submitted: hazards.filter((h: any) => h.status === 'submitted').length,
      approved: hazards.filter((h: any) => h.status === 'approved').length,
      processing: hazards.filter((h: any) => h.status === 'processing').length,
      closed: hazards.filter((h: any) => h.status === 'closed').length,
      rejected: hazards.filter((h: any) => h.status === 'rejected').length,
      // 便捷分组
      pending: hazards.filter((h: any) => ['submitted', 'approved'].includes(h.status)).length,
      inProgress: hazards.filter((h: any) => h.status === 'processing').length,
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get hazard stats error:', error);
    return NextResponse.json({ success: false, error: '获取统计数据失败' }, { status: 500 });
  }
}
