export const COLORS = [
  { id: null, name: 'Default', value: '#ffffff' },
  { id: 'red', name: 'Red', value: '#faafa8' },
  { id: 'orange', name: 'Orange', value: '#f39f76' },
  { id: 'yellow', name: 'Yellow', value: '#fff8b8' },
  { id: 'light-green', name: 'Light green', value: '#e2f6d3' },
  { id: 'teal', name: 'Teal', value: '#b4ddd3' },
  { id: 'blue', name: 'Blue', value: '#d4e4ed' },
  { id: 'purple', name: 'Purple', value: '#d3bfdb' },
  { id: 'pink', name: 'Pink', value: '#f6e2dd' },
  { id: 'brown', name: 'Brown', value: '#e9e3d4' },
  { id: 'gray', name: 'Gray', value: '#efeff1' },
];

export function colorValue(id) {
  return (COLORS.find((c) => c.id === id) || COLORS[0]).value;
}
export function colorName(id) {
  return (COLORS.find((c) => c.id === id) || COLORS[0]).name;
}
