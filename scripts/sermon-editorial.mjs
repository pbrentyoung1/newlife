import mysql from "mysql2/promise";
import { changePublication, validateEditorialRequest } from "./lib/sermon-publication.mjs";

const [action, slug, ...options] = process.argv.slice(2);
const { EDITORIAL_DB_NAME, EDITORIAL_DB_USER, EDITORIAL_DB_PASSWORD, EDITORIAL_ACTOR } = process.env;
let connection;

try {
  if (options.length !== 1 || options[0] !== "--apply-staging") {
    throw new Error("Usage: node scripts/sermon-editorial.mjs <publish|withdraw> <slug> --apply-staging");
  }
  if (!/^u[0-9]+_newlife_stage$/.test(EDITORIAL_DB_NAME ?? "") || !EDITORIAL_DB_USER || !EDITORIAL_DB_PASSWORD) {
    throw new Error("The New Life staging editorial database settings are required");
  }
  validateEditorialRequest(action, slug, EDITORIAL_ACTOR);
  connection = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    database: EDITORIAL_DB_NAME,
    user: EDITORIAL_DB_USER,
    password: EDITORIAL_DB_PASSWORD,
    connectTimeout: 4000,
  });
  const result = await changePublication(connection, action, slug, EDITORIAL_ACTOR);
  if (result.outcome === "missing" || result.outcome === "invalid") {
    console.error(result.outcome === "missing" ? "Sermon not found." : `Cannot ${action} a sermon in state ${result.state}.`);
    process.exitCode = 1;
  } else {
    console.info(`Editorial state: ${result.state} (${result.outcome}). The site changes after the next successful snapshot refresh.`);
  }
} catch (error) {
  // Driver errors can include identifying SQL or connection details.
  console.error(connection || error?.code ? "Staging editorial change failed." : error.message);
  process.exitCode = 1;
} finally {
  await connection?.end();
}
