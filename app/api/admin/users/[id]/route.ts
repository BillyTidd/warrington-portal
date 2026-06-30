export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    const userId = params.id;

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const sanitizedUser = {
      _id: user._id.toString(),
      name: user.name || "",
      email: user.email || "",
      role: user.role || "employee",
      phone: user.phone || "",
      company: user.company || "",
      isApproved: !!user.isApproved,
      createdAt: user.createdAt
        ? user.createdAt.toISOString()
        : new Date().toISOString(),
    };

    return NextResponse.json(sanitizedUser);
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
