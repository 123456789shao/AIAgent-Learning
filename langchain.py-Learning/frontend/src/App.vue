<script setup>
import { computed, ref } from 'vue'

import { runAgent } from './api/agent'

const prompt = ref('帮我查一下上海今天天气，并简短总结。')
const maxRounds = ref(3)
const loading = ref(false)
const error = ref('')
const result = ref(null)

const steps = computed(() => result.value?.steps || [])
const hasTrace = computed(() => steps.value.length > 0)

async function handleSubmit() {
  const input = prompt.value.trim()
  if (!input) {
    error.value = '先输入一个问题'
    return
  }

  loading.value = true
  error.value = ''

  try {
    result.value = await runAgent(input, maxRounds.value)
  } catch (requestError) {
    error.value = requestError instanceof Error ? requestError.message : '请求失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="shell">
    <section class="hero-card">
      <div class="hero-copy">
        <p class="eyebrow">LangChain Loop / ReAct Demo</p>
        <h1>把最小 loop 决策过程直接看出来</h1>
        <p class="intro">
          这个页面会把问题发给后端的 loop / ReAct 执行器，再把最终回答、停止原因和每一步决策过程直接展示出来。
        </p>
      </div>

      <div class="composer">
        <label class="field">
          <span>问题</span>
          <textarea
            v-model="prompt"
            rows="4"
            placeholder="例如：帮我查一下北京天气，并告诉我要不要带伞。"
          />
        </label>

        <div class="toolbar">
          <label class="inline-field">
            <span>最大步数</span>
            <input v-model.number="maxRounds" min="1" max="6" type="number" />
          </label>

          <button :disabled="loading" class="send-button" @click="handleSubmit">
            {{ loading ? '运行中...' : '运行 Loop / ReAct' }}
          </button>
        </div>

        <p v-if="error" class="error-text">{{ error }}</p>
      </div>
    </section>

    <section class="workspace">
      <article class="panel answer-panel">
        <div class="panel-header">
          <p class="panel-kicker">Final Answer</p>
          <h2>最终回答</h2>
        </div>

        <p v-if="!result" class="empty-state">
          先运行一次 loop / ReAct，这里会显示模型给出的最终答复。
        </p>
        <div v-else class="answer-copy">
          {{ result.final_answer }}
        </div>
      </article>

      <article class="panel meta-panel">
        <div class="panel-header">
          <p class="panel-kicker">Trace</p>
          <h2>执行轨迹</h2>
        </div>

        <p v-if="!result" class="empty-state">
          是否调工具、停止原因、步数和每一步决策会显示在这里。
        </p>

        <template v-else>
          <div class="meta-grid meta-grid--triple">
            <div class="meta-item">
              <span>是否调用工具</span>
              <strong>{{ result.used_tools ? '是' : '否' }}</strong>
            </div>
            <div class="meta-item">
              <span>停止原因</span>
              <strong>{{ result.stop_reason || '无' }}</strong>
            </div>
            <div class="meta-item">
              <span>执行步数</span>
              <strong>{{ result.step_count ?? 0 }}</strong>
            </div>
          </div>

          <div class="meta-item meta-item--wide tool-list-card">
            <span>工具列表</span>
            <strong>{{ result.tool_names?.join(', ') || '无' }}</strong>
          </div>

          <ol v-if="hasTrace" class="trace-list">
            <li
              v-for="step in steps"
              :key="`${step.step}-${step.decision_type}-${step.tool_name || 'final'}`"
              class="trace-item"
            >
              <div class="trace-head">
                <span>第 {{ step.step }} 步</span>
                <strong>{{ step.decision_type }}</strong>
              </div>

              <p class="trace-reason">{{ step.reason }}</p>

              <pre v-if="step.tool_input">{{ JSON.stringify(step.tool_input, null, 2) }}</pre>
              <p v-if="step.tool_name" class="trace-line">
                工具：{{ step.tool_name }}
                <span v-if="step.tool_status">（{{ step.tool_status }}）</span>
              </p>
              <p v-if="step.tool_output" class="trace-line">观察：{{ step.tool_output }}</p>
              <p v-if="step.final_answer" class="trace-line">输出：{{ step.final_answer }}</p>
            </li>
          </ol>

          <p v-else class="empty-state compact">
            这次没有留下可展示的步骤轨迹。
          </p>
        </template>
      </article>
    </section>
  </main>
</template>
