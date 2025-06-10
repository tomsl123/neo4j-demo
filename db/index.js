import { config } from "dotenv";
import { expand } from "dotenv-expand";

import neo4j from "neo4j-driver";
import * as path from "node:path";

expand(
  config({
    path: path.resolve(process.cwd(), ".env"),
  })
);

function validateEnv() {
  if (
    !process.env.NEO4J_URI ||
    !process.env.NEO4J_USER ||
    !process.env.NEO4J_PASSWORD
  ) {
    throw new Error(
      "Missing required environment variables: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD"
    );
  }
  return {
    uri: process.env.NEO4J_URI,
    user: process.env.NEO4J_USER,
    password: process.env.NEO4J_PASSWORD,
  };
}
export const env = validateEnv();

const driver = neo4j.driver(env.uri, neo4j.auth.basic(env.user, env.password));

/**
 * @param {string} cypher
 * @param {Object} params
 * @returns {Promise<Object[]>}
 */
export async function query(cypher, params) {
  const session = driver.session();
  // NOTE: we can also user driver.executeQuery(cypher, params) for Neo4j 5.x
  try {
    const result = await session.run(cypher, params);
    return result.records.map((record) => record);
  } catch (error) {
    console.error(error);
  } finally {
    await session.close();
  }
}

export function getSession() {
  return driver.session();
}

await driver.close();
