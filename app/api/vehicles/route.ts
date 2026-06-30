export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const vehicles = await db
      .collection("vehicles")
      .find({})
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json(vehicles);
  } catch (error) {
    console.error("Error fetching vehicles:", error);
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

    const { name, type, pricePerMile } = await request.json();

    if (!name || !type || !pricePerMile) {
      return NextResponse.json(
        { message: "All fields (name, type, pricePerMile) are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Check if vehicle with same name already exists
    const existingVehicle = await db.collection("vehicles").findOne({ name });
    if (existingVehicle) {
      return NextResponse.json(
        { message: "Vehicle with this name already exists" },
        { status: 400 }
      );
    }

    const vehicle = {
      name,
      type,
      pricePerMile: Number(pricePerMile),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("vehicles").insertOne(vehicle);

    const newVehicle = await db
      .collection("vehicles")
      .findOne({ _id: result.insertedId });

    return NextResponse.json(newVehicle, { status: 201 });
  } catch (error) {
    console.error("Error creating vehicle:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
