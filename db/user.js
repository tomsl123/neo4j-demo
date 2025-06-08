import {getSession} from "./index.js";

// Basic CRUD
async function createUser(userId, name) {
    const session = getSession()
    await session.run(
        'MERGE (u:User {userId: $userId}) SET u.name = $name',
        { userId, name }
    )
    await session.close()
}

async function getUser(userId) {
    const session = getSession()
    const result = await session.run(
        'MATCH (u:User {userId: $userId}) RETURN u',
        { userId }
    )
    await session.close()
    return result.records.map(r => r.get('u').properties)
}

async function updateUser(userId, updates) {
    const session = getSession()
    const updateQuery = []
    for (const key of Object.keys(updates)) {
        updateQuery.push(`u.${key} = $${key}`)
    }
    await session.run(
        `MATCH (u:User {userId: $userId}) SET ${updateQuery.join(', ')}`,
        { userId, ...updates }
    )
    await session.close()
}

async function deleteUser(userId) {
    const session = getSession()
    await session.run(
        'MATCH (u:User {userId: $userId}) DETACH DELETE u',
        { userId }
    )
    await session.close()
}

// Specific queries
async function topRatedMovies(userId) {
    const session = getSession()
    const result = await session.run(
        `
    MATCH (u:User {userId: $userId})-[r:RATED]->(m:Movie)
    RETURN m.title AS title, r.rating AS rating
    ORDER BY r.rating DESC
    LIMIT 5
    `,
        { userId }
    )
    await session.close()
    return result.records.map(r => ({ title: r.get('title'), rating: r.get('rating') }))
}

async function leastRatedMovies(userId) {
    const session = getSession()
    const result = await session.run(
        `
    MATCH (u:User {userId: $userId})-[r:RATED]->(m:Movie)
    RETURN m.title AS title, r.rating AS rating
    ORDER BY r.rating ASC
    LIMIT 5
    `,
        { userId }
    )
    await session.close()
    return result.records.map(r => ({ title: r.get('title'), rating: r.get('rating') }))
}

async function mostLikedGenre(userId) {
    const session = getSession()
    const result = await session.run(
        `
    MATCH (u:User {userId: $userId})-[r:RATED]->(m:Movie)-[:HAS_GENRE]->(g)
    WHERE r.rating >= 3
    RETURN g.name AS genre, count(*) AS count
    ORDER BY count DESC
    LIMIT 1
    `,
        { userId }
    )
    await session.close()
    return result.records[0]?.get('genre') || null
}

async function findSimilarUsers(userId) {
    const session = getSession()
    const result = await session.run(
        `
    MATCH (u1:User {userId: $userId})-[r1:RATED]->(m:Movie)<-[r2:RATED]-(u2:User)
    WHERE abs(r1.rating - r2.rating) <= 1 AND u1 <> u2
    RETURN DISTINCT u2.userId AS similarUser
    LIMIT 10
    `,
        { userId }
    )
    await session.close()
    return result.records.map(r => r.get('similarUser'))
}

export {
    createUser,
    getUser,
    updateUser,
    deleteUser,
    topRatedMovies,
    leastRatedMovies,
    mostLikedGenre,
    findSimilarUsers
}
