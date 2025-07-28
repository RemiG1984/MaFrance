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
     * @returns {Promise<Array>} Array of articles
     */
    async function loadArticles(departement, cog = "", lieu = "") {
        try {
            articleListDiv.parentElement.classList.add('loading-container');
            apiService.showSpinner(articleListDiv.parentElement);

            const params = { dept: departement };
            if (cog) params.cog = cog;
            if (lieu) params.lieu = lieu;

            console.log("Fetching articles with params:", params);
            const articles = await api.getArticles(params);
            console.log("Articles fetched:", articles);
            window.allArticles = articles; // Store globally for access in main.js
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
            apiService.hideSpinner(articleListDiv.parentElement);
        }
    }

    async function loadArticleCounts(departement, cog = "", lieu = "") {
        try {
            const params = { dept: departement };
            if (cog) params.cog = cog;
            if (lieu) params.lieu = lieu;

            console.log("Fetching article counts with params:", params);
            const counts = await api.getArticleCounts(params);
            console.log("Article counts:", counts);
            return counts;
        } catch (error) {
            console.error("Erreur chargement comptes articles:", {
                error: error.message,
                stack: error.stack,
                departement: departement,
                cog: cog,
                lieu: lieu
            });
            return {
                insecurite: 0,
                immigration: 0,
                islamisme: 0,
                defrancisation: 0,
                wokisme: 0,
            };
        }
    }

    function renderArticles(articles, lieu, filter = null) {
        articleListDiv.innerHTML = "";
        let filteredArticles = [...articles];

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
        filterButtonsDiv.innerHTML = "";
        const categories = MetricsConfig.articleCategories.map(category => ({
            name: category.name,
            key: category.key,
            count: counts[category.key] || 0,
        }));

        categories.forEach((category) => {
            const button = document.createElement("button");
            button.className = `filter-button${currentFilter === category.key ? " active" : ""}`;
            button.textContent = `${category.name} (${category.count})`;
            button.dataset.category = category.key;
            button.addEventListener("click", () => {
                currentFilter = category.key;
                renderArticles(window.allArticles, currentLieu, currentFilter);
                document
                    .querySelectorAll(".filter-button")
                    .forEach((btn) => btn.classList.remove("active"));
                button.classList.add("active");
            });
            filterButtonsDiv.appendChild(button);
        });

        const allButton = document.createElement("button");
        allButton.className = `filter-button${currentFilter === null ? " active" : ""}`;
        allButton.textContent = `Tous (${getFilteredArticleCount(window.allArticles, currentLieu)})`;
        allButton.addEventListener("click", () => {
            currentFilter = null;
            renderArticles(window.allArticles, currentLieu);
            document
                .querySelectorAll(".filter-button")
                .forEach((btn) => btn.classList.remove("active"));
            allButton.classList.add("active");
        });
        filterButtonsDiv.appendChild(allButton);
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
        window.allArticles = [];
        currentFilter = null;
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