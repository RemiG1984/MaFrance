
const validateOptionalDepartement = (req, res, next) => {
  const { dept } = req.query;
  if (dept && !/^(0[1-9]|[1-8][0-9]|9[0-6]|2[AB]|97[1-6])$/.test(dept)) {
    return res.status(400).json({ error: "Code département invalide" });
  }
  next();
};

const validateOptionalCOG = (req, res, next) => {
  const { cog } = req.query;
  if (cog && !/^[0-9A-Z]{2,5}$/.test(cog)) {
    return res.status(400).json({ error: "Code COG invalide" });
  }
  next();
};

const validatePagination = (req, res, next) => {
  const { cursor, limit } = req.query;
  
  if (cursor && !/^\d+$/.test(cursor)) {
    return res.status(400).json({ error: "Curseur invalide" });
  }
  
  if (limit && (!/^\d+$/.test(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return res.status(400).json({ error: "Limite invalide (1-100)" });
  }
  
  next();
};

module.exports = {
  validateOptionalDepartement,
  validateOptionalCOG,
  validatePagination,
};
