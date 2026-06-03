const fs = require('fs');
let txt = fs.readFileSync('src/app/hazards/page.tsx', 'utf-8');

// 1. 添加 sonner import
txt = txt.replace("from '@/lib/utils'", "from '@/lib/utils'\nimport { toast } from 'sonner'");

// 2. 添加 res.ok 检查
txt = txt.replace(
  'const blob = await res.blob();',
  "if (!res.ok) { const ed = await res.json().catch(()=>({})); toast.error(ed?.error||'\\u5bfc\\u51fa\\u5931\\u8d25\\uff0c\\u8bf7\\u91cd\\u8bd5'); return; }\n      const blob = await res.blob();"
);

// 3. 下载后加成功 toast
txt = txt.replace(
  'document.body.removeChild(a);',
  'document.body.removeChild(a);\n      toast.success("\\u5bfc\\u51fa\\u6210\\u529f");'
);

// 4. catch 中加错误 toast
txt = txt.replace(
  "console.error('Export failed:', error);",
  "console.error('Export failed:', error);\n      toast.error('\\u5bfc\\u51fa\\u5931\\u8d25\\uff0c\\u8bf7\\u68c0\\u67e5\\u7f51\\u7edc\\u8fde\\u63a5\\u540e\\u91cd\\u8bd5');"
);

fs.writeFileSync('src/app/hazards/page.tsx', txt, 'utf-8');
console.log('OK');
