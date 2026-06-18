// scripts/init-user.ts — Lightweight DB init (safe to run on every start)
// Creates default admin user if missing — never deletes existing data.
// Author: Sudarshan Sonawane

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.count();

  if (existing > 0) {
    console.log(`  ⏭️  ${existing} user(s) exist — skipping init`);
    return;
  }

  console.log("  🌱 No users found — creating default admin...");
  const password = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@posystem.com" },
    update: {},
    create: {
      email: "admin@posystem.com",
      password,
      name: "Admin",
      role: "admin",
      isActive: true,
    },
  });
  console.log("  ✅ Default admin created (admin@posystem.com / admin123)");
}

main()
  .catch((e) => {
    console.error("  ❌ Init failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
