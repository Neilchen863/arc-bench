export default {
  testDir: '.',
  testMatch: /selfcheck\.mjs$/,
  workers: 1,
  timeout: 60000,
  use: { baseURL: `http://127.0.0.1:${process.env.PORT || 39001}`, headless: true },
};
