import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";

interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  id: string;
  role: string;
}

interface EntryData {
  date: string;
  client: string;
  description: string;
  mileage?: { miles: number; amount: number };
  expenses?: { description: string; amount: number };
  overtime?: { hours: number; amount: number };
  sustenance?: { description: string; amount: number };
  totalAmount?: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const data: EntryData = await req.json();

    // Calculate amounts based on rates, rounded to 2 decimal places
    const mileageAmount = round2(Number(data.mileage?.miles || 0) * 0.45);
    const overtimeAmount = round2(Number(data.overtime?.hours || 0) * 15);
    const expensesAmount = round2(Number(data.expenses?.amount || 0));
    const sustenanceAmount = round2(Number(data.sustenance?.amount || 0));

    const updateData = {
      date: data.date,
      client: data.client,
      description: data.description,
      mileage: {
        miles: Number(data.mileage?.miles || 0),
        amount: mileageAmount,
      },
      expenses: {
        description: data.expenses?.description || "",
        amount: expensesAmount,
      },
      overtime: {
        hours: Number(data.overtime?.hours || 0),
        amount: overtimeAmount,
      },
      sustenance: {
        description: data.sustenance?.description || "",
        amount: sustenanceAmount,
      },
      totalAmount: round2(
        mileageAmount + expensesAmount + overtimeAmount + sustenanceAmount
      ),
    };

    const clientInstance = await clientPromise;
    const db = clientInstance.db();

    const filter = {
      _id: new ObjectId(params.id),
      ...(user.role !== "admin" && { userId: new ObjectId(user.id) }),
    };

    const result = await db
      .collection("entries")
      .updateOne(filter, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Entry not found or you do not have permission to edit it" },
        { status: 404 }
      );
    }

    // Fetch and return the updated entry
    const updatedEntry = await db
      .collection("entries")
      .findOne({ _id: new ObjectId(params.id) });
    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error("Error in PUT /api/entries/[id]:", error);
    return NextResponse.json(
      { message: "An error occurred while updating the entry" },
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

    const user = session.user as SessionUser;
    const clientInstance = await clientPromise;
    const db = clientInstance.db();

    // Store the entry before deletion for potential rollback or response
    const entryToDelete = await db.collection("entries").findOne({
      _id: new ObjectId(params.id),
    });

    if (!entryToDelete) {
      return NextResponse.json({ message: "Entry not found" }, { status: 404 });
    }

    // Check permissions
    if (user.role !== "admin" && entryToDelete.userId.toString() !== user.id) {
      return NextResponse.json(
        { message: "You do not have permission to delete this entry" },
        { status: 403 }
      );
    }

    const result = await db.collection("entries").deleteOne({
      _id: new ObjectId(params.id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "Entry could not be deleted" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Entry deleted successfully",
      deletedEntry: entryToDelete,
    });
  } catch (error) {
    console.error("Error in DELETE /api/entries/[id]:", error);
    return NextResponse.json(
      { message: "An error occurred while deleting the entry" },
      { status: 500 }
    );
  }
}
