'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { authFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppHeader } from '@/components/app-header';
import Link from 'next/link';
import { Train, Upload, Camera, X, Loader2, AlertCircle, CheckCircle2, Info, FileText } from 'lucide-react';
import type { HazardLevel } from '@/types';

export default function NewHazardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<{ file: File; preview: string; url?: string; key?: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [hazardLevel, setHazardLevel] = useState<HazardLevel>('general_i');

  // 表单字段
  const [formData, setFormData] = useState({
    inspection_location: '',
    line: '',
    hazard_description: '',
    hazard_category: '',
    temporary_measures: '',
    governance_department: '',
    cooperating_department: '',
    governance_person: '',
    governance_measure: '',
    governance_deadline: '',
    related_risk_serial: ''
  });

  // 上传图片到服务器
  const uploadImage = async (file: File): Promise<{ url: string; key: string } | null> => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await authFetch('/api/upload/image', { method: 'POST', body: fd });
      const data = await res.json();
      return data.success && data.data.url ? { url: data.data.url, key: data.data.key } : null;
    } catch (error) {
      console.error('上传失败:', error);
      return null;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setIsUploading(true);
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      const newImage = { file, preview: URL.createObjectURL(file) };
      setImages(prev => [...prev, newImage]);
      const result = await uploadImage(file);
      if (result) {
        setImages(prev => prev.map(img =>
          img.preview === newImage.preview ? { ...img, url: result.url, key: result.key } : img
        ));
      }
    }
    setIsUploading(false);
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const arr = [...prev];
      URL.revokeObjectURL(arr[index].preview);
      arr.splice(index, 1);
      return arr;
    });
  };

  const analyzeImages = async () => {
    if (images.length === 0) {
      setAnalysisError('请先上传隐患图片');
      return;
    }
    setIsAnalyzing(true);
    setAnalysisError('');
    setAnalysisResult(null);
    try {
      const uploadedImage = images.find(img => img.url);
      const body = uploadedImage?.url
        ? { image_url: uploadedImage.url }
        : { image_base64: '' };

      const res = await authFetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setAnalysisResult(data.data);
        if (data.data.hazard_description) {
          setFormData(prev => ({
            ...prev,
            hazard_description: data.data.hazard_description,
          }));
          if (data.data.hazard_level) setHazardLevel(data.data.hazard_level);
          if (data.data.inspection_location) {
            setFormData(prev => ({ ...prev, inspection_location: data.data.inspection_location }));
          }
        }
      } else {
        setAnalysisError(data.error || 'AI分析失败');
      }
    } catch {
      setAnalysisError('AI分析请求失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (status: 'draft' | 'submitted') => {
    if (!user) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const today = new Date().toISOString().split('T')[0];
      const payload = {
        ...formData,
        hazard_level: hazardLevel,
        inspection_center: user.inspection_center || '物资后勤中心',
        inspection_department: user.inspection_department || '',
        inspection_team: user.inspection_team || '',
        inspection_position: user.inspection_position || '',
        inspector_id: user.employee_id || '',
        inspector_name: user.name || '',
        inspector: user.name || '',
        inspection_date: today,
        status,
        images: images.filter(i => i.url).map(i => i.url!),
        ai_analysis_result: analysisResult ? JSON.stringify(analysisResult) : '',
      };

      const res = await authFetch('/api/hazards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/hazards');
      } else {
        setSubmitError(data.error || '提交失败');
      }
    } catch {
      setSubmitError('提交请求失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  if (!user) return null;

  const { inspection_department, inspection_team, inspection_position, name } = user;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 标题 */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">上报隐患</h2>
              <p className="text-sm text-muted-foreground">
                当前用户：{name} | {inspection_department} / {inspection_team} / {inspection_position}
              </p>
            </div>
            <Link href="/hazards">
              <Button variant="outline" size="sm">返回列表</Button>
            </Link>
          </div>

          {/* 图片上传与 AI 分析 */}
          <Card>
            <CardHeader><CardTitle className="text-base">图片上传与 AI 分析</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  <Camera className="w-4 h-4 mr-2" />
                  {isUploading ? '上传中...' : '选择图片'}
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                <Button onClick={analyzeImages} disabled={isAnalyzing || images.length === 0}>
                  {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {isAnalyzing ? 'AI 分析中...' : 'AI 智能识别'}
                </Button>
              </div>

              {images.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img src={img.preview} alt="隐患图片" className="w-24 h-24 object-cover rounded border" />
                      <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {analysisError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" /><AlertDescription>{analysisError}</AlertDescription>
                </Alert>
              )}
              {analysisResult && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /><AlertDescription className="text-green-700">AI 分析完成，描述已自动填入下方</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* 排查信息 */}
          <Card>
            <CardHeader><CardTitle className="text-base">排查信息</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">排查中心</Label>
                  <p className="text-sm font-medium">{user.inspection_center || '物资后勤中心'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">排查部门</Label>
                  <p className="text-sm font-medium">{inspection_department || '(未设置)'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">排查班组</Label>
                  <p className="text-sm font-medium">{inspection_team || '(未设置)'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">排查岗位</Label>
                  <p className="text-sm font-medium">{inspection_position || '(未设置)'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>排查地点</Label>
                  <Input placeholder="如：安顺车辆段物资总库杂品库" value={formData.inspection_location} onChange={e => updateField('inspection_location', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>所属线路</Label>
                  <Input placeholder="如：1号线" value={formData.line} onChange={e => updateField('line', e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>隐患描述（AI 分析后自动填充）</Label>
                <Textarea placeholder="AI 分析结果将自动填入此处，也可手动编辑" rows={4} value={formData.hazard_description} onChange={e => updateField('hazard_description', e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>隐患分类</Label>
                  <Input placeholder="如：电气安全" value={formData.hazard_category} onChange={e => updateField('hazard_category', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>隐患等级</Label>
                  <Select value={hazardLevel} onValueChange={v => setHazardLevel(v as HazardLevel)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general_i">一般隐患I级</SelectItem>
                      <SelectItem value="general_ii">一般隐患II级</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 治理信息 */}
          <Card>
            <CardHeader><CardTitle className="text-base">治理信息</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>临时管控措施</Label>
                <Textarea placeholder="输入临时管控措施..." rows={2} value={formData.temporary_measures} onChange={e => updateField('temporary_measures', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>治理责任部门 <span className="text-red-500">*</span></Label>
                  <Input placeholder="如：物资后勤中心-物资仓储部" value={formData.governance_department} onChange={e => updateField('governance_department', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>配合部门</Label>
                  <Input placeholder="配合部门" value={formData.cooperating_department} onChange={e => updateField('cooperating_department', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>治理责任人 <span className="text-red-500">*</span></Label>
                  <Input placeholder="责任人姓名" value={formData.governance_person} onChange={e => updateField('governance_person', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>治理时限 <span className="text-red-500">*</span></Label>
                  <Input type="date" value={formData.governance_deadline} onChange={e => updateField('governance_deadline', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>治理措施 <span className="text-red-500">*</span></Label>
                <Textarea placeholder="输入治理措施..." rows={3} value={formData.governance_measure} onChange={e => updateField('governance_measure', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" /><AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-4">
            <Button variant="outline" className="flex-1" onClick={() => handleSubmit('draft')} disabled={isSubmitting || !formData.hazard_description}>
              保存草稿
            </Button>
            <Button className="flex-1" onClick={() => handleSubmit('submitted')} disabled={isSubmitting || !formData.hazard_description || !formData.line}>
              {isSubmitting ? '提交中...' : '提交审核'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
