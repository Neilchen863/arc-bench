<template>
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false">
    <path :fill="filled ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"
      d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z" />
    <path stroke="currentColor" stroke-width="1.8" d="M12 14v7" />
  </svg>
</template>
<script setup>
defineProps({ filled: Boolean });
</script>
