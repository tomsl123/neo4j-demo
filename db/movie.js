import { getSession, query } from "./index.js";
import neo4j from "neo4j-driver";

/**
 * Create a movie
 * @param {Object} params
 * @param {string} params.title
 * @param {number} params.year
 * @param {number} params.runtime
 * @param {string} params.language
 * @param {string} params.releaseDate
 * @returns {Promise<void>}
 */
async function createMovie({ title, year, runtime, language, releaseDate }) {
  const session = getSession();
  try {
    await session.run(
      `
      MERGE (m:Movie {title: $title})
      SET m.year = $year,
          m.runtime = $runtime,
          m.original_language = $language,
          m.release_date = $releaseDate
      `,
      { title, year, runtime, language, releaseDate }
    );
  } finally {
    await session.close();
  }
}

/**
 * Get a movie by title
 * @param {string} title
 * @returns {Promise<Object>}
 */
async function getMovie(title) {
  const session = getSession();
  const result = await session.run("MATCH (m:Movie {title: $title}) RETURN m", {
    title,
  });
  await session.close();
  return result.records.map((r) => r.get("m").properties);
}
/**
 * Search a movie by title
 * @param {string} title
 * @returns {Promise<Object>}
 */
// async function searchMovie(title) {
//   const result = await query(
//     "MATCH (m:Movie) WHERE m.title CONTAINS $title RETURN m",
//     { title }
//   );

//   return result.map((r) => r.get("m").properties);
// }

async function searchMovie(title = "") {
  const result = await query(
    `CALL db.index.fulltext.queryNodes("movieTitleIndex", $title) 
     YIELD node, score 
     OPTIONAL MATCH (node)<-[r:RATED]-()
     WITH node, score, COUNT(r) as ratingCount
     WHERE ratingCount > 0
     OPTIONAL MATCH (node)-[:HAS_GENRE]->(g:Genre)
     WITH node, score, ratingCount, collect(g.name) as genres
     RETURN node, score, genres
     ORDER BY score DESC`,
    { title }
  );

  return result.map((r) => r.get("node").properties);
}

/**
 * Update a movie
 * @param {string} title
 * @param {Object} updates
 * @returns {Promise<void>}
 */
async function updateMovie(title, updates) {
  const session = getSession();
  const updateQuery = [];
  for (const key of Object.keys(updates)) {
    updateQuery.push(`m.${key} = $${key}`);
  }
  await session.run(
    `MATCH (m:Movie {title: $title}) SET ${updateQuery.join(", ")}`,
    { title, ...updates }
  );
  await session.close();
}

/**
 * Delete a movie
 * @param {string} title
 * @returns {Promise<void>}
 */
async function deleteMovie(title) {
  const session = getSession();
  await session.run("MATCH (m:Movie {title: $title}) DETACH DELETE m", {
    title,
  });
  await session.close();
}

/**
 * Get all actors in a movie
 * @param {string} title
 * @returns {Promise<string[]>}
 */
async function getAllActors(title) {
  const session = getSession();
  const result = await session.run(
    `
    MATCH (m:Movie {title: $title})<-[:ACTED_IN]-(a:Actor)
    RETURN a.name
    `,
    { title }
  );
  await session.close();
  return result.records.map((r) => r.get("a.name"));
}

/**
 * Get all genres in a movie
 * @param {string} title
 * @returns {Promise<string[]>}
 */
async function getGenre(title) {
  const session = getSession();
  const result = await session.run(
    `
    MATCH (m:Movie {title: $title})-[:HAS_GENRE]->(g)
    RETURN g.name
    `,
    { title }
  );
  await session.close();
  return result.records.map((r) => r.get("g.name"));
}

/**
 * Get all directors in a movie
 * @param {string} title
 * @returns {Promise<string[]>}
 */
async function getDirector(title) {
  const session = getSession();
  const result = await session.run(
    `
    MATCH (m:Movie {title: $title})-[:DIRECTED_BY]->(d)
    RETURN d.name
    `,
    { title }
  );
  await session.close();
  return result.records.map((r) => r.get("d.name"));
}

/**
 * Get the most popular movie
 * @returns {Promise<string>}
 */
async function getMostPopular() {
  const session = getSession();
  const result = await session.run(
    `
    MATCH (m:Movie)<-[r:RATED]-()
    RETURN m.title AS title, avg(r.rating) AS avgRating
    ORDER BY avgRating DESC
    LIMIT 1
    `
  );
  await session.close();
  return result.records[0]?.get("title") || null;
}

/**
 * Get the least popular movie
 * @returns {Promise<string>}
 */
async function getLeastPopular() {
  const session = getSession();
  const result = await session.run(
    `
    MATCH (m:Movie)<-[r:RATED]-()
    RETURN m.title AS title, avg(r.rating) AS avgRating
    ORDER BY avgRating ASC
    LIMIT 1
    `
  );
  await session.close();
  return result.records[0]?.get("title") || null;
}

/**
 * Get the top 10 movies in a genre
 * @param {string} genreName
 * @returns {Promise<Object[]>}
 */
async function getTop10InGenre(genreName) {
  const session = getSession();
  const result = await session.run(
    `
    MATCH (m:Movie)-[:HAS_GENRE]->(g:Genre {name: $genreName})
    MATCH (m)<-[r:RATED]-()
    RETURN m.title AS title, avg(r.rating) AS avgRating
    ORDER BY avgRating DESC
    LIMIT 10
    `,
    { genreName }
  );
  await session.close();
  return result.records.map((r) => ({
    title: r.get("title"),
    avgRating: r.get("avgRating"),
  }));
}

