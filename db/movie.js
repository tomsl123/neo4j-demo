import {getSession} from "./index.js";
import neo4j from "neo4j-driver";

// Basic CRUD
async function createMovie({ title, year, runtime, language, releaseDate }) {
    const session = getSession()
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
        )
    } finally {
        await session.close()
    }
}

async function getMovie(title) {
    const session = getSession()
    const result = await session.run(
        'MATCH (m:Movie {title: $title}) RETURN m',
        { title }
    )
    await session.close()
    return result.records.map(r => r.get('m').properties)
}

async function updateMovie(title, updates) {
    const session = getSession()
    const updateQuery = []
    for (const key of Object.keys(updates)) {
        updateQuery.push(`m.${key} = $${key}`)
    }
    await session.run(
        `MATCH (m:Movie {title: $title}) SET ${updateQuery.join(', ')}`,
        { title, ...updates }
    )
    await session.close()
}

async function deleteMovie(title) {
    const session = getSession()
    await session.run(
        'MATCH (m:Movie {title: $title}) DETACH DELETE m',
        { title }
    )
    await session.close()
}

// Relationship helpers
async function getAllActors(title) {
    const session = getSession()
    const result = await session.run(
        `
    MATCH (m:Movie {title: $title})<-[:ACTED_IN]-(a:Actor)
    RETURN a.name
    `,
        { title }
    )
    await session.close()
    return result.records.map(r => r.get('a.name'))
}

async function getGenre(title) {
    const session = getSession()
    const result = await session.run(
        `
    MATCH (m:Movie {title: $title})-[:HAS_GENRE]->(g)
    RETURN g.name
    `,
        { title }
    )
    await session.close()
    return result.records.map(r => r.get('g.name'))
}

async function getDirector(title) {
    const session = getSession()
    const result = await session.run(
        `
    MATCH (m:Movie {title: $title})-[:DIRECTED_BY]->(d)
    RETURN d.name
    `,
        { title }
    )
    await session.close()
    return result.records.map(r => r.get('d.name'))
}

async function getMostPopular() {
    const session = getSession()
    const result = await session.run(
        `
    MATCH (m:Movie)<-[r:RATED]-()
    RETURN m.title AS title, avg(r.rating) AS avgRating
    ORDER BY avgRating DESC
    LIMIT 1
    `
    )
    await session.close()
    return result.records[0]?.get('title') || null
}

async function getLeastPopular() {
    const session = getSession()
    const result = await session.run(
        `
    MATCH (m:Movie)<-[r:RATED]-()
    RETURN m.title AS title, avg(r.rating) AS avgRating
    ORDER BY avgRating ASC
    LIMIT 1
    `
    )
    await session.close()
    return result.records[0]?.get('title') || null
}

async function getTop10InGenre(genreName) {
    const session = getSession()
    const result = await session.run(
        `
    MATCH (m:Movie)-[:HAS_GENRE]->(g:Genre {name: $genreName})
    MATCH (m)<-[r:RATED]-()
    RETURN m.title AS title, avg(r.rating) AS avgRating
    ORDER BY avgRating DESC
    LIMIT 10
    `,
        { genreName }
    )
    await session.close()
    return result.records.map(r => ({ title: r.get('title'), avgRating: r.get('avgRating') }))
}

async function recommendMoviesBySimilarity(likedTitles, amount = 10) {
    const session = getSession()
    const result = await session.run(
        `
    MATCH (u:User)-[r:RATED]->(m:Movie)
    WHERE m.title IN $likedTitles AND r.rating >= 4
    WITH u, COUNT(m) AS overlap
    MATCH (u)-[r2:RATED]->(rec:Movie)
    WHERE r2.rating >= 4 AND NOT rec.title IN $likedTitles
    WITH rec, SUM(overlap) AS score, COUNT(DISTINCT u) AS voters
    RETURN rec.title
    ORDER BY score DESC
    LIMIT $amount
    `,
        { likedTitles, amount: neo4j.int(amount) }
    )
    await session.close()
    return result.records.map(r => r.get('rec.title'))
}

async function recommendContentBased(titles, amount = 10) {
    const session = getSession()
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
    )
    await session.close()
    return result.records.map(r => r.get('title'))
}

async function recommendByAttributes({
                                         genres = [],
                                         directors = [],
                                         actors = [],
                                         runtime = null,
                                         language = null,
                                         releaseDecade = null
                                     }, amount = 10) {
    const session = getSession()
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
        { genres, directors, actors, runtime, language, releaseDecade, amount: neo4j.int(amount) }
    )
    await session.close()
    return result.records.map(r => r.get('title'))
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
    recommendMoviesBySimilarity,
    recommendContentBased,
    recommendByAttributes
}
