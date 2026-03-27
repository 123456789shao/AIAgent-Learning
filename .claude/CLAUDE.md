# CLAUDE.md

## 项目目标
这是一个用于学习 AI Agent、LangChain.js 和 Claude Code 工作流的示例仓库。

## 代码规则
- 优先修改现有文件，不随意新建文件
- 保持改动最小，不做无关重构
- 回答尽量简短，先给结果再解释
- 修改代码前先阅读相关文件

## 开发习惯
- 实现功能后，优先运行相关测试
- 不要自动提交 git commit，除非我明确要求
- 涉及危险操作时先确认，例如删除文件、强推、重置分支

## 项目偏好
- TypeScript 代码尽量保持简单直接
- 示例代码优先可读性，而不是过度抽象
- 新功能先给最小可运行版本

## 输出要求
- 引用文件时使用明确路径
- 如果有多种方案，优先给推荐方案
- 如果信息不足，先提 1 个最关键的问题

## .claude 目录说明
- `.claude/CLAUDE.md`：项目级指令，告诉 Claude 在本仓库里如何工作
- `.claude/settings.json`：项目级配置，适合放共享设置
- `.claude/settings.local.json`：本机覆盖配置，通常不提交 git
- `.claude/commands/`：自定义 slash commands
- `.claude/worktrees/`：Claude 创建的工作树目录，通常不提交 git