/**
 * Recommend movies by similarity
 * @param {string[]} likedTitles
 * @param {number} amount
 * @returns {Promise<string[]>}
 */
async function recommendMoviesByUserSimilarity(likedTitles, amount = 10) {
  const session = getSession();
  const result = await session.run(
    `
    MATCH (u:User)-[r:RATED]->(m:Movie)
    WHERE m.title IN $likedTitles AND r.rating >= 4
    WITH u, COUNT(m) AS overlap
    MATCH (u)-[r2:RATED]->(rec:Movie)
    WHERE r2.rating >= 4 AND NOT rec.title IN $likedTitles
    WITH rec, SUM(overlap) AS score, COUNT(DISTINCT u) AS voters
    MATCH (rec)-[:HAS_GENRE]->(g:Genre)
    WITH rec, score, COLLECT(g.name) as genres
    RETURN rec, genres
    ORDER BY score DESC
    LIMIT $amount
    `,
    { likedTitles, amount: neo4j.int(amount) }
  );
  await session.close();
  return result.records.map((r) => ({
    ...r.get("rec").properties,
    genres: r.get("genres"),
  }));
}

/**
 * Recommend movies by content
 * @param {string[]} titles
 * @param {number} amount
 * @returns {Promise<string[]>}
 */
async function recommendContentBased(titles, amount = 10) {
  const session = getSession();
  const result = await session.run(
    `
    UNWIND $titles AS inputTitle
    MATCH (m:Movie {title: inputTitle})
    
    MATCH (m)-[:HAS_GENRE]->(g)<-[:HAS_GENRE]-(rec:Movie)
    WHERE NOT rec.title IN $titles
    
    WITH rec, count(DISTINCT g) AS commonGenres, m
    
    OPTIONAL MATCH (m)-[:DIRECTED_BY]->(d)<-[:DIRECTED_BY]-(rec)
    WITH rec, commonGenres, count(DISTINCT d) AS commonDirectors, m
    
    OPTIONAL MATCH (m)<-[:ACTED_IN]-(a)<-[:ACTED_IN]-(rec)
    WITH rec, commonGenres, commonDirectors, count(DISTINCT a) AS commonActors, m
    
    OPTIONAL MATCH (rec)
    WHERE abs(m.runtime - rec.runtime) < 10
    
    WITH rec, commonGenres, commonDirectors, commonActors, m
    WITH rec, sum(commonGenres + commonDirectors + commonActors) AS totalScore
    
    RETURN rec.title AS title, totalScore AS score
    ORDER BY score DESC
    LIMIT $amount
    `,
    { titles, amount: neo4j.int(amount) }
  );
  await session.close();
  // TODO: return movies not jsut titles, but also genres, directors, etc.
  return result.records.map((r) => r.get("title"));
}

/**
 * Recommend movies by attributes
 * @param {Object} attributes
 * @param {string[]} attributes.genres
 * @param {string[]} attributes.directors
 * @param {string[]} attributes.actors
 * @param {number} attributes.runtime
 * @param {string} attributes.language
 * @param {number} attributes.releaseDecade
 * @param {number} amount
 * @returns {Promise<string[]>}
 */
async function recommendByAttributes(
  {
    genres = [],
    directors = [],
    actors = [],
    runtime = null,
    language = null,
    releaseDecade = null,
  },
  amount = 10
) {
  const session = getSession();
  const result = await session.run(
    `
    MATCH (rec:Movie)
    
    // Genre match
    OPTIONAL MATCH (rec)-[:HAS_GENRE]->(g:Genre)
    WHERE g.name IN $genres
    
    // Director match
    OPTIONAL MATCH (rec)-[:DIRECTED_BY]->(d:Director)
    WHERE d.name IN $directors
    
    // Actor match
    OPTIONAL MATCH (rec)<-[:ACTED_IN]-(a:Actor)
    WHERE a.name IN $actors
    
    WITH rec, 
         count(DISTINCT g) AS genreScore,
         count(DISTINCT d) AS directorScore,
         count(DISTINCT a) AS actorScore,
         rec.runtime AS movieRuntime,
         rec.original_language AS movieLanguage,
         rec.year AS movieYear
    
    // Runtime similarity
    WITH rec, genreScore, directorScore, actorScore,
         CASE 
           WHEN $runtime IS NOT NULL AND abs(movieRuntime - $runtime) < 10 THEN 1 
           ELSE 0 
         END AS runtimeScore,
         CASE 
           WHEN $language IS NOT NULL AND movieLanguage = $language THEN 1 
           ELSE 0 
         END AS languageScore,
         CASE 
           WHEN $releaseDecade IS NOT NULL AND floor(toInteger(movieYear) / 10) * 10 = $releaseDecade THEN 1 
           ELSE 0 
         END AS decadeScore
    
    WITH rec, 
         genreScore + directorScore + actorScore + runtimeScore + languageScore + decadeScore AS totalScore
    RETURN rec.title AS title, totalScore
    ORDER BY totalScore DESC
    LIMIT $amount
    `,
    {
      genres,
      directors,
      actors,
      runtime,
      language,
      releaseDecade,
      amount: neo4j.int(amount),
    }
  );
  await session.close();
  return result.records.map((r) => r.get("title"));
}

export {
  createMovie,
  getMovie,
  updateMovie,
  deleteMovie,
  getAllActors,
  getGenre,
  getDirector,
  getMostPopular,
  getLeastPopular,
  getTop10InGenre,
  searchMovie,
  recommendMoviesByUserSimilarity,
  recommendContentBased,
  recommendByAttributes,
};
