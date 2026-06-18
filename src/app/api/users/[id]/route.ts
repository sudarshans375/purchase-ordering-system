// src/app/api/users/[id]/route.ts — Users CRUD by ID
// Author: Sudarshan Sonawane

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const updateUserSchema = z.object({
  email: z.string().email("Valid email is required.").optional(),
  password: z.string().min(6, "Password must be at least 6 characters.").optional(),
  name: z.string().min(1, "Name is required.").optional(),
  role: z.enum(["admin", "manager", "viewer"]).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await request.json();
    const data = updateUserSchema.parse(body);

    // Check user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found." } },
        { status: 404 }
      );
    }

    // Check if email is taken by another user
    if (data.email) {
      const existing = await prisma.user.findFirst({
        where: {
          email: data.email.toLowerCase(),
          NOT: { id },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: { code: "EMAIL_EXISTS", message: "A user with this email already exists." } },
          { status: 409 }
        );
      }
    }

    // Hash password if provided
    let updatePayload: any = { ...data };
    if (data.password) {
      updatePayload.password = await bcrypt.hash(data.password, 12);
    }
    if (data.email) {
      updatePayload.email = data.email.toLowerCase();
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updatePayload,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: error.issues[0]?.message || "Invalid input." } },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update user." } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found." } },
        { status: 404 }
      );
    }

    // Last-admin guard: prevent deleting the only admin user
    if (user.role === "admin") {
      const adminCount = await prisma.user.count({
        where: { role: "admin", isActive: true },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          {
            error: {
              code: "LAST_ADMIN",
              message:
                "Cannot delete the last admin user. " +
                "Promote another user to admin first before deleting this account.",
            },
          },
          { status: 409 }
        );
      }
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ data: { deleted: true, id } });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete user." } },
      { status: 500 }
    );
  }
}
