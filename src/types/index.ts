// 隐患排查治理系统 - 类型定义

export type UserRole = 'inspector' | 'reviewer' | 'admin';

export type HazardStatus = 
  | 'draft'           // 草稿
  | 'submitted'       // 已上报
  | 'approved'        // 审核通过
  | 'rejected'        // 驳回
  | 'processing'      // 治理中
  | 'closed';         // 已关闭

export type HazardLevel = 'general_i' | 'general_ii';  // 一般隐患I级, 一般隐患II级

export type RiskLevel = 'large' | 'general' | 'small';  // 重大/较大/一般/较小

// 用户信息
export interface User {
  id: string;
  username: string;
  password_hash: string;
  name: string;
  employee_id: string;
  role: UserRole;
  inspection_center: string;    // 排查中心
  inspection_department: string; // 排查部门
  inspection_team: string;       // 排查班组
  inspection_position: string;  // 排查岗位
  created_at: string;
  updated_at: string;
}

// 风险数据库条目
export interface RiskItem {
  id: string;
  serial_number: string;         // 序号
  business_module: string;        // 业务板块
  specific_location: string;     // 具体位置/设备/步骤
  risk_point_description: string; // 风险点描述
  risk_point_location: string;   // 风险点位
  risk_level: RiskLevel;         // 风险等级
  risk_control_measures: string; // 风险管控措施
  hazard_inspection_method: string; // 隐患排查方法
  hazard_inspection_cycle: string;  // 隐患排查周期
  hazard_inspection_position: string; // 隐患排查岗位
  control_responsibility_unit: string; // 管控责任单位
  control_responsibility_position: string; // 管控责任岗位
  remarks: string;               // 备注
  created_at: string;
  updated_at: string;
  version: number;
}

// 隐患记录
export interface HazardRecord {
  id: string;
  serial_number: string;         // 序号
  
  // 排查信息（自动从用户信息带入）
  inspection_center: string;     // 排查中心
  inspection_department: string;  // 排查部门
  inspection_team: string;        // 排查班组
  inspection_position: string;    // 排查岗位
  inspector_id: string;          // 排查人工号
  inspector_name: string;        // 排查人员（姓名）
  inspector?: string;            // 排查人员（兼容旧字段）
  
  // 排查详情
  inspection_date: string;       // 排查日期
  inspection_location: string;   // 排查地点
  line: string;                  // 所属线别
  
  // 隐患描述
  hazard_description: string;    // 隐患描述
  hazard_category: string;      // 隐患分类
  hazard_level: HazardLevel;     // 隐患等级
  
  // 治理信息
  temporary_measures: string;    // 临时管控措施
  governance_department: string; // 治理责任部门
  cooperating_department: string; // 配合部门
  governance_person: string;    // 治理责任人
  governance_measure: string;    // 治理措施
  governance_deadline: string;   // 治理时限
  governance_result: string;     // 治理结果
  governance_details: string;    // 具体治理情况
  
  // 复查信息
  reviewer_id: string;           // 复查人ID
  reviewer_name: string;         // 复查人姓名
  
  // 流程状态
  status: HazardStatus;
  
  // 关联风险项
  related_risk_id?: string;      // 关联的风险数据库ID
  related_risk_serial?: string;  // 关联的风险序号
  
  // 图片
  images: string[];              // 隐患图片URL列表
  
  // AI分析结果
  ai_analysis_result?: string;   // AI分析结果
  
  // 预警状态
  deadline_warning?: 'normal' | 'warning' | 'expired';  // 正常/预警/已超期
  
  created_at: string;
  updated_at: string;
}

// 风险数据库修改历史
export interface RiskModificationHistory {
  id: string;
  risk_item_id: string;
  modified_by: string;
  modified_at: string;
  previous_data: string;
  new_data: string;
  change_type: 'create' | 'update' | 'delete';
  reason: string;
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 分页参数
export interface PaginationParams {
  page: number;
  pageSize: number;
}

// 分页结果
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 查询筛选参数
export interface HazardQueryParams extends PaginationParams {
  startDate?: string;
  endDate?: string;
  inspectionCenter?: string;
  inspectionDepartment?: string;
  inspectionTeam?: string;      // 排查班组
  inspectorName?: string;      // 排查人员
  inspectionLocation?: string;
  hazardLevel?: HazardLevel;
  status?: HazardStatus;
  governanceDepartment?: string;
  keyword?: string;
}

// AI 图片分析请求
export interface ImageAnalysisRequest {
  image_base64: string;
  image_url?: string;
  additional_context?: string;
}

// AI 图片分析结果
export interface ImageAnalysisResult {
  hazard_description: string;    // 隐患描述（标准格式）
  inspection_location: string;   // 隐患位置
  hazard_level: HazardLevel;     // 隐患等级
  suggested_measures?: string[]; // 建议的临时管控措施
  suggested_governance_measure?: string; // 建议的治理措施
  suggested_department?: string; // 建议的责任部门
  matched_risk_items?: RiskItem[]; // 匹配的风险项
  raw_response?: string;         // AI 原始返回（调试用）
}

// 登录请求
export interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应
export interface LoginResponse {
  user: Omit<User, 'password_hash'>;
  token: string;
}

// 导出参数
export interface ExportParams {
  startDate?: string;
  endDate?: string;
  inspectionCenter?: string;
  inspectionDepartment?: string;
  hazardLevel?: HazardLevel;
  status?: HazardStatus;
}
