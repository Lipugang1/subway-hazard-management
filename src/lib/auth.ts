// 认证工具函数
import { getUserByUsername, getUsers, createUser as dbCreateUser, getUserById } from './local-db';
import { hashPassword, verifyPassword } from './crypto';
import type { User, LoginResponse } from '@/types';

// 重导出密码工具，保持兼容
export { hashPassword, verifyPassword };

export async function login(username: string, password: string): Promise<LoginResponse | null> {
  const user = await getUserByUsername(username);
  
  if (!user) {
    return null;
  }
  
  if (!verifyPassword(password, user.password_hash)) {
    return null;
  }
  
  const { password_hash, ...userWithoutPassword } = user;
  
  // 生成简单的 token (生产环境应使用 JWT)
  const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
  
  return {
    user: userWithoutPassword as User,
    token
  };
}

export async function getUserByIdFromAuth(id: string): Promise<User | null> {
  const user = await getUserById(id);
  if (!user) return null;
  
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword as User;
}

export async function createUser(userData: any): Promise<User | null> {
  const hashedPassword = hashPassword(userData.password || '');
  
  const user = await dbCreateUser({
    ...userData,
    password_hash: hashedPassword
  });
  
  if (!user) return null;
  
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword as User;
}

export async function getAllUsers(): Promise<User[]> {
  const users = await getUsers();
  
  return users.map((user: any) => {
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  });
}
