<script setup lang="ts">
import { errorMessage } from '~/utils/errorMessage'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })

interface Pupil {
  id: string
  name: string
  studentNumber: string
  classes: { id: string; name: string }[]
}

const { t } = useI18n()

const { data: pupils, refresh } = await useAsyncData(
  'pupils',
  () => useApi<Pupil[]>('/api/pupils'),
  { default: () => [] },
)

const open = ref(false)
const busy = ref(false)
const error = ref('')
const name = ref('')
const studentNumber = ref('')

function initialsOf(name: string) {
  return name.split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase()
}

function openAdd() {
  name.value = ''
  studentNumber.value = ''
  error.value = ''
  open.value = true
}

async function addPupil() {
  error.value = ''
  busy.value = true
  try {
    await useApi('/api/pupils', { method: 'POST', body: { name: name.value, studentNumber: studentNumber.value } })
    await refresh()
    open.value = false
  } catch (e: any) {
    error.value = errorMessage(e, t)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="max-w-6xl mx-auto p-8">
    <PageHeader :title="t('pupils.title')">
      <UButton @click="openAdd">{{ t('pupils.add') }}</UButton>
    </PageHeader>

    <EmptyState v-if="pupils.length === 0" :message="t('pupils.empty')" />
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="p in pupils"
        :key="p.id"
        class="card p-4 rounded-2xl shadow-[0_4px_12px_rgba(58,46,38,0.07)]"
      >
        <div class="flex items-center gap-3 mb-3">
          <span
            class="size-11 rounded-full bg-forest-100 text-forest font-bold grid place-items-center shrink-0"
          >
            {{ initialsOf(p.name) }}
          </span>
          <div class="min-w-0">
            <p class="font-bold truncate">{{ p.name }}</p>
            <p class="text-stone text-sm font-mono">#{{ p.studentNumber }}</p>
          </div>
        </div>
        <div class="flex gap-1.5 flex-wrap">
          <UBadge v-for="c in p.classes" :key="c.id" variant="subtle" class="rounded-full">{{ c.name }}</UBadge>
          <span v-if="p.classes.length === 0" class="text-stone text-xs">{{ t('pupils.noClasses') }}</span>
        </div>
      </div>
    </div>

    <FormModal
      v-model:open="open"
      :title="t('pupils.add')"
      :submit-label="t('pupils.add')"
      :busy="busy"
      :error="error"
      @submit="addPupil"
    >
      <UFormField :label="t('pupils.name')">
        <UInput v-model="name" class="w-full" required />
      </UFormField>
      <UFormField :label="t('pupils.studentNumber')">
        <UInput v-model="studentNumber" class="w-full" required />
      </UFormField>
    </FormModal>
  </main>
</template>
