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
  <main class="max-w-3xl mx-auto p-6">
    <NuxtLink to="/lessons" class="text-moss text-sm">{{ t('results.back') }}</NuxtLink>
    <h1 class="text-3xl mt-2 mb-6">{{ t('results.title') }}</h1>

    <div class="grid grid-cols-3 gap-3 mb-6">
      <div class="card text-center">
        <p class="text-stone text-sm">{{ t('results.submissions') }}</p>
        <p class="text-2xl">{{ summary?.submissions ?? 0 }}</p>
      </div>
      <div class="card text-center">
        <p class="text-stone text-sm">{{ t('results.avgScore') }}</p>
        <p class="text-2xl">{{ Math.round(summary?.avgScore ?? 0) }}</p>
      </div>
      <div class="card text-center">
        <p class="text-stone text-sm">{{ t('results.avgAccuracy') }}</p>
        <p class="text-2xl">{{ Math.round((summary?.avgAccuracy ?? 0) * 100) }}%</p>
      </div>
    </div>

    <p v-if="!summary?.students.length" class="text-stone mb-6">{{ t('results.empty') }}</p>
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

<style scoped>
.card {
  background: var(--color-linen);
  border: 1px solid rgba(58, 46, 38, 0.1);
  border-radius: 14px;
  padding: 1rem 1.25rem;
}
</style>
