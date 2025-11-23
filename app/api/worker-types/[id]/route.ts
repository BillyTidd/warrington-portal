import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Admin access required" },
        { status: 403 }
      );
    }

    const { name, value, dayRate, overtimeRate, icon } = await request.json();

    if (!name || !value || !dayRate || !overtimeRate) {
      return NextResponse.json(
        {
          message:
            "All fields (name, value, dayRate, overtimeRate) are required",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Check if another worker type with same value exists (excluding current one)
    const existingWorkerType = await db.collection("worker-types").findOne({
      value,
      _id: { $ne: new ObjectId(params.id) },
    });

    if (existingWorkerType) {
      return NextResponse.json(
        { message: "Worker type with this value already exists" },
        { status: 400 }
      );
    }

    const result = await db.collection("worker-types").updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          name,
          value,
          dayRate: Number(dayRate),
          overtimeRate: Number(overtimeRate),
          icon: icon || "HardHat",
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Worker type not found" },
        { status: 404 }
      );
    }

    const updatedWorkerType = await db
      .collection("worker-types")
      .findOne({ _id: new ObjectId(params.id) });

    return NextResponse.json(updatedWorkerType);
  } catch (error) {
    console.error("Error updating worker type:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Admin access required" },
        { status: 403 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await db
      .collection("worker-types")
      .deleteOne({ _id: new ObjectId(params.id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "Worker type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Worker type deleted successfully" });
  } catch (error) {
    console.error("Error deleting worker type:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
