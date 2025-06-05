import inquirer from "inquirer";
import figlet from "figlet";
import chalk from "chalk";
import { createSpinner } from "nanospinner";
import { setTimeout } from "node:timers/promises";

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

async function askUserPreferences() {
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
}

async function main() {
  showHeader();
  try {
    const spinner = createSpinner(
      "Preparing your personalized survey..."
    ).start();
    await setTimeout(1500);
    spinner.success({ text: "Survey ready!" });

    await askUserPreferences();
  } catch (error) {
    console.error(chalk.red("❌ Oops!! An error occurred:"), error.message);
  }
}

main();
