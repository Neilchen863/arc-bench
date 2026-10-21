export const COLORS = [
  { id: null, name: 'Default', value: 'var(--surface)' },
  { id: 'coral', name: 'Coral', value: '#faafa8' },
  { id: 'peach', name: 'Peach', value: '#f39f76' },
  { id: 'sand', name: 'Sand', value: '#fff8b8' },
  { id: 'mint', name: 'Mint', value: '#e2f6d3' },
  { id: 'sage', name: 'Sage', value: '#b4ddd3' },
  { id: 'fog', name: 'Fog', value: '#d4e4ed' },
  { id: 'dusk', name: 'Dusk', value: '#d3bfdb' },
  { id: 'clay', name: 'Clay', value: '#e9e3d4' },
]
export const colorValue = id => (COLORS.find(c => c.id === id) || COLORS[0]).value
