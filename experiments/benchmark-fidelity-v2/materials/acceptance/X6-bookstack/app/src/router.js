import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import BooksView from './views/BooksView.vue';
import BookFormView from './views/BookFormView.vue';
import BookView from './views/BookView.vue';
import PageView from './views/PageView.vue';
import PageEditorView from './views/PageEditorView.vue';
import ShelvesView from './views/ShelvesView.vue';
import LoginView from './views/LoginView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView, meta: { title: 'Home' } },
    { path: '/books', component: BooksView, meta: { title: 'Books' } },
    { path: '/books/new', component: BookFormView, meta: { title: 'New book' } },
    { path: '/books/:id', component: BookView, props: true },
    { path: '/books/:id/edit', component: BookFormView, props: true, meta: { title: 'Edit book' } },
    { path: '/books/:bookId/pages/new', component: PageEditorView, props: true, meta: { title: 'New page' } },
    { path: '/pages/:id', component: PageView, props: true },
    { path: '/pages/:id/edit', component: PageEditorView, props: true, meta: { title: 'Edit page' } },
    { path: '/shelves', component: ShelvesView, meta: { title: 'Shelves' } },
    { path: '/login', component: LoginView, meta: { title: 'Log in' } },
    { path: '/:rest(.*)*', component: HomeView },
  ],
});

router.afterEach(to => {
  document.title = to.meta.title ? `${to.meta.title} | BookStack` : 'BookStack';
});
