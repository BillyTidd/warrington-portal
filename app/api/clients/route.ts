export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { message: "Please log in to continue." },
        { status: 401 }
      );
    } 

    const client = await clientPromise;
    const db = client.db();
    const clients = await db
      .collection("clients")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(clients);
  } catch (error) {
    console.error("Error in GET /api/clients:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching clients" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name, description } = await req.json();
    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("clients").insertOne({
      name,
      description,
      createdAt: new Date(),
    });

    const newClient = await db
      .collection("clients")
      .findOne({ _id: result.insertedId });

    return NextResponse.json(newClient, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/clients:", error);
    return NextResponse.json(
      { message: "An error occurred while creating the client" },
      { status: 500 }
    );
  }
}
