<script setup>
import { onMounted, ref } from 'vue';
import { api } from '../api.js';
const shelves = ref([]);
onMounted(async () => { shelves.value = await api.list('shelves'); });
</script>

<template>
  <div class="container">
    <h1>Shelves</h1>
    <section aria-label="Shelf list" class="card">
      <ul class="entity-list">
        <li v-for="s in shelves" :key="s.id" class="entity">
          <span class="entity-title">{{ s.name }}</span>
          <p v-if="s.description" class="excerpt">{{ s.description }}</p>
        </li>
      </ul>
      <p class="muted">Shelf management is not part of this edition.</p>
    </section>
  </div>
</template>
