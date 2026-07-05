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
    <NuxtLink to="/classes" class="text-moss text-sm mb-2 inline-block">{{ t('pupils.back') }}</NuxtLink>
    <PageHeader :title="t('pupils.title')">
      <UButton @click="openAdd">{{ t('pupils.add') }}</UButton>
    </PageHeader>

    <p v-if="pupils.length === 0" class="text-stone">{{ t('pupils.empty') }}</p>
    <ol v-else class="flex flex-col gap-2">
      <li
        v-for="p in pupils"
        :key="p.id"
        class="flex items-center gap-3 p-3 rounded-xl bg-linen border border-black/10"
      >
        <span class="font-mono text-sm text-stone w-12">{{ p.studentNumber }}</span>
        <span class="flex-1">{{ p.name }}</span>
        <div class="flex gap-1 flex-wrap justify-end">
          <UBadge v-for="c in p.classes" :key="c.id" variant="subtle">{{ c.name }}</UBadge>
          <span v-if="p.classes.length === 0" class="text-stone text-xs">{{ t('pupils.noClasses') }}</span>
        </div>
      </li>
    </ol>

    <UModal v-model:open="open" :title="t('pupils.add')">
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField :label="t('pupils.name')">
            <UInput v-model="name" class="w-full" required />
          </UFormField>
          <UFormField :label="t('pupils.studentNumber')">
            <UInput v-model="studentNumber" class="w-full" required />
          </UFormField>
          <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
        </div>
      </template>
      <template #footer>
        <UButton block size="lg" :loading="busy" @click="addPupil">{{ t('pupils.add') }}</UButton>
      </template>
    </UModal>
  </main>
</template>
