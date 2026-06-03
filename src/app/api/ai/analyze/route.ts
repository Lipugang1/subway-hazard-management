import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/local-db';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { LLMClient, Config, HeaderUtils, Message, ContentPart } from 'coze-coding-dev-sdk';
import type { HazardLevel } from '@/types';

// 获取当前日期格式：x月x日
function getCurrentDate(): string {
  const now = new Date();
  return `${now.getMonth() + 1}月${now.getDate()}日`;
}

// 判断图片URL还是base64
function parseImageInput(input: string): { url: string; isBase64: boolean } {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return { url: input, isBase64: false };
  }
  if (input.startsWith('data:')) {
    return { url: input, isBase64: true };
  }
  return { url: `data:image/jpeg;base64,${input}`, isBase64: true };
}

// 调用 LLM API 进行图片分析（使用 SDK）
async function analyzeImageWithAI(
  imageInput: string,
  customHeaders: Record<string, string>,
  userInfo?: { center?: string; department?: string }
): Promise<{
  location: string;
  hazard_description: string;
  hazard_level: HazardLevel;
}> {
  const currentDate = getCurrentDate();
  const userContext = userInfo?.center || userInfo?.department
    ? `排查中心/部门：${userInfo.center || ''} ${userInfo.department || ''}`
    : '';

  const { url } = parseImageInput(imageInput);

  try {
    // 使用 SDK 的 LLMClient
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 准备消息内容
    const userContent: ContentPart[] = [
      {
        type: 'image_url',
        image_url: {
          url: url,
          detail: 'high'
        }
      },
      {
        type: 'text',
        text: userContext
          ? `补充信息：${userContext}\n请仔细分析这张图片，识别所有可能的隐患并按格式输出。`
          : '请仔细分析这张图片，识别所有可能的隐患并按格式输出。'
      }
    ];

    const messages: Message[] = [
      {
        role: 'system',
        content: `你是一个专业的城市轨道交通安全隐患识别专家。请仔细分析上传的现场图片，识别所有可能存在的安全隐患。

## 隐患定义
指违反安全生产法律、法规、规章、标准、规程和安全生产管理制度的规定，或者因其他因素在生产经营活动中存在可能导致事故发生的人的不安全行为、物的危险状态、环境的不安全因素、管理上的缺陷。

## 识别范围（请尽量全面识别，不要遗漏任何隐患）
1. **人的不安全行为**：违规操作、未佩戴安全防护用品、违规进入危险区域、作业姿势不当等
2. **物的危险状态**：设备设施缺陷、危险物品存放不当、消防设施缺失或损坏、电线电缆老化破损、物料堆放不规范等
3. **环境的不安全因素**：地面湿滑、照明不足、通风不良、通道堵塞、地面不平整、有障碍物等
4. **管理上的缺陷**：标识缺失、安全制度未落实、现场管理混乱、防护措施不到位等

## 输出要求
请按以下标准格式输出隐患描述：

【排查发现日期】+【具体地理位置】+【具体隐患概况】

格式要求：
- 【排查发现日期】：当前日期（已提供：${currentDate}）
- 【具体地理位置】：具体的设备设施位置，如"安顺车辆段物资总库杂品库"、"XX车站站台"、"XX区间隧道"、"车辆段料场"等
- 【具体隐患概况】：详细描述发现的具体隐患，包括：
  - 隐患的具体表现（如：电缆卷未固定、物料堆放混乱、地面有杂物等）
  - 可能造成的危害或风险
  - 如果是违规问题，指出违反的相关规定

## 输出格式示例
示例1：X月X日排查发现，安顺车辆段物资总库杂品库内，发现普通白炽灯安装于杂品库，不符合防爆要求，存在火灾隐患。

示例2：X月X日排查发现，登瀛车辆段材料堆场C区，地面散落铁钉及金属异物，存在扎伤人员及损坏物资风险。

示例3：X月X日排查发现，XX车站站厅消防通道被货物堵塞，违反消防通道管理规定，影响应急疏散。

示例4：X月X日排查发现，检修车间内维修人员未佩戴安全帽，存在人员伤害风险。

示例5：X月X日排查发现，XX车辆段料场大型电缆卷未设置固定装置，电缆卷可能发生滚动，存在物体打击风险。

## 重要提醒
1. 必须识别出至少一个隐患，不要说"无隐患"或"图片正常"
2. 隐患描述要详细、具体，避免过于笼统
3. 如果是多处隐患，请合并到一个描述中
4. 隐患等级判断：涉及人员伤亡、消防通道、特种设备、重要设施的为一般隐患I级；其他为一般隐患II级`
      },
      {
        role: 'user',
        content: userContent
      }
    ];

    // 调用 SDK
    const response = await client.invoke(messages, {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.3
    });

    const content = response.content.trim();

    if (!content || content.length < 10) {
      throw new Error('AI返回内容为空或过短');
    }

    if (content.includes('无隐患') || content.includes('未发现隐患') || content.includes('图片正常')) {
      const retryMessages: Message[] = [...messages];
      retryMessages[1] = {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: url,
              detail: 'high'
            }
          },
          {
            type: 'text',
            text: '请务必从这张图片中找出至少一个安全隐患！可能包括：物料未固定、地面有杂物、环境不安全、设备损坏等。请详细描述你看到的隐患。'
          }
        ]
      };

      const retryResponse = await client.invoke(retryMessages, {
        model: 'doubao-seed-1-8-251228',
        temperature: 0.5
      });

      const retryContent = retryResponse.content.trim();
      if (retryContent && retryContent.length > 10 && !retryContent.includes('无隐患')) {
        return parseAnalysisResult(retryContent);
      }
    }

    return parseAnalysisResult(content);
  } catch (error) {
    console.error('AI analysis error:', error);
    throw error;
  }
}

