import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI .env Not provided in the file.");
}

let client;
let db;

export async function connectDB() {
  if (db) return db;

  client = new MongoClient(uri);
  await client.connect();
  db = client.db("intasl-logistics");
  console.log("MongoDB connected");
  return db;
}

export function getDB() {
  if (!db) {
    throw new Error("Database is not connected. Call connectDB() first.");
  }
  return db;
}