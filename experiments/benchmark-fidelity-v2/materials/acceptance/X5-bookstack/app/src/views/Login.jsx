import { Typography, TextField, Checkbox, FormControlLabel, Button, Stack, Alert } from '@mui/material';
import { useState } from 'react';
import { Card } from './common.jsx';

// Login is outside the scope of this build: the form is shown but does not authenticate.
export default function Login() {
  const [msg, setMsg] = useState('');
  return (
    <Card>
      <Typography variant="h4" component="h1" gutterBottom>Log In</Typography>
      <Stack component="form" spacing={2} sx={{ maxWidth: 400 }}
        onSubmit={(e) => { e.preventDefault(); setMsg('Login is not available in this build.'); }}>
        <TextField label="Email" type="email" name="email" />
        <TextField label="Password" type="password" name="password" />
        <FormControlLabel control={<Checkbox name="remember" />} label="Remember Me" />
        <Button type="submit" variant="contained">Login</Button>
        {msg && <Alert severity="info">{msg}</Alert>}
      </Stack>
    </Card>
  );
}
