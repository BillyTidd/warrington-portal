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
  mileage?: { miles: number; amount: number } | number;
  expenses?: { description: string; amount: number } | number;
  overtime?: { hours: number; amount: number } | number;
  sustenance?: { description: string; amount: number } | number;
  totalAmount?: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const client = await clientPromise;
    const db = client.db();

    let entries = await db
      .collection("entries")
      .find(user.role === "admin" ? {} : { userId: new ObjectId(user.id) })
      .toArray();

    // Transform entries to ensure consistent structure
    entries = entries.map((entry) => {
      const transformed: any = {
        ...entry,
        mileage:
          typeof entry.mileage === "number"
            ? { miles: entry.mileage, amount: entry.mileage * 0.45 }
            : entry.mileage || { miles: 0, amount: 0 },
        expenses:
          typeof entry.expenses === "number"
            ? { description: "", amount: entry.expenses }
            : entry.expenses || { description: "", amount: 0 },
        overtime:
          typeof entry.overtime === "number"
            ? { hours: entry.overtime, amount: entry.overtime * 15 }
            : entry.overtime || { hours: 0, amount: 0 },
        sustenance:
          typeof entry.sustenance === "number"
            ? { description: "", amount: entry.sustenance }
            : entry.sustenance || { description: "", amount: 0 },
      };

      if (!transformed.totalAmount) {
        transformed.totalAmount =
          transformed.mileage.amount +
          transformed.expenses.amount +
          transformed.overtime.amount +
          transformed.sustenance.amount;
      }

      return transformed;
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error in GET /api/entries:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching entries" },
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

    const user = session.user as SessionUser;
    const data: EntryData = await req.json();

    const mileageAmount = round2(
      Number(
        data.mileage && typeof data.mileage !== "number"
          ? data.mileage.amount
          : 0
      )
    );
    const expensesAmount = round2(
      Number(
        data.expenses && typeof data.expenses !== "number"
          ? data.expenses.amount
          : data.expenses || 0
      )
    );
    const overtimeAmount = round2(
      Number(
        data.overtime && typeof data.overtime !== "number"
          ? data.overtime.amount
          : 0
      )
    );
    const sustenanceAmount = round2(
      Number(
        data.sustenance && typeof data.sustenance !== "number"
          ? data.sustenance.amount
          : data.sustenance || 0
      )
    );

    const entry = {
      userId: new ObjectId(user.id),
      userName: user.name,
      date: data.date,
      client: data.client,
      description: data.description,
      mileage: {
        miles: Number(
          data.mileage && typeof data.mileage !== "number"
            ? data.mileage.miles
            : data.mileage || 0
        ),
        amount: mileageAmount,
      },
      expenses: {
        description:
          data.expenses && typeof data.expenses !== "number"
            ? data.expenses.description
            : "",
        amount: expensesAmount,
      },
      overtime: {
        hours: Number(
          data.overtime && typeof data.overtime !== "number"
            ? data.overtime.hours
            : data.overtime || 0
        ),
        amount: overtimeAmount,
      },
      sustenance: {
        description:
          data.sustenance && typeof data.sustenance !== "number"
            ? data.sustenance.description
            : "",
        amount: sustenanceAmount,
      },
      totalAmount: round2(Number(data.totalAmount || 0)),
    };

    const clientInstance = await clientPromise;
    const db = clientInstance.db();
    const result = await db.collection("entries").insertOne(entry);

    return NextResponse.json(
      { message: "Entry created successfully", entryId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/entries:", error);
    return NextResponse.json(
      { message: "An error occurred while creating the entry" },
      { status: 500 }
    );
  }
}
