import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import BooksView from './views/BooksView.vue';
import BookFormView from './views/BookFormView.vue';
import BookView from './views/BookView.vue';
import PageEditorView from './views/PageEditorView.vue';
import PageView from './views/PageView.vue';
import ShelvesView from './views/ShelvesView.vue';
import LoginView from './views/LoginView.vue';
import NotFoundView from './views/NotFoundView.vue';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/books', name: 'books', component: BooksView },
    { path: '/books/new', name: 'book-new', component: BookFormView },
    { path: '/books/:bookId', name: 'book', component: BookView, props: true },
    { path: '/books/:bookId/edit', name: 'book-edit', component: BookFormView, props: true },
    { path: '/books/:bookId/pages/new', name: 'page-new', component: PageEditorView, props: true },
    { path: '/books/:bookId/pages/:pageId', name: 'page', component: PageView, props: true },
    { path: '/books/:bookId/pages/:pageId/edit', name: 'page-edit', component: PageEditorView, props: true },
    { path: '/shelves', name: 'shelves', component: ShelvesView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/:rest(.*)*', name: 'not-found', component: NotFoundView },
  ],
});
