<script setup lang="ts">
defineProps<{ color: string; soft: string }>()
</script>

<template>
  <span class="text-sm px-3 py-1 rounded-full" :style="{ color, background: soft }">
    <slot />
  </span>
</template>
