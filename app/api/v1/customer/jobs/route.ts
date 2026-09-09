export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      session.user.role !== "customer"
    ) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!ObjectId.isValid(session.user.id)) {
      return NextResponse.json(
        { message: "Invalid customer account" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const page = Math.max(
      Number.parseInt(searchParams.get("page") || "1"),
      1
    );

    const requestedLimit = Number.parseInt(
      searchParams.get("limit") || "10"
    );

    const limit = Math.min(
      Math.max(requestedLimit, 1),
      100
    );

    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const viewMode =
      searchParams.get("viewMode") || "list";

    const customerAccountObjectId = new ObjectId(
      session.user.id
    );

    const conditions: any[] = [
      {
        $or: [
          {
            customer_account_id:
              customerAccountObjectId,
          },
          {
            customer_account_id: session.user.id,
          },

          // Temporary fallback for legacy jobs
          {
            clientId: session.user.id,
          },
        ],
      },
    ];

    if (status && status !== "all") {
      conditions.push({
        status,
      });
    }

    if (startDate && endDate) {
      const startDateObject = new Date(startDate);
      const endDateObject = new Date(endDate);

      const startDateString =
        startDateObject.toISOString().split("T")[0];

      const endDateString =
        endDateObject.toISOString().split("T")[0];

      conditions.push({
        $or: [
          {
            $and: [
              {
                assignDate: {
                  $lte: endDateString,
                },
              },
              {
                expireDate: {
                  $gte: startDateString,
                },
              },
            ],
          },
          {
            $and: [
              {
                startDate: {
                  $lte: endDateObject,
                },
              },
              {
                dueDate: {
                  $gte: startDateObject,
                },
              },
            ],
          },
        ],
      });
    }

    if (search?.trim()) {
      conditions.push({
        $or: [
          {
            jobName: {
              $regex: search.trim(),
              $options: "i",
            },
          },
          {
            description: {
              $regex: search.trim(),
              $options: "i",
            },
          },
          {
            clientName: {
              $regex: search.trim(),
              $options: "i",
            },
          },
          {
            jobLocation: {
              $regex: search.trim(),
              $options: "i",
            },
          },
        ],
      });
    }

    const query = {
      $and: conditions,
    };

    const mongoClient = await clientPromise;
    const db = mongoClient.db();

    const total = await db
      .collection("jobs")
      .countDocuments(query);

    const skip = (page - 1) * limit;

    const jobs =
      viewMode === "calendar"
        ? await db
            .collection("jobs")
            .find(query)
            .sort({
              assignDate: -1,
              createdAt: -1,
            })
            .toArray()
        : await db
            .collection("jobs")
            .find(query)
            .sort({
              assignDate: -1,
              createdAt: -1,
            })
            .skip(skip)
            .limit(limit)
            .toArray();

    return NextResponse.json(
      {
        jobs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error in GET /api/v1/customer/jobs:",
      error
    );

    return NextResponse.json(
      {
        message: "Failed to load customer jobs",
      },
      { status: 500 }
    );
  }
}