import { GridFSBucket, type Db, type MongoClient } from "mongodb";
import { connectMongoClient, readDatabaseConfiguration } from "./mongo-client.mjs";

export async function connectDB(): Promise<MongoClient> {
  return connectMongoClient();
}

export async function getDatabase(): Promise<Db> {
  const { databaseName } = readDatabaseConfiguration();
  return (await connectDB()).db(databaseName);
}

export async function mediaBucket() {
  return new GridFSBucket(await getDatabase(), { bucketName: "media" });
}
