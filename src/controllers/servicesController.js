import { getDB } from "../config/db.js";

export async function getAllServices(req, res) {
  try {
    const db = getDB();
    const services = await db
      .collection("services")
      .find({}, { projection: { _id: 0 } })
      .sort({ id: 1 })
      .toArray();

    return res.json({ services });
  } catch (err) {
    console.error("GET SERVICES ERROR:", err);
    return res.status(500).json({ error: "Failed to add service data" });
  }
}