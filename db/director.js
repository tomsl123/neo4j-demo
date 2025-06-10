import { getSession, query } from "./index.js";

// Create director (optionally connect to movie)
async function createDirector(name, movieTitle) {
  const session = getSession();
  try {
    if (movieTitle) {
      await session.run(
        `
        MERGE (d:Director {name: $name})
        WITH d
        MATCH (m:Movie {title: $movieTitle})
        MERGE (m)-[:DIRECTED_BY]->(d)
        `,
        { name, movieTitle }
      );
    } else {
      await session.run("MERGE (d:Director {name: $name})", { name });
    }
  } finally {
    await session.close();
  }
}

// Get director by name
async function getDirector(name) {
  const session = getSession();
  const result = await session.run(
    "MATCH (d:Director {name: $name}) RETURN d",
    { name }
  );
  await session.close();
  return result.records.map((r) => r.get("d").properties);
}
/**
 * @param {string} [search] - Optional search term to filter directors
 * @returns {Promise<Object[]>} Returns all directors
 */
async function getDirectors(search) {
  const result = await session.run(
    `CALL db.index.fulltext.queryNodes("directorFullTextIndex", $search) 
   YIELD node, score 
   RETURN node ORDER BY score DESC`,
    { search }
  );
  return result.records.map((r) => r.get("node").properties);
}

// async function getDirectors(search = "") {
//   const session = getSession();
//   const result = await session.run(
//     "MATCH (d:Director) WHERE d.name CONTAINS $search RETURN d",
//     { search }
//   );
//   await session.close();
//   return result.records.map((r) => r.get("d").properties);
// }

// Update director name
async function updateDirectorName(oldName, newName) {
  const session = getSession();
  await session.run(
    "MATCH (d:Director {name: $oldName}) SET d.name = $newName",
    { oldName, newName }
  );
  await session.close();
}

// Delete director (and all relationships)
async function deleteDirector(name) {
  const session = getSession();
  await session.run("MATCH (d:Director {name: $name}) DETACH DELETE d", {
    name,
  });
  await session.close();
}

// Create relationship to movie
async function relateDirectorToMovie(directorName, movieTitle) {
  const session = getSession();
  await session.run(
    `
    MATCH (d:Director {name: $directorName}), (m:Movie {title: $movieTitle})
    MERGE (m)-[:DIRECTED_BY]->(d)
    `,
    { directorName, movieTitle }
  );
  await session.close();
}

// Find which actors a director has worked with
async function findActorsForDirector(directorName) {
  const session = getSession();
  const result = await session.run(
    `
    MATCH (d:Director {name: $directorName})<-[:DIRECTED_BY]-(m)<-[:ACTED_IN]-(a:Actor)
    RETURN DISTINCT a.name AS actor
    `,
    { directorName }
  );
  await session.close();
  return result.records.map((r) => r.get("actor"));
}

// Find genre they work the most in
async function mostFrequentGenreForDirector(directorName) {
  const session = getSession();
  const result = await session.run(
    `
    MATCH (d:Director {name: $directorName})<-[:DIRECTED_BY]-(m)-[:HAS_GENRE]->(g)
    RETURN g.name AS genre, count(*) AS count
    ORDER BY count DESC
    LIMIT 1
    `,
    { directorName }
  );
  await session.close();
  return result.records.length > 0 ? result.records[0].get("genre") : null;
}

export {
  createDirector,
  getDirector,
  updateDirectorName,
  deleteDirector,
  relateDirectorToMovie,
  findActorsForDirector,
  getDirectors,
  mostFrequentGenreForDirector,
};
