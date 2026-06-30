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
    const invoices = await db
      .collection("invoice")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Error in GET /api/invoice:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching invoices" },
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
    const data = await req.json();

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("invoice").insertOne({
      fileName: data.fileName,
      name: session.user.name,
      role: session.user.role,
      paymentStatus: false,
      createdAt: new Date(),
      fileType:data.fileType,
      webViewLink: data.webViewLink,
      invoiceNumber: data.invoiceNumber, // Add this line to store the invoice number
    });

    const newInvoice = await db
      .collection("invoice")
      .findOne({ _id: result.insertedId });
    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/create-invoice:", error);
    return NextResponse.json(
      { message: "An error occurred while creating the invoice" },
      { status: 500 }
    );
  }
}
