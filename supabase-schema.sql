-- 隐患排查治理系统 - 数据库 Schema

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'inspector',
  inspection_center VARCHAR(100),
  inspection_department VARCHAR(100),
  inspection_team VARCHAR(100),
  inspection_position VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 风险数据库表
CREATE TABLE IF NOT EXISTS risk_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number VARCHAR(50) NOT NULL,
  business_module VARCHAR(100),
  specific_location VARCHAR(500),
  risk_point_description TEXT,
  risk_point_location VARCHAR(500),
  risk_level VARCHAR(20),
  risk_control_measures TEXT,
  hazard_inspection_method TEXT,
  hazard_inspection_cycle VARCHAR(100),
  hazard_inspection_position VARCHAR(200),
  control_responsibility_unit VARCHAR(200),
  control_responsibility_position VARCHAR(200),
  remarks TEXT,
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(serial_number)
);

-- 隐患记录表
CREATE TABLE IF NOT EXISTS hazard_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number SERIAL,
  
  -- 排查信息
  inspection_center VARCHAR(100),
  inspection_department VARCHAR(100),
  inspection_team VARCHAR(100),
  inspection_position VARCHAR(100),
  inspector_id VARCHAR(50),
  inspector_name VARCHAR(100),
  
  -- 排查详情
  inspection_date DATE,
  inspection_location VARCHAR(500),
  line VARCHAR(50),
  
  -- 隐患描述
  hazard_description TEXT,
  hazard_category VARCHAR(100),
  hazard_level VARCHAR(50),
  
  -- 治理信息
  temporary_measures TEXT,
  governance_department VARCHAR(200),
  cooperating_department VARCHAR(200),
  governance_person VARCHAR(100),
  governance_measure TEXT,
  governance_deadline DATE,
  governance_result VARCHAR(50),
  governance_details TEXT,
  
  -- 复查信息
  reviewer_id VARCHAR(50),
  reviewer_name VARCHAR(100),
  
  -- 流程状态
  status VARCHAR(30) DEFAULT 'draft',
  
  -- 关联风险项
  related_risk_id UUID,
  related_risk_serial VARCHAR(50),
  
  -- 图片(JSON数组)
  images JSONB DEFAULT '[]'::jsonb,
  
  -- AI分析结果
  ai_analysis_result TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (related_risk_id) REFERENCES risk_items(id)
);

-- 风险数据库修改历史表
CREATE TABLE IF NOT EXISTS risk_modification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_item_id UUID,
  modified_by VARCHAR(100),
  modified_at TIMESTAMP DEFAULT NOW(),
  previous_data JSONB,
  new_data JSONB,
  change_type VARCHAR(20),
  reason TEXT,
  FOREIGN KEY (risk_item_id) REFERENCES risk_items(id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_hazard_records_status ON hazard_records(status);
CREATE INDEX IF NOT EXISTS idx_hazard_records_inspection_date ON hazard_records(inspection_date);
CREATE INDEX IF NOT EXISTS idx_hazard_records_inspection_center ON hazard_records(inspection_center);
CREATE INDEX IF NOT EXISTS idx_hazard_records_hazard_level ON hazard_records(hazard_level);
CREATE INDEX IF NOT EXISTS idx_risk_items_serial ON risk_items(serial_number);
CREATE INDEX IF NOT EXISTS idx_risk_items_location ON risk_items(specific_location);

-- 插入示例管理员用户 (密码: admin123)
INSERT INTO users (username, password_hash, name, employee_id, role, inspection_center, inspection_department, inspection_position)
VALUES ('admin', '$2a$10$rqJxB.q.w.Y.HvGq.jKzXO.Y.HvGq.jKzXO.Y.HvGq.jKzXO.Y', '系统管理员', 'A001', 'admin', '物资后勤中心', '综合管理部', '系统管理岗')
ON CONFLICT (username) DO NOTHING;

-- 插入示例排查员用户
INSERT INTO users (username, password_hash, name, employee_id, role, inspection_center, inspection_department, inspection_team, inspection_position)
VALUES ('inspector1', '$2a$10$rqJxB.q.w.Y.HvGq.jKzXO.Y.HvGq.jKzXO.Y.HvGq.jKzXO.Y', '张三', 'E001', 'inspector', '物资后勤中心', '物资仓储部', '东部储运工班', '仓管员')
ON CONFLICT (username) DO NOTHING;

-- 插入示例审核员用户
INSERT INTO users (username, password_hash, name, employee_id, role, inspection_center, inspection_department, inspection_position)
VALUES ('reviewer1', '$2a$10$rqJxB.q.w.Y.HvGq.jKzXO.Y.HvGq.jKzXO.Y.HvGq.jKzXO.Y', '李四', 'M001', 'reviewer', '物资后勤中心', '安全工作部', '安全工作岗')
ON CONFLICT (username) DO NOTHING;
