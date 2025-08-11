const express = require("express");
const router = express.Router();
const db = require("../config/db");
const {
  validateDepartement,
  validateOptionalCOG,
  validateLieu,
} = require("../middleware/validate");

// Centralized error handler for database queries
const handleDbError = (err, next) => {
  const error = new Error("Erreur lors de la requête à la base de données");
  error.status = 500;
  error.details = err.message;
  return next(error);
};

// Base condition for articles with at least one category flag
const baseCondition =
  "departement = ? AND (insecurite = 1 OR immigration = 1 OR islamisme = 1 OR defrancisation = 1 OR wokisme = 1)";

// GET /api/articles
router.get(
  "/",
  [validateDepartement, validateOptionalCOG, validateLieu],
  (req, res) => {
    const { dept, cog, lieu, category } = req.query;

    let sql = `
    SELECT date, title, url, lieu, commune, insecurite, immigration, islamisme, defrancisation, wokisme 
    FROM articles 
    WHERE ${baseCondition}`;
    const params = [dept];

    if (cog) {
      sql += " AND cog = ?";
      params.push(cog);
    }
    if (lieu) {
      sql += " AND lieu LIKE ?";
      params.push(`%${lieu}%`);
    }
    
    // Add category filtering if specified and not 'tous'
    if (category && category !== 'tous') {
      const validCategories = ['insecurite', 'immigration', 'islamisme', 'defrancisation', 'wokisme'];
      if (validCategories.includes(category)) {
        sql += ` AND ${category} = 1`;
      }
    }
    
    sql += " ORDER BY date DESC";

    // Get articles
    db.all(sql, params, (err, rows) => {
      if (err) return handleDbError(err, res);
      
      // Calculate counts from the fetched articles
      const counts = {
        insecurite: 0,
        immigration: 0,
        islamisme: 0,
        defrancisation: 0,
        wokisme: 0,
        total: rows.length
      };

      rows.forEach(article => {
        if (article.insecurite === 1) counts.insecurite++;
        if (article.immigration === 1) counts.immigration++;
        if (article.islamisme === 1) counts.islamisme++;
        if (article.defrancisation === 1) counts.defrancisation++;
        if (article.wokisme === 1) counts.wokisme++;
      });

      res.json({
        list: rows,
        counts: counts
      });
    });
  },
);

// GET /api/articles/counts
router.get(
  "/counts",
  [validateDepartement, validateOptionalCOG, validateLieu],
  (req, res) => {
    const { dept, cog, lieu } = req.query;

    let sql = `
    SELECT 
      SUM(insecurite) as insecurite_count,
      SUM(immigration) as immigration_count,
      SUM(islamisme) as islamisme_count,
      SUM(defrancisation) as defrancisation_count,
      SUM(wokisme) as wokisme_count
    FROM articles 
    WHERE ${baseCondition}`;
    const params = [dept];

    if (cog) {
      sql += " AND COG = ?";
      params.push(cog);
    }
    if (lieu) {
      sql += " AND lieu LIKE ?";
      params.push(`%${lieu}%`);
    }

    db.get(sql, params, (err, row) => {
      if (err) return handleDbError(res, err);
      const result = {
        insecurite: row?.insecurite_count || 0,
        immigration: row?.immigration_count || 0,
        islamisme: row?.islamisme_count || 0,
        defrancisation: row?.defrancisation_count || 0,
        wokisme: row?.wokisme_count || 0,
      };
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

    let sql = `SELECT DISTINCT lieu 
             FROM articles 
             WHERE ${baseCondition} AND lieu IS NOT NULL`;
    const params = [dept];

    if (cog) {
      sql += " AND cog = ?";
      params.push(cog);
    } else if (lieu) {
      sql += " AND lieu LIKE ?";
      params.push(`%${lieu}%`);
    }

    db.all(sql, params, (err, rows) => {
      if (err) return handleDbError(res, err);
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
