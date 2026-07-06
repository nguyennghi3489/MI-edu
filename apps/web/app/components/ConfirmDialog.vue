<script setup lang="ts">
defineProps<{ message: string }>()
const open = defineModel<boolean>('open', { required: true })
defineEmits<{ confirm: [] }>()
const { t } = useI18n()
</script>

<template>
  <UModal v-model:open="open" :title="t('lessons.confirmTitle')">
    <template #body>
      <p>{{ message }}</p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton variant="outline" @click="open = false">{{ t('lessons.cancel') }}</UButton>
        <UButton color="error" @click="$emit('confirm')">{{ t('lessons.confirmYes') }}</UButton>
      </div>
    </template>
  </UModal>
</template>