// 解析分析结果
function parseAnalysisResult(content: string): {
  location: string;
  hazard_description: string;
  hazard_level: HazardLevel;
} {
  let level: HazardLevel = 'general_ii';
  if (content.includes('I级') || content.includes('消防') ||
      content.includes('爆炸') || content.includes('人员伤亡') ||
      content.includes('逃生') || content.includes('疏散') ||
      content.includes('电缆卷') || content.includes('固定') ||
      content.includes('物体打击') || content.includes('碾压')) {
    level = 'general_i';
  }

  const locationMatch = content.match(/(安顺|登瀛|XX|1号线|2号线|3号线|车辆段|料场|车站)[^，。,、：:\s]+/);
  const location = locationMatch ? locationMatch[0] : '';

  return {
    location,
    hazard_description: content,
    hazard_level: level
  };
}

// 检查 AI 功能是否可用
function isAIAvailable(): boolean {
  return !!(process.env.DOUBAO_API_KEY || process.env.COZE_API_KEY || process.env.COZE_BOT_ID);
}

const AI_UNAVAILABLE_MSG = 'AI 图片分析功能未配置。如需启用，请在项目根目录创建 .env 文件并设置 DOUBAO_API_KEY=你的API密钥（豆包视觉模型）';

export async function POST(request: NextRequest) {
  if (!isAIAvailable()) {
    return NextResponse.json(
      { success: false, error: AI_UNAVAILABLE_MSG },
      { status: 503 }
    );
  }
  try {
    // 从请求头获取用户 ID
    const userId = getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    // 验证用户存在
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { image_base64, image_url } = body;

    const imageInput = image_base64 || image_url;

    if (!imageInput) {
      return NextResponse.json(
        { success: false, error: '请提供图片数据（image_base64 或 image_url）' },
        { status: 400 }
      );
    }

    // 调用 AI 分析
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const result = await analyzeImageWithAI(imageInput, customHeaders, {
      center: user.inspection_center,
      department: user.inspection_department
    });

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Image analysis error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '图片分析失败' },
      { status: 500 }
    );
  }
}
