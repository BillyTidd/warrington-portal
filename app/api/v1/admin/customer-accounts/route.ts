export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Only administrators can access customer accounts" },
        { status: 403 }
      );
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db();

    const customerUsers = await db
      .collection("users")
      .find(
        {
          role: "customer",
          isApproved: true,
        },
        {
          projection: {
            password: 0,
          },
        }
      )
      .sort({
        company: 1,
        name: 1,
      })
      .toArray();

    const customerObjectIds = customerUsers.map(
      (customer) => customer._id
    );

    const customerStringIds = customerUsers.map(
      (customer) => customer._id.toString()
    );

    const linkedClients =
      customerUsers.length > 0
        ? await db
            .collection("clients")
            .find({
              $or: [
                {
                  customerAccountId: {
                    $in: customerObjectIds,
                  },
                },
                {
                  customerAccountId: {
                    $in: customerStringIds,
                  },
                },
                {
                  customer_account_id: {
                    $in: customerObjectIds,
                  },
                },
                {
                  customer_account_id: {
                    $in: customerStringIds,
                  },
                },
              ],
            })
            .toArray()
        : [];

    const clientsByCustomerAccount = new Map<string, any>();

    linkedClients.forEach((client) => {
      const accountId =
        client.customerAccountId ||
        client.customer_account_id;

      if (accountId) {
        clientsByCustomerAccount.set(
          accountId.toString(),
          client
        );
      }
    });

    const customers = customerUsers.map((customer) => {
      const accountId = customer._id.toString();
      const linkedClient =
        clientsByCustomerAccount.get(accountId);

      const displayName =
        linkedClient?.name ||
        customer.company ||
        customer.name ||
        customer.email;

      return {
        customerAccountId: accountId,
        clientId: linkedClient?._id?.toString() || null,
        displayName,
        contactName: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        company: customer.company || "",
      };
    });

    return NextResponse.json(
      {
        customers,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error loading customer accounts:",
      error
    );

    return NextResponse.json(
      {
        message: "Failed to load customer accounts",
      },
      {
        status: 500,
      }
    );
  }
}