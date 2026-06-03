// 客户端 API 请求工具

const getUserId = (): string | null => {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('user');
  if (user) {
    try {
      return JSON.parse(user).id;
    } catch {
      return null;
    }
  }
  return null;
};

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const userId = getUserId();
  
  const headers = new Headers(options.headers);
  if (userId) {
    headers.set('x-user-id', userId);
  }
  
  return fetch(url, {
    ...options,
    headers
  });
}
