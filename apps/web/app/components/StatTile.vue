<script setup lang="ts">
defineProps<{ label: string; value: string | number }>()
</script>

<template>
  <div>
    <p class="text-stone text-sm">{{ label }}</p>
    <p class="text-2xl">{{ value }}</p>
  </div>
</template>
