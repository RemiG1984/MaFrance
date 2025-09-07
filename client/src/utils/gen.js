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
 * Extract département code from COG code
 * @param {string} cog - The COG (Code Officiel Géographique) code
 * @returns {string|null} - The département code or null if invalid
 */
export function getDepartementFromCog(cog) {
  if (!cog) return null;
  
  const cogStr = cog.toString();
  
  // Handle special cases for overseas territories (5-digit codes)
  if (cogStr.startsWith('971')) return '971'; // Guadeloupe
  if (cogStr.startsWith('972')) return '972'; // Martinique
  if (cogStr.startsWith('973')) return '973'; // Guyane
  if (cogStr.startsWith('974')) return '974'; // Réunion
  if (cogStr.startsWith('976')) return '976'; // Mayotte
  if (cogStr.startsWith('2A')) return '2A'; // Corse-du-Sud
  if (cogStr.startsWith('2B')) return '2B'; // Haute-Corse
  
  // Metropolitan France
  if (cogStr.length === 4) {
    // 4-character COG: first character is département (needs padding)
    const deptChar = cogStr.substring(0, 1);
    return deptChar.padStart(2, '0');
  } else if (cogStr.length >= 5) {
    // 5-character COG: first 2 digits are département
    return cogStr.substring(0, 2);
  } else if (cogStr.length >= 2) {
    // Fallback: assume first 2 characters
    return cogStr.substring(0, 2);
  }
  
  return null;
}

/**
 * Normalize département code to ensure consistent format
 * @param {string|number} deptCode - The département code to normalize
 * @returns {string} - The normalized département code
 */
export function normalizeDepartementCode(deptCode) {
  if (!deptCode) return '';
  
  const deptStr = deptCode.toString().trim().toUpperCase();
  
  // Handle special cases (Corsica, overseas territories)
  if (['2A', '2B'].includes(deptStr)) return deptStr;
  if (['971', '972', '973', '974', '976'].includes(deptStr)) return deptStr;
  
  // For numeric départements, pad with leading zero if single digit
  if (/^\d+$/.test(deptStr)) {
    return deptStr.padStart(2, '0');
  }
  
  return deptStr;
}
