
const express = require('express');
const router = express.Router();
const MBTiles = require('mbtiles');
const path = require('path');

let mbtilesInstance = null;

// Initialize MBTiles
const initMBTiles = async () => {
  if (mbtilesInstance) return mbtilesInstance;
  
  const mbtilesPath = path.join(__dirname, '../public/tiles/france.mbtiles');
  
  return new Promise((resolve, reject) => {
    new MBTiles(mbtilesPath, (err, mbtiles) => {
      if (err) {
        console.error('Error loading MBTiles:', err);
        reject(err);
        return;
      }
      mbtilesInstance = mbtiles;
      resolve(mbtiles);
    });
  });
};

// Serve tiles
router.get('/:z/:x/:y.png', async (req, res) => {
  try {
    const { z, x, y } = req.params;
    
    if (!mbtilesInstance) {
      await initMBTiles();
    }
    
    mbtilesInstance.getTile(parseInt(z), parseInt(x), parseInt(y), (err, tile, headers) => {
      if (err) {
        // Return a blank tile or 404
        return res.status(404).send('Tile not found');
      }
      
      res.set(headers);
      res.send(tile);
    });
  } catch (error) {
    console.error('Tile server error:', error);
    res.status(500).send('Tile server error');
  }
});

// Get tile metadata
router.get('/metadata', async (req, res) => {
  try {
    if (!mbtilesInstance) {
      await initMBTiles();
    }
    
    mbtilesInstance.getInfo((err, info) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to get tile info' });
      }
      res.json(info);
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize tiles' });
  }
});

module.exports = router;
