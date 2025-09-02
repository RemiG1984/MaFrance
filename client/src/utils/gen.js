export function dedupeArrByKey(arr, key) {
  const map = new Map();
  return arr.filter(obj => {
    const value = obj[key]
    if (map.has(value)) {
      return false
    }
    map.set(value, true)
    return true
  })
}
export function arrGetLast(arr) {
  if(arr.length === 0) return null
  return arr[arr.length-1]
}
export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  const num = parseFloat(value);
  return num.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}
