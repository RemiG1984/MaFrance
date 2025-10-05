
const express = require("express");
const router = express.Router();
const cacheService = require("../services/cacheService");
const { cacheMiddleware } = require("../middleware/cache");

// GET /api/cache/stats - Get cache statistics
router.get("/stats", cacheMiddleware((req) => 'cache:stats'), (req, res) => {
  const stats = cacheService.getStats();
  res.json(stats);
});

// POST /api/cache/clear - Clear cache (admin only)
router.post("/clear", (req, res) => {
  cacheService.clear();
  res.json({ message: "Cache cleared successfully" });
});

// POST /api/cache/refresh - Refresh cache data
router.post("/refresh", async (req, res) => {
  try {
    await cacheService.initializeCache();
    res.json({ message: "Cache refreshed successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to refresh cache", details: error.message });
  }
});

module.exports = router;
