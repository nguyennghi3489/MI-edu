<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'dashboard' })

interface Student {
  id: string
  studentName: string
  studentNumber: string
  totalScore: number
  totalCorrect: number
  totalQuestions: number
  completedAt: string
}

interface ResultsSummary {
  submissions: number
  avgScore: number
  avgAccuracy: number
  students: Student[]
}

interface AccuracyRow {
  questionId: string
  text: string
  accuracyPct: number
}

const { t } = useI18n()
const route = useRoute()
const assignmentId = route.params.id as string

const { data: summary } = await useAsyncData(`results-${assignmentId}`, () =>
  useApi<ResultsSummary>(`/api/results?assignmentId=${assignmentId}`),
)
const { data: accuracy } = await useAsyncData(`accuracy-${assignmentId}`, () =>
  useApi<AccuracyRow[]>(`/api/results/accuracy?assignmentId=${assignmentId}`),
  { default: () => [] },
)

type SortKey = 'totalScore' | 'totalCorrect' | 'completedAt'
const sortKey = ref<SortKey>('totalScore')
const sortDesc = ref(true)

function sortBy(key: SortKey) {
  if (sortKey.value === key) sortDesc.value = !sortDesc.value
  else {
    sortKey.value = key
    sortDesc.value = true
  }
}

const sortedStudents = computed(() => {
  const students = [...(summary.value?.students ?? [])]
  students.sort((a, b) => {
    const av = sortKey.value === 'completedAt' ? new Date(a.completedAt).getTime() : a[sortKey.value]
    const bv = sortKey.value === 'completedAt' ? new Date(b.completedAt).getTime() : b[sortKey.value]
    return sortDesc.value ? bv - av : av - bv
  })
  return students
})
</script>

<template>
  <main class="max-w-6xl mx-auto p-8">
    <NuxtLink to="/lessons" class="text-moss text-sm mb-2 inline-block">{{ t('results.back') }}</NuxtLink>
    <PageHeader :title="t('results.title')" />

    <div class="grid grid-cols-3 gap-3 mb-6">
      <StatTile class="card text-center" :label="t('results.submissions')" :value="summary?.submissions ?? 0" />
      <StatTile class="card text-center" :label="t('results.avgScore')" :value="Math.round(summary?.avgScore ?? 0)" />
      <StatTile
        class="card text-center"
        :label="t('results.avgAccuracy')"
        :value="`${Math.round((summary?.avgAccuracy ?? 0) * 100)}%`"
      />
    </div>

    <EmptyState v-if="!summary?.students.length" class="mb-6" :message="t('results.empty')" />
    <table v-else class="w-full mb-6 text-sm">
      <thead>
        <tr class="text-left text-stone">
          <th class="py-2">{{ t('results.name') }}</th>
          <th class="py-2">{{ t('results.studentNumber') }}</th>
          <th class="py-2 cursor-pointer" @click="sortBy('totalScore')">{{ t('results.score') }}</th>
          <th class="py-2 cursor-pointer" @click="sortBy('totalCorrect')">{{ t('results.correct') }}</th>
          <th class="py-2 cursor-pointer" @click="sortBy('completedAt')">{{ t('results.completedAt') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in sortedStudents" :key="s.id" class="border-t border-black/10">
          <td class="py-2">{{ s.studentName }}</td>
          <td class="py-2">{{ s.studentNumber }}</td>
          <td class="py-2">{{ s.totalScore }}</td>
          <td class="py-2">{{ s.totalCorrect }}/{{ s.totalQuestions }}</td>
          <td class="py-2">{{ new Date(s.completedAt).toLocaleString('vi-VN') }}</td>
        </tr>
      </tbody>
    </table>

    <h2 class="text-xl mb-3">{{ t('results.byQuestion') }}</h2>
    <ol class="flex flex-col gap-2">
      <li
        v-for="(q, i) in accuracy"
        :key="q.questionId"
        class="flex items-center justify-between p-3 rounded-xl bg-linen border border-black/10"
      >
        <span class="truncate flex-1">{{ i + 1 }}. {{ q.text }}</span>
        <span class="flex items-center gap-2">
          <span>{{ Math.round(q.accuracyPct * 100) }}%</span>
          <UBadge v-if="q.accuracyPct < 0.5" color="warning" variant="subtle">{{ t('results.needsReview') }}</UBadge>
        </span>
      </li>
    </ol>
  </main>
</template>
