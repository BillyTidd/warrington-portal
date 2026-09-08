export const dynamic = "force-dynamic";

import { ObjectId, type Document } from "mongodb";
import { getServerSession } from "next-auth/next";
import { type NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

function serializeManager(manager: Document) {
  return {
    ...manager,
    _id: manager._id.toString(),
    customer_account_id:
      manager.customer_account_id.toString(),
    fullName:
      manager.fullName ||
      `${manager.firstName || ""} ${
        manager.lastName || ""
      }`.trim(),
  };
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      customerAccountId: string;
    };
  }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Please log in to continue." },
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

    const isCustomerOwner =
      session.user.role === "customer" &&
      session.user.id === params.customerAccountId;

    if (!isAdmin && !isCustomerOwner) {
      return NextResponse.json(
        {
          message:
            "You do not have access to these managers",
        },
        { status: 403 }
      );
    }

    const customerAccountId = new ObjectId(
      params.customerAccountId
    );

    const client = await clientPromise;
    const db = client.db();

    const customerAccount = await db
      .collection("users")
      .findOne({
        _id: customerAccountId,
        role: "customer",
      });

    if (!customerAccount) {
      return NextResponse.json(
        { message: "Customer account not found" },
        { status: 404 }
      );
    }

    const includeInactive =
      request.nextUrl.searchParams.get(
        "includeInactive"
      ) === "true";

    const query: Record<string, unknown> = {
      customer_account_id: customerAccountId,
    };

    if (!includeInactive) {
      query.status = "active";
    }

    const managers = await db
      .collection("customer_site_managers")
      .find(query)
      .sort({
        status: 1,
        firstName: 1,
        lastName: 1,
      })
      .toArray();

    return NextResponse.json(
      managers.map(serializeManager)
    );
  } catch (error) {
    console.error(
      "Error fetching customer managers:",
      error
    );

    return NextResponse.json(
      { message: "Unable to fetch managers" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      customerAccountId: string;
    };
  }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Please log in to continue." },
        { status: 401 }
      );
    }

    if (!ObjectId.isValid(params.customerAccountId)) {
      return NextResponse.json(
        { message: "Invalid customer account ID" },
        { status: 400 }
      );
    }

    if (
      session.user.role !== "customer" ||
      session.user.id !== params.customerAccountId
    ) {
      return NextResponse.json(
        {
          message:
            "You can create managers only for your own account",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const firstName = String(
      body.firstName || ""
    ).trim();

    const lastName = String(
      body.lastName || ""
    ).trim();

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const phone = String(body.phone || "").trim();

    if (!firstName || !lastName) {
      return NextResponse.json(
        {
          message:
            "First name and last name are required",
        },
        { status: 400 }
      );
    }

    if (
      firstName.length > 100 ||
      lastName.length > 100
    ) {
      return NextResponse.json(
        {
          message:
            "First name and last name must be 100 characters or fewer",
        },
        { status: 400 }
      );
    }

    if (email && !validateEmail(email)) {
      return NextResponse.json(
        {
          message:
            "Enter a valid manager email address",
        },
        { status: 400 }
      );
    }

    if (phone.length > 50) {
      return NextResponse.json(
        {
          message:
            "Phone number must be 50 characters or fewer",
        },
        { status: 400 }
      );
    }

    const customerAccountId = new ObjectId(
      params.customerAccountId
    );

    const client = await clientPromise;
    const db = client.db();

    const customerAccount = await db
      .collection("users")
      .findOne({
        _id: customerAccountId,
        role: "customer",
      });

    if (!customerAccount) {
      return NextResponse.json(
        { message: "Customer account not found" },
        { status: 404 }
      );
    }

    const now = new Date();

    const managerRecord = {
      customer_account_id: customerAccountId,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email: email || null,
      phone: phone || null,
      status: "active",
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
      deactivatedAt: null,
    };

    const result = await db
      .collection("customer_site_managers")
      .insertOne(managerRecord);

    /*
     * Connect the authenticated customer account to
     * the existing Admin Clients roster.
     *
     * The account password is never copied.
     */
    await db.collection("clients").updateOne(
      {
        customerAccountId,
      },
      {
        $set: {
          name:
            customerAccount.company ||
            customerAccount.name ||
            customerAccount.email,
          customerAccountId,
          updatedAt: now,
        },
        $setOnInsert: {
          description: "Customer portal account",
          createdAt:
            customerAccount.createdAt || now,
        },
      },
      {
        upsert: true,
      }
    );

    return NextResponse.json(
      serializeManager({
        _id: result.insertedId,
        ...managerRecord,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Error creating customer manager:",
      error
    );

    return NextResponse.json(
      { message: "Unable to create manager" },
      { status: 500 }
    );
  }
}