<script setup>
import { onMounted, ref } from 'vue';
import { api } from '../api.js';

const shelves = ref([]);
onMounted(async () => { shelves.value = (await api.list('shelves')) || []; });
</script>

<template>
  <div class="content-card">
    <section aria-labelledby="shelves-heading">
      <h1 id="shelves-heading">Shelves</h1>
      <p class="muted">Shelf management is not available in this edition.</p>
      <ul class="entity-list books">
        <li v-for="shelf in shelves" :key="shelf.id">
          <span style="font-size:1.25rem">{{ shelf.name }}</span>
          <p v-if="shelf.description">{{ shelf.description }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>
