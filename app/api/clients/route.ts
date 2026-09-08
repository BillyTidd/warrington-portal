export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const session = await getServerSession(
      authOptions
    );

    if (!session?.user) {
      return NextResponse.json(
        {
          message:
            "Please log in to continue.",
        },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const clients = await db
      .collection("clients")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    /*
     * Employees currently use /api/clients when creating
     * jobs. Keep returning the basic list to them, but
     * expose customer logins and managers only to Admin.
     */
    if (session.user.role !== "admin") {
      return NextResponse.json(clients);
    }

    const customerAccountIds: ObjectId[] = [];

    clients.forEach((clientRecord) => {
      const accountId =
        clientRecord.customerAccountId;

      if (
        accountId &&
        ObjectId.isValid(accountId.toString())
      ) {
        customerAccountIds.push(
          new ObjectId(accountId.toString())
        );
      }
    });

    const uniqueAccountIds = Array.from(
      new Map(
        customerAccountIds.map((accountId) => [
          accountId.toString(),
          accountId,
        ])
      ).values()
    );

    const [customerAccounts, managers] =
      await Promise.all([
        uniqueAccountIds.length > 0
          ? db
              .collection("users")
              .find({
                _id: {
                  $in: uniqueAccountIds,
                },
                role: "customer",
              })
              .toArray()
          : [],

        uniqueAccountIds.length > 0
          ? db
              .collection(
                "customer_site_managers"
              )
              .find({
                customer_account_id: {
                  $in: uniqueAccountIds,
                },
              })
              .sort({
                firstName: 1,
                lastName: 1,
              })
              .toArray()
          : [],
      ]);

    const accountsById = new Map(
      customerAccounts.map((account) => [
        account._id.toString(),
        account,
      ])
    );

    const managersByAccountId = new Map<
      string,
      typeof managers
    >();

    managers.forEach((manager) => {
      const accountId =
        manager.customer_account_id.toString();

      const currentManagers =
        managersByAccountId.get(accountId) || [];

      currentManagers.push(manager);

      managersByAccountId.set(
        accountId,
        currentManagers
      );
    });

    const clientsWithManagers = clients.map(
      (clientRecord) => {
        const accountId =
          clientRecord.customerAccountId
            ?.toString() || null;

        const customerAccount = accountId
          ? accountsById.get(accountId)
          : null;

        const accountManagers = accountId
          ? managersByAccountId.get(
              accountId
            ) || []
          : [];

        return {
          ...clientRecord,
          customerAccountId: accountId,
          customerLogin:
            customerAccount?.email || null,

          managers: accountManagers.map(
            (manager) => ({
              _id: manager._id.toString(),
              customer_account_id:
                manager.customer_account_id.toString(),
              firstName: manager.firstName,
              lastName: manager.lastName,
              fullName:
                manager.fullName ||
                `${manager.firstName || ""} ${
                  manager.lastName || ""
                }`.trim(),
              email: manager.email || null,
              phone: manager.phone || null,
              status:
                manager.status || "active",
              createdAt: manager.createdAt,
              updatedAt: manager.updatedAt,
            })
          ),
        };
      }
    );

    return NextResponse.json(
      clientsWithManagers
    );
  } catch (error) {
    console.error(
      "Error in GET /api/clients:",
      error
    );

    return NextResponse.json(
      {
        message:
          "An error occurred while fetching clients",
      },
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

    const { name, description } = await req.json();
    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("clients").insertOne({
      name,
      description,
      createdAt: new Date(),
    });

    const newClient = await db
      .collection("clients")
      .findOne({ _id: result.insertedId });

    return NextResponse.json(newClient, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/clients:", error);
    return NextResponse.json(
      { message: "An error occurred while creating the client" },
      { status: 500 }
    );
  }
}
