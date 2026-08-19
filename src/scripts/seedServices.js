import "dotenv/config";
import { connectDB } from "../config/db.js";
import { servicesData } from "../data/servicesData.js";

async function seed() {
  const db = await connectDB();
  const collection = db.collection("services");

  await collection.deleteMany({}); // পুরনো data clear
  await collection.insertMany(servicesData);

  console.log(`${servicesData.length} service insert done`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("SEED ERROR:", err);
  process.exit(1);
});