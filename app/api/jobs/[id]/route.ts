export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { message: "Please log in to continue." },
        { status: 401 }
      );
    }

    const { id } = params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid job ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Build query with role-based filtering
    const query: any = { _id: new ObjectId(id) };

    // Apply role-based filtering
    if (session.user.role === "admin") {
      // Admin can see any job
    } else if (session.user.role === "customer") {
  if (!ObjectId.isValid(session.user.id)) {
    return NextResponse.json(
      { message: "Invalid customer account" },
      { status: 401 }
    );
  }

  query.$and = [
    {
      $or: [
        {
          customer_account_id: new ObjectId(
            session.user.id
          ),
        },
        {
          customer_account_id: session.user.id,
        },

        // Temporary fallback for pre-migration jobs
        {
          clientId: session.user.id,
        },
      ],
    },
  ];
} else {
      // Employee can only see jobs they're assigned to
      query["workers.userId"] = session.user.id;
    }

    console.log("Job detail query:", JSON.stringify(query, null, 2));

    const job = await db.collection("jobs").findOne(query);

    if (!job) {
      return NextResponse.json(
        { message: "Job not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch client details if available
    if (job.clientId) {
      try {
        const clientData = await db
          .collection("clients")
          .findOne({ _id: new ObjectId(job.clientId) });
        job.client = clientData || { name: job.clientName || "Unknown Client" };
      } catch (error) {
        console.error("Error fetching client data:", error);
        job.client = { name: job.clientName || "Unknown Client" };
      }
    }
    


    job.documents = await db
      .collection("job_documents")
      .find({
        jobId: job._id,
      })
      .sort({
        createdAt: 1,
      })
      .toArray();



    return NextResponse.json(job);
  } catch (error) {
    console.error("Error in GET /api/jobs/[id]:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching the job" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const id = params.id;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid job ID" },
        { status: 400 }
      );
    }

    const jobData = await req.json();
    const mongoClient = await clientPromise;
    const db = mongoClient.db();

    const existingJob = await db
      .collection("jobs")
      .findOne({
        _id: new ObjectId(id),
      });

    if (!existingJob) {
      return NextResponse.json(
        { message: "Job not found" },
        { status: 404 }
      );
    }

    const isAdmin = session.user.role === "admin";

    const isAssigned = existingJob.workers
      ? existingJob.workers.some(
          (worker: any) =>
            worker.userId === session.user.id
        )
      : existingJob.userId === session.user.id;

    if (!isAdmin && !isAssigned) {
      return NextResponse.json(
        {
          message:
            "You do not have permission to update this job",
        },
        { status: 403 }
      );
    }

    let updateData: Record<string, any> = {};

    if (isAdmin) {
      const requestedCustomerAccountId = String(
        jobData.customer_account_id || ""
      );

      if (
        !requestedCustomerAccountId ||
        !ObjectId.isValid(requestedCustomerAccountId)
      ) {
        return NextResponse.json(
          {
            message:
              "A valid customer account must be selected",
          },
          { status: 400 }
        );
      }

      const customerAccountObjectId = new ObjectId(
        requestedCustomerAccountId
      );

      const customerAccount = await db
        .collection("users")
        .findOne({
          _id: customerAccountObjectId,
          role: "customer",
          isApproved: true,
        });

      if (!customerAccount) {
        return NextResponse.json(
          {
            message:
              "The selected customer account was not found or is inactive",
          },
          { status: 400 }
        );
      }

      let linkedClient = await db
        .collection("clients")
        .findOne({
          $or: [
            {
              customerAccountId:
                customerAccountObjectId,
            },
            {
              customerAccountId:
                requestedCustomerAccountId,
            },
            {
              customer_account_id:
                customerAccountObjectId,
            },
            {
              customer_account_id:
                requestedCustomerAccountId,
            },
          ],
        });

      if (!linkedClient) {
        const clientResult = await db
          .collection("clients")
          .insertOne({
            name:
              customerAccount.company ||
              customerAccount.name ||
              customerAccount.email,
            description: "Customer Portal account",
            customerAccountId:
              customerAccountObjectId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

        linkedClient = await db
          .collection("clients")
          .findOne({
            _id: clientResult.insertedId,
          });
      }

      if (!linkedClient) {
        return NextResponse.json(
          {
            message:
              "Unable to resolve the linked client record",
          },
          { status: 500 }
        );
      }

      let workers = Array.isArray(jobData.workers)
        ? jobData.workers
        : [];

      if (workers.length === 0 && jobData.userId) {
        workers = [
          {
            userId: jobData.userId,
            workerName:
              jobData.workerName || "Unknown Worker",
          },
        ];
      }

      const {
        _id,
        customer_account_id,
        customerAccountId,
        clientId,
        clientName,
        clientEmail,
        clientPhone,
        clientCompany,
        createdAt,
        createdBy,
        createdByName,
        progressLogs,
        userId,
        workerName,
        ...allowedJobData
      } = jobData;

      updateData = {
        ...allowedJobData,
        workers,
        customer_account_id:
          customerAccountObjectId,
        clientId: linkedClient._id.toString(),
        clientName:
          linkedClient.name ||
          customerAccount.company ||
          customerAccount.name,
        clientEmail: customerAccount.email,
        clientPhone: customerAccount.phone || null,
        clientCompany: customerAccount.company || null,
      };
    } else {
      // Workers can only update these existing fields.
      updateData = {
        ...(jobData.status !== undefined && {
          status: jobData.status,
        }),
        ...(jobData.pdfUrl !== undefined && {
          pdfUrl: jobData.pdfUrl,
        }),
        ...(jobData.pdfFilename !== undefined && {
          pdfFilename: jobData.pdfFilename,
        }),
      };
    }

    updateData = {
      ...updateData,
      updatedBy: session.user.id,
      updatedByName: session.user.name,
      updatedAt: new Date(),
    };

    const result = await db
      .collection("jobs")
      .updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: updateData,
        }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Job not found" },
        { status: 404 }
      );
    }

    const updatedJob = await db
      .collection("jobs")
      .findOne({
        _id: new ObjectId(id),
      });

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error(
      `Error in PUT /api/jobs/${params.id}:`,
      error
    );

    return NextResponse.json(
      {
        message:
          "An error occurred while updating the job",
      },
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

    // Only admins can delete jobs
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Only admins can delete jobs" },
        { status: 403 }
      );
    }

    const id = params.id;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid job ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await db
      .collection("jobs")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error(`Error in DELETE /api/jobs/${params.id}:`, error);
    return NextResponse.json(
      { message: "An error occurred while deleting the job" },
      { status: 500 }
    );
  }
}
