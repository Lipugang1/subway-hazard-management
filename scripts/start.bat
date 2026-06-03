@echo off
setlocal enabledelayedexpansion

:: 设置默认工作目录，如果环境变量 COZE_WORKSPACE_PATH 未设置，则默认为当前目录
if not defined COZE_WORKSPACE_PATH (
    set "COZE_WORKSPACE_PATH=%cd%"
)

:: 设置默认端口为 5000，如果环境变量 DEPLOY_RUN_PORT 未设置，则默认为 5000
set PORT=5000
if not defined DEPLOY_RUN_PORT (
    set "DEPLOY_RUN_PORT=%PORT%"
)

:: 切换到指定的工作目录
cd /d "%COZE_WORKSPACE_PATH%"

:: 打印提示信息
echo Starting HTTP service on port %DEPLOY_RUN_PORT% for deploy...

:: 设置当前进程的端口环境变量并启动 Node.js 服务
set PORT=%DEPLOY_RUN_PORT%
node dist/server.js

pause