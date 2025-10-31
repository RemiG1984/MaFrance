const fs = require('fs');
const csv = require('csv-parser');

const cogLieuMap = new Map(); // Map<cog, Set<lieu>>

function createTables(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `
                CREATE TABLE IF NOT EXISTS articles (
                    date TEXT,
                    departement TEXT,
                    cog TEXT,
                    commune TEXT,
                    lieu TEXT,
                    title TEXT,
                    url TEXT,
                    insecurite INTEGER,
                    immigration INTEGER,
                    islamisme INTEGER,
                    defrancisation INTEGER,
                    wokisme INTEGER
                )
                `,
        (err) => {
          if (err) {
            reject(err);
            return;
          }

          db.run(
            'CREATE INDEX IF NOT EXISTS idx_articles_dept_commune ON articles(departement, cog, commune, lieu)',
            (indexErr) => {
              if (indexErr) {
                reject(indexErr);
                return;
              }

              db.run(
                `
                                CREATE TABLE IF NOT EXISTS lieux (
                                    cog TEXT,
                                    lieu TEXT
                                )
                                `,
                (lieuErr) => {
                  if (lieuErr) {
                    reject(lieuErr);
                    return;
                  }
                  resolve();
                }
              );
            }
          );
        }
      );
    });
  });
}

function validateRequiredFields(row) {
  const missingFields = [];
  if (!row.date) {
    missingFields.push('date');
  }
  if (!row.departement) {
    missingFields.push('departement');
  }
  if (!row.title) {
    missingFields.push('title');
  }
  if (!row.url) {
    missingFields.push('url');
  }

  if (missingFields.length > 0) {
    return false;
  }
  return true;
}

function normalizeDepartementCode(code) {
  let normalized = code.trim();
  if (normalized.length <= 2) {
    normalized = normalized.padStart(2, '0');
  }
  return normalized;
}

function parseBooleanField(value) {
  return ['1', '1.0', 1].includes(value) ? 1 : 0;
}

function updateCogLieuMap(cog, lieu) {
  if (cog && lieu) {
    if (!cogLieuMap.has(cog)) {
      cogLieuMap.set(cog, new Set());
    }
    // Split lieu by ", " to handle multiple lieux
    const lieux = lieu.split(/, /);
    lieux.forEach(l => {
      const trimmedL = l.trim();
      if (trimmedL) {
        cogLieuMap.get(cog).add(trimmedL);
      }
    });
  }
}

function processRow(row) {
  if (!validateRequiredFields(row)) {
    return null;
  }

  const normalizedDepartement = normalizeDepartementCode(row.departement);

  const insecurite = parseBooleanField(row.Insécurité);
  const immigration = parseBooleanField(row.Immigration);
  const islamisme = parseBooleanField(row.Islamisme);
  const defrancisation = parseBooleanField(row.Défrancisation);
  const wokisme = parseBooleanField(row.Wokisme);

  const cog = row.COG && row.COG.trim() !== '' ? row.COG : null;
  const commune = row.commune && row.commune.trim() !== '' ? row.commune : null;
  const lieu = row.lieu && row.lieu.trim() !== '' ? row.lieu : null;

  updateCogLieuMap(cog, lieu);

  return [
    row.date,
    normalizedDepartement,
    cog,
    commune,
    lieu,
    row.title,
    row.url,
    insecurite,
    immigration,
    islamisme,
    defrancisation,
    wokisme
  ];
}

function parseFrenchDate(dateStr) {
  if (!dateStr) {
    return null;
  }
  const frenchDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (frenchDateMatch) {
    const [, day, month, year] = frenchDateMatch;
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  }
  return new Date(dateStr);
}

function processCSV() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync('setup/inputFiles/fdesouche_analyzed.csv')) {
      reject(new Error('setup/inputFiles/fdesouche_analyzed.csv n\'existe pas'));
      return;
    }

    const allArticles = [];
    let articleRows = 0;

    fs.createReadStream('setup/inputFiles/fdesouche_analyzed.csv')
      .pipe(csv())
      .on('data', (row) => {
        const processed = processRow(row);
        if (processed) {
          allArticles.push(processed);
          articleRows++;
        }
      })
      .on('end', () => {
        // Sort all articles by date in descending order
        allArticles.sort((a, b) => {
          const parsedDateA = parseFrenchDate(a[0]);
          const parsedDateB = parseFrenchDate(b[0]);
          if (!parsedDateA || !parsedDateB || isNaN(parsedDateA.getTime()) || isNaN(parsedDateB.getTime())) {
            return b[0].localeCompare(a[0]);
          }
          return parsedDateB - parsedDateA;
        });

        resolve({ allArticles, articleRows });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

function insertBatches(db, allArticles) {
  return new Promise((resolve, reject) => {
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        reject(err);
        return;
      }

      let currentBatch = [];
      const batchSize = 1000;
      let batchIndex = 0;

      function insertNextBatch() {
        if (batchIndex >= allArticles.length) {
          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              reject(commitErr);
            } else {
              resolve();
            }
          });
          return;
        }

        currentBatch = [];
        for (let i = batchIndex; i < Math.min(batchIndex + batchSize, allArticles.length); i++) {
          currentBatch.push(allArticles[i]);
        }

        const placeholders = currentBatch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
        const flatBatch = [].concat(...currentBatch);

        db.run(
          `INSERT INTO articles (date, departement, cog, commune, lieu, title, url, insecurite, immigration, islamisme, defrancisation, wokisme) VALUES ${placeholders}`,
          flatBatch,
          (insertErr) => {
            if (insertErr) {
              db.run('ROLLBACK', () => reject(insertErr));
              return;
            }
            batchIndex += batchSize;
            insertNextBatch();
          }
        );
      }

      insertNextBatch();
    });
  });
}

function insertLieux(db) {
  return new Promise((resolve, reject) => {
    const lieuxData = [];
    for (const [cog, lieuxSet] of cogLieuMap) {
      for (const lieu of lieuxSet) {
        lieuxData.push([cog, lieu]);
      }
    }

    if (lieuxData.length === 0) {
      resolve();
      return;
    }

    const lieuxPlaceholders = lieuxData.map(() => '(?, ?)').join(',');
    const flatLieux = [].concat(...lieuxData);
    db.run(
      `INSERT OR IGNORE INTO lieux (cog, lieu) VALUES ${lieuxPlaceholders}`,
      flatLieux,
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

async function importArticles(db, callback) {
  try {
    const { allArticles } = await processCSV();
    await createTables(db);
    await insertBatches(db, allArticles);
    await insertLieux(db);
    callback(null);
  } catch (err) {
    callback(err);
  }
}

const getCogLieuTable = () => {
  const table = {};
  for (const [cog, lieuxSet] of cogLieuMap) {
    table[cog] = Array.from(lieuxSet).sort();
  }
  return table;
};

module.exports = { importArticles, getCogLieuTable };
