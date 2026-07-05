<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<template>
  <div class="flex items-center justify-between gap-4 mb-6">
    <div>
      <h1 class="text-[1.9rem] tracking-tight flex items-center gap-2">
        <slot name="title">{{ title }}</slot>
      </h1>
      <p v-if="$slots.subtitle" class="text-stone text-sm mt-1">
        <slot name="subtitle" />
      </p>
    </div>
    <div class="flex gap-2 shrink-0">
      <slot />
    </div>
  </div>
</template>
