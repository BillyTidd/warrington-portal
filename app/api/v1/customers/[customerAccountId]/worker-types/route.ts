export const dynamic = "force-dynamic";

import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { type NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { ensureCustomerWorkerTypes } from "@/lib/customer-worker-types";
import clientPromise from "@/lib/mongodb";

function serializeWorkerType(record: any) {
  return {
    ...record,
    _id: record._id.toString(),
    customer_account_id: record.customer_account_id.toString(),
    source_worker_type_id:
      record.source_worker_type_id?.toString() || null,
  };
}

function normalizeWorkerTypeValue(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { customerAccountId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!ObjectId.isValid(params.customerAccountId)) {
      return NextResponse.json(
        { message: "Invalid customer account ID" },
        { status: 400 }
      );
    }

    const isAdmin = session.user.role === "admin";
    const isOwner =
      session.user.role === "customer" &&
      session.user.id === params.customerAccountId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { message: "You cannot access these rates" },
        { status: 403 }
      );
    }

    const customerAccountId = new ObjectId(
      params.customerAccountId
    );
    const mongoClient = await clientPromise;
    const db = mongoClient.db();

    await ensureCustomerWorkerTypes(db, customerAccountId);

    const workerTypes = await db
      .collection("customer_worker_types")
      .find({ customer_account_id: customerAccountId })
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json(
      workerTypes.map(serializeWorkerType),
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Unable to load customer worker types:", error);

    return NextResponse.json(
      { message: "Unable to load worker types" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { customerAccountId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Admin access required" },
        { status: 403 }
      );
    }

    if (!ObjectId.isValid(params.customerAccountId)) {
      return NextResponse.json(
        { message: "Invalid customer account ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const name = String(body.name || "").trim();
    const value = normalizeWorkerTypeValue(body.value || name);
    const dayRate = Number(body.dayRate);
    const overtimeRate = Number(body.overtimeRate);

    if (
      !name ||
      !value ||
      !Number.isFinite(dayRate) ||
      !Number.isFinite(overtimeRate) ||
      dayRate < 0 ||
      overtimeRate < 0
    ) {
      return NextResponse.json(
        {
          message:
            "Name and valid non-negative rates are required",
        },
        { status: 400 }
      );
    }

    const customerAccountId = new ObjectId(
      params.customerAccountId
    );
    const mongoClient = await clientPromise;
    const db = mongoClient.db();

    await ensureCustomerWorkerTypes(db, customerAccountId);

    const duplicate = await db
      .collection("customer_worker_types")
      .findOne({
        customer_account_id: customerAccountId,
        value,
      });

    if (duplicate) {
      return NextResponse.json(
        { message: "This customer already has that worker type" },
        { status: 409 }
      );
    }

    const now = new Date();
    const record = {
      customer_account_id: customerAccountId,
      source_worker_type_id: null,
      name,
      value,
      dayRate,
      overtimeRate,
      icon: String(body.icon || "HardHat"),
      createdAt: now,
      updatedAt: now,
    };

    const result = await db
      .collection("customer_worker_types")
      .insertOne(record);

    return NextResponse.json(
      serializeWorkerType({
        _id: result.insertedId,
        ...record,
      }),
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Unable to create customer worker type:", error);

    if (error?.code === 11000) {
      return NextResponse.json(
        { message: "This customer already has that worker type" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Unable to create worker type" },
      { status: 500 }
    );
  }
}
