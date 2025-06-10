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

import chalk from "chalk";
import Table from "cli-table3";
import figlet from "figlet";
import { createSpinner } from "nanospinner";
import { setTimeout } from "node:timers/promises";
import prompts from "prompts";
import { searchActors } from "../db/actor.js";
import { searchDirectors } from "../db/director.js"; // getDirectors seems unused, but keeping it
import { searchGenres } from "../db/genre.js";
import {
  recommendByAttributes,
  recommendContentBased,
  recommendMoviesByUserSimilarity,
  searchMovie,
} from "../db/movie.js";
import { saveRecommendations, showSpinner } from "./utils.js";

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
 * Display movie recommendations in a formatted table
 * @param {Object[]} movies - Array of movie objects
 * @param {Object} [preferences] - Optional preferences for filtering
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
 * Collect user's liked movies with database search
 * @returns {Promise<string[]>} Array of movie titles
 */
async function collectLikedMovies() {
  console.log(chalk.cyan("\n🎬 Select movies you like:"));

  // This function is custom, assuming it uses the autocompleteMultiselect logic internally
  // We need to modify this to match the new prompt structure if it's not custom already.
  // For now, I'll keep it as is, assuming it handles the prompt internally.

  return await prompts([
    {
      type: "autocompleteMultiselect", // Changed from 'autocomplete'
      name: "likedMovies",
      message: "🎬 Select movies you like:",
      instructions: "",
      choices: async () => {
        await showSpinner("Fetching movies...");
        const movies = await searchMovie();
        return movies.map((m) => ({ title: m.title, value: m.title }));
      },
      suggest: async (input, choices) => {
        // `choices` here might be what `choices` returns, but `suggest` will handle actual DB fetch
        if (!input || input.length < 2) return [];
        const movies = await searchMovie(input); // Use your full-text search function
        return movies.map((m) => ({ title: m.title, value: m.title }));
      },
    },
  ]);
}

/**
 * @returns {Promise<UserPreferences>} The collected user preferences
 */
