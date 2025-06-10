import { promises as fs } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createSpinner } from "nanospinner";
import { setTimeout } from "node:timers/promises";

/**
 * Saves movie recommendations to a JSON file
 * @param {string} algorithm - The recommendation algorithm used
 * @param {Object} preferences - User preferences used for recommendations
 * @param {Object[]} recommendations - Array of movie recommendations
 * @returns {Promise<string>} Path to the saved recommendations file
 */
export async function saveRecommendations(
  algorithm,
  preferences,
  recommendations
) {
  // Get current file's directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // Create recommendations directory if it doesn't exist
  const recommendationsDir = join(__dirname, "..", "recommendations");
  try {
    await fs.access(recommendationsDir);
  } catch {
    await fs.mkdir(recommendationsDir);
  }

  // Generate filename with timestamp
  const timestamp = Date.now();
  const filename = join(recommendationsDir, `${timestamp}.json`);

  // Write recommendations to file
  await fs.writeFile(
    filename,
    JSON.stringify(
      {
        algorithm,
        preferences,
        recommendations,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )
  );

  return filename;
}

/**
 * Shows a spinner with a message and a timeout
 * @param {string} message - The message to show
 * @param {number} timeout - The timeout in milliseconds
 * @returns {Promise<void>}
 */
export async function showSpinner(message, timeout = 1000) {
  const spinner = createSpinner(message).start();
  await setTimeout(timeout);
  spinner.success({ text: "✅ " + message });
}
