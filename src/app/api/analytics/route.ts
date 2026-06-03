import { NextRequest, NextResponse } from 'next/server';
import { getHazards, getUsers } from '@/lib/local-db';
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
    
    const [allHazards, users] = await Promise.all([
      getHazards(),
      getUsers()
    ]);

    // 获取时间范围参数
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';

    // 根据时间范围筛选隐患
    let hazards = allHazards;
    if (period === 'month') {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      hazards = allHazards.filter((h: any) => {
        const date = new Date(h.inspection_date || h.created_at);
        return date.getFullYear() === year && date.getMonth() === month;
      });
    }
    
    // 1. 各部门隐患数量统计
    const departmentStats = hazards.reduce((acc: Record<string, number>, h: any) => {
      const dept = h.inspection_department || '未知部门';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});
    
    // 2. 各线路隐患数量统计
    const lineStats = hazards.reduce((acc: Record<string, number>, h: any) => {
      const line = h.line || h.inspection_location || '未分类';
      acc[line] = (acc[line] || 0) + 1;
      return acc;
    }, {});
    
    // 3. 隐患等级分布
    const levelStats = hazards.reduce((acc: Record<string, number>, h: any) => {
      const level = h.hazard_level || 'general_i';
      const levelMap: Record<string, string> = {
        'general_i': '一般隐患I级',
        'general_ii': '一般隐患II级',
        'serious_i': '重大隐患I级',
        'serious_ii': '重大隐患II级'
      };
      const levelName = levelMap[level] || level;
      acc[levelName] = (acc[levelName] || 0) + 1;
      return acc;
    }, {});
    
    // 4. 隐患状态分布
    const statusStats = hazards.reduce((acc: Record<string, number>, h: any) => {
      const status = h.status || 'unknown';
      const statusMap: Record<string, string> = {
        'draft': '草稿',
        'submitted': '已上报',
        'under_review': '审核中',
        'approved': '审核通过',
        'rejected': '已驳回',
        'governance': '治理中',
        'processing': '治理中',
        'closed': '已关闭'
      };
      const statusName = statusMap[status] || status;
      acc[statusName] = (acc[statusName] || 0) + 1;
      return acc;
    }, {});
    
    // 5. 排查人员统计
    const inspectorStats = hazards.reduce((acc: Record<string, any>, h: any) => {
      const name = h.inspector_name || h.inspector || '未知';
      if (!acc[name]) {
        acc[name] = {
          name,
          employee_id: h.inspector_id,
          department: h.inspection_department,
          count: 0
        };
      }
      acc[name].count++;
      return acc;
    }, {});
    
    // 6. 班组隐患数量统计
    const teamStats = hazards.reduce((acc: Record<string, number>, h: any) => {
      const team = h.inspection_team || '未分组';
      acc[team] = (acc[team] || 0) + 1;
      return acc;
    }, {});
    
    // 7. 班组内成员参与度
    const teamParticipation: Record<string, { team: string; members: Array<{ name: string; count: number; percentage: number }> }> = {};
    
    for (const h of hazards) {
      const team = (h as any).inspection_team || '未分组';
      const member = (h as any).inspector_name || (h as any).inspector || '未知';
      
      if (!teamParticipation[team]) {
        teamParticipation[team] = { team, members: [] };
      }
      
      const existing = teamParticipation[team].members.find(m => m.name === member);
      if (existing) {
        existing.count++;
      } else {
        teamParticipation[team].members.push({ name: member, count: 1, percentage: 0 });
      }
    }
    
    // 计算百分比
    for (const team in teamParticipation) {
      const total = teamParticipation[team].members.reduce((sum, m) => sum + m.count, 0);
      teamParticipation[team].members.forEach(m => {
        m.percentage = total > 0 ? Math.round((m.count / total) * 100) : 0;
      });
      // 按数量排序
      teamParticipation[team].members.sort((a, b) => b.count - a.count);
    }
    
    // 8. 月度趋势（最近6个月）
    const monthlyTrend: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrend[key] = 0;
    }
    
    allHazards.forEach((h: any) => {
      const date = new Date(h.inspection_date || h.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyTrend.hasOwnProperty(key)) {
        monthlyTrend[key]++;
      }
    });
    
    // 9. 汇总数据
    const summary = {
      total: hazards.length,
      departments: Object.keys(departmentStats).length,
      inspectors: Object.keys(inspectorStats).length,
      teams: Object.keys(teamStats).length,
      avgPerDepartment: Object.keys(departmentStats).length > 0 
        ? Math.round(hazards.length / Object.keys(departmentStats).length) 
        : 0
    };
    
    // 10. 各部门详细数据
    const departmentDetail = Object.entries(departmentStats)
      .map(([name, count]) => {
        const deptHazards = hazards.filter((h: any) => h.inspection_department === name);
        const deptInspectors = [...new Set(deptHazards.map((h: any) => h.inspector_name || h.inspector))];
        const byLevel = deptHazards.reduce((acc: Record<string, number>, h: any) => {
          const level = (h as any).hazard_level || 'general_i';
          acc[level] = (acc[level] || 0) + 1;
          return acc;
        }, {});
        
        return {
          name,
          count,
          inspectors: deptInspectors.length,
          inspectorNames: deptInspectors,
          byLevel
        };
      })
      .sort((a, b) => b.count - a.count);
    
    return NextResponse.json({
      success: true,
      data: {
        summary,
        departmentStats,
        departmentDetail,
        lineStats,
        levelStats,
        statusStats,
        inspectorStats: Object.values(inspectorStats).sort((a: any, b: any) => b.count - a.count),
        teamStats,
        teamParticipation: Object.values(teamParticipation).sort((a, b) => b.members.reduce((s, m) => s + m.count, 0) - a.members.reduce((s, m) => s + m.count, 0)),
        monthlyTrend: Object.entries(monthlyTrend).map(([month, count]) => ({ month, count }))
      }
    });
    
  } catch (error) {
    console.error('[Analytics API] Error:', error);
    return NextResponse.json(
      { success: false, error: '获取分析数据失败' },
      { status: 500 }
    );
  }
}
