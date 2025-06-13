const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const basicAuth = require("express-basic-auth");
const app = express();
const port = process.env.PORT || 3000;
const fs = require("fs");

// Initialize SQLite database connection to '.data/france.db'
const db = new sqlite3.Database(".data/france.db");

// Load environment variables
const authSecret = process.env.AUTH_SECRET;
const authPassword = "betapass" + authSecret;

// Add basic authentication for beta testing
app.use(
    basicAuth({
        users: { betauser: authPassword },
        challenge: true,
        realm: "BetaTest",
    }),
);

// Parse URL-encoded form data for feedback form
app.use(express.urlencoded({ extended: true }));

// Configure Express to serve static files from the 'public' directory
app.use(
    express.static(path.join(__dirname, "public"), {
        setHeaders: (res, path) => {
            if (path.endsWith(".html")) {
                res.setHeader("Content-Type", "text/html; charset=utf-8");
            } else if (path.endsWith(".css")) {
                res.setHeader("Content-Type", "text/css; charset=utf-8");
            } else if (path.endsWith(".js")) {
                res.setHeader(
                    "Content-Type",
                    "application/javascript; charset=utf-8",
                );
            }
        },
    }),
);

// Route: GET /
app.get("/", (req, res) => {
    console.log("Serving index.html");
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Route: POST /feedback
app.post("/submit_feedback", (req, res) => {
    const feedback = req.body.feedback;
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp}: ${feedback}\n`;
    console.log("Feedback received:", feedback);
    const filePath = path.join(__dirname, "feedback.txt");
    console.log("Attempting to write to:", filePath);
    fs.appendFile(filePath, logEntry, (err) => {
        if (err) {
            console.error("Erreur écriture feedback:", err.message, err.code);
            return res
                .status(500)
                .send("Erreur lors de l'enregistrement du feedback");
        }
        console.log("Feedback successfully written to:", filePath);
        fs.access(filePath, fs.constants.F_OK, (accessErr) => {
            if (accessErr) {
                console.error(
                    "Feedback file not found after write:",
                    accessErr.message,
                );
            } else {
                console.log("Feedback file confirmed to exist:", filePath);
            }
        });
        res.send("Merci pour votre feedback !");
    });
});

// Route: GET /feedback_content
app.get("/feedback_content", (req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    fs.readFile(path.join(__dirname, "feedback.txt"), "utf8", (err, data) => {
        if (err) {
            if (err.code === "ENOENT") {
                return res.send("Aucun commentaire trouvé.");
            }
            console.error("Erreur lecture feedback.txt:", err.message);
            return res
                .status(500)
                .send("Erreur lors de la lecture des commentaires");
        }
        res.send(data);
    });
});

// Route: GET /country_details
app.get("/country_details", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    console.log("Fetching country_details");
    db.get(
        "SELECT country, population, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k FROM country WHERE country = ?",
        ["France"],
        (err, row) => {
            if (err) {
                console.error(
                    "Database error in /country_details:",
                    err.message,
                );
                return res.status(500).json({
                    error: "Erreur lors de la requête à la base de données",
                    details: err.message,
                });
            }
            if (!row) {
                console.log(
                    'No country found in /country_details for country = "France"',
                );
                return res.status(404).json({ error: "Pays non trouvé" });
            }
            console.log("Country data:", row);
            res.json(row);
        },
    );
});

// Route: GET /country_names
app.get("/country_names", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    console.log("Fetching country_names for latest year");
    db.get(
        `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
         FROM country_names 
         WHERE UPPER(country) = ? AND annais = (SELECT MAX(annais) FROM country_names WHERE UPPER(country) = ?)`,
        ["FRANCE", "FRANCE"],
        (err, row) => {
            if (err) {
                console.error("Database error in /country_names:", err.message);
                return res.status(500).json({
                    error: "Erreur lors de la requête à la base de données",
                    details: err.message,
                });
            }
            if (!row) {
                console.log(
                    'No name data found in /country_names for country = "France" and latest year',
                );
                return res.status(404).json({
                    error: "Données de prénoms non trouvées pour la dernière année",
                });
            }
            console.log("Country names data for year", row.annais, ":", row);
            res.json(row);
        },
    );
});

// Route: GET /country_names_history
app.get("/country_names_history", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const country = req.query.country || "France";
    console.log("Fetching country_names_history for country:", country);
    db.all(
        `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct, annais
         FROM country_names 
         WHERE UPPER(country) = ? 
         ORDER BY annais ASC`,
        [country.toUpperCase()],
        (err, rows) => {
            if (err) {
                console.error(
                    "Database error in /country_names_history:",
                    err.message,
                );
                return res.status(500).json({
                    error: "Erreur lors de la requête à la base de données",
                    details: err.message,
                });
            }
            console.log("Country names history data:", rows.length, "rows");
            res.json(rows);
        },
    );
});

// Route: GET /country_crime
app.get("/country_crime", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    console.log("Fetching country_crime for latest year");
    db.get(
        `SELECT * 
         FROM country_crime 
         WHERE UPPER(country) = ? AND annee = (SELECT MAX(annee) FROM country_crime WHERE UPPER(country) = ?)`,
        ["FRANCE", "FRANCE"],
        (err, row) => {
            if (err) {
                console.error("Database error in /country_crime:", err.message);
                return res.status(500).json({
                    error: "Erreur lors de la requête à la base de données",
                    details: err.message,
                });
            }
            if (!row) {
                console.log(
                    'No crime data found in /country_crime for country = "France" and latest year',
                );
                return res.status(404).json({
                    error: "Données criminelles non trouvées pour la dernière année",
                });
            }
            console.log("Country crime data for year", row.annee, ":", row);
            res.json(row);
        },
    );
});

// Route: GET /departements
app.get("/departements", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    console.log("Fetching departements");
    db.all("SELECT DISTINCT departement FROM departements", [], (err, rows) => {
        if (err) {
            console.error("Database error in /departements:", err.message);
            return res.status(500).json({
                error: "Erreur lors de la requête à la base de données",
                details: err.message,
            });
        }
        console.log("Departements found:", rows.length);
        rows.sort((a, b) => {
            const deptA = a.departement.padStart(3, "0");
            const deptB = b.departement.padStart(3, "0");
            return deptA.localeCompare(deptB);
        });
        res.json(rows);
    });
});

// Route: GET /departement_details
app.get("/departement_details", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const departement = req.query.dept || "";
    console.log("Fetching departement_details for:", departement);
    if (!departement) {
        return res.status(400).json({ error: "Département requis" });
    }
    db.get(
        "SELECT departement, population, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k FROM departements WHERE departement = ?",
        [departement],
        (err, row) => {
            if (err) {
                console.error(
                    "Database error in /departement_details:",
                    err.message,
                );
                return res.status(500).json({
                    error: "Erreur lors de la requête à la base de données",
                    details: err.message,
                });
            }
            if (!row) {
                console.log(
                    "No departement found in /departement_details for departement =",
                    departement,
                );
                return res
                    .status(404)
                    .json({ error: "Département non trouvé" });
            }
            if (
                !/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(departement)
            ) {
                return res
                    .status(400)
                    .json({ error: "Code département invalide" });
            }
            console.log("Departement data:", row);
            res.json(row);
        },
    );
});

// Route: GET /department_names
app.get("/department_names", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const departement = req.query.dept || "";
    console.log(
        "Fetching department_names for dept:",
        departement,
        "and latest year",
    );
    if (!departement) {
        return res.status(400).json({ error: "Département requis" });
    }
    db.get(
        `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
         FROM department_names 
         WHERE dpt = ? AND annais = (SELECT MAX(annais) FROM department_names WHERE dpt = ?)`,
        [departement, departement],
        (err, row) => {
            console.log(`Query result for dpt=${departement}:`, row);
            if (err) {
                console.error(
                    "Database error in /department_names:",
                    err.message,
                );
                return res.status(500).json({
                    error: "Erreur lors de la requête à la base de données",
                    details: err.message,
                });
            }
            if (!row) {
                db.all(
                    `SELECT DISTINCT annais FROM department_names WHERE dpt = ?`,
                    [departement],
                    (err, years) => {
                        console.log(
                            `Available years for dpt=${departement}:`,
                            years,
                        );
                    },
                );
                console.log(
                    `No name data found in /department_names for dpt = ${departement} and latest year`,
                );
                return res.status(404).json({
                    error: "Données de prénoms non trouvées pour la dernière année",
                });
            }
            console.log("Department names data for year", row.annais, ":", row);
            res.json(row);
        },
    );
});

// Route: GET /department_names_history
app.get("/department_names_history", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const departement = req.query.dept || "";
    console.log("Fetching department_names_history for dept:", departement);
    if (!departement) {
        return res.status(400).json({ error: "Département requis" });
    }
    db.all(
        `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct, annais
         FROM department_names 
         WHERE dpt = ? 
         ORDER BY annais ASC`,
        [departement],
        (err, rows) => {
            if (err) {
                console.error(
                    "Database error in /department_names_history:",
                    err.message,
                );
                return res.status(500).json({
                    error: "Erreur lors de la requête à la base de données",
                    details: err.message,
                });
            }
            console.log("Department names history data:", rows.length, "rows");
            res.json(rows);
        },
    );
});

// Route: GET /department_crime
app.get("/department_crime", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const departement = req.query.dept || "";
    console.log(
        "Fetching department_crime for dept:",
        departement,
        "and latest year",
    );
    if (!departement) {
        return res.status(400).json({ error: "Département requis" });
    }
    db.get(
        `SELECT * 
         FROM department_crime 
         WHERE dep = ? AND annee = (SELECT MAX(annee) FROM department_crime WHERE dep = ?)`,
        [departement, departement],
        (err, row) => {
            if (err) {
                console.error(
                    "Database error in /department_crime:",
                    err.message,
                );
                return res.status(500).json({
                    error: "Erreur lors de la requête à la base de données",
                    details: err.message,
                });
            }
            if (!row) {
                console.log(
                    `No crime data found in /department_crime for dep = ${departement} and latest year`,
                );
                return res.status(404).json({
                    error: "Données criminelles non trouvées pour la dernière année",
                });
            }
            console.log("Department crime data for year", row.annee, ":", row);
            res.json(row);
        },
    );
});

// Route: GET /communes
app.get("/communes", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const departement = req.query.dept || "";
    const query = req.query.q || "";
    console.log("Fetching communes for dept:", departement, "query:", query);
    if (!departement) {
        return res.status(400).json({ error: "Département requis" });
    }

    if (!query || query.length < 2) {
        db.all(
            `SELECT DISTINCT commune, COG 
             FROM locations 
             WHERE departement = ? 
             ORDER BY commune ASC 
             LIMIT 10`,
            [departement],
            (err, rows) => {
                if (err) {
                    console.error("Database error in /communes:", err.message);
                    return res.status(500).json({
                        error: "Erreur lors de la requête à la base de données",
                        details: err.message,
                    });
                }
                console.log("Communes found:", rows.length);
                res.json(rows);
            },
        );
        return;
    }

    const normalizedQuery = query
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    db.all(
        `SELECT DISTINCT commune, COG 
         FROM locations 
         WHERE departement = ?`,
        [departement],
        (err, rows) => {
            if (err) {
                console.error("Database error in /communes:", err.message);
                return res.status(500).json({
                    error: "Erreur lors de la requête à la base de données",
                    details: err.message,
                });
            }

            const filteredCommunes = rows.filter((row) => {
                const normalizedCommune = row.commune
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
                return normalizedCommune.includes(normalizedQuery);
            });

            filteredCommunes.sort((a, b) => {
                const normA = a.commune
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
                const normB = b.commune
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
                const aStartsWith = normA.startsWith(normalizedQuery) ? -1 : 0;
                const bStartsWith = normB.startsWith(normalizedQuery) ? -1 : 0;
                if (aStartsWith !== bStartsWith) {
                    return aStartsWith - bStartsWith;
                }
                return a.commune.localeCompare(b.commune);
            });

            console.log("Communes found:", filteredCommunes.length);
            res.json(filteredCommunes.slice(0, 5));
        },
    );
});

// Route: GET /commune_names
app.get("/commune_names", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const departement = req.query.dept || "";
    const cog = req.query.cog || "";
    console.log(
        "Fetching commune_names for dept:",
        departement,
        "COG:",
        cog,
        "and latest year",
    );
    if (!departement || !cog) {
        return res.status(400).json({ error: "Département et COG requis" });
    }
    db.get(
        `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
         FROM commune_names 
         WHERE COG = ? AND annais = (SELECT MAX(annais) FROM commune_names WHERE COG = ?)`,
        [cog, cog],
        (err, row) => {
            if (err) {
                console.error("Database error in /commune_names:", err.message);
                return res.status(500).json({
                    error: "Erreur lors de la requête à la base de données",
                    details: err.message,
                });
            }
            if (!row) {
                console.log(
                    `No name data found in /commune_names for COG = ${cog} and latest year`,
                );
                return res.status(404).json({
                    error: "Données de prénoms non trouvées pour la dernière année",
                });
            }
            console.log("Commune names data for year", row.annais, ":", row);
            res.json(row);
        },
    );
});

// Route: GET /commune_names_history
app.get("/commune_names_history", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const departement = req.query.dept || "";
    const cog = req.query.cog || "";
    console.log(
        "Fetching commune_names_history for dept:",
        departement,
        "COG:",
        cog,
    );
    if (!departement || !cog) {
        return res.status(400).json({ error: "Département et COG requis" });
    }
    db.all(
        `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct, annais
         FROM commune_names 
         WHERE COG = ? 
         ORDER BY annais ASC`,
        [cog],
        (err, rows) => {
            if (err) {
                console.error(
                    "Database error in /commune_names_history:",
                    err.message,
                );
                return res.status(500).json({
                    error: "Erreur lors de la requête à la base de données",
                    details: err.message,
                });
            }
            console.log("Commune names history data:", rows.length, "rows");
            res.json(rows);
        },
    );
});

// Route: GET /commune_crime
app.get("/commune_crime", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const departement = req.query.dept || "";
    const cog = req.query.cog || "";
    console.log(
        "Fetching commune_crime for dept:",
        departement,
        "COG:",
        cog,
        "and latest year",
    );
    if (!departement || !cog) {
        return res.status(400).json({ error: "Département et COG requis" });
    }
    db.get(
        `SELECT * 
         FROM commune_crime 
         WHERE COG = ? AND annee = (SELECT MAX(annee) FROM commune_crime WHERE COG = ?)`,
        [cog, cog],
        (err, row) => {
            if (err) {
                console.error("Database error in /commune_crime:", err.message);
                return res.status(500).json({
                    error: "Erreur lors de la requête à la base de données",
                    details: err.message,
                });
            }
            if (!row) {
                console.log(
                    `No crime data found in /commune_crime for COG = ${cog} and latest year`,
                );
                return res.status(404).json({
                    error: "Données criminelles non trouvées pour la dernière année",
                });
            }
            console.log("Commune crime data for year", row.annee, ":", row);
            res.json(row);
        },
    );
});

// Route: GET /country_crime_history
app.get("/country_crime_history", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const country = req.query.country || "France";
    console.log("Fetching country_crime_history for country:", country);
    db.all(
        `SELECT *
         FROM country_crime 
         WHERE UPPER(country) = ? 
         ORDER BY annee ASC`,
        [country.toUpperCase()],
        (err, rows) => {
            if (err) {
                console.error(
                    "Database error in /country_crime_history:",
                    err.message,
                );
                return res.status(500).json({
                    error: "Erreur lors de la requête à la base de données",
                    details: err.message,
                });
            }
            console.log("Country crime history data:", rows.length, "rows");
            res.json(rows);
        },
    );
});

// Route: GET /department_crime_history
app.get("/department_crime_history", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const departement = req.query.dept || "";
    console.log("Fetching department_crime_history for dept:", departement);
    if (!departement) {
        return res.status(400).json({ error: "Département requis" });
    }
    db.all(
        `SELECT *
         FROM department_crime 
         WHERE dep = ? 
         ORDER BY annee ASC`,
        [departement],
        (err, rows) => {
            if (err) {
                console.error(
                    "Database error in /department_crime_history:",
                    err.message,
                );
                return res.status(500).json({
                    error: "Erreur lors de la requête à la base de données",
                    details: err.message,
                });
            }
            console.log("Department crime history data:", rows.length, "rows");
            res.json(rows);
        },
    );
});

// Route: GET /commune_crime_history
app.get("/commune_crime_history", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const departement = req.query.dept || "";
    const cog = req.query.cog || "";
    console.log(
        "Fetching commune_crime_history for dept:",
        departement,
        "COG:",
        cog,
    );
    if (!departement || !cog) {
        return res.status(400).json({ error: "Département et COG requis" });
    }
    db.all(
        `SELECT *
         FROM commune_crime 
         WHERE COG = ? 
         ORDER BY annee ASC`,
        [cog],
        (err, rows) => {
            if (err) {
                console.error(
                    "Database error in /commune_crime_history:",
                    err.message,
                );
                return res.status(500).json({
                    error: "Erreur lors de la requête à la base de données",
                    details: err.message,
                });
            }
            console.log("Commune crime history data:", rows.length, "rows");
            res.json(rows);
        },
    );
});

// Route: GET /lieux
app.get("/lieux", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const departement = req.query.dept || "";
    const cog = req.query.cog || "";
    console.log("Fetching lieux for dept:", departement, "COG:", cog);
    if (!departement || !cog) {
        return res.status(400).json({ error: "Département et COG requis" });
    }
    db.all(
        `SELECT DISTINCT lieu 
         FROM articles 
         WHERE departement = ? AND COG = ? AND lieu IS NOT NULL 
         AND (insecurite = 1 OR immigration = 1 OR islamisme = 1 OR defrancisation = 1 OR wokisme = 1)`,
        [departement, cog],
        (err, rows) => {
            if (err) {
                console.error("Database error in /lieux:", err.message);
                return res.status(500).json({
                    error: "Erreur lors de la requête à la base de données",
                    details: err.message,
                });
            }
            console.log("Lieux found:", rows.length);
            const lieuxSet = new Set();
            rows.forEach((row) => {
                if (row.lieu) {
                    row.lieu
                        .split(",")
                        .forEach((lieu) => lieuxSet.add(lieu.trim()));
                }
            });
            const lieux = Array.from(lieuxSet).sort();
            res.json(lieux.map((lieu) => ({ lieu })));
        },
    );
});

// Route: GET /search
app.get("/search", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const departement = req.query.dept || "";
    const query = req.query.q || "";
    console.log("Fetching search for dept:", departement, "query:", query);
    if (!departement) {
        db.all(
            "SELECT COG, departement, commune, population, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k FROM locations WHERE departement LIKE ? OR commune LIKE ? LIMIT 50",
            [`%${query}%`, `%${query}%`],
            (err, rows) => {
                if (err) {
                    console.error("Database error in /search:", err.message);
                    return res.status(500).json({
                        error: "Erreur lors de la requête à la base de données",
                        details: err.message,
                    });
                }
                console.log("Search results:", rows.length);
                res.json(rows);
            },
        );
    } else {
        db.all(
            "SELECT COG, departement, commune, population, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k FROM locations WHERE departement = ? AND commune = ? LIMIT 1",
            [departement, query],
            (err, rows) => {
                if (err) {
                    console.error("Database error in /search:", err.message);
                    return res.status(500).json({
                        error: "Erreur lors de la requête à la base de données",
                        details: err.message,
                    });
                }
                console.log("Search results:", rows.length);
                res.json(rows);
            },
        );
    }
});

// Route: GET /articles
app.get("/articles", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const departement = req.query.dept || "";
    const cog = req.query.cog || "";
    const lieu = req.query.lieu || "";
    console.log(
        "Fetching articles for dept:",
        departement,
        "COG:",
        cog,
        "lieu:",
        lieu,
    );
    if (!departement) {
        return res.status(400).json({ error: "Département requis" });
    }
    let sql, params;
    if (cog) {
        sql =
            "SELECT date, title, url, lieu, commune, insecurite, immigration, islamisme, defrancisation, wokisme FROM articles WHERE departement = ? AND COG = ? AND (insecurite = 1 OR immigration = 1 OR islamisme = 1 OR defrancisation = 1 OR wokisme = 1)";
        params = [departement, cog];
    } else {
        sql =
            "SELECT date, title, url, lieu, commune, insecurite, immigration, islamisme, defrancisation, wokisme FROM articles WHERE departement = ? AND (insecurite = 1 OR immigration = 1 OR islamisme = 1 OR defrancisation = 1 OR wokisme = 1)";
        params = [departement];
    }
    if (lieu) {
        sql += " AND lieu LIKE ?";
        params.push(`%${lieu}%`);
    }
    sql += " ORDER BY date DESC";
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error("Database error in /articles:", err.message);
            return res.status(500).json({
                error: "Erreur lors de la requête à la base de données",
                details: err.message,
            });
        }
        console.log("Articles found:", rows.length);
        res.json(rows);
    });
});

// Route: GET /departement_details_all
app.get("/departements_details_all", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const limit = parseInt(req.query.limit) || 101;
    const offset = parseInt(req.query.offset) || 0;
    const sort = req.query.sort || "insecurite_score";
    const direction = req.query.direction || "DESC";
    console.log(
        "Fetching departements_details_all with limit:",
        limit,
        "offset:",
        offset,
        "sort:",
        sort,
        "direction:",
        direction,
    );

    // Validate sort parameter to prevent SQL injection
    const validSortColumns = [
        "insecurite_score",
        "immigration_score",
        "islamisation_score",
        "defrancisation_score",
        "wokisme_score",
        "number_of_mosques",
        "mosque_p100k",
        "musulman_pct",
        "africain_pct",
        "asiatique_pct",
        "traditionnel_pct",
        "moderne_pct",
        "homicides_p100k",
        "violences_physiques_p1k",
        "violences_sexuelles_p1k",
        "vols_p1k",
        "destructions_p1k",
        "stupefiants_p1k",
        "escroqueries_p1k",
        "extra_europeen_pct",
        "prenom_francais_pct",
    ];
    const sortColumn = validSortColumns.includes(sort)
        ? sort
        : "insecurite_score";
    const sortDirection = direction === "ASC" ? "ASC" : "DESC";

    let sql = `
        WITH LatestDepartmentNames AS (
            SELECT dpt, musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
            FROM department_names dn
            WHERE dn.annais = (SELECT MAX(annais) FROM department_names WHERE dpt = dn.dpt)
            GROUP BY dpt
        )
        SELECT 
            d.departement, d.population, d.insecurite_score, 
            d.immigration_score, d.islamisation_score, d.defrancisation_score, 
            d.wokisme_score, d.number_of_mosques, d.mosque_p100k,
            dn.musulman_pct, dn.africain_pct, dn.asiatique_pct, dn.traditionnel_pct, 
            dn.moderne_pct, dn.annais,
            (COALESCE(dc.homicides_p100k, 0) + COALESCE(dc.tentatives_homicides_p100k, 0)) AS homicides_p100k,
            (COALESCE(dc.coups_et_blessures_volontaires_p1k, 0) + 
             COALESCE(dc.coups_et_blessures_volontaires_intrafamiliaux_p1k, 0) + 
             COALESCE(dc.autres_coups_et_blessures_volontaires_p1k, 0) + 
             COALESCE(dc.vols_avec_armes_p1k, 0) + 
             COALESCE(dc.vols_violents_sans_arme_p1k, 0)) AS violences_physiques_p1k,
            COALESCE(dc.violences_sexuelles_p1k, 0) AS violences_sexuelles_p1k,
            (COALESCE(dc.vols_avec_armes_p1k, 0) + 
             COALESCE(dc.vols_violents_sans_arme_p1k, 0) + 
             COALESCE(dc.vols_sans_violence_contre_des_personnes_p1k, 0) + 
             COALESCE(dc.cambriolages_de_logement_p1k, 0) + 
             COALESCE(dc.vols_de_vehicules_p1k, 0) + 
             COALESCE(dc.vols_dans_les_vehicules_p1k, 0) + 
             COALESCE(dc.vols_d_accessoires_sur_vehicules_p1k, 0)) AS vols_p1k,
            COALESCE(dc.destructions_et_degradations_volontaires_p1k, 0) AS destructions_p1k,
            (COALESCE(dc.usage_de_stupefiants_p1k, 0) + 
             COALESCE(dc.usage_de_stupefiants_afd_p1k, 0) + 
             COALESCE(dc.trafic_de_stupefiants_p1k, 0)) AS stupefiants_p1k,
            COALESCE(dc.escroqueries_p1k, 0) AS escroqueries_p1k,
            ROUND(COALESCE(dn.musulman_pct, 0) + COALESCE(dn.africain_pct, 0) + COALESCE(dn.asiatique_pct, 0)) AS extra_europeen_pct,
            ROUND(COALESCE(dn.traditionnel_pct, 0) + COALESCE(dn.moderne_pct, 0)) AS prenom_francais_pct
        FROM departements d
        LEFT JOIN LatestDepartmentNames dn ON d.departement = dn.dpt
        LEFT JOIN department_crime dc ON d.departement = dc.dep 
            AND dc.annee = (SELECT MAX(annee) FROM department_crime WHERE dep = d.departement)
        ORDER BY ${sortColumn} ${sortDirection}
        LIMIT ? OFFSET ?
    `;
    db.all(sql, [limit, offset], (err, rows) => {
        if (err) {
            console.error(
                "Database error in /departements_details_all:",
                err.message,
            );
            return res.status(500).json({
                error: "Erreur lors de la requête à la base de données",
                details: err.message,
            });
        }
        console.log("Departements details found:", rows.length);
        res.json(rows);
    });
});

// Route: GET /communes_all
app.get("/communes_all", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    console.log("Fetching all communes");
    db.all(
        "SELECT COG, departement, commune, population, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k FROM locations",
        [],
        (err, rows) => {
            if (err) {
                console.error("Database error in /communes_all:", err.message);
                return res.status(500).json({
                    error: "Erreur lors de la requête à la base de données",
                    details: err.message,
                });
            }
            console.log("Communes found:", rows.length);
            res.json(rows);
        },
    );
});

// Route: GET /communes_details_all
app.get("/communes_details_all", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const departement = req.query.dept || "";
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const sort = req.query.sort || "insecurite_score";
    const direction = req.query.direction || "DESC";
    const populationRange = req.query.population_range || "";
    console.log(
        "Fetching communes_details_all for dept:",
        departement,
        "limit:",
        limit,
        "offset:",
        offset,
        "sort:",
        sort,
        "direction:",
        direction,
        "population_range:",
        populationRange,
    );

    // Validate sort parameter to prevent SQL injection
    const validSortColumns = [
        "total_score",
        "population",
        "insecurite_score",
        "immigration_score",
        "islamisation_score",
        "defrancisation_score",
        "wokisme_score",
        "number_of_mosques",
        "mosque_p100k",
        "musulman_pct",
        "africain_pct",
        "asiatique_pct",
        "traditionnel_pct",
        "moderne_pct",
        "violences_physiques_p1k",
        "violences_sexuelles_p1k",
        "vols_p1k",
        "destructions_p1k",
        "stupefiants_p1k",
        "escroqueries_p1k",
        "extra_europeen_pct",
        "prenom_francais_pct",
    ];
    const sortColumn = validSortColumns.includes(sort)
        ? sort
        : "insecurite_score";
    const sortDirection = direction === "ASC" ? "ASC" : "DESC";

    // Build population filter for SQL
    let populationFilter = "";
    let queryParams = [departement, departement, limit, offset];
    if (populationRange) {
        switch (populationRange) {
            case "0-1000":
                populationFilter = "AND l.population < 1000";
                break;
            case "1000-10000":
                populationFilter =
                    "AND l.population >= 1000 AND l.population < 10000";
                break;
            case "10000+":
                populationFilter = "AND l.population >= 10000";
                break;
            default:
                populationFilter = "";
        }
    }

    // Define sort expression to handle derived columns and nulls
    let sortExpression;
    switch (sortColumn) {
            case "total_score":
            sortExpression = `(COALESCE(l.insecurite_score, 0) + 
                              COALESCE(l.immigration_score, 0) + 
                              COALESCE(l.islamisation_score, 0) + 
                              COALESCE(l.defrancisation_score, 0) + 
                              COALESCE(l.wokisme_score, 0))`;
            break;
        case "violences_physiques_p1k":
            sortExpression = `(COALESCE(cc.coups_et_blessures_volontaires_p1k, 0) + 
                              COALESCE(cc.coups_et_blessures_volontaires_intrafamiliaux_p1k, 0) + 
                              COALESCE(cc.autres_coups_et_blessures_volontaires_p1k, 0) + 
                              COALESCE(cc.vols_avec_armes_p1k, 0) + 
                              COALESCE(cc.vols_violents_sans_arme_p1k, 0))`;
            break;
        case "violences_sexuelles_p1k":
            sortExpression = `COALESCE(cc.violences_sexuelles_p1k, 0)`;
            break;
        case "vols_p1k":
            sortExpression = `(COALESCE(cc.vols_avec_armes_p1k, 0) + 
                              COALESCE(cc.vols_violents_sans_arme_p1k, 0) + 
                              COALESCE(cc.vols_sans_violence_contre_des_personnes_p1k, 0) + 
                              COALESCE(cc.cambriolages_de_logement_p1k, 0) + 
                              COALESCE(cc.vols_de_vehicules_p1k, 0) + 
                              COALESCE(cc.vols_dans_les_vehicules_p1k, 0) + 
                              COALESCE(cc.vols_d_accessoires_sur_vehicules_p1k, 0))`;
            break;
        case "destructions_p1k":
            sortExpression = `COALESCE(cc.destructions_et_degradations_volontaires_p1k, 0)`;
            break;
        case "stupefiants_p1k":
            sortExpression = `(COALESCE(cc.usage_de_stupefiants_p1k, 0) + 
                              COALESCE(cc.usage_de_stupefiants_afd_p1k, 0) + 
                              COALESCE(cc.trafic_de_stupefiants_p1k, 0))`;
            break;
        case "escroqueries_p1k":
            sortExpression = `COALESCE(cc.escroqueries_p1k, 0)`;
            break;
        case "extra_europeen_pct":
            sortExpression = `(COALESCE(cn.musulman_pct, 0) + COALESCE(cn.africain_pct, 0) + COALESCE(cn.asiatique_pct, 0))`;
            break;
        case "prenom_francais_pct":
            sortExpression = `(COALESCE(cn.traditionnel_pct, 0) + COALESCE(cn.moderne_pct, 0)))`;
            break;
        default:
            sortExpression = `l.${sortColumn}`;
    }

    // Main query for data
    let sql = `
        WITH LatestCommuneNames AS (
            SELECT COG, musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
            FROM commune_names cn
            WHERE cn.annais = (SELECT MAX(annais) FROM commune_names WHERE COG = cn.COG)
            GROUP BY COG
        )
        SELECT 
            l.COG, l.departement, l.commune, l.population, l.insecurite_score, 
            l.immigration_score, l.islamisation_score, l.defrancisation_score, 
            l.wokisme_score, l.number_of_mosques, l.mosque_p100k,
            cn.musulman_pct, cn.africain_pct, cn.asiatique_pct, cn.traditionnel_pct, 
            cn.moderne_pct, cn.annais,
            (COALESCE(cc.coups_et_blessures_volontaires_p1k, 0) + 
             COALESCE(cc.coups_et_blessures_volontaires_intrafamiliaux_p1k, 0) + 
             COALESCE(cc.autres_coups_et_blessures_volontaires_p1k, 0) + 
             COALESCE(cc.vols_avec_armes_p1k, 0) + 
             COALESCE(cc.vols_violents_sans_arme_p1k, 0)) AS violences_physiques_p1k,
            COALESCE(cc.violences_sexuelles_p1k, 0) AS violences_sexuelles_p1k, 
            (COALESCE(cc.vols_avec_armes_p1k, 0) + 
             COALESCE(cc.vols_violents_sans_arme_p1k, 0) + 
             COALESCE(cc.vols_sans_violence_contre_des_personnes_p1k, 0) + 
             COALESCE(cc.cambriolages_de_logement_p1k, 0) + 
             COALESCE(cc.vols_de_vehicules_p1k, 0) + 
             COALESCE(cc.vols_dans_les_vehicules_p1k, 0) + 
             COALESCE(cc.vols_d_accessoires_sur_vehicules_p1k, 0)) AS vols_p1k,
            COALESCE(cc.destructions_et_degradations_volontaires_p1k, 0) AS destructions_p1k,
            (COALESCE(cc.usage_de_stupefiants_p1k, 0) + 
             COALESCE(cc.usage_de_stupefiants_afd_p1k, 0) + 
             COALESCE(cc.trafic_de_stupefiants_p1k, 0)) AS stupefiants_p1k,
            COALESCE(cc.escroqueries_p1k, 0) AS escroqueries_p1k,
            (COALESCE(cn.musulman_pct, 0) + COALESCE(cn.africain_pct, 0) + COALESCE(cn.asiatique_pct, 0)) AS extra_europeen_pct,
            (COALESCE(cn.traditionnel_pct, 0) + COALESCE(cn.moderne_pct, 0)) AS prenom_francais_pct
        FROM locations l
        LEFT JOIN LatestCommuneNames cn ON l.COG = cn.COG
        LEFT JOIN commune_crime cc ON l.COG = cc.COG 
            AND cc.annee = (SELECT MAX(annee) FROM commune_crime WHERE COG = l.COG)
        WHERE l.departement = ? OR ? = ''
        ${populationFilter}
        ORDER BY ${sortExpression} ${sortDirection}, l.COG ASC
        LIMIT ? OFFSET ?
    `;

    // Count query for total communes
    let countSql = `
        SELECT COUNT(*) as total_count
        FROM locations l
        WHERE l.departement = ? OR ? = ''
        ${populationFilter}
    `;
    let countParams = [departement, departement];

    // Execute both queries
    db.all(sql, queryParams, (err, rows) => {
        if (err) {
            console.error(
                "Database error in /communes_details_all:",
                err.message,
            );
            return res.status(500).json({
                error: "Erreur lors de la requête à la base de données",
                details: err.message,
            });
        }
        db.get(countSql, countParams, (countErr, countRow) => {
            if (countErr) {
                console.error(
                    "Database error in count query:",
                    countErr.message,
                );
                return res.status(500).json({
                    error: "Erreur lors de la requête de comptage",
                    details: countErr.message,
                });
            }
            console.log(
                "Communes details found:",
                rows.length,
                "Total count:",
                countRow.total_count,
            );
            res.json({
                data: rows,
                total_count: countRow.total_count,
            });
        });
    });
});

// Route: GET /article_counts
app.get("/article_counts", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const departement = req.query.dept || "";
    const cog = req.query.cog || "";
    const lieu = req.query.lieu || "";
    console.log(
        "Fetching article_counts for dept:",
        departement,
        "COG:",
        cog,
        "lieu:",
        lieu,
    );
    if (!departement) {
        return res.status(400).json({ error: "Département requis" });
    }
    let sql, params;
    if (cog) {
        sql = `SELECT 
            SUM(insecurite) as insecurite_count,
            SUM(immigration) as immigration_count,
            SUM(islamisme) as islamisme_count,
            SUM(defrancisation) as defrancisation_count,
            SUM(wokisme) as wokisme_count
        FROM articles 
        WHERE departement = ? AND COG = ? AND (insecurite = 1 OR immigration = 1 OR islamisme = 1 OR defrancisation = 1 OR wokisme = 1)`;
        params = [departement, cog];
    } else {
        sql = `SELECT 
            SUM(insecurite) as insecurite_count,
            SUM(immigration) as immigration_count,
            SUM(islamisme) as islamisme_count,
            SUM(defrancisation) as defrancisation_count,
            SUM(wokisme) as wokisme_count
        FROM articles 
        WHERE departement = ? AND (insecurite = 1 OR immigration = 1 OR islamisme = 1 OR defrancisation = 1 OR wokisme = 1)`;
        params = [departement];
    }
    if (lieu) {
        sql += " AND lieu LIKE ?";
        params.push(`%${lieu}%`);
    }
    db.get(sql, params, (err, row) => {
        if (err) {
            console.error("Database error in /article_counts:", err.message);
            return res.status(500).json({
                error: "Erreur lors de la requête à la base de données",
                details: err.message,
            });
        }
        console.log("Article counts:", row);
        res.json({
            insecurite: row ? row.insecurite_count || 0 : 0,
            immigration: row ? row.immigration_count || 0 : 0,
            islamisme: row ? row.islamisme_count || 0 : 0,
            defrancisation: row ? row.defrancisation_count || 0 : 0,
            wokisme: row ? row.wokisme_count || 0 : 0,
        });
    });
});

// Start the Express server
const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Handle server shutdown gracefully
process.on("SIGINT", () => {
    console.log("Fermeture du serveur...");
    db.close((err) => {
        if (err) {
            console.error("Erreur fermeture base:", err.message);
        }
        console.log("Base de données fermée");
        server.close(() => {
            console.log("Serveur arrêté");
            process.exit(0);
        });
    });
});
