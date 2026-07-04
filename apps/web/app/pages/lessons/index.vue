<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

interface Lesson {
  id: string
  title: string
  subject: string
  grade: string
  gameFormat: string
  _count: { questions: number }
}

const { t } = useI18n()
const auth = useAuthStore()
const token = useCookie('token')

const { data: lessons } = await useAsyncData(
  'lessons',
  () => $fetch<Lesson[]>('/api/lessons', { headers: { Authorization: `Bearer ${token.value}` } }),
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

async function logout() {
  auth.logout()
  await navigateTo('/login')
}
</script>

<template>
  <main class="max-w-3xl mx-auto p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl">{{ t('lessons.title') }}</h1>
      <div class="flex gap-2">
        <UButton to="/lessons/new">{{ t('lessons.create') }}</UButton>
        <UButton variant="ghost" @click="logout">{{ t('auth.logout') }}</UButton>
      </div>
    </div>

    <UInput
      v-model="search"
      class="w-full mb-3"
      :placeholder="t('lessons.searchPlaceholder')"
    />

    <div class="flex gap-2 overflow-x-auto pb-1 mb-4">
      <UButton
        :variant="subjectFilter === '' ? 'solid' : 'outline'"
        size="sm"
        @click="subjectFilter = ''"
      >
        {{ t('lessons.all') }}
      </UButton>
      <UButton
        v-for="s in SUBJECTS"
        :key="s.name"
        :variant="subjectFilter === s.name ? 'solid' : 'outline'"
        size="sm"
        :style="subjectFilter !== s.name ? { color: s.color, borderColor: s.color } : {}"
        @click="subjectFilter = s.name"
      >
        {{ s.name }}
      </UButton>
    </div>

    <div v-if="filtered.length === 0" class="card text-center py-12">
      <p class="text-lg mb-2">{{ t('lessons.empty') }}</p>
      <p class="text-stone mb-4">{{ t('lessons.emptyHint') }}</p>
      <UButton to="/lessons/new">{{ t('lessons.createFirst') }}</UButton>
    </div>

    <div v-else class="flex flex-col gap-3">
      <NuxtLink
        v-for="l in filtered"
        :key="l.id"
        :to="`/lessons/${l.id}`"
        class="card block"
        :style="{ borderLeft: `5px solid ${subjectColor(l.subject)}` }"
      >
        <p class="font-bold">{{ l.title }}</p>
        <p class="text-stone text-sm">
          {{ l.subject }} · {{ t('lessons.grade') }} {{ l.grade }} ·
          {{ l._count.questions }} {{ t('lessons.questions') }}
        </p>
      </NuxtLink>
    </div>
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
