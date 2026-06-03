@echo off
setlocal enabledelayedexpansion

:: 设置默认工作目录，如果环境变量 COZE_WORKSPACE_PATH 未设置，则默认为当前目录
if not defined COZE_WORKSPACE_PATH (
    set "COZE_WORKSPACE_PATH=%cd%"
)

:: 切换到指定的工作目录
cd /d "%COZE_WORKSPACE_PATH%"

echo Installing dependencies...
:: 在 Windows 批处理中调用 npm/pnpm 等脚本时，建议加上 call 以防止脚本提前终止
call pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only

echo Building the Next.js project...
call pnpm next build

echo Bundling server with tsup...
call pnpm tsup src/server.ts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify

echo Build completed successfully!
pause