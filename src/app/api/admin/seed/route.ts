import { NextRequest, NextResponse } from 'next/server';
import { getUserById, initializeData, addRiskItem } from '@/lib/local-db';
import { getAuthenticatedUserId } from '@/lib/auth-utils';

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
        { success: false, error: '无权限执行此操作' },
        { status: 403 }
      );
    }
    
    // 初始化数据
    await initializeData();
    
    // 插入示例风险数据库数据
    const riskItems = [
      {
        serial_number: '1',
        business_module: '仓储管理',
        specific_location: '安顺车辆段物资总库',
        risk_point_description: '物资库房内照明设备不符合防爆要求',
        risk_point_location: '物资总库照明系统',
        risk_level: 'general',
        risk_control_measures: '1.更换为符合国家防爆标准的照明灯具\n2.定期检查照明设备完好性\n3.建立照明设备检查台账',
        hazard_inspection_method: '1.检查是否为防爆型灯具\n2.检查灯具安装是否牢固\n3.检查是否存在破损老化',
        hazard_inspection_cycle: '每周',
        hazard_inspection_position: '仓管员',
        control_responsibility_unit: '物资后勤中心-物资仓储部',
        control_responsibility_position: '仓储管理员'
      },
      {
        serial_number: '2',
        business_module: '仓储管理',
        specific_location: '各车辆段物资库区',
        risk_point_description: '货物堆放不符合规范，堵塞消防通道',
        risk_point_location: '库区内通道',
        risk_level: 'general',
        risk_control_measures: '1.严格按五距要求堆放货物\n2.保持消防通道畅通\n3.设置明显的通道标识',
        hazard_inspection_method: '1.检查货物堆放是否规范\n2.检查消防通道是否畅通\n3.检查标识是否清晰',
        hazard_inspection_cycle: '随岗',
        hazard_inspection_position: '仓管员、安全工作岗',
        control_responsibility_unit: '物资后勤中心-物资仓储部',
        control_responsibility_position: '仓储管理员'
      },
      {
        serial_number: '3',
        business_module: '设备设施',
        specific_location: '登瀛车辆段材料堆场',
        risk_point_description: '地面有铁钉、外露金属物等异物',
        risk_point_location: '材料堆场地面',
        risk_level: 'small',
        risk_control_measures: '1.定期清理场地异物\n2.设置硬质地面\n3.加强场地巡检',
        hazard_inspection_method: '1.目视检查地面状况\n2.检查是否有外露异物\n3.检查场地平整度',
        hazard_inspection_cycle: '每周',
        hazard_inspection_position: '场段工作岗',
        control_responsibility_unit: '物资后勤中心-后勤场段部',
        control_responsibility_position: '场段管理员'
      },
      {
        serial_number: '4',
        business_module: '安全管理',
        specific_location: '各物资仓库',
        risk_point_description: '仓库未配备有效的消防器材',
        risk_point_location: '仓库消防设施',
        risk_level: 'large',
        risk_control_measures: '1.按标准配置消防器材\n2.定期检查器材有效性\n3.建立消防器材检查台账\n4.组织消防演练',
        hazard_inspection_method: '1.检查消防器材配置数量\n2.检查器材有效期\n3.检查器材完好性',
        hazard_inspection_cycle: '每月',
        hazard_inspection_position: '安全工作岗',
        control_responsibility_unit: '物资后勤中心-安全工作部',
        control_responsibility_position: '安全员'
      },
      {
        serial_number: '5',
        business_module: '仓储管理',
        specific_location: '杂品库',
        risk_point_description: '杂品库内违规使用非防爆灯具',
        risk_point_location: '杂品库照明系统',
        risk_level: 'general',
        risk_control_measures: '1.更换为防爆型灯具\n2.严禁在杂品库内使用非防爆电器\n3.定期检查库内电气设备',
        hazard_inspection_method: '杂品库内灯具是否为防爆型',
        hazard_inspection_cycle: '每周',
        hazard_inspection_position: '仓管员',
        control_responsibility_unit: '物资后勤中心-物资仓储部',
        control_responsibility_position: '仓储管理员'
      }
    ];
    
    for (const item of riskItems) {
      await addRiskItem({ ...item, id: Date.now().toString() } as any);
    }
    
    return NextResponse.json({
      success: true,
      data: { count: riskItems.length }
    });
  } catch (error) {
    console.error('Seed data error:', error);
    return NextResponse.json(
      { success: false, error: '初始化数据失败' },
      { status: 500 }
    );
  }
}
