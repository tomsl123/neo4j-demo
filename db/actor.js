import {getSession} from "./index.js";

// Create actor (optionally connect to movie)
async function createActor(name, movieTitle) {
    const session = getSession()
    try {
        if (movieTitle) {
            await session.run(
                `
        MERGE (a:Actor {name: $name})
        WITH a
        MATCH (m:Movie {title: $movieTitle})
        MERGE (a)-[:ACTED_IN]->(m)
        `,
                { name, movieTitle }
            )
        } else {
            await session.run(
                'MERGE (a:Actor {name: $name})',
                { name }
            )
        }
    } finally {
        await session.close()
    }
}

// Get actor by name
async function getActor(name) {
    const session = getSession()
    const result = await session.run(
        'MATCH (a:Actor {name: $name}) RETURN a',
        { name }
    )
    await session.close()
    return result.records.map(r => r.get('a').properties)
}

// Update actor name
async function updateActorName(oldName, newName) {
    const session = getSession()
    await session.run(
        'MATCH (a:Actor {name: $oldName}) SET a.name = $newName',
        { oldName, newName }
    )
    await session.close()
}

// Delete actor (and all relationships)
async function deleteActor(name) {
    const session = getSession()
    await session.run(
        'MATCH (a:Actor {name: $name}) DETACH DELETE a',
        { name }
    )
    await session.close()
}

// Create relationship to movie
async function relateActorToMovie(actorName, movieTitle) {
    const session = getSession()
    await session.run(
        `
    MATCH (a:Actor {name: $actorName}), (m:Movie {title: $movieTitle})
    MERGE (a)-[:ACTED_IN]->(m)
    `,
        { actorName, movieTitle }
    )
    await session.close()
}

// Find which directors an actor has worked with
async function findDirectorsForActor(actorName) {
    const session = getSession()
    const result = await session.run(
        `
    MATCH (a:Actor {name: $actorName})-[:ACTED_IN]->(m)<-[:DIRECTED_BY]-(d:Director)
    RETURN DISTINCT d.name AS director
    `,
        { actorName }
    )
    await session.close()
    return result.records.map(r => r.get('director'))
}

// Find genre they work the most in
async function mostFrequentGenreForActor(actorName) {
    const session = getSession()
    const result = await session.run(
        `
    MATCH (a:Actor {name: $actorName})-[:ACTED_IN]->(m)-[:HAS_GENRE]->(g)
    RETURN g.name AS genre, count(*) AS count
    ORDER BY count DESC
    LIMIT 1
    `,
        { actorName }
    )
    await session.close()
    return result.records.length > 0 ? result.records[0].get('genre') : null
}

export {
    createActor,
    getActor,
    updateActorName,
    deleteActor,
    relateActorToMovie,
    findDirectorsForActor,
    mostFrequentGenreForActor
}
