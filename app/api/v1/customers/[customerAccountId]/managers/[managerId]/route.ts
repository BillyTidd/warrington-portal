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

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      customerAccountId: string;
      managerId: string;
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

    if (
      session.user.role !== "customer" ||
      session.user.id !== params.customerAccountId
    ) {
      return NextResponse.json(
        {
          message:
            "You can update only your own manager records",
        },
        { status: 403 }
      );
    }

    if (
      !ObjectId.isValid(params.customerAccountId) ||
      !ObjectId.isValid(params.managerId)
    ) {
      return NextResponse.json(
        {
          message: "Invalid customer or manager ID",
        },
        { status: 400 }
      );
    }

    const customerAccountId = new ObjectId(
      params.customerAccountId
    );

    const managerId = new ObjectId(params.managerId);

    const client = await clientPromise;
    const db = client.db();

    const existingManager = await db
      .collection("customer_site_managers")
      .findOne({
        _id: managerId,
        customer_account_id: customerAccountId,
      });

    if (!existingManager) {
      return NextResponse.json(
        { message: "Manager not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const firstName =
      body.firstName === undefined
        ? String(existingManager.firstName || "").trim()
        : String(body.firstName || "").trim();

    const lastName =
      body.lastName === undefined
        ? String(existingManager.lastName || "").trim()
        : String(body.lastName || "").trim();

    const email =
      body.email === undefined
        ? String(existingManager.email || "")
            .trim()
            .toLowerCase()
        : String(body.email || "").trim().toLowerCase();

    const phone =
      body.phone === undefined
        ? String(existingManager.phone || "").trim()
        : String(body.phone || "").trim();

    const managerStatus =
      body.status === undefined
        ? existingManager.status
        : body.status;

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

    if (
      managerStatus !== "active" &&
      managerStatus !== "inactive"
    ) {
      return NextResponse.json(
        {
          message:
            "Manager status must be active or inactive",
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const fullName = `${firstName} ${lastName}`;

    const updatedManager = await db
      .collection("customer_site_managers")
      .findOneAndUpdate(
        {
          _id: managerId,
          customer_account_id: customerAccountId,
        },
        {
          $set: {
            firstName,
            lastName,
            fullName,
            email: email || null,
            phone: phone || null,
            status: managerStatus,
            deactivatedAt:
              managerStatus === "inactive"
                ? existingManager.deactivatedAt || now
                : null,
            updatedAt: now,
          },
        },
        {
          returnDocument: "after",
        }
      );

    if (!updatedManager) {
      return NextResponse.json(
        { message: "Manager not found" },
        { status: 404 }
      );
    }

    const managerDetails = {
      firstName,
      lastName,
      fullName,
      email: email || null,
      phone: phone || null,
    };

    /*
     * Keep the manager information displayed on existing
     * estimates and jobs synchronized.
     *
     * manager_id remains the permanent relationship.
     */
    await Promise.all([
      db.collection("booking-requests").updateMany(
        {
          customerId: params.customerAccountId,
          "jobEstimate.manager_id":
            params.managerId,
        },
        {
          $set: {
            "jobEstimate.manager": fullName,
            "jobEstimate.managerDetails":
              managerDetails,
            updatedAt: now,
          },
        }
      ),

      db.collection("jobs").updateMany(
        {
          clientId: params.customerAccountId,
          "jobEstimate.manager_id":
            params.managerId,
        },
        {
          $set: {
            managerId: params.managerId,
            managerName: fullName,
            managerEmail: email || null,
            managerPhone: phone || null,
            "jobEstimate.manager": fullName,
            "jobEstimate.managerDetails":
              managerDetails,
            updatedAt: now,
          },
        }
      ),
    ]);

    return NextResponse.json(
      serializeManager(updatedManager)
    );
  } catch (error) {
    console.error(
      "Error updating customer manager:",
      error
    );

    return NextResponse.json(
      { message: "Unable to update manager" },
      { status: 500 }
    );
  }
}