import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { addDays, differenceInDays, parseISO, isValid } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 默认治理时限（天）
export const DEFAULT_GOVERNANCE_DEADLINE = 10;
// 预警提前天数
export const WARNING_BEFORE_DEADLINE = 3;

// 计算隐患预警状态
export type DeadlineWarning = 'normal' | 'warning' | 'expired';

export function calculateDeadlineWarning(
  status: string,
  governanceDeadline?: string,
  governanceResult?: string,
  inspectionDate?: string
): DeadlineWarning {
  // 从已上报状态开始计算预警
  if (!['submitted', 'approved', 'processing'].includes(status)) {
    return 'normal';
  }
  
  // 已完成治理的不显示预警
  if (governanceResult && governanceResult.trim()) {
    return 'normal';
  }
  
  // 如果没有设置治理时限，使用默认时限
  if (!governanceDeadline || !governanceDeadline.trim()) {
    // 使用默认10天时限，从排查日期计算
    if (!inspectionDate) {
      return 'normal';
    }
    
    const inspectionDateObj = parseISO(inspectionDate);
    if (!isValid(inspectionDateObj)) {
      return 'normal';
    }
    
    const deadlineDate = addDays(inspectionDateObj, DEFAULT_GOVERNANCE_DEADLINE);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const daysUntilDeadline = differenceInDays(deadlineDate, today);
    
    if (daysUntilDeadline < 0) {
      return 'expired';
    }
    if (daysUntilDeadline <= WARNING_BEFORE_DEADLINE) {
      return 'warning';
    }
    return 'normal';
  }
  
  const deadlineDate = parseISO(governanceDeadline);
  if (!isValid(deadlineDate)) {
    return 'normal';
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const daysUntilDeadline = differenceInDays(deadlineDate, today);
  
  // 已超期
  if (daysUntilDeadline < 0) {
    return 'expired';
  }
  
  // 临近超期（3天内）
  if (daysUntilDeadline <= WARNING_BEFORE_DEADLINE) {
    return 'warning';
  }
  
  return 'normal';
}

// 获取预警剩余天数
export function getDaysUntilDeadline(governanceDeadline?: string): number | null {
  if (!governanceDeadline || !governanceDeadline.trim()) {
    return null;
  }
  
  const deadlineDate = parseISO(governanceDeadline);
  if (!isValid(deadlineDate)) {
    return null;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return differenceInDays(deadlineDate, today);
}
