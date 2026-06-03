// 统一的认证工具函数
import { createHmac } from 'crypto';

// HMAC 签名密钥（从环境变量读取，开发环境有默认值）
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'hazard-system-dev-secret-2024';

/**
 * 生成带 HMAC 签名的 token
 * 格式: Base64(userId:timestamp).signature
 */
export function generateToken(userId: string): string {
  const payload = Buffer.from(`${userId}:${Date.now()}`).toString('base64');
  const signature = createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex').slice(0, 16);
  return `${payload}.${signature}`;
}

/**
 * 验证 token 签名并提取 userId
 */
export function verifyToken(token: string): string | null {
  try {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    // 验证签名
    const expectedSignature = createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex').slice(0, 16);
    if (signature !== expectedSignature) return null;

    // 解码 payload
    const decoded = Buffer.from(payload, 'base64').toString();
    const userId = decoded.split(':')[0];
    return userId || null;
  } catch {
    return null;
  }
}

/**
 * 从请求中获取已认证的用户 ID
 * 统一入口：优先从 cookie 读取 token 验证，备选从 header 读取
 */
export function getAuthenticatedUserId(request: Request): string | null {
  // 1. 优先从 cookie 获取 token
  const cookieHeader = request.headers.get('cookie') || '';
  const authTokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
  if (authTokenMatch) {
    const userId = verifyToken(authTokenMatch[1]);
    if (userId) return userId;
  }

  // 2. 备选：从 x-user-id header 获取（兼容前端 localStorage 方式）
  const headerUserId = request.headers.get('x-user-id');
  if (headerUserId) return headerUserId;

  return null;
}
