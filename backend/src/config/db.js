import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
const databaseHost = databaseUrl ? new URL(databaseUrl).hostname : "";
const isLocalDatabase = databaseHost === "localhost" || databaseHost === "127.0.0.1";
const pool = mysql.createPool({
  uri: databaseUrl,
  ...(isLocalDatabase ? {} : { ssl: { rejectUnauthorized: false } }),
  connectTimeout: 20000,
});

function createQueryable(connection) {
  return {
    async query(sql, parameters = []) {
      const [result] = await connection.query(sql, parameters);
      if (Array.isArray(result)) {
        return { rows: result, rowCount: result.length };
      }
      return {
        rows: [],
        rowCount: result.affectedRows,
        insertId: result.insertId,
      };
    },
  };
}

export const db = createQueryable(pool);

export async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(createQueryable(connection));
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function closeDatabase() {
  await pool.end();
}
