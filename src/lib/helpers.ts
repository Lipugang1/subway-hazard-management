// cn 统一从 utils.ts 导出，避免重复定义
export { cn } from './utils';

export function formatDate(date: string | Date): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export function formatDateTime(date: string | Date): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    submitted: '已上报',
    approved: '审核通过',
    rejected: '驳回',
    processing: '治理中',
    closed: '已关闭'
  };
  return statusMap[status] || status;
}

export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    processing: 'bg-yellow-100 text-yellow-800',
    closed: 'bg-gray-100 text-gray-600'
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}

export function getHazardLevelLabel(level: string): string {
  const levelMap: Record<string, string> = {
    general_i: '一般隐患I级',
    general_ii: '一般隐患II级'
  };
  return levelMap[level] || level;
}

export function getHazardLevelColor(level: string): string {
  const colorMap: Record<string, string> = {
    general_i: 'bg-red-100 text-red-800',
    general_ii: 'bg-orange-100 text-orange-800'
  };
  return colorMap[level] || 'bg-gray-100 text-gray-800';
}
