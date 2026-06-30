export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { userId, action } = await req.json();
    const client = await clientPromise;
    const db = client.db();

    if (action === "approve") {
      await db
        .collection("users")
        .updateOne(
          { _id: new ObjectId(userId) },
          { $set: { isApproved: true } }
        );
      return NextResponse.json(
        { message: "User approved successfully" },
        { status: 200 }
      );
    } else if (action === "decline") {
      await db.collection("users").deleteOne({ _id: new ObjectId(userId) });
      return NextResponse.json(
        { message: "User declined and deleted successfully" },
        { status: 200 }
      );
    } else {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "An error occurred while processing the user action" },
      { status: 500 }
    );
  }
}
