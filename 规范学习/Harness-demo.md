# Harness Demo

这个 Demo 演示：**怎么把已经写好的代码，放进工程化和自动化交付流程里。**

Harness 关注的不是“需求怎么写”，而是：

- 代码怎么托管
- 测试怎么自动跑
- 构建怎么自动做
- 部署怎么自动发
- 制品怎么保存

所以它更偏工程平台 / DevOps 平台。

---

## 场景

假设你已经完成了一个功能：

> Day7 聊天页新增“清空对话”按钮。

现在问题变成：

- 每次提交代码后，谁来自动跑 `npm run typecheck`？
- 谁来自动跑测试？
- 谁来构建前端/后端产物？
- 谁来决定能不能上线？

Harness 处理的是这类问题。

---

## 1. 最小工程化流程

一个最小流程可以是：

```text
git push
  -> 自动拉代码
  -> npm install
  -> npm run typecheck
  -> npm run test
  -> npm run build
  -> 产物归档
  -> 部署到测试环境
```

这就是典型的 CI/CD 思路。

---

## 2. 一个超简化 Pipeline Demo

下面不是 Harness 真配置，只是帮助你理解它在干什么。

```yaml
pipeline:
  name: day7-demo
  stages:
    - name: install
      steps:
        - run: npm install

    - name: verify
      steps:
        - run: npm run typecheck
        - run: npm run eval

    - name: build
      steps:
        - run: npm run build-index

    - name: deploy-staging
      steps:
        - run: echo "deploy to staging"
```

这个流程表达的是：

1. 先安装依赖
2. 再做校验
3. 再构建
4. 最后部署

---

## 3. 它解决什么问题

如果没有 Harness 这类平台，很多事情只能手工做：

- 手工跑命令
- 手工判断能不能上线
- 手工保存构建产物
- 手工追踪失败日志

有了工程平台后，流程就能更稳定：

- 每次提交都自动检查
- 错误更早暴露
- 发布更标准化
- 团队协作更顺

---

## 4. 对应到你当前仓库

对你现在这个学习仓库来说，Harness 思维最像：

- 不是只把 Day7 写完
- 而是进一步思考：
  - typecheck 能不能自动跑
  - eval 能不能变成上线前必过项
  - build-index / start 能不能进入固定流程

也就是说，它关注的是：

**代码完成以后，如何稳定地验证、构建、交付。**

---

## 5. 一句话总结

**Harness Demo = 演示怎么把“已经写出来的功能”，接入自动化工程流程。**
