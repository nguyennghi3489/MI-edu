<script setup lang="ts">
import { errorMessage } from '~/utils/errorMessage'

definePageMeta({ middleware: 'auth', layout: 'dashboard' })

interface Pupil {
  id: string
  name: string
  studentNumber: string
}

interface ClassDetail {
  id: string
  name: string
  grade: string | null
  schoolYear: string | null
  pupils: Pupil[]
}

const { t } = useI18n()
const route = useRoute()

const { data: klass, error, refresh } = await useAsyncData(`class-${route.params.id}`, () =>
  useApi<ClassDetail>(`/api/classes/${route.params.id}`),
)
if (error.value) {
  throw createError({ statusCode: error.value.statusCode ?? 500, statusMessage: 'Không tìm thấy lớp học' })
}

const addOpen = ref(false)
const addBusy = ref(false)
const addError = ref('')
const addMode = ref<'new' | 'existing'>('new')
const newName = ref('')
const newStudentNumber = ref('')
const orgPupils = ref<{ id: string; name: string; studentNumber: string }[]>([])
const pickedPupilId = ref('')

const pickablePupils = computed(() => {
  const enrolledIds = new Set(klass.value!.pupils.map((p) => p.id))
  return orgPupils.value.filter((p) => !enrolledIds.has(p.id))
})

async function openAdd() {
  newName.value = ''
  newStudentNumber.value = ''
  addError.value = ''
  addMode.value = 'new'
  orgPupils.value = await useApi<{ id: string; name: string; studentNumber: string }[]>('/api/pupils')
  pickedPupilId.value = pickablePupils.value[0]?.id ?? ''
  addOpen.value = true
}

async function addPupil() {
  addError.value = ''
  addBusy.value = true
  try {
    if (addMode.value === 'new') {
      await useApi(`/api/classes/${klass.value!.id}/pupils`, {
        method: 'POST',
        body: { name: newName.value, studentNumber: newStudentNumber.value },
      })
    } else {
      await useApi(`/api/classes/${klass.value!.id}/enrollments`, {
        method: 'POST',
        body: { pupilId: pickedPupilId.value },
      })
    }
    await refresh()
    addOpen.value = false
  } catch (e: any) {
    addError.value = errorMessage(e, t)
  } finally {
    addBusy.value = false
  }
}

// ponytail: naive comma-split, no quoting/escaping — fine for a plain "name,studentNumber" list,
// upgrade to a real CSV parser only if teachers hit quoted fields or embedded commas.
const importOpen = ref(false)
const importBusy = ref(false)
const importError = ref('')
const importRows = ref<{ name: string; studentNumber: string }[]>([])

function openImport() {
  importRows.value = []
  importError.value = ''
  importOpen.value = true
}

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const text = await file.text()
  importRows.value = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, studentNumber] = line.split(',').map((v) => v.trim())
      return { name: name ?? '', studentNumber: studentNumber ?? '' }
    })
    .filter((r) => r.name && r.studentNumber)
}

async function confirmImport() {
  importError.value = ''
  importBusy.value = true
  try {
    await useApi(`/api/classes/${klass.value!.id}/pupils/bulk`, {
      method: 'POST',
      body: { pupils: importRows.value },
    })
    await refresh()
    importOpen.value = false
  } catch (e: any) {
    importError.value = errorMessage(e, t)
  } finally {
    importBusy.value = false
  }
}
</script>

<template>
  <main class="max-w-2xl mx-auto p-6">
    <NuxtLink to="/classes" class="text-moss text-sm">{{ t('classes.back') }}</NuxtLink>
    <h1 class="text-3xl mt-2 mb-1">{{ klass.name }}</h1>
    <p class="text-stone text-sm mb-6">
      {{ klass.grade ?? '' }} <span v-if="klass.grade && klass.schoolYear">·</span> {{ klass.schoolYear ?? '' }}
    </p>

    <div class="flex gap-2 mb-4">
      <UButton size="sm" @click="openAdd">{{ t('classes.addPupil') }}</UButton>
      <UButton size="sm" variant="outline" @click="openImport">{{ t('classes.importCsv') }}</UButton>
    </div>

    <p v-if="klass.pupils.length === 0" class="text-stone">{{ t('classes.noPupils') }}</p>
    <ol v-else class="flex flex-col gap-2">
      <li
        v-for="p in klass.pupils"
        :key="p.id"
        class="flex items-center gap-3 p-3 rounded-xl bg-linen border border-black/10"
      >
        <span class="font-mono text-sm text-stone w-12">{{ p.studentNumber }}</span>
        <span class="flex-1">{{ p.name }}</span>
      </li>
    </ol>

    <UModal v-model:open="addOpen" :title="t('classes.addPupil')">
      <template #body>
        <div class="flex flex-col gap-4">
          <div class="flex gap-3">
            <UButton :variant="addMode === 'new' ? 'solid' : 'outline'" @click="addMode = 'new'">
              {{ t('classes.createNewPupil') }}
            </UButton>
            <UButton :variant="addMode === 'existing' ? 'solid' : 'outline'" @click="addMode = 'existing'">
              {{ t('classes.pickExistingPupil') }}
            </UButton>
          </div>

          <template v-if="addMode === 'new'">
            <UFormField :label="t('classes.pupilName')">
              <UInput v-model="newName" class="w-full" required />
            </UFormField>
            <UFormField :label="t('classes.studentNumber')">
              <UInput v-model="newStudentNumber" class="w-full" required />
            </UFormField>
          </template>
          <template v-else>
            <p v-if="pickablePupils.length === 0" class="text-stone text-sm">{{ t('classes.noPickablePupils') }}</p>
            <UFormField v-else :label="t('classes.pickExistingPupil')">
              <USelect
                v-model="pickedPupilId"
                class="w-full"
                :items="pickablePupils.map((p) => ({ label: `${p.name} (${p.studentNumber})`, value: p.id }))"
              />
            </UFormField>
          </template>

          <p v-if="addError" class="text-red-600 text-sm">{{ addError }}</p>
        </div>
      </template>
      <template #footer>
        <UButton
          block
          size="lg"
          :disabled="addMode === 'existing' && pickablePupils.length === 0"
          :loading="addBusy"
          @click="addPupil"
        >
          {{ t('classes.addPupil') }}
        </UButton>
      </template>
    </UModal>

    <UModal v-model:open="importOpen" :title="t('classes.importCsv')">
      <template #body>
        <div class="flex flex-col gap-4">
          <p class="text-stone text-sm">{{ t('classes.importHint') }}</p>
          <input type="file" accept=".csv,text/csv" @change="onFileChange" />
          <ul v-if="importRows.length" class="flex flex-col gap-1 max-h-64 overflow-y-auto">
            <li v-for="(r, i) in importRows" :key="i" class="text-sm flex gap-2">
              <span class="font-mono text-stone w-12">{{ r.studentNumber }}</span>
              <span>{{ r.name }}</span>
            </li>
          </ul>
          <p v-if="importError" class="text-red-600 text-sm">{{ importError }}</p>
        </div>
      </template>
      <template #footer>
        <UButton block size="lg" :disabled="!importRows.length" :loading="importBusy" @click="confirmImport">
          {{ t('classes.confirmImport') }} ({{ importRows.length }})
        </UButton>
      </template>
    </UModal>
  </main>
</template>
