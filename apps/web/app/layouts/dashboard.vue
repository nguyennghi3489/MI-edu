<script setup lang="ts">
const { t } = useI18n();
const route = useRoute();
const auth = useAuthStore();

const links = [
  { to: "/lessons", label: t("nav.lessons"), icon: "i-lucide-book-open" },
  { to: "/classes", label: t("nav.classes"), icon: "i-lucide-users" },
  { to: "/pupils", label: t("nav.pupils"), icon: "i-lucide-graduation-cap" },
];

const initials = computed(() =>
  (auth.teacher?.name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase(),
);

function isActive(to: string) {
  return route.path === to || route.path.startsWith(`${to}/`);
}

async function logout() {
  auth.logout();
  await navigateTo("/login");
}
</script>

<template>
  <div class="md:flex md:min-h-screen">
    <aside
      class="hidden md:flex md:flex-col md:w-64 md:shrink-0 bg-linen border-r border-black/10 p-4"
    >
      <div class="flex items-center gap-3 px-2 mb-4">
        <span
          class="size-10 rounded-2xl bg-forest-500 text-white grid place-items-center shrink-0"
        >
          <UIcon name="i-lucide-feather" class="size-5" />
        </span>
        <p class="font-display font-semibold text-forest text-xl">
          {{ t("app.name") }}
        </p>
      </div>
      <div class="border-t border-black/10 mb-4" />

      <p
        class="text-xs font-semibold tracking-wide text-stone uppercase px-3 mb-2"
      >
        {{ t("nav.section") }}
      </p>
      <nav class="flex flex-col gap-1">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="rounded-2xl pl-4 py-3 text-base flex gap-3"
          :class="
            isActive(link.to)
              ? 'bg-forest-600 text-white font-semibold'
              : 'text-bark hover:bg-forest-50'
          "
        >
          <UIcon :name="link.icon" class="size-6" />{{ link.label }}
        </NuxtLink>
      </nav>

      <div class="mt-auto pt-4">
        <div
          v-if="auth.teacher"
          class="flex items-center gap-2 rounded-2xl border border-black/10 bg-white/60 px-3 py-2 mb-2"
        >
          <span
            class="size-9 rounded-full bg-forest-100 text-forest font-semibold text-sm grid place-items-center shrink-0"
          >
            {{ initials }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold truncate">
              {{ auth.teacher.name }}
            </p>
            <p class="text-xs text-stone truncate">
              {{ auth.teacher.school ?? auth.teacher.email }}
            </p>
          </div>
        </div>
        <UButton variant="ghost" block icon="i-lucide-log-out" @click="logout">{{
          t("auth.logout")
        }}</UButton>
      </div>
    </aside>

    <main class="flex-1 pb-20 md:pb-0">
      <slot />
    </main>

    <nav
      class="md:hidden fixed bottom-0 inset-x-0 bg-linen border-t border-black/10 flex"
    >
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
