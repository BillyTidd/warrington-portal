export const dynamic = "force-dynamic";

import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { type NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

function idsAreValid(params: {
  customerAccountId: string;
  workerTypeId: string;
}) {
  return (
    ObjectId.isValid(params.customerAccountId) &&
    ObjectId.isValid(params.workerTypeId)
  );
}

function serializeWorkerType(record: any) {
  return {
    ...record,
    _id: record._id.toString(),
    customer_account_id: record.customer_account_id.toString(),
    source_worker_type_id:
      record.source_worker_type_id?.toString() || null,
  };
}

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      customerAccountId: string;
      workerTypeId: string;
    };
  }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Admin access required" },
        { status: 403 }
      );
    }

    if (!idsAreValid(params)) {
      return NextResponse.json(
        { message: "Invalid ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const name = String(body.name || "").trim();
    const dayRate = Number(body.dayRate);
    const overtimeRate = Number(body.overtimeRate);

    if (
      !name ||
      !Number.isFinite(dayRate) ||
      !Number.isFinite(overtimeRate) ||
      dayRate < 0 ||
      overtimeRate < 0
    ) {
      return NextResponse.json(
        { message: "Valid name and rates are required" },
        { status: 400 }
      );
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db();
    const updated = await db
      .collection("customer_worker_types")
      .findOneAndUpdate(
        {
          _id: new ObjectId(params.workerTypeId),
          customer_account_id: new ObjectId(
            params.customerAccountId
          ),
        },
        {
          $set: {
            name,
            dayRate,
            overtimeRate,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" }
      );

    if (!updated) {
      return NextResponse.json(
        { message: "Worker type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(serializeWorkerType(updated));
  } catch (error) {
    console.error("Unable to update customer worker type:", error);

    return NextResponse.json(
      { message: "Unable to update worker type" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: {
    params: {
      customerAccountId: string;
      workerTypeId: string;
    };
  }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Admin access required" },
        { status: 403 }
      );
    }

    if (!idsAreValid(params)) {
      return NextResponse.json(
        { message: "Invalid ID" },
        { status: 400 }
      );
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db();
    const result = await db
      .collection("customer_worker_types")
      .deleteOne({
        _id: new ObjectId(params.workerTypeId),
        customer_account_id: new ObjectId(
          params.customerAccountId
        ),
      });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "Worker type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Worker type removed successfully",
    });
  } catch (error) {
    console.error("Unable to remove customer worker type:", error);

    return NextResponse.json(
      { message: "Unable to remove worker type" },
      { status: 500 }
    );
  }
}
