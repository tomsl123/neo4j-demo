const { getSession } = require('./index')

async function getMoviesByUser(userId) {
    // TODO: Return movies rated by user
}

async function getTopRatedMoviesByUser(userId) {
    // TODO: Return top-rated movies for user
}

async function getMostPopularMovie() {
    // TODO: Find the most liked movie
}

async function getMostDislikedMovie() {
    // TODO: Find the most disliked movie
}

async function getSimilarUsers(userId) {
    // TODO: Find similar users
}

async function getRecommendedMoviesForUser(userId) {
    // TODO: Collaborative filtering style recommendations
}

async function getContentBasedRecommendations(movieTitle) {
    // TODO: Content-based recs based on genre/director/actors
}

async function getDirectorsForMovie(movieTitle) {
    // TODO: List directors for a movie
}

async function getActorsForMovie(movieTitle) {
    // TODO: List actors for a movie
}

module.exports = {
    getMoviesByUser,
    getTopRatedMoviesByUser,
    getMostPopularMovie,
    getMostDislikedMovie,
    getSimilarUsers,
    getRecommendedMoviesForUser,
    getContentBasedRecommendations,
    getDirectorsForMovie,
    getActorsForMovie
}
