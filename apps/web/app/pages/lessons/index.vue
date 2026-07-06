<script setup lang="ts">
import { errorMessage } from '~/utils/errorMessage'
import { GAMES, QUIZ } from '~/games/registry'

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
const auth = useAuthStore()

const { data: lessons } = await useAsyncData(
  'lessons',
  () => useApi<Lesson[]>('/api/lessons'),
  { default: () => [] },
)
await useAsyncData('auth-me', () => auth.fetchMe().then(() => true))

const isFreePlan = computed(() => auth.teacher?.plan === 'free')
const gameItems = computed(() => [
  { label: `${QUIZ.icon} ${QUIZ.name}`, value: QUIZ.id },
  ...GAMES.map((g) => ({
    label: `${g.icon} ${g.name}${g.status !== 'live' ? ` — ${t('games.comingSoon')}` : ''}${g.tier === 'pro' && isFreePlan.value ? ' 🔒' : ''}`,
    value: g.id,
    disabled: g.status !== 'live' || (g.tier === 'pro' && isFreePlan.value),
  })),
])
const GAME_TIMES = [10, 20, 30]
const search = ref('')
const subjectFilter = ref('')

const open = ref(false)
const busy = ref(false)
const error = ref('')
const title = ref('')
const subject = ref(SUBJECTS[0].name)
const grade = ref('')
const gameFormat = ref(QUIZ.id)
const gameTimeSec = ref(20)

function openAdd() {
  title.value = ''
  subject.value = SUBJECTS[0].name
  grade.value = ''
  gameFormat.value = QUIZ.id
  gameTimeSec.value = 20
  error.value = ''
  open.value = true
}

async function submit() {
  error.value = ''
  busy.value = true
  try {
    const lesson = await useApi<{ id: string }>('/api/lessons', {
      method: 'POST',
      body: {
        title: title.value,
        subject: subject.value,
        grade: grade.value,
        gameFormat: gameFormat.value,
        gameTimeSec: gameTimeSec.value,
      },
    })
    open.value = false
    await navigateTo(`/lessons/${lesson.id}`)
  } catch (e: any) {
    error.value = errorMessage(e, t)
  } finally {
    busy.value = false
  }
}

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
      <UButton class="rounded-xl px-5 py-3 font-semibold shadow-[0_6px_16px_rgba(47,74,58,0.28)]" @click="openAdd">
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

    <EmptyState v-if="filtered.length === 0" :message="t('lessons.empty')" :hint="t('lessons.emptyHint')">
      <UButton @click="openAdd">{{ t('lessons.createFirst') }}</UButton>
    </EmptyState>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[18px]">
      <div
        v-for="l in filtered"
        :key="l.id"
        class="card p-0 rounded-2xl relative group shadow-[0_4px_12px_rgba(58,46,38,0.07)] transition-shadow hover:shadow-[0_4px_12px_rgba(58,46,38,0.12)]"
        :style="{ borderLeft: `5px solid ${subjectColor(l.subject)}` }"
      >
        <NuxtLink :to="`/lessons/${l.id}`" class="absolute inset-0 z-0" :aria-label="l.title" />

        <div class="relative z-[1] p-5 pb-4 pointer-events-none">
          <div class="flex items-center justify-between gap-2 mb-4">
            <div class="flex items-center gap-2.5">
              <span
                class="size-12 rounded-2xl grid place-items-center text-xl shrink-0"
                :style="{ background: subjectSoft(l.subject) }"
              >
                {{ subjectIcon(l.subject) }}
              </span>
              <Pill class="font-bold" :color="subjectColor(l.subject)" :soft="subjectSoft(l.subject)">
                {{ l.subject }}
              </Pill>
            </div>
            <Pill
              class="font-semibold whitespace-nowrap"
              :color="gameFormatMeta(l.gameFormat).color"
              :soft="gameFormatMeta(l.gameFormat).soft"
            >
              {{ gameFormatMeta(l.gameFormat).icon }} {{ gameFormatMeta(l.gameFormat).label }}
            </Pill>
          </div>

          <p class="text-lg font-bold mb-3 line-clamp-2">{{ l.title }}</p>
          <p class="text-stone">
            {{ t('lessons.grade') }} {{ l.grade }} ·
            {{ l._count.questions }} {{ t('lessons.questions') }}
          </p>
        </div>

        <div class="relative z-[1] border-t border-black/10 px-5 py-3 flex items-center justify-between gap-2">
          <span class="text-stone text-sm pointer-events-none">🕐 {{ timeAgo(l.createdAt) }}</span>
          <div class="flex gap-2">
            <UButton :to="`/lessons/${l.id}`" variant="outline" color="neutral" size="sm" class="rounded-xl font-semibold text-moss">
              🔗 {{ t('lessons.share') }}
            </UButton>
            <UButton :to="`/lessons/${l.id}`" variant="outline" color="neutral" size="sm" class="rounded-xl font-semibold text-bark">
              ✏️ {{ t('lessons.editLesson') }}
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <FormModal
      v-model:open="open"
      :title="t('lessons.create')"
      :submit-label="t('lessons.create')"
      :busy="busy"
      :error="error"
      @submit="submit"
    >
      <UFormField :label="t('lessons.lessonTitle')">
        <UInput v-model="title" class="w-full" required />
      </UFormField>
      <UFormField :label="t('lessons.subject')">
        <USelect v-model="subject" class="w-full" :items="SUBJECTS.map((s) => s.name)" />
      </UFormField>
      <UFormField :label="t('lessons.grade')">
        <UInput v-model="grade" class="w-full" placeholder="VD: 3" required />
      </UFormField>
      <UFormField :label="t('lessons.game')">
        <USelect v-model="gameFormat" class="w-full" :items="gameItems" />
      </UFormField>
      <UFormField v-if="gameFormat !== QUIZ.id" :label="t('lessons.gameTime')">
        <USelect v-model="gameTimeSec" class="w-full" :items="GAME_TIMES.map((s) => ({ label: `${s} giây`, value: s }))" />
      </UFormField>
    </FormModal>
  </main>
</template>
