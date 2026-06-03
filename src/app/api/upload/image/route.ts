import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/local-db';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { S3Storage } from 'coze-coding-dev-sdk';

// 延迟初始化存储（避免无配置时模块加载失败）
let storage: S3Storage | null = null;

function getStorage(): S3Storage | null {
  if (storage) return storage;
  
  const endpointUrl = process.env.COZE_BUCKET_ENDPOINT_URL;
  const bucketName = process.env.COZE_BUCKET_NAME;
  
  if (!endpointUrl || !bucketName) {
    console.log('[Upload] 未配置云端存储，图片上传不可用');
    return null;
  }
  
  storage = new S3Storage({
    endpointUrl,
    bucketName,
  });
  
  return storage;
}

export async function POST(request: NextRequest) {
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
    
    // 检查云存储配置
    const storage = getStorage();
    if (!storage) {
      return NextResponse.json(
        { success: false, error: '系统未配置云端存储，图片上传暂不可用' },
        { status: 503 }
      );
    }
    
    // 解析 multipart/form-data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: '请上传图片文件' },
        { status: 400 }
      );
    }
    
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '只支持 JPG、PNG、GIF、WebP 格式的图片' },
        { status: 400 }
      );
    }
    
    // 验证文件大小（最大 10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: '图片大小不能超过 10MB' },
        { status: 400 }
      );
    }
    
    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 生成文件名
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `hazards/${userId}/${timestamp}.${extension}`;
    
    // 上传到对象存储
    const key = await storage.uploadFile({
      fileContent: buffer,
      fileName: fileName,
      contentType: file.type,
    });
    
    // 生成签名 URL（有效期 30 天）
    const url = await storage.generatePresignedUrl({
      key: key,
      expireTime: 30 * 24 * 60 * 60, // 30 天
    });
    
    return NextResponse.json({
      success: true,
      data: {
        key: key,
        url: url,
        fileName: file.name,
        size: file.size,
      }
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { success: false, error: '图片上传失败' },
      { status: 500 }
    );
  }
}
