import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createMongoConnectionManager,
  DatabaseConfigurationError,
  DatabaseUnavailableError,
  readDatabaseConfiguration,
} from "../src/server/config/mongo-client.mjs";
const environment = { MONGODB_URI: "mongodb://127.0.0.1:27017", MONGODB_DATABASE: "isolated_test" };

test("concurrent database calls share one connection and bounded pool", async () => {
  let created = 0;
  let closed = 0;
  let options;
  class Client {
    constructor(_uri, configuration) {
      created++;
      options = configuration;
    }
    async connect() {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return this;
    }
    async close() {
      closed++;
    }
  }
  const manager = createMongoConnectionManager(Client);
  const clients = await Promise.all(Array.from({ length: 20 }, () => manager.connect(environment)));
  assert.equal(created, 1);
  assert.ok(clients.every((client) => client === clients[0]));
  assert.equal(options.maxPoolSize, 20);
  assert.equal(options.serverSelectionTimeoutMS, 7000);
  await manager.close();
  assert.equal(closed, 1);
});

test("a failed initial connection is closed and the next request can retry", async () => {
  let created = 0;
  let closed = 0;
  class Client {
    constructor() {
      this.attempt = ++created;
    }
    async connect() {
      if (this.attempt === 1) throw new Error("mongodb://private:password@host");
      return this;
    }
    async close() {
      closed++;
    }
  }
  const manager = createMongoConnectionManager(Client);
  await assert.rejects(
    manager.connect(environment),
    (error) => error instanceof DatabaseUnavailableError && !error.message.includes("password"),
  );
  assert.equal(closed, 1);
  assert.ok(await manager.connect(environment));
  assert.equal(created, 2);
  await manager.close();
});

test("database configuration requires an explicit safe name and never echoes credentials", () => {
  for (const configuration of [
    {},
    { ...environment, MONGODB_DATABASE: "unsafe/name" },
    { ...environment, MONGODB_URI: "https://private:password@host" },
  ])
    assert.throws(() => readDatabaseConfiguration(configuration), DatabaseConfigurationError);
});
