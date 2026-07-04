<script setup lang="ts">
const token = useCookie('token')
await navigateTo(token.value ? '/lessons' : '/login', { replace: true })
</script>

<template>
  <main />
</template>
