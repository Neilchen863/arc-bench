export const NOTE_COLORS = [
  { id: null, name: 'Default', value: '#ffffff' },
  { id: 'coral', name: 'Coral', value: '#faafa8' },
  { id: 'peach', name: 'Peach', value: '#f39f76' },
  { id: 'sand', name: 'Sand', value: '#fff8b8' },
  { id: 'mint', name: 'Mint', value: '#e2f6d3' },
  { id: 'sage', name: 'Sage', value: '#b4ddd3' },
  { id: 'fog', name: 'Fog', value: '#d4e4ed' },
  { id: 'storm', name: 'Storm', value: '#aeccdc' },
];
export const colorValue = (id) => (NOTE_COLORS.find((c) => c.id === id) || NOTE_COLORS[0]).value;
