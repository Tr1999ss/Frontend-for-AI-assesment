import type { A2aTask, AgentCard, RaceArmSummary, RaceReport, RaceRunMetrics } from '../api/types'

export function armSummary(arm: 'single' | 'team', patch: Partial<RaceArmSummary> = {}): RaceArmSummary {
  return {
    arm,
    totalRuns: 2,
    factPresenceRate: 0.5,
    sourceRecallRate: 0.5,
    avgJudgeScore: 3.5,
    medianLatencyMs: 2000,
    p95LatencyMs: 3000,
    avgInputTokens: 900,
    avgOutputTokens: 100,
    avgTotalTokens: 1000,
    avgCostUsd: 0.0002,
    totalCostUsd: 0.0004,
    avgHandoffTokens: 0,
    ...patch,
  }
}

export function runMetrics(patch: Partial<RaceRunMetrics> = {}): RaceRunMetrics {
  return {
    repetition: 1,
    latencyMs: 2000,
    inputTokens: 900,
    outputTokens: 100,
    costUsd: 0.0002,
    factScore: 0.5,
    sourceScore: 1,
    judgeScore: 4,
    judgeReason: 'Covers the retry policy',
    aborted: false,
    answerSummary: 'ERR-4012 is a gateway timeout…',
    handoffTokens: 0,
    ...patch,
  }
}

export function raceReport(patch: Partial<RaceReport> = {}): RaceReport {
  const single = armSummary('single')
  const team = armSummary('team', { medianLatencyMs: 5000, p95LatencyMs: 8000, avgTotalTokens: 2600, avgCostUsd: 0.0005, avgJudgeScore: 4.2, avgHandoffTokens: 300 })
  return {
    raceName: 'race-questions',
    timestamp: '2026-11-02T10:00:00Z',
    agentModel: 'openai/gpt-4o-mini',
    judgeModel: 'openai/gpt-4o',
    totalQuestions: 1,
    repetitions: 1,
    overallSingle: single,
    overallTeam: team,
    byType: { simple: { type: 'simple', questionCount: 1, single, team } },
    questionResults: [
      {
        questionId: 'q-err-4012',
        type: 'simple',
        question: 'What does ERR-4012 mean?',
        singleRuns: [runMetrics()],
        teamRuns: [runMetrics({ judgeScore: 2, judgeReason: 'Misses the retry count', latencyMs: 5000 })],
        singleSummary: single,
        teamSummary: team,
      },
    ],
    markdownTable: '| Metric | Single | Team |',
    ...patch,
  }
}

export function a2aTask(patch: Partial<A2aTask> = {}): A2aTask {
  return {
    id: 'task-1',
    state: 'completed',
    input: 'What is ERR-4012?',
    output: 'ERR-4012 is a **gateway timeout** [1].',
    inputTokens: 320,
    outputTokens: 85,
    latencyMs: 1420,
    createdAt: '2026-11-02T16:00:00Z',
    completedAt: '2026-11-02T16:00:01Z',
    ...patch,
  }
}

export const agentCard: AgentCard = {
  name: 'code-and-config-specialist',
  description: 'Finds exact commands and settings.',
  url: 'http://localhost:8091/api/a2a',
  version: '1.0.0',
  capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: true },
  skills: [{ id: 'code-config-lookup', name: 'Code & Configuration Lookup', description: 'Searches runbooks.', tags: ['code', 'runbooks'] }],
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
}
