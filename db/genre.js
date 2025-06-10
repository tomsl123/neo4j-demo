import { getSession, query } from "./index.js";

// Create genre (or update existing one)
async function createGenre(name) {
  const session = getSession();
  try {
    await session.run("MERGE (g:Genre {name: $name})", { name });
  } finally {
    await session.close();
  }
}

// Get genre by name
async function getGenre(name) {
  const session = getSession();
  const result = await session.run("MATCH (g:Genre {name: $name}) RETURN g", {
    name,
  });
  await session.close();
  return result.records.map((r) => r.get("g").properties);
}

/**
 * Search for genres using full-text search
 * @param {string} searchQuery - The search term to find genres
 * @typedef {Object} Genre
 * @property {string} name - The name of the genre
 * @property {string} id - The name of the genre
 * @returns {Promise<Genre[]>} Array of genre objects
 */
async function searchGenres(searchQuery = "") {
  const result = await query(
    `CALL db.index.fulltext.queryNodes("genreFullTextIndex", $searchQuery)
     YIELD node, score
     WHERE node:Genre
     RETURN node, score
     ORDER BY score DESC`,
    { searchQuery }
  );

  return result.map((r) => r.get("node").properties);
}

// Update genre name
async function updateGenreName(oldName, newName) {
  const session = getSession();
  await session.run("MATCH (g:Genre {name: $oldName}) SET g.name = $newName", {
    oldName,
    newName,
  });
  await session.close();
}

// Delete genre (and all relationships)
async function deleteGenre(name) {
  const session = getSession();
  await session.run("MATCH (g:Genre {name: $name}) DETACH DELETE g", { name });
  await session.close();
}

// Create relationship to movie
async function relateGenreToMovie(genreName, movieTitle) {
  const session = getSession();
  await session.run(
    `
    MATCH (g:Genre {name: $genreName}), (m:Movie {title: $movieTitle})
    MERGE (m)-[:HAS_GENRE]->(g)
    `,
    { genreName, movieTitle }
  );
  await session.close();
}

export {
  createGenre,
  getGenre,
  updateGenreName,
  deleteGenre,
  relateGenreToMovie,
  searchGenres,
};
