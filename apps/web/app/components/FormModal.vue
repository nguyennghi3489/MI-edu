<script setup lang="ts">
defineProps<{
  title: string
  submitLabel: string
  busy?: boolean
  error?: string
  disabled?: boolean
  bodyClass?: string
  ui?: Record<string, string>
}>()
const open = defineModel<boolean>('open', { required: true })
defineEmits<{ submit: [] }>()
</script>

<template>
  <UModal v-model:open="open" :title="title" :ui="ui">
    <template #body>
      <div :class="bodyClass ?? 'flex flex-col gap-4'">
        <slot />
        <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
      </div>
    </template>
    <template #footer>
      <UButton block size="lg" :disabled="disabled" :loading="busy" @click="$emit('submit')">
        {{ submitLabel }}
      </UButton>
    </template>
  </UModal>
</template>
