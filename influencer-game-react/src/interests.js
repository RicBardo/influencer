// Canonical interests array for Influencer game
export const interests = [
  { name: 'fashion', icon: '👗', color: '#e040fb' }, // fuchsia
  { name: 'tourism', icon: '🌍', color: '#40c4ff' }, // blue
  { name: 'food', icon: '🍔', color: '#ffa726' }, // orange
  { name: 'fitness', icon: '🏋️', color: '#66bb6a' }, // green
  { name: 'music', icon: '🎵', color: '#7e57c2' }, // purple
  { name: 'gaming', icon: '🎮', color: '#ff7043' } // red-orange
];

export function getInterestData(interestName) {
  return interests.find(i => i.name === interestName) || { icon: '', color: '#ccc', name: interestName };
} 