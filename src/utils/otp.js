import crypto from "crypto";
import bcrypt from "bcryptjs";

export function generateOTP() {
  return String(crypto.randomInt(100000, 999999));
}

export async function hashOTP(otp) {
  return bcrypt.hash(otp, 10);
}

export async function compareOTP(otp, hash) {
  return bcrypt.compare(otp, hash);
}