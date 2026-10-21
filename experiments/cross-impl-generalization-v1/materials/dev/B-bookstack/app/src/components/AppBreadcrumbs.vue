<script setup>
// items: [{ label, to? }]; the last item is the current location.
defineProps({ items: { type: Array, required: true } });
</script>

<template>
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol>
      <li v-for="(item, i) in items" :key="i">
        <router-link v-if="item.to && i < items.length - 1" :to="item.to">{{ item.label }}</router-link>
        <span v-else aria-current="page">{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>