async function askUserPreferences() {
  if (inlineFlags.genres) {
    const answers = {
      genres: inlineFlags.genres.split(",").map((s) => s.trim()),
      actors: (inlineFlags.actors ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      languages: inlineFlags.languages?.split(",").map((s) => s.trim()) || [],
      era: inlineFlags.era?.split(",").map((s) => s.trim()) || [],
      mood: inlineFlags.mood?.split(",").map((s) => s.trim()) || [],
      length: inlineFlags.length,
      platforms: inlineFlags.platforms?.split(",").map((s) => s.trim()) || [],
      subtitles: inlineFlags.subtitles === "true",
      type: inlineFlags.type,
    };

    console.log(chalk.green("\n✅ Inline preferences loaded:\n"));
    console.log(chalk.cyan(JSON.stringify(answers, null, 2)));
    return answers;
  }

  console.log(chalk.blue("\n🎯 Let's collect your movie preferences...\n"));
  let _tempGenresHack = [];
  const response = await prompts([
    {
      type: "autocompleteMultiselect", // Changed from 'autocomplete'
      name: "genres",
      message: "🎭 Select your favorite genres:",
      instructions: "", // Keep as empty string if not needed
      hint: "- Type at least 2 characters to search. Space to select. Return to submit",
      choices: async () => {
        await showSpinner("Fetching genres...");
        const genres = await searchGenres("*");
        return genres.map((g) => ({ title: g.name, value: g.name }));
      },
      suggest: async (input, choices) => {
        // `choices` here might be what `choices` returns, but `suggest` will handle actual DB fetch
        if (!input || input.length < 2) return [];
        const genres = await searchGenres(input); // Use your full-text search function
        return genres.map((g) => ({ title: g.name, value: g.name }));
      },
      onState: (state) => {
        _tempGenresHack = state.value
          .filter((v) => v.selected)
          .map((v) => v.value);
      },
    },
    {
      type: "autocompleteMultiselect",
      name: "actors",
      message: "🎬 Select your favorite actors:",
      instructions: "",
      hint: "- Type at least 2 characters to search. Space to select. Return to submit",

      choices: async () => {
        await showSpinner("Fetching actors...");
        const actors = await searchActors("*", _tempGenresHack);
        return actors.map((a) => ({ title: a.name, value: a.name }));
      },
      suggest: async (input, choices) => {
        console.log(choices);
        if (!input || input.length < 2) return [];
        const actors = await searchActors(input, _tempGenresHack);
        return actors.map((a) => ({ title: a.name, value: a.name }));
      },
    },
    {
      type: "autocompleteMultiselect",
      name: "directors",
      message: "🎥 Select your favorite directors:",
      instructions: "",
      hint: "- Type at least 2 characters to search. Space to select. Return to submit",
      choices: async () => {
        await showSpinner("Fetching directors...");
        const directors = await searchDirectors("*", _tempGenresHack);
        return directors.map((d) => ({ title: d.name, value: d.name }));
      },
      suggest: async (input) => {
        if (!input || input.length < 3) return [];
        const directors = await searchDirectors(input, _tempGenresHack);
        return directors.map((d) => ({ title: d.name, value: d.name }));
      },
    },
    // The rest of your prompts remain the same
    {
      type: "multiselect",
      name: "languages",
      message: "🌍 Select preferred languages:",
      choices: [
        { title: "English", value: "en" },
        { title: "Spanish", value: "es" },
        { title: "French", value: "fr" },
        { title: "Japanese", value: "ja" },
        { title: "Korean", value: "ko" },
        { title: "Hindi", value: "hi" },
        { title: "German", value: "de" },
        { title: "Italian", value: "it" },
        { title: "Chinese", value: "zh" },
      ],
      hint: "- Space to select. Return to submit",
    },
    {
      type: "multiselect",
      name: "era",
      message: "🕰 Select preferred movie era:",
      choices: [
        { title: "2020s", value: "2020" },
        { title: "2010s", value: "2010" },
        { title: "2000s", value: "2000" },
        { title: "1990s", value: "1990" },
        { title: "1980s", value: "1980" },
        { title: "1970s", value: "1970" },
        { title: "Classic (Before 1970)", value: "1960" },
      ],
      hint: "- Space to select. Return to submit",
    },
    {
      type: "select",
      name: "runtime",
      message: "⏱ Select preferred movie length range:",
      choices: [
        { title: "60-90 min", value: { min: 60, max: 90 } },
        { title: "90-120 min", value: { min: 90, max: 120 } },
        { title: "120-150 min", value: { min: 120, max: 150 } },
        { title: "150-180 min", value: { min: 150, max: 180 } },
        { title: "180+ min", value: { min: 180, max: 300 } },
      ],
      hint: "- Space to select multiple ranges. Return to submit",
    },
  ]);

  console.log(chalk.green("\n✅ Preferences Collected:\n"));
  console.log(chalk.cyan(JSON.stringify(response, null, 2)));
  return response;
}

async function main() {
  showHeader();

  try {
    const { algorithm } = await prompts({
      type: "select",
      name: "algorithm",
      message: "Which type of recommendations would you like?",
      choices: [
        { title: "Based on users who like the same movies", value: "user" },
        { title: "Based on similar movies", value: "content" },
        { title: "Based on your preferences", value: "attributes" },
        { title: "I don't know", value: "unknown" },
      ],
    });

    if (!algorithm) {
      console.log(chalk.yellow("👋 Goodbye!"));
      return;
    }

    let preferences = null;

    if (algorithm === "unknown" || algorithm === "attributes") {
      console.log(chalk.yellow("🤔 Let's find out your preferences first!"));
      preferences = await askUserPreferences();
    } else if (algorithm === "user" || algorithm === "content") {
      preferences = await collectLikedMovies();

      if (preferences.likedMovies.length === 0) {
        console.log(
          chalk.yellow(
            "⚠️ No movies selected. Using preference-based recommendations instead."
          )
        );
        preferences = await askUserPreferences();
      }
    }

    console.log(preferences);

    const finalAlgorithm = algorithm === "unknown" ? "attributes" : algorithm;
    const recommendations = await getRecommendations(
      finalAlgorithm,
      preferences
    );

    if (recommendations && recommendations.length > 0) {
      const filename = await saveRecommendations(
        algorithm,
        preferences,
        recommendations
      );

      console.log(chalk.green(`\n💾 Recommendations saved to ${filename}`));
      displayMovieTable(recommendations, preferences);
    } else {
      console.log(
        chalk.red(
          "❌ No recommendations found. Try adjusting your preferences."
        )
      );
    }

    process.exit(0);
  } catch (error) {
    if (error.message.includes("User force closed")) {
      console.log(chalk.yellow("\n👋 Goodbye!"));
    } else {
      console.error(chalk.red("❌ Oops!! An error occurred:"), error.message);
    }

    process.exit(1);
  }
}

main();
