<script setup>
import { computed } from 'vue';
import { segments } from '../highlight.js';

const props = defineProps({ text: { type: String, default: '' }, keyword: { type: String, default: '' } });
const parts = computed(() => segments(props.text, props.keyword));
</script>

<template>
  <template v-for="(p, i) in parts" :key="i"><mark v-if="p.match" class="hl">{{ p.text }}</mark><template v-else>{{ p.text }}</template></template>
</template>
