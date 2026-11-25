import { createServer } from "node:http";
import mysql from "mysql2/promise";
import { createSermonAdmin } from "./lib/sermon-admin.mjs";

const { ADMIN_ORIGIN, ADMIN_USER, ADMIN_PASSWORD, ADMIN_ACTOR,
  EDITORIAL_DB_NAME, EDITORIAL_DB_USER, EDITORIAL_DB_PASSWORD } = process.env;
if (!/^https:\/\/[a-z0-9-]+\.hostingersite\.com$/.test(ADMIN_ORIGIN ?? "")
  || ADMIN_ORIGIN === "https://legendary-white-clam-37.hostingersite.com"
  || !ADMIN_USER || ADMIN_USER.includes(":") || (ADMIN_PASSWORD?.length ?? 0) < 24
  || !ADMIN_ACTOR?.trim() || ADMIN_ACTOR.trim().length > 200
  || !/^u[0-9]+_newlife_stage$/.test(EDITORIAL_DB_NAME ?? "") || !EDITORIAL_DB_USER || !EDITORIAL_DB_PASSWORD) {
  console.error("Separate New Life staging admin settings are required.");
  process.exit(1);
}

const pool = mysql.createPool({
  host: "127.0.0.1", port: 3306, database: EDITORIAL_DB_NAME,
  user: EDITORIAL_DB_USER, password: EDITORIAL_DB_PASSWORD,
  dateStrings: true, connectionLimit: 3, queueLimit: 12, connectTimeout: 4000,
});
createServer(createSermonAdmin({
  pool, origin: ADMIN_ORIGIN, username: ADMIN_USER, password: ADMIN_PASSWORD, actor: ADMIN_ACTOR.trim(),
})).listen(Number(process.env.PORT ?? 3000), "0.0.0.0");
