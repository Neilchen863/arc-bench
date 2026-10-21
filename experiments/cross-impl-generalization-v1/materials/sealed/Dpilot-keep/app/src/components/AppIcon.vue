<script setup>
// Decorative inline icons; the owning control always carries the accessible name.
defineProps({ name: { type: String, required: true }, size: { type: Number, default: 24 } })
const PATHS = {
  menu: 'M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z',
  bulb: 'M9 21h6v-1H9v1zm3-19a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2zm2.9 11.1-.9.6V16h-4v-2.3l-.9-.6A5 5 0 1 1 14.9 13.1z',
  bell: 'M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6V11c0-3.1-1.6-5.6-4.5-6.3V4a1.5 1.5 0 0 0-3 0v.7C7.6 5.4 6 7.9 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.5 1.5-4.5 4-4.5s4 2 4 4.5v6z',
  label: 'M17.6 5.8A2 2 0 0 0 16 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11c.7 0 1.3-.3 1.6-.8L22 12l-4.4-6.2zM16 17H5V7h11l3.5 5L16 17z',
  pencil: 'M3 17.3V21h3.8L17.8 9.9l-3.7-3.7L3 17.3zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.7L20.7 7z',
  archive: 'M20.5 5.2 19.1 3.5A1.5 1.5 0 0 0 18 3H6c-.5 0-.9.2-1.2.5L3.5 5.2C3.2 5.6 3 6 3 6.5V19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.5c0-.5-.2-.9-.5-1.3zM6.2 5h11.6l.8 1H5.4l.8-1zM5 19V8h14v11H5zm8.5-9h-3v3H8l4 4 4-4h-2.5v-3z',
  trash: 'M15 4V3H9v1H4v2h1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5zm2 15H7V6h10v13zM9 8h2v9H9zm4 0h2v9h-2z',
  search: 'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  close: 'M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z',
  list: 'M4 5h16v6H4zm0 8h16v6H4zm2-6v2h12V7zm0 8v2h12v-2z',
  grid: 'M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm8-2h8v8h-8zm2 2v4h4v-4z',
  pin: 'M16 9V4h1V2H7v2h1v5c0 1.7-1.3 3-3 3v2h6v7l1 1 1-1v-7h6v-2c-1.7 0-3-1.3-3-3zm-7.3 3c.8-.8 1.3-1.8 1.3-3V4h4v5c0 1.2.5 2.2 1.3 3H8.7z',
  pinFilled: 'M16 9V4h1V2H7v2h1v5c0 1.7-1.3 3-3 3v2h6v7l1 1 1-1v-7h6v-2c-1.7 0-3-1.3-3-3z',
  palette: 'M12 3a9 9 0 0 0 0 18c.8 0 1.5-.7 1.5-1.5 0-.4-.1-.7-.4-1-.2-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
  more: 'M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  check: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z',
}
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="icon">
    <path :d="PATHS[name]" fill="currentColor" />
  </svg>
</template>
