/**
 * @typedef {Object} UserPreferences
 * @property {string[]} genres - Selected movie genres
 * @property {string[]} actors - Favorite actors/actresses
 * @property {string[]} languages - Preferred movie languages
 * @property {string[]} era - Preferred movie eras
 * @property {string[]} mood - Selected movie moods
 * @property {string} length - Preferred movie length
 * @property {string[]} platforms - Selected streaming platforms
 * @property {boolean} subtitles - Whether user prefers subtitles
 * @property {('Blockbusters'|'Indie/Art-house'|'Both')} type - Preferred movie type
 **/

import inquirer from "inquirer";
import figlet from "figlet";
import chalk from "chalk";
import { createSpinner } from "nanospinner";
import { setTimeout } from "node:timers/promises";
import Table from "cli-table3";
import { getDirectors } from "../db/director.js";
import {
  recommendMoviesByUserSimilarity,
  recommendContentBased,
  recommendByAttributes,
  searchMovie,
} from "../db/movie.js";

// import { get } from "../db/actor";

// 🔍 Parse command-line arguments
const args = process.argv.slice(2);
const inlineFlags = Object.fromEntries(
  args
    .filter((arg) => arg.startsWith("--"))
    .map((arg) => {
      const [key, value] = arg.replace(/^--/, "").split("=");
      return [key, value ?? true];
    })
);

function showHeader() {
  console.log(
    chalk.magenta(
      figlet.textSync("MovieRec CLI", {
        font: "Standard",
        horizontalLayout: "default",
        verticalLayout: "default",
      })
    )
  );
}

/**
 * @returns {Promise<UserPreferences>} The collected user preferences
 */
async function askUserPreferences() {
  if (inlineFlags.genres) {
    // Convert comma-separated values
    const answers = {
      genres: inlineFlags.genres.split(","),
      actors: (inlineFlags.actors ?? "").split(",").map((s) => s.trim()),
      languages: inlineFlags.languages?.split(",") || [],
      era: inlineFlags.era?.split(",") || [],
      mood: inlineFlags.mood?.split(",") || [],
      length: inlineFlags.length,
      platforms: inlineFlags.platforms?.split(",") || [],
      subtitles: inlineFlags.subtitles === "true",
      type: inlineFlags.type,
    };

    console.log(chalk.green("\n✅ Inline preferences loaded:\n"));
    console.log(chalk.cyan(JSON.stringify(answers, null, 2)));
    return answers;
  }

  const directorsAnswers = [];
  let done = false;
  do {
    const answer = await inquirer.prompt({
      type: "search",
      name: "directors",
      source: async (input) => {
        if (!input) return [];
        const directors = await getDirectors(input);
        return directors.map((d) => d.name);
      },
      message: "Would you like to search for specific directors?",
    });

    directorsAnswers.push(answer.directors);

    const confirm = await inquirer.prompt({
      type: "confirm",
      name: "addMore",
      message: "Add more directors?",
      default: false,
    });

    if (!confirm.addMore) break;
  } while (!done);

  // Otherwise, use prompts
  const answers = await inquirer.prompt([
    {
      type: "checkbox",
      name: "genres",
      message: "🎭 Select your favorite genres:",
      choices: [
        "Action",
        "Adventure",
        "Comedy",
        "Drama",
        "Horror",
        "Romance",
        "Sci-Fi",
        "Thriller",
        "Animation",
        "Documentary",
      ],
      validate: (answer) => answer.length > 0 || "Select at least one genre.",
    },
    {
      type: "input",
      name: "actors",
      message: "🎬 Favorite actors or actresses? (comma separated):",
      filter: (input) =>
        input
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
    },

    {
      type: "checkbox",
      name: "languages",
      message: "🌍 Preferred languages:",
      choices: [
        "English",
        "Spanish",
        "French",
        "Japanese",
        "Korean",
        "Hindi",
        "German",
        "Others",
      ],
    },
    {
      type: "checkbox",
      name: "era",
      message: "🕰 Preferred movie era:",
      choices: [
        "2020s",
        "2010s",
        "2000s",
        "1990s",
        "1980s",
        "Classic (Before 1980)",
      ],
    },
    {
      type: "checkbox",
      name: "mood",
      message: "🧠 What moods are you in the mood for?",
      choices: [
        "Feel-Good",
        "Dark",
        "Romantic",
        "Funny",
        "Suspenseful",
        "Intense",
        "Inspiring",
      ],
    },
    {
      type: "list",
      name: "length",
      message: "⏱ Preferred movie length:",
      choices: ["< 90 min (Short)", "90–120 min (Medium)", "> 120 min (Long)"],
    },
    {
      type: "checkbox",
      name: "platforms",
      message: "📺 Streaming platforms you use:",
      choices: [
        "Netflix",
        "Amazon Prime",
        "Disney+",
        "Hulu",
        "HBO",
        "Apple TV",
        "Other",
      ],
    },
    {
      type: "confirm",
      name: "subtitles",
      message: "💬 Do you like watching movies with subtitles?",
      default: true,
    },
    {
      type: "list",
      name: "type",
      message: "🎥 What type of films do you prefer?",
      choices: ["Blockbusters", "Indie/Art-house", "Both"],
    },
  ]);

  console.log(chalk.green("\n✅ Preferences Collected:\n"));
  console.log(chalk.cyan(JSON.stringify(answers, null, 2)));
  return answers;
}

