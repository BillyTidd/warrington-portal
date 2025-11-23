import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const workerTypes = await db
      .collection("worker-types")
      .find({})
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json(workerTypes);
  } catch (error) {
    console.error("Error fetching worker types:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== "admin") {
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

    // Check if worker type with same value already exists
    const existingWorkerType = await db
      .collection("worker-types")
      .findOne({ value });
    if (existingWorkerType) {
      return NextResponse.json(
        { message: "Worker type with this value already exists" },
        { status: 400 }
      );
    }

    const workerType = {
      name,
      value,
      dayRate: Number(dayRate),
      overtimeRate: Number(overtimeRate),
      icon: icon || "HardHat",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("worker-types").insertOne(workerType);

    const newWorkerType = await db
      .collection("worker-types")
      .findOne({ _id: result.insertedId });

    return NextResponse.json(newWorkerType, { status: 201 });
  } catch (error) {
    console.error("Error creating worker type:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
