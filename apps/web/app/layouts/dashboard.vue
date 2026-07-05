<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()

const links = [
  { to: '/lessons', label: t('nav.lessons') },
  { to: '/classes', label: t('nav.classes') },
  { to: '/pupils', label: t('nav.pupils') },
]

function isActive(to: string) {
  return route.path === to || route.path.startsWith(`${to}/`)
}

async function logout() {
  auth.logout()
  await navigateTo('/login')
}
</script>

<template>
  <div class="md:flex md:min-h-screen">
    <aside class="hidden md:flex md:flex-col md:w-60 md:shrink-0 bg-linen border-r border-black/10 p-4">
      <p class="font-display text-forest text-xl px-2 mb-6">{{ t('app.name') }}</p>
      <nav class="flex flex-col gap-1">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="rounded-xl px-3 py-2 text-base"
          :class="isActive(link.to) ? 'bg-forest-100 text-forest font-semibold' : 'text-bark hover:bg-forest-50'"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
      <UButton variant="ghost" class="mt-auto" @click="logout">{{ t('auth.logout') }}</UButton>
    </aside>

    <main class="flex-1 pb-20 md:pb-0">
      <slot />
    </main>

    <nav class="md:hidden fixed bottom-0 inset-x-0 bg-linen border-t border-black/10 flex">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="flex-1 text-center py-3 text-sm"
        :class="isActive(link.to) ? 'text-forest font-semibold' : 'text-stone'"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>
  </div>
</template>
