import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vehicleId = params.id;
    if (!vehicleId || !ObjectId.isValid(vehicleId)) {
      return NextResponse.json(
        { message: "Invalid vehicle ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const vehicle = await db
      .collection("vehicles")
      .findOne({ _id: new ObjectId(vehicleId) });

    if (!vehicle) {
      return NextResponse.json(
        { message: "Vehicle not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const vehicleId = params.id;
    if (!vehicleId || !ObjectId.isValid(vehicleId)) {
      return NextResponse.json(
        { message: "Invalid vehicle ID" },
        { status: 400 }
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

    // Check if another vehicle with same name exists
    const existingVehicle = await db.collection("vehicles").findOne({
      name,
      _id: { $ne: new ObjectId(vehicleId) },
    });
    if (existingVehicle) {
      return NextResponse.json(
        { message: "Vehicle with this name already exists" },
        { status: 400 }
      );
    }

    const result = await db.collection("vehicles").updateOne(
      { _id: new ObjectId(vehicleId) },
      {
        $set: {
          name,
          type,
          pricePerMile: Number(pricePerMile),
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { message: "Vehicle not found or no changes made" },
        { status: 404 }
      );
    }

    const updatedVehicle = await db
      .collection("vehicles")
      .findOne({ _id: new ObjectId(vehicleId) });

    return NextResponse.json(updatedVehicle);
  } catch (error) {
    console.error("Error updating vehicle:", error);
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

    const vehicleId = params.id;
    if (!vehicleId || !ObjectId.isValid(vehicleId)) {
      return NextResponse.json(
        { message: "Invalid vehicle ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await db
      .collection("vehicles")
      .deleteOne({ _id: new ObjectId(vehicleId) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "Vehicle not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
