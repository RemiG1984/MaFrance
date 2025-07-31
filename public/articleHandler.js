import { MetricsConfig } from './metricsConfig.js';
import { api, apiService } from './apiService.js';

/**
 * Article handler module for managing news articles display and filtering.
 * Handles loading, filtering, and rendering of articles based on location and category.
 * @param {HTMLElement} articleListDiv - Container for displaying article list
 * @param {HTMLElement} filterButtonsDiv - Container for filter buttons
 * @returns {Object} Article handler interface
 */
function ArticleHandler(articleListDiv, filterButtonsDiv) {
    let currentFilter = null;
    let filteredArticles = [];



    /**
     * Loads articles for a specific location.
     * @async
     * @param {string} departement - Department code
     * @param {string} cog - Commune COG code (optional)
     * @param {string} lieu - Specific location (optional)
     * @param {Object} locationHandler - LocationHandler instance for loading lieux
     * @returns {Promise<Array>} Array of articles
     */
    async function loadArticles(departement, cog = "", lieu = "", locationHandler = null) {
        try {
            const params = { dept: departement };
            if (cog) params.cog = cog;
            if (lieu) params.lieu = lieu;

            console.log("Fetching articles with params:", params);
            const articles = await api.getArticles(params);
            console.log("Articles fetched:", articles);

            // Articles are returned and handled by the caller
            // Note: lieux loading is now handled exclusively by locationHandler

            renderArticles(articles, lieu, currentFilter);
            return articles;
        } catch (error) {
            articleListDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
            console.error("Erreur chargement articles:", {
                error: error.message,
                stack: error.stack,
                departement: departement,
                cog: cog,
                lieu: lieu
            });
            return [];
        } finally {
            // Cleanup handled elsewhere
        }
    }

    async function loadArticleCounts(departement, cog = "", lieu = "") {
        console.log("=== loadArticleCounts START ===");
        console.log("Input params:", { departement, cog, lieu });
        
        try {
            const params = { dept: departement };
            if (cog) params.cog = cog;
            if (lieu) params.lieu = lieu;

            console.log("API request params for article counts:", params);
            const counts = await api.getArticleCounts(params);
            console.log("Article counts received:", counts);
            console.log("Article counts type:", typeof counts);
            console.log("Article counts keys:", counts ? Object.keys(counts) : 'no keys - null/undefined');
            console.log("=== loadArticleCounts SUCCESS ===");
            return counts;
        } catch (error) {
            console.error("=== loadArticleCounts ERROR ===");
            console.error("Error details:", {
                error: error.message,
                stack: error.stack,
                departement: departement,
                cog: cog,
                lieu: lieu
            });
            const fallbackCounts = {
                insecurite: 0,
                immigration: 0,
                islamisme: 0,
                defrancisation: 0,
                wokisme: 0,
            };
            console.log("Returning fallback counts:", fallbackCounts);
            return fallbackCounts;
        }
    }

    function renderArticles(articles, lieu, filter = null) {
        articleListDiv.innerHTML = "";
        let filteredArticles = [...articles];

        // Show filters container if articles exist
        const filtersContainer = document.getElementById('articleFilters');

        if (articles && articles.length > 0) {
            filtersContainer.classList.remove('hidden');
        } else {
            filtersContainer.classList.add('hidden');
        }

        if (lieu) {
            filteredArticles = filteredArticles.filter(
                (article) =>
                    article.lieu &&
                    article.lieu
                        .toLowerCase()
                        .split(",")
                        .map((l) => l.trim())
                        .includes(lieu.toLowerCase()),
            );
            console.log("Filtered by lieu:", lieu, filteredArticles);
        }

        if (filter) {
            filteredArticles = filteredArticles.filter((article) => {
                const value = article[filter];
                const result = value === 1 || value === "1";
                console.log(
                    `Checking article ${article.title} for ${filter}: ${value}, result: ${result}`,
                );
                return result;
            });
        }

        if (filteredArticles.length === 0) {
            articleListDiv.innerHTML = "<p>Aucun article trouvé.</p>";
        } else {
            filteredArticles.forEach((article) => {
                const articleItem = document.createElement("div");
                articleItem.className = "article-item";
                articleItem.innerHTML = `
                    <p><strong>${article.date}</strong>${article.lieu ? ` (${article.lieu})` : ""}${article.commune ? ` [${article.commune}]` : ""}: <a href="${article.url}" target="_blank">${article.title}</a></p>
                `;
                articleListDiv.appendChild(articleItem);
            });
        }
    }

    /**
     * Renders filter buttons based on article counts.
     * @param {Object} counts - Article counts by category
     * @param {Array} allArticles - All available articles
     * @param {string} currentLieu - Currently selected location
     */
    function renderFilterButtons(counts, allArticles, currentLieu) {
        console.log("=== renderFilterButtons START ===");
        console.log("Input parameters:", { 
            counts, 
            countsType: typeof counts,
            countsKeys: counts ? Object.keys(counts) : 'null/undefined',
            articlesLength: allArticles?.length, 
            articlesType: typeof allArticles,
            currentLieu,
            currentLieuType: typeof currentLieu
        });
        
        // Check DOM elements with retries if needed
        const lieuxSelect = document.getElementById('lieuxSelect');
        const communeInput = document.getElementById('communeInput');
        const filtersContainer = document.getElementById('articleFilters');
        
        console.log("DOM elements check:", {
            filterButtonsDiv: filterButtonsDiv ? 'found' : 'NOT FOUND',
            lieuxSelect: lieuxSelect ? 'found' : 'NOT FOUND',
            communeInput: communeInput ? 'found' : 'NOT FOUND',
            filtersContainer: filtersContainer ? 'found' : 'NOT FOUND',
            communeInputValue: communeInput ? communeInput.value : 'N/A'
        });
        
        filterButtonsDiv.innerHTML = "";

        // Show lieuxSelect if we're at commune level (commune input has value)
        const isAtCommuneLevel = communeInput && communeInput.value.trim() !== '';
        console.log("Commune level detection:", {
            isAtCommuneLevel,
            communeInputExists: !!communeInput,
            communeInputValue: communeInput ? `"${communeInput.value}"` : 'N/A',
            communeInputTrimmed: communeInput ? `"${communeInput.value.trim()}"` : 'N/A'
        });

        if (lieuxSelect) {
            console.log("Processing lieuxSelect visibility...");
            if (isAtCommuneLevel) {
                lieuxSelect.style.display = 'block';
                lieuxSelect.disabled = false;
                console.log("✓ Showing lieux selector at commune level");
                console.log("LieuxSelect current options count:", lieuxSelect.options.length);
                console.log("LieuxSelect innerHTML length:", lieuxSelect.innerHTML.length);
                
                // Preserve existing options - don't clear if they're already loaded
                if (lieuxSelect.options.length <= 1) {
                    console.log("⚠️ LieuxSelect has no options loaded yet - this may be a timing issue");
                }
            } else {
                lieuxSelect.style.display = 'none';
                lieuxSelect.disabled = true;
                console.log("✗ Hiding lieux selector - not at commune level");
            }
        } else {
            console.error("⚠️ lieuxSelect element not found!");
        }

        // Ensure we have valid counts and articles
        if (!counts) {
            console.warn("⚠️ No counts provided to renderFilterButtons - using empty object");
            counts = {};
        }
        if (!allArticles) {
            console.warn("⚠️ No articles provided to renderFilterButtons - using empty array");
            allArticles = [];
        }

        console.log("Data validation after fallbacks:", {
            countsAfterFallback: counts,
            articlesAfterFallback: allArticles?.length || 0
        });

        // Check if MetricsConfig is available
        if (!MetricsConfig || !MetricsConfig.articleCategories) {
            console.error("⚠️ MetricsConfig or articleCategories not available!");
            return;
        }

        console.log("MetricsConfig.articleCategories:", MetricsConfig.articleCategories);

        const categories = MetricsConfig.articleCategories.map(category => ({
            name: category.name,
            key: category.key,
            count: counts[category.key] || 0,
        }));

        console.log("Mapped categories for filter buttons:", categories);

        console.log("Starting filter button creation...");
        categories.forEach((category, index) => {
            console.log(`Creating button ${index + 1}/${categories.length} for category:`, category);
            const button = document.createElement("button");
            button.className = `filter-button${currentFilter === category.key ? " active" : ""}`;
            button.textContent = `${category.name} (${category.count})`;
            button.dataset.category = category.key;
            button.addEventListener("click", () => {
                console.log(`Filter button clicked: ${category.key}`);
                currentFilter = category.key;
                renderArticles(allArticles, currentLieu, currentFilter);
                document
                    .querySelectorAll(".filter-button")
                    .forEach((btn) => btn.classList.remove("active"));
                button.classList.add("active");
            });
            filterButtonsDiv.appendChild(button);
            console.log(`✓ Button created and appended for: ${category.key}`);
        });

        console.log("Creating 'All' button...");
        const allCount = getFilteredArticleCount(allArticles, currentLieu);
        console.log("All articles count:", allCount);
        
        const allButton = document.createElement("button");
        allButton.className = `filter-button${currentFilter === null ? " active" : ""}`;
        allButton.textContent = `Tous (${allCount})`;
        allButton.addEventListener("click", () => {
            console.log("'All' filter button clicked");
            currentFilter = null;
            renderArticles(allArticles, currentLieu);
            document
                .querySelectorAll(".filter-button")
                .forEach((btn) => btn.classList.remove("active"));
            allButton.classList.add("active");
        });
        filterButtonsDiv.appendChild(allButton);
        console.log("✓ 'All' button created and appended");
        
        console.log("=== renderFilterButtons COMPLETE ===");
        console.log("Final state:", {
            totalButtons: filterButtonsDiv.children.length,
            filterButtonsDivHTML: filterButtonsDiv.innerHTML.length > 0 ? 'has content' : 'EMPTY',
            lieuxSelectVisible: lieuxSelect ? (lieuxSelect.style.display !== 'none') : false,
            lieuxSelectDisabled: lieuxSelect ? lieuxSelect.disabled : 'N/A'
        });
    }

    function getFilteredArticleCount(articles, lieu) {
        let filteredArticles = articles;
        if (lieu) {
            filteredArticles = filteredArticles.filter(
                (article) =>
                    article.lieu &&
                    article.lieu
                        .toLowerCase()
                        .split(",")
                        .map((l) => l.trim())
                        .includes(lieu.toLowerCase()),
            );
        }
        return filteredArticles.length;
    }

    function clearArticles() {
        articleListDiv.innerHTML = "";
        filterButtonsDiv.innerHTML = "";
        currentFilter = null;

        // Hide the filters container and lieu selector
        const filtersContainer = document.getElementById('articleFilters');
        const lieuxSelect = document.getElementById('lieuxSelect');

        if (filtersContainer) {
            filtersContainer.classList.add('hidden');
        }

        if (lieuxSelect) {
            lieuxSelect.innerHTML = '<option value="">-- Tous les lieux --</option>';
            lieuxSelect.disabled = true;
            lieuxSelect.style.display = 'none';
        }
    }

    function setFilter(filter) {
        currentFilter = filter;
    }

    return {
        loadArticles,
        loadArticleCounts,
        renderFilterButtons,
        clearArticles,
        setFilter,
    };
}

// Export for ES6 modules
export { ArticleHandler };