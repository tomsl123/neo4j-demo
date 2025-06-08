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
 * @param {UserPreferences} [preferences]
 */
// async function recommendMovies(preferences) {
//   const spinner = createSpinner("Fetching movie recommendations...").start();
//   await setTimeout(1500);
//   spinner.success({ text: "🍿 Here's what you might enjoy:" });

//   // 🎬 Dummy recommendation logic
//   const recommendations = [
//     { title: "Inception", genres: ["Sci-Fi", "Thriller"] },
//     { title: "La La Land", genres: ["Romantic", "Musical"] },
//     { title: "Parasite", genres: ["Drama", "Thriller"] },
//   ];

//   if (!preferences) {
//     const m = recommendations.map(
//       (m) => `  - ${m.title} (${m.genres.join(", ")})`
//     );
//     console.log(chalk.yellow(m.join("\n")));
//     return;
//   }

//   // Filter recommendations based on user preferences
//   const filtered = recommendations.filter((movie) =>
//     preferences.genres.some((genre) => movie.genres.includes(genre))
//   );

//   if (filtered.length === 0) {
//     console.log(chalk.red("❌ No recommendations found."));
//   } else {
//     console.log(
//       chalk.yellow(
//         filtered
//           .map((m) => `  - ${m.title} (${m.genres.join(", ")})`)
//           .join("\n")
//       )
//     );
//   }
// }

const recommendations = [
  {
    title: "Inception",
    genres: ["Action", "Science Fiction", "Adventure"],
    vote_average: 8.364,
    vote_count: 34495,
    release_date: "2010-07-15",
    runtime: 148,
    overview:
      "Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets is offered a chance to regain his old life as payment for a task considered to be impossible: \"inception\", the implantation of another person's idea into a target's subconscious.",
    original_language: "en",
    spoken_languages: ["English", "French", "Japanese", "Swahili"],
    production_companies: [
      "Legendary Pictures",
      "Syncopy",
      "Warner Bros. Pictures",
    ],
  },
  {
    title: "La La Land",
    genres: ["Romance", "Drama", "Music"],
    vote_average: 8.0,
    vote_count: 15000,
    release_date: "2016-12-09",
    runtime: 128,
    overview: "A jazz pianist falls for an aspiring actress in Los Angeles.",
    original_language: "en",
    spoken_languages: ["English"],
    production_companies: ["Summit Entertainment", "Black Label Media"],
  },
  {
    title: "Parasite",
    genres: ["Drama", "Thriller", "Comedy"],
    vote_average: 8.6,
    vote_count: 25000,
    release_date: "2019-05-30",
    runtime: 132,
    overview:
      "All unemployed, Ki-taek and his family take peculiar interest in the wealthy and glamorous Parks, as they ingratiate themselves into their lives and get entangled in an unexpected incident.",
    original_language: "ko",
    spoken_languages: ["Korean", "English"],
    production_companies: ["CJ Entertainment", "Barunson E&A"],
  },
];

async function recommendMovies(preferences) {
  const spinner = createSpinner("Fetching movie recommendations...").start();
  await setTimeout(1500);
  spinner.success({ text: "🍿 Here's what you might enjoy:" });

  const table = new Table({
    head: [
      chalk.blue("Title"),
      chalk.blue("Genres"),
      chalk.blue("Rating"),
      chalk.blue("Runtime"),
      chalk.blue("Release Date"),
    ],
    colWidths: [25, 25, 10, 10, 15],
  });

  let filtered = recommendations;

  if (preferences && preferences.genres?.length > 0) {
    filtered = recommendations.filter((movie) =>
      preferences.genres.some((genre) => movie.genres.includes(genre))
    );
  }

  if (filtered.length === 0) {
    console.log(chalk.red("❌ No recommendations found."));
    return;
  }

  filtered.forEach((movie) => {
    table.push([
      movie.title,
      movie.genres.join(", "),
      movie.vote_average.toFixed(1),
      `${movie.runtime} min`,
      movie.release_date,
    ]);
  });

  console.log(table.toString());
}

async function main() {
  showHeader();

  try {
    await inquirer.prompt([
      {
        type: "input",
        name: "username",
        message: "Please enter your username",
      },
    ]);

    const spinner = createSpinner(
      "Preparing your personalized survey..."
    ).start();
    await setTimeout(1500);
    spinner.success({ text: "Survey ready!" });

    if (inlineFlags.recommend) {
      const spinner2 = createSpinner("Analyzing your taste...").start();
      await setTimeout(1500);
      spinner2.success({ text: "Done!" });
      recommendMovies();
    } else {
      const preferences = await askUserPreferences();
      await recommendMovies(preferences);
    }
  } catch (error) {
    console.error(chalk.red("❌ Oops!! An error occurred:"), error.message);
  }
}

main();
