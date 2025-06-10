import { query } from "./index.js";

// Create actor (optionally connect to movie)
async function createActor(name, movieTitle) {
  let result;
  if (movieTitle) {
    result = await query(
      `
        MERGE (a:Actor {name: $name})
        WITH a
        MATCH (m:Movie {title: $movieTitle})
        MERGE (a)-[:ACTED_IN]->(m)
        `,
      { name, movieTitle }
    );
  } else {
    result = await query("MERGE (a:Actor {name: $name})", { name });
  }
  return result;
}

// Get actor by name (supports full-text search)
async function getActor(name) {
  const query = `CALL db.index.fulltext.queryNodes("actorName", $name) 
      YIELD node, score
      RETURN node as a
      ORDER BY score DESC, a.name
    `;

  const result = await query(query, { name });
  console.log(result);
  return result.map((r) => r.get("a").properties);
}

async function searchActors(searchQuery = "*", genres = []) {
  const result = await query(
    `CALL db.index.fulltext.queryNodes("actorName", $searchQuery)
     YIELD node, score
     MATCH (node)-[:ACTED_IN]->(movie)-[:HAS_GENRE]->(genre)
     WITH node, score, COLLECT(DISTINCT genre.name) as actorGenres
     WHERE $genres = [] OR ANY(g IN $genres WHERE g IN actorGenres)
     RETURN node as a, actorGenres
     ORDER BY score DESC, a.name`,
    { searchQuery, genres }
  );

  const actors = result.map((r) => ({
    ...r.get("a").properties,
    genres: r.get("actorGenres"),
  }));

  return actors;
}

async function getActors(name) {
  const result = await query("MATCH (a:Actor {name: $name}) RETURN a", {
    name,
  });
  return result.map((r) => r.get("a").properties);
}

// Update actor name
async function updateActorName(oldName, newName) {
  await query("MATCH (a:Actor {name: $oldName}) SET a.name = $newName", {
    oldName,
    newName,
  });
}

// Delete actor (and all relationships)
async function deleteActor(name) {
  await query("MATCH (a:Actor {name: $name}) DETACH DELETE a", { name });
}

// Create relationship to movie
async function relateActorToMovie(actorName, movieTitle) {
  await query(
    `
    MATCH (a:Actor {name: $actorName}), (m:Movie {title: $movieTitle})
    MERGE (a)-[:ACTED_IN]->(m)
    `,
    { actorName, movieTitle }
  );
}

// Find which directors an actor has worked with
async function findDirectorsForActor(actorName) {
  const result = await query(
    `
    MATCH (a:Actor {name: $actorName})-[:ACTED_IN]->(m)<-[:DIRECTED_BY]-(d:Director)
    RETURN DISTINCT d.name AS director
    `,
    { actorName }
  );
  return result.records.map((r) => r.get("director"));
}

// Find genre they work the most in
async function mostFrequentGenreForActor(actorName) {
  const result = await query(
    `
    MATCH (a:Actor {name: $actorName})-[:ACTED_IN]->(m)-[:HAS_GENRE]->(g)
    RETURN g.name AS genre, count(*) AS count
    ORDER BY count DESC
    LIMIT 1
    `,
    { actorName }
  );
  return result.records.length > 0 ? result.records[0].get("genre") : null;
}

export {
  createActor,
  deleteActor,
  findDirectorsForActor,
  getActor,
  mostFrequentGenreForActor,
  relateActorToMovie,
  updateActorName,
  searchActors,
};
