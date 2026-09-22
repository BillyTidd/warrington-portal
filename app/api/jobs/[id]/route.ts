export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendWorkerAssignmentSms } from "@/lib/worker-assignment-sms";
import {
  resolveJobCustomerAccountId,
  syncAutomaticJobFolders,
} from "@/lib/job-folders";

function normalizedClientPrice(job: any) {
  const rawPrice =
    job.clientPrice ??
    job.estimatedCost?.totalCost ??
    job.estimatedCosts?.totalCost ??
    job.jobEstimate?.estimatedCost?.totalCost ??
    job.jobEstimate?.estimatedCosts?.totalCost ??
    0;

  const parsedPrice = Number(rawPrice);
  return Number.isFinite(parsedPrice) ? parsedPrice : 0;
}

function safeDocument(document: any) {
  return {
    _id: document._id,
    originalName: document.originalName,
    mimeType: document.mimeType,
    size: document.size,
    downloadPath:
      document.downloadPath ||
      `/api/job-documents/${document._id.toString()}/download`,
    uploadedByRole: document.uploadedByRole,
    createdAt: document.createdAt,
  };
}

function safeCustomerJob(job: any) {
  const customerJob = { ...job };
  delete customerJob.workerPaymentRate;
  delete customerJob.workerHourlyRate;

  customerJob.workers = Array.isArray(job.workers)
    ? job.workers.map((worker: any) => ({
        userId: worker.userId,
        workerName: worker.workerName,
      }))
    : [];

  customerJob.progressLogs = Array.isArray(job.progressLogs)
    ? job.progressLogs.map((entry: any) => {
        const safeEntry = { ...entry };
        delete safeEntry.cost;
        delete safeEntry.originalCost;
        delete safeEntry.overtimeCost;
        delete safeEntry.costTreatment;

        if (safeEntry.vehicleUsage) {
          const safeVehicleUsage = { ...safeEntry.vehicleUsage };
          delete safeVehicleUsage.totalCost;
          delete safeVehicleUsage.pricePerMile;
          safeEntry.vehicleUsage = safeVehicleUsage;
        }

        return safeEntry;
      })
    : [];

  return customerJob;
}

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

    const query: any = { _id: new ObjectId(id) };

    if (session.user.role === "customer") {
      if (!ObjectId.isValid(session.user.id)) {
        return NextResponse.json(
          { message: "Invalid customer account" },
          { status: 401 }
        );
      }

      const customerAccountId = new ObjectId(session.user.id);

      query.$or = [
        { customer_account_id: customerAccountId },
        { customer_account_id: session.user.id },
        { customerAccountId: customerAccountId },
        { customerAccountId: session.user.id },
        // Temporary fallback for legacy records.
        { clientId: session.user.id },
      ];
    } else if (session.user.role === "employee") {
      const workerIds: Array<string | ObjectId> = [session.user.id];

      if (ObjectId.isValid(session.user.id)) {
        workerIds.push(new ObjectId(session.user.id));
      }

      query.$or = [
        { "workers.userId": { $in: workerIds } },
        { userId: { $in: workerIds } },
        { workerId: { $in: workerIds } },
      ];
    } else if (session.user.role !== "admin") {
      return NextResponse.json(
        { message: "You do not have permission to view this job" },
        { status: 403 }
      );
    }

    const job = await db.collection("jobs").findOne(query);

    if (!job) {
      return NextResponse.json(
        { message: "Job not found or access denied" },
        { status: 404 }
      );
    }

    job.clientPrice = normalizedClientPrice(job);
    job.managerName =
      job.managerName ||
      job.jobEstimate?.managerDetails?.fullName ||
      job.jobEstimate?.manager ||
      null;

    // Fetch client details if the legacy clients record is available.
    if (job.clientId && ObjectId.isValid(job.clientId.toString())) {
      try {
        const clientData = await db
          .collection("clients")
          .findOne({ _id: new ObjectId(job.clientId.toString()) });
        job.client = clientData || { name: job.clientName || "Unknown Client" };
      } catch (error) {
        console.error("Error fetching client data:", error);
        job.client = { name: job.clientName || "Unknown Client" };
      }
    }
    const documentFilters: Record<string, any>[] = [
      {
        jobId: {
          $in: [job._id, job._id.toString()],
        },
      },
    ];

    if (job.bookingRequestId) {
      const bookingRequestId = job.bookingRequestId.toString();
      const bookingRequestIds: Array<string | ObjectId> = [
        bookingRequestId,
      ];

      if (ObjectId.isValid(bookingRequestId)) {
        bookingRequestIds.push(new ObjectId(bookingRequestId));
      }

      // Compatibility for estimates converted before jobId was consistently
      // copied onto every job_documents record.
      documentFilters.push({
        bookingRequestId: { $in: bookingRequestIds },
      });
    }

    const documents = await db
      .collection("job_documents")
      .find({
        $or: documentFilters,
      })
      .sort({
        createdAt: 1,
      })
      .toArray();

    job.documents = documents.map(safeDocument);

    return NextResponse.json(
      session.user.role === "customer" ? safeCustomerJob(job) : job,
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
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
    const previousCustomerAccountId = isAdmin
      ? await resolveJobCustomerAccountId(db, existingJob)
      : null;

    const previouslyAssignedWorkerIds = new Set<string>(
      (Array.isArray(existingJob.workers)
        ? existingJob.workers
        : existingJob.userId
          ? [{ userId: existingJob.userId }]
          : []
      )
        .map((worker: any) => worker?.userId?.toString())
        .filter(Boolean)
    );

    let newlyAssignedWorkerIds: string[] = [];

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

      if (!jobData.assignDate) {
        return NextResponse.json(
          { message: "The job start date is required" },
          { status: 400 }
        );
      }

      let selectedManager: any = null;

      if (jobData.managerId) {
        if (!ObjectId.isValid(String(jobData.managerId))) {
          return NextResponse.json(
            { message: "Invalid customer manager" },
            { status: 400 }
          );
        }

        selectedManager = await db
          .collection("customer_site_managers")
          .findOne({
            _id: new ObjectId(String(jobData.managerId)),
            customer_account_id: customerAccountObjectId,
            status: "active",
          });

        if (!selectedManager) {
          return NextResponse.json(
            {
              message:
                "The selected manager does not belong to this customer or is inactive",
            },
            { status: 400 }
          );
        }
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

      newlyAssignedWorkerIds = workers
        .map((worker: any) => worker?.userId?.toString())
        .filter(
          (workerId: string | undefined): workerId is string =>
            Boolean(workerId) && !previouslyAssignedWorkerIds.has(workerId!)
        );

      const {
        _id,
        customer_account_id,
        customerAccountId,
        clientId,
        clientName,
        clientEmail,
        clientPhone,
        clientCompany,
        managerId,
        managerName,
        managerEmail,
        managerPhone,
        createdAt,
        createdBy,
        createdByName,
        progressLogs,
        documents,
        userId,
        workerName,
        folderId,
        folderName,
        folderAssignment,
        ...allowedJobData
      } = jobData;

      updateData = {
        ...allowedJobData,
        assignDate: jobData.assignDate,
        expireDate: jobData.assignDate,
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
        managerId: selectedManager?._id?.toString() || null,
        managerName:
          selectedManager?.fullName ||
          (selectedManager
            ? `${selectedManager.firstName || ""} ${
                selectedManager.lastName || ""
              }`.trim()
            : null),
        managerEmail: selectedManager?.email || null,
        managerPhone: selectedManager?.phone || null,
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

    if (isAdmin && updatedJob) {
      try {
        const updatedCustomerAccountId =
          await resolveJobCustomerAccountId(db, updatedJob);
        const customerAccountIds = new Map<string, ObjectId>();

        if (previousCustomerAccountId) {
          customerAccountIds.set(
            previousCustomerAccountId.toString(),
            previousCustomerAccountId
          );
        }

        if (updatedCustomerAccountId) {
          customerAccountIds.set(
            updatedCustomerAccountId.toString(),
            updatedCustomerAccountId
          );
        }

        for (const customerAccountId of Array.from(
          customerAccountIds.values()
        )) {
          await syncAutomaticJobFolders(db, customerAccountId);
        }
      } catch (folderError) {
        // The job update remains valid; opening Job Folders retries the sync.
        console.error(
          "Unable to synchronize automatic job folders:",
          folderError
        );
      }
    }

    if (isAdmin && updatedJob && newlyAssignedWorkerIds.length > 0) {
      try {
        await sendWorkerAssignmentSms({
          db,
          job: updatedJob,
          workerIds: newlyAssignedWorkerIds,
          sentBy: session.user.id,
          sentByName: session.user.name,
        });
      } catch (error) {
        // Do not undo a valid assignment because the SMS provider is down.
        console.error("Unable to send worker assignment SMS:", error);
      }
    }

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
