const { getSession } = require('./index')

async function deleteMovie(movieId) {
    // TODO: Delete movie and all its relationships
}

async function deleteUser(userId) {
    // TODO: Delete user and their ratings
}

async function deleteRating({ userId, movieTitle }) {
    // TODO: Delete rating between user and movie
}

async function deleteDirector(movieId, directorName) {
    // TODO: Remove a director from a movie
}

async function deleteActor(movieId, actorName) {
    // TODO: Remove an actor from a movie
}

module.exports = { deleteMovie, deleteUser, deleteRating, deleteDirector, deleteActor }
