const ArticleHandler = (function () {
    return function (articleListDiv, filterButtonsDiv) {
        let currentFilter = null;

        async function loadArticles(departement, cog = "", lieu = "") {
            try {
                const url = `/api/articles?dept=${departement}${cog ? `&cog=${encodeURIComponent(cog)}` : ""}${lieu ? `&lieu=${encodeURIComponent(lieu)}` : ""}`;
                console.log("Fetching articles from:", url);
                const response = await fetch(url);
                console.log("Articles response status:", response.status, response.statusText);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("Articles API error response:", errorText);
                    throw new Error(`Erreur ${response.status}: ${response.statusText} - ${errorText}`);
                }
                const articles = await response.json();
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
            }
        }

        async function loadArticleCounts(departement, cog = "", lieu = "") {
            try {
                const url = `/api/articles/counts?dept=${departement}${cog ? `&cog=${encodeURIComponent(cog)}` : ""}${lieu ? `&lieu=${encodeURIComponent(lieu)}` : ""}`;
                console.log("Fetching article counts from:", url);
                const response = await fetch(url);
                console.log("Article counts response status:", response.status, response.statusText);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("Article counts API error response:", errorText);
                    throw new Error(`Erreur ${response.status}: ${response.statusText} - ${errorText}`);
                }
                const counts = await response.json();
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

        function renderFilterButtons(counts, articles, lieu) {
            filterButtonsDiv.innerHTML = "";
            const categories = [
                {
                    name: "Insécurité",
                    key: "insecurite",
                    count: counts.insecurite || 0,
                },
                {
                    name: "Immigration",
                    key: "immigration",
                    count: counts.immigration || 0,
                },
                {
                    name: "Islamisation",
                    key: "islamisme",
                    count: counts.islamisme || 0,
                },
                {
                    name: "Défrancisation",
                    key: "defrancisation",
                    count: counts.defrancisation || 0,
                },
                { name: "Wokisme", key: "wokisme", count: counts.wokisme || 0 },
            ];

            categories.forEach((category) => {
                const button = document.createElement("button");
                button.className = `filter-button${currentFilter === category.key ? " active" : ""}`;
                button.textContent = `${category.name} (${category.count})`;
                button.dataset.category = category.key;
                button.addEventListener("click", () => {
                    currentFilter = category.key;
                    renderArticles(window.allArticles, lieu, currentFilter);
                    document
                        .querySelectorAll(".filter-button")
                        .forEach((btn) => btn.classList.remove("active"));
                    button.classList.add("active");
                });
                filterButtonsDiv.appendChild(button);
            });

            const allButton = document.createElement("button");
            allButton.className = `filter-button${currentFilter === null ? " active" : ""}`;
            allButton.textContent = `Tous (${getFilteredArticleCount(window.allArticles, lieu)})`;
            allButton.addEventListener("click", () => {
                currentFilter = null;
                renderArticles(window.allArticles, lieu);
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
            renderArticles,
            renderFilterButtons,
            clearArticles,
            setFilter,
        };
    };
})();
