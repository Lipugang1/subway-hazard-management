import { NextRequest, NextResponse } from 'next/server';
import { getHazards, getUsers } from '@/lib/local-db';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { LLMClient, Config, HeaderUtils, Message } from 'coze-coding-dev-sdk';

// 检查 AI 功能是否可用
function isAIAvailable(): boolean {
  return !!(process.env.DOUBAO_API_KEY || process.env.COZE_API_KEY || process.env.COZE_BOT_ID);
}

export async function POST(request: NextRequest) {
  if (!isAIAvailable()) {
    return NextResponse.json(
      { success: false, error: 'AI 月度分析功能未配置。如需启用，请在项目根目录创建 .env 文件并设置 DOUBAO_API_KEY=你的API密钥' },
      { status: 503 }
    );
  }
  try {
    const userId = getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    let period = 'month';
    try {
      const body = await request.json();
      period = body.period || 'month';
    } catch {
      // GET request without body, use default
    }

    const [allHazards, users] = await Promise.all([
      getHazards(),
      getUsers()
    ]);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    const currentMonthName = `${currentMonth + 1}月`;

    // 当月隐患
    const currentMonthHazards = allHazards.filter((h: any) => {
      const date = new Date(h.inspection_date || h.created_at);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    });

    // 上月隐患
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonthHazards = allHazards.filter((h: any) => {
      const date = new Date(h.inspection_date || h.created_at);
      return date.getFullYear() === prevYear && date.getMonth() === prevMonth;
    });

    // 需要分析的隐患数据
    const hazards = period === 'month' ? currentMonthHazards : allHazards;

    // 按部门分组
    const departmentGroups: Record<string, any[]> = {};
    for (const h of hazards) {
      const dept = h.inspection_department || '未知部门';
      if (!departmentGroups[dept]) departmentGroups[dept] = [];
      departmentGroups[dept].push(h);
    }

    // 上月按部门分组
    const prevDepartmentGroups: Record<string, any[]> = {};
    for (const h of prevMonthHazards) {
      const dept = h.inspection_department || '未知部门';
      if (!prevDepartmentGroups[dept]) prevDepartmentGroups[dept] = [];
      prevDepartmentGroups[dept].push(h);
    }

    // 状态映射
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

    // 等级映射
    const levelMap: Record<string, string> = {
      'general_i': '一般隐患I级',
      'general_ii': '一般隐患II级',
      'serious_i': '重大隐患I级',
      'serious_ii': '重大隐患II级'
    };

    // 治理时限预警计算
    const DEADLINE_DAYS = 10;
    function getDeadlineInfo(h: any): string {
      if (h.status === 'closed' || h.status === 'draft') return '';
      const startDate = new Date(h.inspection_date || h.created_at);
      const deadline = new Date(startDate.getTime() + DEADLINE_DAYS * 24 * 60 * 60 * 1000);
      const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays < 0) return `已超期${Math.abs(diffDays)}天`;
      if (diffDays <= 3) return `即将超期(剩余${diffDays}天)`;
      return '';
    }

    // 构建每个部门的分析数据
    const departmentAnalysisData: Record<string, any> = {};
    for (const [dept, deptHazards] of Object.entries(departmentGroups)) {
      const prevDeptHazards = prevDepartmentGroups[dept] || [];
      const totalCount = deptHazards.length;
      const prevTotalCount = prevDeptHazards.length;

      // 环比变化
      let changeStr = '';
      if (prevTotalCount > 0) {
        const change = ((totalCount - prevTotalCount) / prevTotalCount * 100).toFixed(1);
        const numChange = parseFloat(change);
        if (numChange > 0) changeStr = `环比上月增长${change}%`;
        else if (numChange < 0) changeStr = `环比上月下降${Math.abs(numChange)}%`;
        else changeStr = '与上月持平';
      } else if (prevTotalCount === 0 && totalCount > 0) {
        changeStr = '上月无隐患记录';
      }

      // 已整改/未整改
      const rectified = deptHazards.filter((h: any) => h.status === 'closed');
      const unrectified = deptHazards.filter((h: any) => h.status !== 'closed' && h.status !== 'draft');
      const rectifiedCount = rectified.length;
      const unrectifiedCount = unrectified.length;

      // 未整改隐患描述
      const unrectifiedDescs = unrectified.map((h: any) =>
        h.hazard_description || h.inspection_location || '无描述'
      ).slice(0, 5);

      // 超期隐患
      const overdueItems = deptHazards.filter((h: any) => {
        const info = getDeadlineInfo(h);
        return info.includes('超期');
      });
      const overdueCount = overdueItems.length;

      // 高发隐患类型
      const categoryCount: Record<string, number> = {};
      for (const h of deptHazards) {
        const cat = h.hazard_category || h.hazard_description || '未分类';
        // 取描述中的关键信息（前20字作为类别）
        const shortCat = cat.length > 20 ? cat.substring(0, 20) + '...' : cat;
        categoryCount[shortCat] = (categoryCount[shortCat] || 0) + 1;
      }
      const topCategories = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      // 排查参与人数
      const inspectors = [...new Set(deptHazards.map((h: any) => h.inspector_name || h.inspector))];

      // 等级分布
      const levelDist: Record<string, number> = {};
      for (const h of deptHazards) {
        const lvl = levelMap[h.hazard_level] || h.hazard_level || '未知';
        levelDist[lvl] = (levelDist[lvl] || 0) + 1;
      }

      departmentAnalysisData[dept] = {
        totalCount,
        prevTotalCount,
        changeStr,
        rectifiedCount,
        unrectifiedCount,
        unrectifiedDescs,
        overdueCount,
        topCategories,
        inspectorCount: inspectors.length,
        inspectorNames: inspectors,
        levelDist,
        statusDist: deptHazards.reduce((acc: Record<string, number>, h: any) => {
          const s = statusMap[h.status] || h.status;
          acc[s] = (acc[s] || 0) + 1;
          return acc;
        }, {})
      };
    }

    // 整体分析数据
    const totalRectified = hazards.filter((h: any) => h.status === 'closed').length;
    const totalUnrectified = hazards.filter((h: any) => h.status !== 'closed' && h.status !== 'draft').length;
    const totalPrevCount = prevMonthHazards.length;
    let totalChangeStr = '';
    if (totalPrevCount > 0) {
      const change = ((hazards.length - totalPrevCount) / totalPrevCount * 100).toFixed(1);
      const numChange = parseFloat(change);
      if (numChange > 0) totalChangeStr = `环比上月增长${change}%`;
      else if (numChange < 0) totalChangeStr = `环比上月下降${Math.abs(numChange)}%`;
      else totalChangeStr = '与上月持平';
    } else if (totalPrevCount === 0 && hazards.length > 0) {
      totalChangeStr = '上月无隐患记录';
    }

    const overallData = {
      total: hazards.length,
      prevTotal: totalPrevCount,
      changeStr: totalChangeStr,
      rectifiedCount: totalRectified,
      unrectifiedCount: totalUnrectified,
      departments: Object.keys(departmentGroups),
      departmentCount: Object.keys(departmentGroups).length,
      totalInspectors: [...new Set(hazards.map((h: any) => h.inspector_name || h.inspector))].length,
    };

    // 构建 prompt
    const prompt = `你是一位城市轨道交通安全隐患排查治理分析专家。请根据以下隐患数据，撰写一份专业的月度隐患整改情况分析报告。

## 要求
1. 先写整体分析，再逐个部门分析
2. 语言专业、简洁，使用正式的公文风格
3. 必须包含每个部门的具体数据
4. 对于超期隐患要特别指出并强调
5. 高发隐患要指出具体类型和建议
6. 保留原始数据中的具体数值，不要编造数据
7. 每个部门分析要包含：发现隐患数量、环比变化、已整改/未整改数量、未整改隐患具体内容、是否有超期隐患、高发隐患类型、排查参与人数

## 当前月份
${currentYear}年${currentMonthName}

## 整体数据
- ${currentMonthName}共发现隐患${overallData.total}条，${overallData.changeStr}
- 已整改${overallData.rectifiedCount}条，未整改${overallData.unrectifiedCount}条
- 涉及${overallData.departmentCount}个部门，排查参与${overallData.totalInspectors}人

## 各部门数据
${Object.entries(departmentAnalysisData).map(([dept, data]: [string, any]) => `
### ${dept}
- ${currentMonthName}共发现隐患${data.totalCount}条，${data.changeStr}
- 已整改${data.rectifiedCount}条，未整改${data.unrectifiedCount}条
- 未整改隐患：${data.unrectifiedDescs.length > 0 ? data.unrectifiedDescs.join('；') : '无'}
- 超期隐患：${data.overdueCount}条${data.overdueCount > 0 ? '（存在超期未整改隐患，需重点关注）' : '（无超期隐患）'}
- 高发隐患：${data.topCategories.map((c: any) => `${c[0]}(${c[1]}条)`).join('、') || '无'}
- 排查参与人数：${data.inspectorCount}人（${data.inspectorNames.join('、')}）
- 隐患等级分布：${Object.entries(data.levelDist).map(([k, v]: [string, any]) => `${k}${v}条`).join('、')}
`).join('')}

请生成分析报告。`;

    // 调用 LLM
    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new LLMClient(config, customHeaders);

    const messages: Message[] = [
      { role: 'user', content: prompt },
    ];

    const stream = client.stream(messages, {
      model: 'doubao-seed-2-0-lite-260215',
      temperature: 0.3,
    });

    // 收集完整响应
    let fullText = '';
    for await (const chunk of stream) {
      if (chunk.content) {
        fullText += chunk.content.toString();
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        analysis: fullText,
        period: period === 'month' ? `${currentYear}年${currentMonthName}` : '全部',
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[AI Monthly Analysis] Error:', error);
    return NextResponse.json(
      { success: false, error: 'AI分析失败: ' + (error instanceof Error ? error.message : '未知错误') },
      { status: 500 }
    );
  }
}
