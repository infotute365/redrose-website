import { MongoClient } from "mongodb";
import { createHash } from "node:crypto";

export class DatabaseConfigurationError extends Error {
  constructor() {
    super(
      "Set a valid MONGODB_URI and explicit MONGODB_DATABASE in the private server environment.",
    );
    this.name = "DatabaseConfigurationError";
  }
}
export class DatabaseUnavailableError extends Error {
  constructor() {
    super("The database is temporarily unavailable.");
    this.name = "DatabaseUnavailableError";
  }
}
export function readDatabaseConfiguration(environment = process.env) {
  const uri = environment.MONGODB_URI;
  const databaseName = environment.MONGODB_DATABASE;
  if (
    !uri ||
    !/^mongodb(?:\+srv)?:\/\//.test(uri) ||
    !databaseName ||
    !/^[A-Za-z0-9_-]{1,63}$/.test(databaseName)
  )
    throw new DatabaseConfigurationError();
  return { uri, databaseName };
}

/** Shared implementation for Next.js and compatible plain-Node maintenance tools. */
export function createMongoConnectionManager(Client = MongoClient) {
  /** @type {{key?: string, client?: import("mongodb").MongoClient, promise?: Promise<import("mongodb").MongoClient>}} */
  const state = {};
  return {
    async connect(environment = process.env) {
      const { uri } = readDatabaseConfiguration(environment);
      const key = createHash("sha256").update(uri).digest("hex");
      if (state.promise && state.key === key) return state.promise;
      if (state.client && state.key !== key) await state.client.close().catch(() => {});
      let client;
      try {
        client = new Client(uri, {
          maxPoolSize: 20,
          minPoolSize: 0,
          maxConnecting: 2,
          retryWrites: true,
          appName: "red-rose-academy",
          maxIdleTimeMS: 60_000,
          connectTimeoutMS: 7000,
          serverSelectionTimeoutMS: 7000,
          waitQueueTimeoutMS: 7000,
        });
      } catch {
        throw new DatabaseConfigurationError();
      }
      state.client = client;
      state.key = key;
      const attempt = client.connect().catch(async () => {
        if (state.promise === attempt) {
          state.promise = undefined;
          state.client = undefined;
          state.key = undefined;
        }
        await client.close().catch(() => {});
        throw new DatabaseUnavailableError();
      });
      state.promise = attempt;
      return attempt;
    },
    async close() {
      const client = state.client;
      state.client = undefined;
      state.promise = undefined;
      state.key = undefined;
      await client?.close();
    },
  };
}
const cacheKey = Symbol.for("red-rose.mongo-connection.v2");
const manager = globalThis[cacheKey] || (globalThis[cacheKey] = createMongoConnectionManager());
export const connectMongoClient = (environment = process.env) => manager.connect(environment);
export const closeMongoClient = () => manager.close();
