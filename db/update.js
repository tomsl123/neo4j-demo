const { getSession } = require('./index')

async function updateMovieTitle(movieId, newTitle) {
    // TODO: Update movie title
}

async function updateUserName(userId, newName) {
    // TODO: Update user's name
}

async function updateRating({ userId, movieTitle, newRating }) {
    // TODO: Update rating on RATED relationship
}

async function updateDirector(movieId, newDirector) {
    // TODO: Update director of a movie
}

async function updateActor(movieId, newActor) {
    // TODO: Update actor(s) for a movie
}

module.exports = { updateMovieTitle, updateUserName, updateRating, updateDirector, updateActor }
