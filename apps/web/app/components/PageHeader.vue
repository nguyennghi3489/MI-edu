<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-[1.9rem] tracking-tight">{{ title }}</h1>
    <div class="flex gap-2">
      <slot />
    </div>
  </div>
</template>
