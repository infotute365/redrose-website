import test from "node:test";
import assert from "node:assert/strict";
import {
  readDatabaseConfiguration,
  DatabaseConfigurationError,
} from "../scripts/lib/mongo-client.mjs";

test("database name is read from MONGODB_URI (same as St Mary)", () => {
  const config = readDatabaseConfiguration({
    MONGODB_URI: "mongodb://127.0.0.1:27017/red_rose_academy",
  });
  assert.equal(config.databaseName, "red_rose_academy");
});
test("MongoDB replica set connection string is supported", () => {
  const config = readDatabaseConfiguration({
    MONGODB_URI: "mongodb://node1:27017,node2:27017/red_rose_academy?replicaSet=rs0",
  });
  assert.equal(config.databaseName, "red_rose_academy");
});
test("database URI without database name is refused", () => {
  assert.throws(
    () => readDatabaseConfiguration({ MONGODB_URI: "mongodb://127.0.0.1:27017" }),
    DatabaseConfigurationError,
  );
  assert.throws(
    () =>
      readDatabaseConfiguration({
        MONGODB_URI: "mongodb://127.0.0.1:27017/stmarys",
        MONGODB_DATABASE: "red_rose_academy",
      }),
    DatabaseConfigurationError,
  );
});
