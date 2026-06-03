-- =====================================================
-- 城市轨道交通隐患排查治理系统 - 数据库初始化脚本
-- =====================================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 用户表 (users)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'inspector' CHECK (role IN ('admin', 'reviewer', 'inspector')),
    inspection_center VARCHAR(100) DEFAULT '',
    inspection_department VARCHAR(100) DEFAULT '',
    inspection_team VARCHAR(100) DEFAULT '',
    inspection_position VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(inspection_department);

-- =====================================================
-- 隐患记录表 (hazards)
-- =====================================================
CREATE TABLE IF NOT EXISTS hazards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_number SERIAL,
    
    -- 排查信息
    inspection_center VARCHAR(100) DEFAULT '',
    inspection_department VARCHAR(100) DEFAULT '',
    inspection_team VARCHAR(100) DEFAULT '',
    inspection_position VARCHAR(100) DEFAULT '',
    inspector_id VARCHAR(50) DEFAULT '',
    inspector_name VARCHAR(100) DEFAULT '',
    inspector VARCHAR(100) DEFAULT '',
    inspection_date DATE DEFAULT CURRENT_DATE,
    
    -- 隐患详情
    inspection_location VARCHAR(255) NOT NULL DEFAULT '',
    line VARCHAR(50) DEFAULT '',
    hazard_description TEXT NOT NULL DEFAULT '',
    hazard_category VARCHAR(50) NOT NULL DEFAULT '',
    hazard_level VARCHAR(20) NOT NULL DEFAULT 'general_i' CHECK (hazard_level IN ('general_i', 'general_ii')),
    
    -- 临时措施
    temporary_measures TEXT DEFAULT '',
    
    -- 治理信息
    governance_department VARCHAR(100) DEFAULT '',
    cooperating_department VARCHAR(100) DEFAULT '',
    governance_person VARCHAR(100) DEFAULT '',
    governance_measure TEXT DEFAULT '',
    governance_deadline DATE,
    governance_result VARCHAR(50) DEFAULT '',
    governance_details TEXT DEFAULT '',
    reviewer_name VARCHAR(100) DEFAULT '',
    
    -- 状态
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'in_progress', 'closed')),
    rejection_reason TEXT DEFAULT '',
    
    -- 图片
    images JSONB DEFAULT '[]'::jsonb,
    
    -- 关联风险项
    related_risk_serial VARCHAR(50) DEFAULT '',
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 隐患表索引
CREATE INDEX IF NOT EXISTS idx_hazards_status ON hazards(status);
CREATE INDEX IF NOT EXISTS idx_hazards_level ON hazards(hazard_level);
CREATE INDEX IF NOT EXISTS idx_hazards_department ON hazards(inspection_department);
CREATE INDEX IF NOT EXISTS idx_hazards_team ON hazards(inspection_team);
CREATE INDEX IF NOT EXISTS idx_hazards_inspector_name ON hazards(inspector_name);
CREATE INDEX IF NOT EXISTS idx_hazards_category ON hazards(hazard_category);
CREATE INDEX IF NOT EXISTS idx_hazards_inspection_date ON hazards(inspection_date);
CREATE INDEX IF NOT EXISTS idx_hazards_created_at ON hazards(created_at);

-- =====================================================
-- 风险数据库表 (risk_items)
-- =====================================================
CREATE TABLE IF NOT EXISTS risk_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_number VARCHAR(20) UNIQUE NOT NULL,
    business_module VARCHAR(100) NOT NULL,
    specific_location VARCHAR(255) NOT NULL,
    risk_point_description TEXT NOT NULL,
    risk_point_location VARCHAR(255) DEFAULT '',
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('small', 'general', 'large', 'serious')),
    risk_control_measures TEXT NOT NULL,
    hazard_inspection_method TEXT NOT NULL,
    hazard_inspection_cycle VARCHAR(50) DEFAULT '',
    hazard_inspection_position VARCHAR(100) DEFAULT '',
    control_responsibility_unit VARCHAR(200) DEFAULT '',
    control_responsibility_position VARCHAR(100) DEFAULT '',
    remarks TEXT DEFAULT '',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 风险项表索引
CREATE INDEX IF NOT EXISTS idx_risk_items_module ON risk_items(business_module);
CREATE INDEX IF NOT EXISTS idx_risk_items_level ON risk_items(risk_level);

-- =====================================================
-- 插入默认用户 (密码: admin123)
-- =====================================================
INSERT INTO users (username, password_hash, name, employee_id, role, inspection_center, inspection_department, inspection_team, inspection_position)
VALUES 
    ('admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', '系统管理员', 'A001', 'admin', '物资后勤中心', '综合管理部', '', '系统管理岗'),
    ('inspector1', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', '张三', 'E001', 'inspector', '物资后勤中心', '物资仓储部', '东部储运工班', '仓管员'),
    ('reviewer1', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', '李四', 'M001', 'reviewer', '物资后勤中心', '安全工作部', '', '安全工作岗')
ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- 插入默认风险项数据
-- =====================================================
INSERT INTO risk_items (serial_number, business_module, specific_location, risk_point_description, risk_point_location, risk_level, risk_control_measures, hazard_inspection_method, hazard_inspection_cycle, hazard_inspection_position, control_responsibility_unit, control_responsibility_position)
VALUES 
    ('1', '仓储管理', '安顺车辆段物资总库', '物资库房内照明设备不符合防爆要求', '物资总库照明系统', 'general', '1.更换为符合国家防爆标准的照明灯具\n2.定期检查照明设备完好性\n3.建立照明设备检查台账', '1.检查是否为防爆型灯具\n2.检查灯具安装是否牢固\n3.检查是否存在破损老化', '每周', '仓管员', '物资后勤中心-物资仓储部', '仓储管理员'),
    ('2', '仓储管理', '各车辆段物资库区', '货物堆放不符合规范，堵塞消防通道', '库区内通道', 'general', '1.严格按五距要求堆放货物\n2.保持消防通道畅通\n3.设置明显的通道标识', '1.检查货物堆放是否规范\n2.检查消防通道是否畅通\n3.检查标识是否清晰', '随岗', '仓管员、安全工作岗', '物资后勤中心-物资仓储部', '仓储管理员'),
    ('3', '设备设施', '登瀛车辆段材料堆场', '地面有铁钉、外露金属物等异物', '材料堆场地面', 'small', '1.定期清理场地异物\n2.设置硬质地面\n3.加强场地巡检', '1.目视检查地面状况\n2.检查是否有外露异物\n3.检查场地平整度', '每周', '场段工作岗', '物资后勤中心-后勤场段部', '场段管理员'),
    ('4', '安全管理', '各物资仓库', '仓库未配备有效的消防器材', '仓库消防设施', 'large', '1.按标准配置消防器材\n2.定期检查器材有效性\n3.建立消防器材检查台账\n4.组织消防演练', '1.检查消防器材配置数量\n2.检查器材有效期\n3.检查器材完好性', '每月', '安全工作岗', '物资后勤中心-安全工作部', '安全员'),
    ('5', '仓储管理', '杂品库', '杂品库内违规使用非防爆灯具', '杂品库照明系统', 'general', '1.更换为防爆型灯具\n2.严禁在杂品库内使用非防爆电器\n3.定期检查库内电气设备', '杂品库内灯具是否为防爆型', '每周', '仓管员', '物资后勤中心-物资仓储部', '仓储管理员')
ON CONFLICT (serial_number) DO NOTHING;
