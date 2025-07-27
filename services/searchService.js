/**
 * Search service for optimized commune searching with fuzzy matching
 */
const db = require('../config/db');

class SearchService {
    /**
     * Normalize text for search by removing accents and converting to lowercase
     */
    static normalizeText(text) {
        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    /**
     * Calculate Levenshtein distance for fuzzy matching
     */
    static levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Search communes with fuzzy matching and ranking
     */
    static searchCommunes(departement, query, limit = 10) {
        return new Promise((resolve, reject) => {
            if (!query || query.length < 2) {
                // For short queries, just return recent or popular communes
                db.all(
                    `SELECT DISTINCT commune, COG 
                     FROM locations 
                     WHERE departement = ? 
                     ORDER BY population DESC 
                     LIMIT ?`,
                    [departement, limit],
                    (err, rows) => {
                        if (err) return reject(err);
                        resolve(rows);
                    }
                );
                return;
            }

            const normalizedQuery = this.normalizeText(query);

            // Use SQL LIKE for initial filtering to leverage indexes
            const likePattern = `%${normalizedQuery}%`;

            db.all(
                `SELECT DISTINCT commune, COG, population
                 FROM locations 
                 WHERE departement = ? 
                 AND (
                     LOWER(commune) LIKE ? 
                     OR commune LIKE ?
                 )
                 ORDER BY population DESC
                 LIMIT ?`,
                [departement, likePattern, `%${query}%`, limit * 3], // Get more results for fuzzy ranking
                (err, rows) => {
                    if (err) return reject(err);

                    // Apply fuzzy matching and ranking
                    const results = rows.map(row => {
                        const normalizedName = this.normalizeText(row.commune);

                        // Calculate different types of matches for scoring
                        const exactMatch = normalizedName === normalizedQuery;
                        const startsWith = normalizedName.startsWith(normalizedQuery);
                        const contains = normalizedName.includes(normalizedQuery);
                        const distance = this.levenshteinDistance(normalizedQuery, normalizedName);

                        // Calculate relevance score
                        let score = 0;
                        if (exactMatch) score += 1000;
                        if (startsWith) score += 500;
                        if (contains) score += 100;
                        score -= distance * 10; // Penalize edit distance
                        score += Math.log(row.population || 1); // Boost by population

                        return {
                            ...row,
                            score,
                            exactMatch,
                            startsWith,
                            distance
                        };
                    });

                    // Sort by relevance score and return top results
                    const sortedResults = results
                        .sort((a, b) => b.score - a.score)
                        .slice(0, limit)
                        .map(({ score, exactMatch, startsWith, distance, ...item }) => item);

                    resolve(sortedResults);
                }
            );
        });
    }

    

    /**
     * Search communes globally (without department filter) with fuzzy matching and ranking
     */
    static async searchCommunesGlobally(query, limit = 15) {
        return new Promise((resolve, reject) => {
            if (!query || query.length < 2) {
                resolve([]);
                return;
            }

            const normalizedQuery = this.normalizeText(query);

            // Use SQL LIKE for initial filtering to leverage indexes
            const likePattern = `%${normalizedQuery}%`;

            const sql = `
                SELECT DISTINCT commune, COG, departement, population
                FROM locations 
                WHERE (
                    LOWER(commune) LIKE ? 
                    OR commune LIKE ?
                )
                ORDER BY population DESC
                LIMIT ?
            `;

            db.all(sql, [likePattern, `%${query}%`, limit * 3], (err, rows) => {
                if (err) return reject(err);

                // Apply fuzzy matching and ranking
                const results = rows.map(row => {
                    const normalizedName = this.normalizeText(row.commune);

                    // Calculate different types of matches for scoring
                    const exactMatch = normalizedName === normalizedQuery;
                    const startsWith = normalizedName.startsWith(normalizedQuery);
                    const contains = normalizedName.includes(normalizedQuery);
                    const distance = this.levenshteinDistance(normalizedQuery, normalizedName);

                    // Calculate relevance score
                    let score = 0;
                    if (exactMatch) score += 1000;
                    if (startsWith) score += 500;
                    if (contains) score += 100;
                    score -= distance * 10; // Penalize edit distance
                    score += Math.log(row.population || 1); // Boost by population

                    return {
                        ...row,
                        score,
                        exactMatch,
                        startsWith,
                        distance
                    };
                });

                // Sort by relevance score and return top results
                const sortedResults = results
                    .sort((a, b) => b.score - a.score)
                    .slice(0, limit)
                    .map(({ score, exactMatch, startsWith, distance, population, ...item }) => item);

                resolve(sortedResults);
            });
        });
    }
}

module.exports = SearchService;