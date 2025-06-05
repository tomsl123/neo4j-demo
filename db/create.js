const { getSession } = require('./index')

async function createMovie({ title, year, genres, directors, actors }) {
    // TODO: Create a movie node, connect to genres, directors, actors
}

async function createUser({ userId, name }) {
    // TODO: Create a user node
}

async function createRating({ userId, movieTitle, rating }) {
    // TODO: Create RATED relationship
}

module.exports = { createMovie, createUser, createRating }
