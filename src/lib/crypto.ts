// 密码哈希工具函数（独立模块，避免循环依赖）
import { createHash } from 'crypto';

export function hashPassword(password: string): string {
  if (!password) return '';
  return createHash('sha256').update(password, 'utf8').digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
