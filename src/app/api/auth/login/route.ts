import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, verifyPassword, initializeData } from '@/lib/local-db';
import { generateToken } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }
    
    // 初始化本地数据库
    await initializeData();
    
    const user = await getUserByUsername(username);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }
    
    // 验证密码
    const isValid = verifyPassword(password, user.password_hash);
    
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }
    
    // 生成带 HMAC 签名的 token
    const token = generateToken(user.id);
    
    // 移除密码哈希
    const { password_hash, ...userWithoutPassword } = user;
    
    // 使用 NextResponse 设置 cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      }
    });
    
    // 设置 cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: false, // 允许 HTTP 环境
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });
    
    response.cookies.set('user_id', user.id, {
      httpOnly: true,
      secure: false, // 允许 HTTP 环境
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
