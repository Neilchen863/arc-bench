import React, { useEffect, useState } from 'react';
import { usePath, match, Link } from './router.jsx';
import { api } from './api.js';
import Home from './views/Home.jsx';
import Shelves from './views/Shelves.jsx';
import Login from './views/Login.jsx';
import Books from './views/Books.jsx';
import BookForm from './views/BookForm.jsx';
import BookDetail from './views/BookDetail.jsx';
import PageEditor from './views/PageEditor.jsx';
import PageView from './views/PageView.jsx';
import { NowContext } from './now.js';

const routes = [
  ['/', () => <Home />],
  ['/login', () => <Login />],
  ['/shelves', () => <Shelves />],
  ['/books', () => <Books />],
  ['/books/new', () => <BookForm />],
  ['/books/:bookId', (p) => <BookDetail key={p.bookId} bookId={p.bookId} />],
  ['/books/:bookId/edit', (p) => <BookForm key={p.bookId} bookId={p.bookId} />],
  ['/books/:bookId/pages/new', (p) => <PageEditor key={`new-${p.bookId}`} bookId={p.bookId} />],
  ['/books/:bookId/pages/:pageId', (p) => <PageView key={p.pageId} bookId={p.bookId} pageId={p.pageId} />],
  ['/books/:bookId/pages/:pageId/edit', (p) => <PageEditor key={p.pageId} bookId={p.bookId} pageId={p.pageId} />],
];

function Header() {
  return (
    <header className="topbar">
      <Link to="/" className="brand">
        BookStack
      </Link>
      <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
        <input type="search" aria-label="Search" placeholder="Search" />
      </form>
      <nav aria-label="Main" className="topnav">
        <Link to="/shelves">Shelves</Link>
        <Link to="/books">Books</Link>
        <Link to="/login">Login</Link>
      </nav>
    </header>
  );
}

export default function App() {
  const path = usePath();
  const [now, setNow] = useState(null);
  useEffect(() => {
    api.now().then(setNow).catch(() => setNow(null));
  }, []);

  let view = null;
  for (const [pattern, render] of routes) {
    const params = match(pattern, path);
    if (params) {
      view = render(params);
      break;
    }
  }
  if (!view)
    view = (
      <div className="card">
        <h1>Not found</h1>
        <p>
          <Link to="/">Back to home</Link>
        </p>
      </div>
    );

  return (
    <NowContext.Provider value={now}>
      <Header />
      <main className="content">{view}</main>
    </NowContext.Provider>
  );
}
