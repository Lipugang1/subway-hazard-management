import { NextRequest, NextResponse } from 'next/server';
import { getHazards } from '@/lib/local-db';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { getUserById } from '@/lib/local-db';
import * as XLSX from 'xlsx';

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
    const { startDate, endDate, inspectionCenter, inspectionDepartment, hazardLevel, status } = body;
    
    let hazards = await getHazards();

    // 部门数据隔离：非管理员只能导出自己部门的隐患
    const user = await getUserById(userId);
    if (user && user.role !== 'admin') {
      hazards = hazards.filter((h: any) => h.inspection_department === user.inspection_department);
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
    if (inspectionDepartment) {
      hazards = hazards.filter((h: any) => h.inspection_department === inspectionDepartment);
    }
    if (hazardLevel) {
      hazards = hazards.filter((h: any) => h.hazard_level === hazardLevel);
    }
    if (status) {
      hazards = hazards.filter((h: any) => h.status === status);
    }
    
    // 构建符合《隐患排查治理记录2026.xlsx》格式的数据
    const exportData = hazards.map((record: any, index: number) => ({
      '序号': index + 1,
      '排查中心': record.inspection_center || '',
      '排查部门': record.inspection_department || '',
      '排查班组': record.inspection_team || '',
      '排查岗位': record.inspection_position || '',
      '排查人工号': record.inspector_id || '',
      '排查人员': record.inspector_name || '',
      '排查日期': record.inspection_date || '',
      '排查地点': record.inspection_location || '',
      '所属线别': record.line || '',
      '隐患描述': record.hazard_description || '',
      '治理责任部门': record.governance_department || '',
      '配合部门': record.cooperating_department || '',
      '治理责任人': record.governance_person || '',
      '隐患分类': record.hazard_category || '',
      '隐患等级': record.hazard_level === 'general_i' ? '一般隐患I级' : '一般隐患II级',
      '临时管控措施': record.temporary_measures || '',
      '治理措施': record.governance_measure || '',
      '治理时限': record.governance_deadline || '',
      '治理结果': record.governance_result || '',
      '具体治理情况': record.governance_details || '',
      '复查人': record.reviewer_name || ''
    }));
    
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 30 },
      { wch: 10 },
      { wch: 50 },
      { wch: 25 },
      { wch: 25 },
      { wch: 10 },
      { wch: 20 },
      { wch: 15 },
      { wch: 40 },
      { wch: 50 },
      { wch: 12 },
      { wch: 10 },
      { wch: 30 },
      { wch: 10 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, '隐患排查治理记录');
    
    // 生成 buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // 生成文件名（URL编码处理中文）
    const filename = `隐患排查治理记录_${new Date().toISOString().split('T')[0]}.xlsx`;
    const encodedFilename = encodeURIComponent(filename);
    
    // 返回文件
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { success: false, error: '导出失败' },
      { status: 500 }
    );
  }
}
