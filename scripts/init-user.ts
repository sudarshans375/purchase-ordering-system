// scripts/init-user.ts — Lightweight DB init (safe to run on every start)
// Creates the initial admin user only if no users exist.
// Author: Sudarshan Sonawane

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.count();

  if (existing > 0) {
    console.log(`  ⏭️  ${existing} user(s) exist — skipping init`);
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@posystem.com";
  const adminName = process.env.ADMIN_NAME ?? "Admin";

  // Read ADMIN_PASSWORD from env. If unset, generate a strong random
  // password and print a "set your password" message instead of the
  // password itself — so the credential is never logged.
  let adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    adminPassword = randomBytes(24).toString("base64url");
    console.warn(
      "\n  ⚠️  ADMIN_PASSWORD env var not set. Generated a strong random password."
    );
    console.warn(
      "  ⚠️  A reset-password link would normally be sent to the admin email."
    );
    console.warn(
      "  ⚠️  For development, the password is shown ONCE below — copy it now."
    );
    console.warn(`\n  >>> ADMIN PASSWORD: ${adminPassword} <<<\n`);
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: passwordHash,
      name: adminName,
      role: "admin",
      isActive: true,
    },
  });

  console.log(`  ✅ Default admin created: ${adminEmail}`);
  if (process.env.ADMIN_PASSWORD) {
    console.log("  ℹ️  Using ADMIN_PASSWORD from environment.");
  }
}

main()
  .catch((e) => {
    console.error("  ❌ Init failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());