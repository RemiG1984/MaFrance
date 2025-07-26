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
            const originalQuery = query.toLowerCase();

            // Search with both normalized and original patterns
            const normalizedPattern = `%${normalizedQuery}%`;
            const originalPattern = `%${originalQuery}%`;

            db.all(
                `SELECT DISTINCT commune, COG, population
                 FROM locations 
                 WHERE departement = ? 
                 ORDER BY population DESC`,
                [departement],
                (err, rows) => {
                    if (err) return reject(err);

                    // Filter and rank results with proper accent handling
                    const results = rows
                        .map(row => {
                            const normalizedName = this.normalizeText(row.commune);

                            // Only use normalized comparison for consistent accent handling
                            const normalizedMatches = normalizedName.includes(normalizedQuery);
                            
                            if (!normalizedMatches) {
                                return null; // Filter out non-matches
                            }

                            // Calculate different types of matches for scoring
                            const exactMatch = normalizedName === normalizedQuery;
                            const startsWith = normalizedName.startsWith(normalizedQuery);
                            const distance = this.levenshteinDistance(normalizedQuery, normalizedName);

                            // Calculate relevance score
                            let score = 0;
                            if (exactMatch) score += 1000;
                            if (startsWith) score += 500;
                            score += 100; // Base score for any match
                            score -= distance * 10; // Penalize edit distance
                            score += Math.log(row.population || 1); // Boost by population

                            return {
                                ...row,
                                score,
                                exactMatch,
                                startsWith,
                                distance
                            };
                        })
                        .filter(result => result !== null); // Remove null results

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
     * Get commune suggestions based on partial input
     */
    static getCommuneSuggestions(departement, query, limit = 5) {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT DISTINCT commune, COG, departement
                FROM locations 
                WHERE departement = ?
            `;
            let params = [departement];

            if (query && query.length >= 2) {
                sql += ` AND commune LIKE ?`;
                params.push(`%${query}%`);
            }

            sql += ` ORDER BY commune LIMIT ?`;
            params.push(limit);

            db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Search communes globally (without department filter)
     */
    static async searchCommunesGlobally(query, limit = 15) {
        return new Promise((resolve, reject) => {
            if (!query || query.length < 2) {
                resolve([]);
                return;
            }

            const normalizedQuery = this.normalizeText(query);
            console.log(`Debug: Original query: "${query}", Normalized query: "${normalizedQuery}"`);

            // Get all communes and filter/rank in JavaScript for proper accent handling
            const sql = `
                SELECT DISTINCT commune, COG, departement, population
                FROM locations 
                ORDER BY population DESC
            `;

            db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Filter and rank results with proper accent handling
                const results = rows
                    .map(row => {
                        const normalizedName = this.normalizeText(row.commune);
                        
                        // Debug specific case
                        if (row.commune.toLowerCase().includes('nîmes') || normalizedName.includes('nimes')) {
                            console.log(`Debug: Found "${row.commune}" -> normalized: "${normalizedName}"`);
                        }

                        // Check if normalized query matches normalized name
                        const normalizedMatches = normalizedName.includes(normalizedQuery);
                        
                        if (!normalizedMatches) {
                            return null; // Filter out non-matches
                        }

                        // Calculate different types of matches for scoring
                        const exactMatch = normalizedName === normalizedQuery;
                        const startsWith = normalizedName.startsWith(normalizedQuery);

                        // Calculate relevance score
                        let score = 0;
                        if (exactMatch) score += 1000;
                        if (startsWith) score += 500;
                        score += 100; // Base score for any match
                        score += Math.log(row.population || 1); // Boost by population

                        return {
                            commune: row.commune,
                            COG: row.COG,
                            departement: row.departement,
                            score
                        };
                    })
                    .filter(result => result !== null) // Remove null results
                    .sort((a, b) => b.score - a.score) // Sort by relevance score
                    .slice(0, limit); // Limit results

                console.log(`Debug: Found ${results.length} results for "${query}"`);
                resolve(results);
            });
        });
    }
}

module.exports = SearchService;