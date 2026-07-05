<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'dashboard' })

interface Lesson {
  id: string
  title: string
  subject: string
  grade: string
  gameFormat: string
  createdAt: string
  _count: { questions: number }
}

const { t } = useI18n()

const { data: lessons } = await useAsyncData(
  'lessons',
  () => useApi<Lesson[]>('/api/lessons'),
  { default: () => [] },
)
const search = ref('')
const subjectFilter = ref('')

const filtered = computed(() =>
  lessons.value.filter((l) => {
    const matchesSearch = l.title.toLowerCase().includes(search.value.toLowerCase())
    const matchesSubject = !subjectFilter.value || l.subject === subjectFilter.value
    return matchesSearch && matchesSubject
  }),
)
</script>

<template>
  <main class="max-w-6xl mx-auto p-8">
    <PageHeader :title="t('lessons.title')">
      <UButton to="/lessons/new" class="rounded-xl px-5 py-3 font-semibold shadow-[0_6px_16px_rgba(47,74,58,0.28)]">
        + {{ t('lessons.createNew') }}
      </UButton>
    </PageHeader>

    <div class="flex flex-wrap items-center gap-3.5 mb-6">
      <UInput
        v-model="search"
        class="w-full sm:w-80"
        :ui="{ base: 'rounded-xl' }"
        :placeholder="t('lessons.searchPlaceholder')"
      />

      <div class="flex gap-2 overflow-x-auto pb-1">
        <UButton
          class="rounded-full font-semibold"
          :variant="subjectFilter === '' ? 'solid' : 'outline'"
          size="sm"
          @click="subjectFilter = ''"
        >
          {{ t('lessons.all') }}
        </UButton>
        <UButton
          v-for="s in SUBJECTS"
          :key="s.name"
          class="rounded-full font-semibold"
          :variant="subjectFilter === s.name ? 'solid' : 'outline'"
          size="sm"
          :style="subjectFilter !== s.name ? { color: s.color, borderColor: s.color } : {}"
          @click="subjectFilter = s.name"
        >
          {{ s.name }}
        </UButton>
      </div>
    </div>

    <div v-if="filtered.length === 0" class="card text-center py-12 px-6">
      <p class="text-lg mb-2">{{ t('lessons.empty') }}</p>
      <p class="text-stone mb-4">{{ t('lessons.emptyHint') }}</p>
      <UButton to="/lessons/new">{{ t('lessons.createFirst') }}</UButton>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[18px]">
      <div
        v-for="l in filtered"
        :key="l.id"
        class="card relative group shadow-[0_4px_12px_rgba(58,46,38,0.07)] transition-shadow hover:shadow-[0_4px_12px_rgba(58,46,38,0.12)]"
        :style="{ borderLeft: `5px solid ${subjectColor(l.subject)}` }"
      >
        <NuxtLink :to="`/lessons/${l.id}`" class="absolute inset-0 z-0" :aria-label="l.title" />

        <div class="relative z-[1] p-5 pb-4 pointer-events-none">
          <div class="flex items-center justify-between gap-2 mb-4">
            <div class="flex items-center gap-2">
              <span
                class="size-9 rounded-xl grid place-items-center text-base shrink-0"
                :style="{ background: subjectSoft(l.subject) }"
              >
                {{ subjectIcon(l.subject) }}
              </span>
              <span
                class="text-sm font-semibold px-2.5 py-0.5 rounded-full border"
                :style="{ color: subjectColor(l.subject), borderColor: subjectColor(l.subject) }"
              >
                {{ l.subject }}
              </span>
            </div>
            <span
              class="text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap"
              :style="{ color: gameFormatMeta(l.gameFormat).color, background: gameFormatMeta(l.gameFormat).soft }"
            >
              {{ gameFormatMeta(l.gameFormat).icon }} {{ gameFormatMeta(l.gameFormat).label }}
            </span>
          </div>

          <p class="font-bold mb-2">{{ l.title }}</p>
          <p class="text-stone text-sm">
            {{ t('lessons.grade') }} {{ l.grade }} ·
            {{ l._count.questions }} {{ t('lessons.questions') }}
          </p>
        </div>

        <div class="relative z-[1] border-t border-black/10 px-5 py-3 flex items-center justify-between gap-2">
          <span class="text-stone text-sm pointer-events-none">🕐 {{ timeAgo(l.createdAt) }}</span>
          <div class="flex gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            <UButton :to="`/lessons/${l.id}`" variant="outline" color="neutral" size="xs" class="rounded-lg text-moss">
              🔗 {{ t('lessons.share') }}
            </UButton>
            <UButton :to="`/lessons/${l.id}`" variant="outline" color="neutral" size="xs" class="rounded-lg text-bark">
              ✏️ {{ t('lessons.editLesson') }}
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.card {
  background: var(--color-linen);
  border: 1px solid rgba(58, 46, 38, 0.1);
  border-radius: 16px;
}
</style>