/**
 * Display movie recommendations in a formatted table
 * @param {Object[]} movies - Array of movie objects
 * @param {string[]} [preferences] - Optional preferences for filtering
 */
function displayMovieTable(movies, preferences = null) {
  const table = new Table({
    head: [
      chalk.blue("Title"),
      chalk.blue("Genres"),
      chalk.blue("Runtime"),
      chalk.blue("Release Date"),
    ],
    colWidths: [25, 25, 10, 15],
  });

  let filtered = movies;

  if (preferences?.genres?.length > 0) {
    filtered = movies.filter((movie) =>
      preferences.genres.some((genre) => movie.genres?.includes(genre))
    );
  }

  if (filtered.length === 0) {
    console.log(chalk.red("❌ No recommendations found."));
    return;
  }

  filtered.forEach((movie) => {
    table.push([
      movie.title,
      movie.genres?.join(", ") || "N/A",
      `${movie.runtime || "N/A"} min`,
      movie.release_date || "N/A",
    ]);
  });

  console.log(table.toString());
}

/**
 * Get movie recommendations based on user input
 * @param {string} type - Type of recommendation ('user', 'content', or 'attributes')
 * @param {Object} [preferences] - User preferences for attribute-based recommendations
 * @returns {Promise<Object[]>} Array of recommended movies
 */
async function getRecommendations(type, preferences = null) {
  const spinner = createSpinner("Fetching movie recommendations...").start();
  await setTimeout(1500);

  try {
    let recommendations;
    switch (type) {
      case "user":
        recommendations = await recommendMoviesByUserSimilarity(
          preferences?.likedMovies || []
        );
        break;
      case "content":
        recommendations = await recommendContentBased(
          preferences?.likedMovies || []
        );
        break;
      case "attributes":
        recommendations = await recommendByAttributes({
          genres: preferences?.genres || [],
          directors: preferences?.directors || [],
          actors: preferences?.actors || [],
          runtime: preferences?.runtime,
          language: preferences?.languages?.[0],
          releaseDecade: preferences?.era?.[0]?.replace("s", ""),
        });
        break;
      default:
        throw new Error("Invalid recommendation type");
    }
    spinner.success({ text: "🍿 Here's what you might enjoy:" });
    return recommendations;
  } catch (error) {
    spinner.error({ text: "Failed to get recommendations" });
    throw error;
  }
}

/**
 * Collect user's liked movies
 * @returns {Promise<string[]>} Array of movie titles
 */
async function collectLikedMovies() {
  const preferences = [];
  let done = false;

  do {
    const { movie } = await inquirer.prompt({
      type: "search",
      name: "movie",
      source: async (input) => {
        if (!input) return [];
        const movies = await searchMovie(input);
        return movies.map((m) => m.title);
      },
      message: "Search for a movie you like:",
    });

    preferences.push(movie);

    const { addMore } = await inquirer.prompt({
      type: "confirm",
      name: "addMore",
      message: "Add another movie?",
      default: false,
    });
    done = !addMore;
  } while (!done);

  return preferences;
}

async function main() {
  showHeader();

  try {
    const { algorithm } = await inquirer.prompt({
      type: "select",
      name: "algorithm",
      message: "Which type of recommendations would you like?",
      choices: [
        { name: "Based on users who like the same movies", value: "user" },
        { name: "Based on similar movies", value: "content" },
        { name: "Based on your preferences", value: "attributes" },
        { name: "I don't know", value: "unknown" },
      ],
    });

    let preferences = null;

    if (algorithm === "unknown") {
      console.log(chalk.yellow("🤔 Let's find out your preferences first!"));
      preferences = await askUserPreferences();
    } else if (algorithm === "user" || algorithm === "content") {
      preferences = { likedMovies: await collectLikedMovies() };
    } else if (algorithm === "attributes") {
      preferences = await askUserPreferences();
    }

    const recommendations = await getRecommendations(algorithm, preferences);
    displayMovieTable(recommendations, preferences);
  } catch (error) {
    console.error(chalk.red("❌ Oops!! An error occurred:"), error.message);
  }
}

main();
