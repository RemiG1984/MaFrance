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

/**
 * Serialize stats data into a structured format with labels and data arrays
 * @param {Array} data - Array of data objects with year and metric properties
 * @returns {Object} - Object with labels array and data object containing metric arrays
 */
export function serializeStats(data) {
  // 1. Récupération de toutes les années et de toutes les clés d'indicateurs disponibles
  const allYears = new Set();
  const allKeys = new Set();

  if (data.length === 0)
    return {
      labels: [],
      data: {},
    };

  const yearKey = data[0].hasOwnProperty("annee") ? "annee" : "annais";

  // ensure years order
  data.sort((a, b) => {
    a[yearKey] - b[yearKey];
  });

  data.forEach((entry) => {
    Object.keys(entry).forEach((key) => {
      if (key === yearKey) {
        allYears.add(entry[yearKey]);
      } else if (key !== "COG" && key !== "dep" && key !== "country") {
        allKeys.add(key);
      }
    });
  });

  const labels = Array.from(allYears);

  // 2. Construction de la structure de données
  const result = {};

  for (const key of allKeys) {
    result[key] = {};

    // Création d'un map année -> valeur pour ce niveau et cette clé
    const dataMap = {};
    data.forEach((entry) => {
      if (entry[yearKey] && entry[key] !== undefined) {
        const year = entry[yearKey];
        dataMap[year] = entry[key];
      }
    });

    // Création du tableau avec null pour les années manquantes
    result[key] = labels.map((year) => dataMap[year] ?? null);
  }

  return {
    labels,
    data: result,
  };
}

/**
 * Aggregate stats using calculated metrics formulas
 * @param {Object} data - Data object with metric arrays
 * @param {Object} calculatedMetrics - Object containing metric calculation definitions
 * @returns {Object} - Object with aggregated metric arrays
 */
export function aggregateStats(data, calculatedMetrics) {
  // crée des stats "composites" en utilisant les formules de calculatedMetrics
  const result = {};

  // Pour chaque métrique calculée définie dans calculatedMetrics
  Object.keys(calculatedMetrics).forEach((metricKey) => {
    const calculation = calculatedMetrics[metricKey];

    // Vérifier que tous les composants nécessaires sont disponibles
    const inputSeries = calculation.components
      .map((key) => data[key])
      .filter((serie) => serie); // Filtrer les séries undefined/null

    if (inputSeries.length === 0) return;

    const seriesLength = inputSeries[0].length;

    // Calculer la métrique pour chaque entrée/level en utilisant la formule
    result[metricKey] = [];

    for (let i = 0; i < seriesLength; i++) {
      // Créer un objet de données pour cette année/période
      const dataPoint = {};
      calculation.components.forEach((key) => {
        dataPoint[key] = data[key] ? data[key][i] || 0 : 0;
      });

      // Appliquer la formule
      const calculatedValue = calculation.formula(dataPoint);
      result[metricKey].push(calculatedValue);
    }
  });

  return result;
}

