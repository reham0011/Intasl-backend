// One-time script to promote an existing user to super_admin.
// Usage: node src/scripts/makeSuperAdmin.js someone@example.com
import "dotenv/config";
import { connectDB, getDB } from "../config/db.js";
import { ROLES } from "../models/user.js";

async function run() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node src/scripts/makeSuperAdmin.js <email>");
    process.exit(1);
  }

  await connectDB();
  const db = getDB();

  const result = await db.collection("users").updateOne(
    { email: email.trim().toLowerCase() },
    { $set: { accountRole: ROLES.SUPER_ADMIN, isAdmin: true } }
  );

  if (result.matchedCount === 0) {
    console.error(`No user found with email: ${email}`);
  } else {
    console.log(`✅ ${email} is now a super_admin`);
  }

  process.exit(0);
}

run();