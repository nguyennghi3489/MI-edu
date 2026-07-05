<script setup lang="ts">
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

const { data: classes } = await useAsyncData(
  'classes',
  () => useApi<ClassSummary[]>('/api/classes'),
  { default: () => [] },
)
</script>

<template>
  <main class="max-w-6xl mx-auto p-8">
    <PageHeader :title="t('classes.title')">
      <UButton to="/pupils" variant="ghost">{{ t('classes.goToPupils') }}</UButton>
      <UButton to="/classes/new">{{ t('classes.create') }}</UButton>
    </PageHeader>

    <div v-if="classes.length === 0" class="card text-center py-12">
      <p class="text-lg mb-2">{{ t('classes.empty') }}</p>
      <UButton to="/classes/new">{{ t('classes.createFirst') }}</UButton>
    </div>

    <div v-else class="flex flex-col gap-3">
      <NuxtLink v-for="c in classes" :key="c.id" :to="`/classes/${c.id}`" class="card block">
        <p class="font-bold">{{ c.name }}</p>
        <p class="text-stone text-sm">
          {{ c.pupilCount }} {{ t('classes.pupilCount') }} ·
          {{ c.lastActivity ? new Date(c.lastActivity).toLocaleDateString('vi-VN') : t('classes.noActivity') }}
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
