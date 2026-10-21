import { Routes, Route, Link as RouterLink } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, InputBase, Container, Link } from '@mui/material';
import Home from './views/Home.jsx';
import Login from './views/Login.jsx';
import { ShelfList, ShelfDetail } from './views/Shelves.jsx';
import BookList from './views/BookList.jsx';
import BookDetail from './views/BookDetail.jsx';
import BookForm from './views/BookForm.jsx';
import PageView from './views/PageView.jsx';
import PageEditor from './views/PageEditor.jsx';
import NotFound from './views/NotFound.jsx';

function Header() {
  return (
    <AppBar position="static" elevation={0}>
      <Toolbar component="nav" aria-label="Main" sx={{ gap: 2, flexWrap: 'wrap' }}>
        <Link component={RouterLink} to="/" color="inherit" underline="none" variant="h6" sx={{ mr: 2 }}>
          BookStack
        </Link>
        <Box
          role="search"
          sx={{ flex: 1, maxWidth: 420, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 5, px: 2 }}
        >
          <InputBase
            placeholder="Search"
            inputProps={{ 'aria-label': 'Search', type: 'search' }}
            sx={{ color: 'inherit', width: '100%' }}
          />
        </Box>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Button component={RouterLink} to="/shelves" color="inherit">Shelves</Button>
          <Button component={RouterLink} to="/books" color="inherit">Books</Button>
          <Button component={RouterLink} to="/login" color="inherit">Login</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <Container component="main" maxWidth="md" sx={{ py: 4 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/shelves" element={<ShelfList />} />
          <Route path="/shelves/:shelfId" element={<ShelfDetail />} />
          <Route path="/books" element={<BookList />} />
          <Route path="/books/new" element={<BookForm />} />
          <Route path="/books/:bookId" element={<BookDetail />} />
          <Route path="/books/:bookId/edit" element={<BookForm />} />
          <Route path="/books/:bookId/pages/new" element={<PageEditor />} />
          <Route path="/books/:bookId/pages/:pageId" element={<PageView />} />
          <Route path="/books/:bookId/pages/:pageId/edit" element={<PageEditor />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Container>
    </>
  );
}
