const db = require('../config/db');

/**
 * Takes a raw ingredient name and finds its Standard Identity (CAS/Reference Code).
 * @param {string} rawName - The user input (e.g., "Lye", "TFM")
 * @returns {object|null} - The standardized substance object or null if not found.
 */
async function resolveIngredient(rawName) {
  const cleanName = rawName.trim();

  // STRATEGY 1: Check Aliases (Most likely scenario for user input)
  // We join with the substances table to get the full details immediately.
  const aliasQuery = `
    SELECT s.reference_code, s.official_name, s.cas_number, s.type
    FROM substance_aliases a
    JOIN substances s ON a.substance_id = s.id
    WHERE a.alias_name ILIKE $1
  `;
  const aliasRes = await db.query(aliasQuery, [cleanName]);
  if (aliasRes.rows.length > 0) {
    return aliasRes.rows[0];
  }

  // STRATEGY 2: Check Official Name or Reference Code directly
  // 'ILIKE' makes it case-insensitive (e.g., "sodium hydroxide" matches "Sodium Hydroxide")
  const directQuery = `
    SELECT reference_code, official_name, cas_number, type
    FROM substances
    WHERE official_name ILIKE $1 OR reference_code = $1 OR cas_number = $1
  `;
  const directRes = await db.query(directQuery, [cleanName]);
  if (directRes.rows.length > 0) {
    return directRes.rows[0];
  }

  // If we reach here, we have no idea what this is.
  return null;
}

module.exports = { resolveIngredient };
