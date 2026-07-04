<script setup lang="ts">
// Google OAuth landing: API redirects here with ?token=
const route = useRoute()
const token = useCookie<string | null>('token', { maxAge: 60 * 60 * 24 * 7 })

if (typeof route.query.token === 'string') token.value = route.query.token
await navigateTo(token.value ? '/lessons' : '/login', { replace: true })
</script>

<template>
  <main />
</template>
