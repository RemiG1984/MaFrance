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

/**
 * Extract department code from COG (Code Officiel Géographique)
 * @param {string} cog - 5-digit INSEE code
 * @returns {string} Department code (2 digits or 2A/2B for Corsica)
 */
export function getDepartmentFromCOG(cog) {
  if (!cog || cog.length !== 5) return '';

  const firstTwo = cog.substring(0, 2);

  // Special case for Corsica
  if (firstTwo === '20') {
    const thirdDigit = cog.charAt(2);
    return thirdDigit === '1' ? '2A' : '2B';
  }

  return firstTwo;
}