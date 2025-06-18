const express = require("express");
const router = express.Router();
const db = require("../config/db");
const {
  validateDepartement,
  validateOptionalCOG,
  validateLieu,
} = require("../middleware/validate");

// GET /api/articles
router.get(
  "/",
  [validateDepartement, validateOptionalCOG, validateLieu],
  (req, res) => {
    const { dept, cog, lieu } = req.query;
    console.log("GET /api/articles - Request params:", { dept, cog, lieu });
    
    let sql =
      "SELECT date, title, url, lieu, commune, insecurite, immigration, islamisme, defrancisation, wokisme FROM articles WHERE departement = ? AND (insecurite = 1 OR immigration = 1 OR islamisme = 1 OR defrancisation = 1 OR wokisme = 1)";
    let params = [dept];
    if (cog) {
      sql += " AND cog = ?";
      params.push(cog);
    }
    if (lieu) {
      sql += " AND lieu LIKE ?";
      params.push(`%${lieu}%`);
    }
    sql += " ORDER BY date DESC";
    
    console.log("Executing SQL:", sql, "with params:", params);
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error("Database error in /api/articles:", err);
        return res.status(500).json({
          error: "Erreur lors de la requête à la base de données",
          details: err.message,
        });
      }
      console.log("Articles query result:", rows?.length || 0, "articles found");
      res.json(rows);
    });
  },
);

// GET /api/articles/counts
router.get(
  "/counts",
  [validateDepartement, validateOptionalCOG, validateLieu],
  (req, res) => {
    const { dept, cog, lieu } = req.query;
    console.log("GET /api/articles/counts - Request params:", { dept, cog, lieu });
    
    let sql = `SELECT 
    SUM(insecurite) as insecurite_count,
    SUM(immigration) as immigration_count,
    SUM(islamisme) as islamisme_count,
    SUM(defrancisation) as defrancisation_count,
    SUM(wokisme) as wokisme_count
  FROM articles 
  WHERE departement = ? AND (insecurite = 1 OR immigration = 1 OR islamisme = 1 OR defrancisation = 1 OR wokisme = 1)`;
    let params = [dept];
    if (cog) {
      sql += " AND COG = ?";
      params.push(cog);
    }
    if (lieu) {
      sql += " AND lieu LIKE ?";
      params.push(`%${lieu}%`);
    }
    
    console.log("Executing counts SQL:", sql, "with params:", params);
    
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error("Database error in /api/articles/counts:", err);
        return res.status(500).json({
          error: "Erreur lors de la requête à la base de données",
          details: err.message,
        });
      }
      const result = {
        insecurite: row ? row.insecurite_count || 0 : 0,
        immigration: row ? row.immigration_count || 0 : 0,
        islamisme: row ? row.islamisme_count || 0 : 0,
        defrancisation: row ? row.defrancisation_count || 0 : 0,
        wokisme: row ? row.wokisme_count || 0 : 0,
      };
      console.log("Article counts result:", result);
      res.json(result);
    });
  },
);

// GET /api/articles/lieux
router.get(
  "/lieux",
  [validateDepartement, validateOptionalCOG, validateLieu],
  (req, res) => {
    const { dept, cog, lieu } = req.query;
    let sql, params;
    if (cog) {
      sql = `SELECT DISTINCT lieu 
           FROM articles 
           WHERE departement = ? AND cog = ? AND lieu IS NOT NULL 
           AND (insecurite = 1 OR immigration = 1 OR islamisme = 1 OR defrancisation = 1 OR wokisme = 1)`;
      params = [dept, cog];
    } else if (lieu) {
      sql = `SELECT DISTINCT lieu 
           FROM articles 
           WHERE departement = ? AND lieu LIKE ? AND lieu IS NOT NULL 
           AND (insecurite = 1 OR immigration = 1 OR islamisme = 1 OR defrancisation = 1 OR wokisme = 1)`;
      params = [dept, `%${lieu}%`];
    } else {
      sql = `SELECT DISTINCT lieu 
           FROM articles 
           WHERE departement = ? AND lieu IS NOT NULL 
           AND (insecurite = 1 OR immigration = 1 OR islamisme = 1 OR defrancisation = 1 OR wokisme = 1)`;
      params = [dept];
    }
    db.all(sql, params, (err, rows) => {
      if (err) {
        return res.status(500).json({
          error: "Erreur lors de la requête à la base de données",
          details: err.message,
        });
      }
      const lieuxSet = new Set();
      rows.forEach((row) => {
        if (row.lieu) {
          row.lieu.split(",").forEach((l) => lieuxSet.add(l.trim()));
        }
      });
      const lieux = Array.from(lieuxSet).sort();
      res.json(lieux.map((l) => ({ lieu: l })));
    });
  },
);

module.exports = router;
