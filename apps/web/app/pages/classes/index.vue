<script setup lang="ts">
import { errorMessage } from '~/utils/errorMessage'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })

interface ClassSummary {
  id: string
  name: string
  grade: string | null
  schoolYear: string | null
  isDefault: boolean
  pupilCount: number
  lastActivity: string | null
}

const { t } = useI18n()

const { data: classes, refresh } = await useAsyncData(
  'classes',
  () => useApi<ClassSummary[]>('/api/classes'),
  { default: () => [] },
)

const open = ref(false)
const busy = ref(false)
const error = ref('')
const name = ref('')
const grade = ref('')
const schoolYear = ref('')

function openAdd() {
  name.value = ''
  grade.value = ''
  schoolYear.value = ''
  error.value = ''
  open.value = true
}

async function submit() {
  error.value = ''
  busy.value = true
  try {
    await useApi('/api/classes', {
      method: 'POST',
      body: { name: name.value, grade: grade.value || undefined, schoolYear: schoolYear.value || undefined },
    })
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
    <PageHeader :title="t('classes.title')">
      <UButton to="/pupils" variant="ghost">{{ t('classes.goToPupils') }}</UButton>
      <UButton @click="openAdd">{{ t('classes.create') }}</UButton>
    </PageHeader>

    <EmptyState v-if="classes.length === 0" :message="t('classes.empty')">
      <UButton @click="openAdd">{{ t('classes.createFirst') }}</UButton>
    </EmptyState>

    <div v-else class="flex flex-col gap-3">
      <NuxtLink v-for="c in classes" :key="c.id" :to="`/classes/${c.id}`" class="card block">
        <p class="font-bold">{{ c.name }}</p>
        <p class="text-stone text-sm">
          {{ c.pupilCount }} {{ t('classes.pupilCount') }} ·
          {{ c.lastActivity ? new Date(c.lastActivity).toLocaleDateString('vi-VN') : t('classes.noActivity') }}
        </p>
      </NuxtLink>
    </div>

    <FormModal
      v-model:open="open"
      :title="t('classes.create')"
      :submit-label="t('classes.create')"
      :busy="busy"
      :error="error"
      @submit="submit"
    >
      <UFormField :label="t('classes.name')">
        <UInput v-model="name" class="w-full" required />
      </UFormField>
      <UFormField :label="t('classes.grade')">
        <UInput v-model="grade" class="w-full" placeholder="VD: 3" />
      </UFormField>
      <UFormField :label="t('classes.schoolYear')">
        <UInput v-model="schoolYear" class="w-full" placeholder="VD: 2025-2026" />
      </UFormField>
    </FormModal>
  </main>
</template>
