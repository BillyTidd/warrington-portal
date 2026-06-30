export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name, description } = await req.json();
    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("clients").findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          name,
          description,
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in PUT /api/clients/[id]:", error);
    if (error instanceof Error && error.name === "BSONTypeError") {
      return NextResponse.json(
        { message: "Invalid client ID" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "An error occurred while updating the client" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await db
      .collection("clients")
      .deleteOne({ _id: new ObjectId(params.id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Client deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE /api/clients/[id]:", error);
    if (error instanceof Error && error.name === "BSONTypeError") {
      return NextResponse.json(
        { message: "Invalid client ID" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "An error occurred while deleting the client" },
      { status: 500 }
    );
  }
}
