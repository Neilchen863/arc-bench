<script setup>
import { ref } from 'vue';

const search = ref('');
</script>

<template>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="topbar">
    <router-link to="/" class="brand">Knowledge Base</router-link>
    <form class="search" role="search" @submit.prevent>
      <el-input v-model="search" placeholder="Search" aria-label="Search" clearable />
    </form>
    <nav aria-label="Main">
      <ul>
        <li><router-link to="/shelves">Shelves</router-link></li>
        <li><router-link to="/books">Books</router-link></li>
        <li><router-link to="/login">Log in</router-link></li>
      </ul>
    </nav>
  </header>
  <main id="main" tabindex="-1">
    <router-view :key="$route.fullPath" />
  </main>
</template>
