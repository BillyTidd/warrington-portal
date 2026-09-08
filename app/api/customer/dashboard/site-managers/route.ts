import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";

import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

type ManagerDocument = {
  customer_account_id: ObjectId;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deactivatedAt: Date | null;
};

/*
 * IMPORTANT:
 * Replace this function with your project's existing authentication.
 *
 * It must return the MongoDB users._id belonging to the currently
 * logged-in customer.
 *
 * Never obtain customer_account_id from the request body.
 */
async function getAuthenticatedCustomerId(
  _request: NextRequest
): Promise<string | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  const sessionUser = session.user as {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
  };

  if (!sessionUser.id || !ObjectId.isValid(sessionUser.id)) {
    return null;
  }

  const customerId = new ObjectId(sessionUser.id);

  const client = await clientPromise;
  const db = client.db();

  const customer = await db.collection("users").findOne({
    _id: customerId,
    isApproved: true,
  });

  if (!customer) {
    return null;
  }

  /*
   * Add the customer role check after confirming the exact role value
   * stored in your users collection.
   *
   * For example:
   */
    if (customer.role !== "customer") {
      return null;
    }
   

  return customer._id.toString();
}

function serializeManager(manager: ManagerDocument & { _id: ObjectId }) {
  return {
    ...manager,
    _id: manager._id.toString(),
    customer_account_id: manager.customer_account_id.toString(),
    createdBy: manager.createdBy.toString(),
  };
}

/*
 * GET /api/customer/site-managers
 * Returns managers belonging to the logged-in customer.
 */
export async function GET(request: NextRequest) {
  try {
    const authenticatedCustomerId =
      await getAuthenticatedCustomerId(request);

    if (
      !authenticatedCustomerId ||
      !ObjectId.isValid(authenticatedCustomerId)
    ) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const databaseName = process.env.MONGODB_DB_NAME;

    if (!databaseName) {
      return NextResponse.json(
        { error: "MONGODB_DB_NAME is not configured." },
        { status: 500 }
      );
    }

    const customerAccountId = new ObjectId(authenticatedCustomerId);

    // This is where your original code belongs.
    const client = await clientPromise;
    const db = client.db(databaseName);
    const customerSiteManagers =
      db.collection<ManagerDocument>("customer_site_managers");

    const managers = await customerSiteManagers
      .find({ customer_account_id: customerAccountId })
      .sort({ fullName: 1 })
      .toArray();

    return NextResponse.json({
      managers: managers.map(serializeManager),
    });
  } catch (error) {
    console.error("Unable to load site managers:", error);

    return NextResponse.json(
      { error: "Unable to load site managers." },
      { status: 500 }
    );
  }
}

/*
 * POST /api/customer/site-managers
 * Creates a manager for the logged-in customer.
 */
export async function POST(request: NextRequest) {
  try {
    const authenticatedCustomerId =
      await getAuthenticatedCustomerId(request);

    if (
      !authenticatedCustomerId ||
      !ObjectId.isValid(authenticatedCustomerId)
    ) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();

    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        {
          error:
            "First name, last name, email, and phone number are required.",
        },
        { status: 400 }
      );
    }

    if (!email.includes("@")) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    const databaseName = process.env.MONGODB_DB_NAME;

    if (!databaseName) {
      return NextResponse.json(
        { error: "MONGODB_DB_NAME is not configured." },
        { status: 500 }
      );
    }

    const customerAccountId = new ObjectId(authenticatedCustomerId);

    const client = await clientPromise;
    const db = client.db(databaseName);

    const users = db.collection("users");
    const customerSiteManagers =
      db.collection<ManagerDocument>("customer_site_managers");

    // Confirm that the authenticated customer exists.
    const customer = await users.findOne({
      _id: customerAccountId,
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer account was not found." },
        { status: 404 }
      );
    }

    // Prevent duplicate manager emails for the same customer.
    const existingManager = await customerSiteManagers.findOne({
      customer_account_id: customerAccountId,
      email,
    });

    if (existingManager) {
      return NextResponse.json(
        { error: "A manager with this email already exists." },
        { status: 409 }
      );
    }

    const now = new Date();

    const manager: ManagerDocument = {
      customer_account_id: customerAccountId,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email,
      phone,
      status: "active",
      createdBy: customerAccountId,
      createdAt: now,
      updatedAt: now,
      deactivatedAt: null,
    };

    const result = await customerSiteManagers.insertOne(manager);

    return NextResponse.json(
      {
        message: "Site manager created successfully.",
        manager: serializeManager({
          _id: result.insertedId,
          ...manager,
        }),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unable to create site manager:", error);

    return NextResponse.json(
      { error: "Unable to create site manager." },
      { status: 500 }
    );
  }
}