<script setup lang="ts">
defineProps<{ message: string; hint?: string }>()
</script>

<template>
  <div v-if="hint || $slots.default" class="card text-center py-12 px-6">
    <p class="text-lg mb-2">{{ message }}</p>
    <p v-if="hint" class="text-stone mb-4">{{ hint }}</p>
    <slot />
  </div>
  <p v-else class="text-stone">{{ message }}</p>
</template>
