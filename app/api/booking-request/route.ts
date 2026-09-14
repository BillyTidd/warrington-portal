export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { getObjectStorage } from "@/lib/object-storage";
import { validateJobDocument } from "@/lib/job-document-validation";
import type { PendingJobDocument } from "@/types/job-document";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (
      session.user.role !== "admin" &&
      session.user.role !== "customer"
    ) {
      return NextResponse.json(
        { message: "You do not have access to booking requests" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const client = await clientPromise;
    const db = client.db();

    // Build query
    const query: any = {};

    // Filter by status if provided
    if (status && status !== "all") {
      query.status = status;
    }

    // Filter by customer ID if provided (for customer users)
    if (customerId) {
      query.customerId = customerId;
    }

    // If user is customer, only show their requests
    if (session.user.role === "customer") {
      query.customerId = session.user.id;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { customerEmail: { $regex: search, $options: "i" } },
        { customerCompany: { $regex: search, $options: "i" } },
        { "jobEstimate.jobType": { $regex: search, $options: "i" } },
        { "jobEstimate.jobLocation": { $regex: search, $options: "i" } },
        { "jobEstimate.jobDescription": { $regex: search, $options: "i" } },
      ];
    }

    // Date range filter
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.createdAt = { $lte: new Date(endDate) };
    }

    const skip = (page - 1) * limit;

    // Build sort object
    const sortObject: any = {};
    if (sortBy === "totalCost") {
      sortObject["estimatedCost.totalCost"] = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "jobDate") {
      sortObject["jobEstimate.jobDate"] = sortOrder === "asc" ? 1 : -1;
    } else {
      sortObject[sortBy] = sortOrder === "asc" ? 1 : -1;
    }

    // Get total count
    const total = await db.collection("booking-requests").countDocuments(query);

    // Get paginated results
    const bookingRequests = await db
      .collection("booking-requests")
      .find(query)
      .sort(sortObject)
      .skip(skip)
      .limit(limit)
      .toArray();



    const bookingRequestIds = bookingRequests.map(
      (bookingRequest) => bookingRequest._id
    );

    const jobDocuments =
      bookingRequestIds.length > 0
        ? await db
            .collection("job_documents")
            .find({
              bookingRequestId: {
                $in: bookingRequestIds,
              },
            })
            .sort({ createdAt: 1 })
            .toArray()
        : [];

    const documentsByBookingId = jobDocuments.reduce<
      Record<string, any[]>
    >((groupedDocuments, document) => {
      const bookingId = document.bookingRequestId.toString();

      if (!groupedDocuments[bookingId]) {
        groupedDocuments[bookingId] = [];
      }

      groupedDocuments[bookingId].push({
        _id: document._id,
        bookingRequestId: document.bookingRequestId,
        jobId: document.jobId,
        originalName: document.originalName,
        mimeType: document.mimeType,
        size: document.size,
        downloadPath:
          document.downloadPath ||
          `/api/job-documents/${document._id.toString()}/download`,
        uploadedByRole: document.uploadedByRole,
        createdAt: document.createdAt,
      });

      return groupedDocuments;
    }, {});

    const bookingRequestsWithDocuments = bookingRequests.map(
      (bookingRequest) => ({
        ...bookingRequest,
        documents:
          documentsByBookingId[bookingRequest._id.toString()] || [],
      })
    );

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      bookingRequests: bookingRequestsWithDocuments,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
      totalPages, // Keep for backward compatibility
    });
  } catch (error) {
    console.error("Error fetching booking requests:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "customer") {
      return NextResponse.json(
        {
          message:
            "Only customer accounts can submit booking requests",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      customerName,
      customerEmail,
      customerPhone,
      customerCompany,
      jobEstimate,
      estimatedCost,
      documents = [],
    } = body;

    if (
      !customerName ||
      !customerEmail ||
      !jobEstimate ||
      !estimatedCost
    ) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!Array.isArray(documents)) {
      return NextResponse.json(
        { message: "Documents must be an array" },
        { status: 400 }
      );
    }

    if (documents.length > 10) {
      return NextResponse.json(
        {
          message:
            "A maximum of 10 documents can be attached to one estimate",
        },
        { status: 400 }
      );
    }



    const client = await clientPromise;
    const db = client.db();




    let jobEstimateToSave = {
      ...jobEstimate,
    };

    if (jobEstimate.manager_id) {
      if (
        !ObjectId.isValid(jobEstimate.manager_id) ||
        !ObjectId.isValid(session.user.id)
      ) {
        return NextResponse.json(
          { message: "Invalid manager selection" },
          { status: 400 }
        );
      }

      const selectedManager = await db
        .collection("customer_site_managers")
        .findOne({
          _id: new ObjectId(
            jobEstimate.manager_id
          ),
          customer_account_id: new ObjectId(
            session.user.id
          ),
          status: "active",
        });

      if (!selectedManager) {
        return NextResponse.json(
          {
            message:
              "The selected manager does not belong to your customer account or is inactive",
          },
          { status: 400 }
        );
      }

      const fullName =
        `${selectedManager.firstName} ${selectedManager.lastName}`.trim();

      jobEstimateToSave = {
        ...jobEstimate,
        manager_id:
          selectedManager._id.toString(),
        manager: fullName,
        managerDetails: {
          firstName: selectedManager.firstName,
          lastName: selectedManager.lastName,
          fullName,
          email: selectedManager.email || null,
          phone: selectedManager.phone || null,
        },
      };
    }

    // London estimates have no vehicle or travel charge. Normalize the values
    // again on the server so stale or manually modified browser data cannot
    // reintroduce the previous London charges.
    if (jobEstimateToSave.team === "london") {
      jobEstimateToSave = {
        ...jobEstimateToSave,
        vehicleType: "",
      };
    }

    const estimatedCostToSave =
      jobEstimateToSave.team === "london"
        ? {
            ...estimatedCost,
            travelCost: 0,
            totalCost:
              (Number(estimatedCost.laborCost) || 0) +
              (Number(estimatedCost.materialCost) || 0),
            breakdown: {
              ...estimatedCost.breakdown,
              travel: {
                ...estimatedCost.breakdown?.travel,
                vehicleType: "",
                rate: 0,
                cost: 0,
              },
            },
          }
        : estimatedCost;




    const verifiedDocuments: PendingJobDocument[] = [];

    let storageBucket: string | null = null;

    if (documents.length > 0) {
      const { client: storageClient, bucket } =
        getObjectStorage();

      storageBucket = bucket;

      const requiredObjectPrefix =
        `customer-job-documents/${session.user.id}/`;

      const documentKeys = documents.map(
        (document: PendingJobDocument) => document.objectKey
      );

      if (new Set(documentKeys).size !== documentKeys.length) {
        return NextResponse.json(
          { message: "Duplicate document objects were submitted" },
          { status: 400 }
        );
      }

      for (const document of documents as PendingJobDocument[]) {
        const validationError = validateJobDocument(
          document.originalName,
          document.mimeType,
          document.size
        );

        if (validationError) {
          return NextResponse.json(
            {
              message: `${document.originalName}: ${validationError}`,
            },
            { status: 400 }
          );
        }

        if (
          !document.objectKey ||
          !document.objectKey.startsWith(requiredObjectPrefix)
        ) {
          return NextResponse.json(
            {
              message:
                "One of the uploaded documents does not belong to this customer",
            },
            { status: 403 }
          );
        }

        let storedObject;

        try {
          storedObject = await storageClient.send(
            new HeadObjectCommand({
              Bucket: bucket,
              Key: document.objectKey,
            })
          );
        } catch (storageError) {
          console.error(
            "Unable to verify uploaded R2 object:",
            storageError
          );

          return NextResponse.json(
            {
              message: `${document.originalName} could not be verified in storage`,
            },
            { status: 400 }
          );
        }

        const storedSize = Number(storedObject.ContentLength || 0);
        const storedMimeType = (
          storedObject.ContentType || ""
        )
          .split(";")[0]
          .trim()
          .toLowerCase();

        if (storedSize !== document.size) {
          return NextResponse.json(
            {
              message: `${document.originalName} has an invalid stored size`,
            },
            { status: 400 }
          );
        }

        if (
          storedMimeType !== document.mimeType.toLowerCase()
        ) {
          return NextResponse.json(
            {
              message: `${document.originalName} has an invalid stored content type`,
            },
            { status: 400 }
          );
        }

        verifiedDocuments.push(document);
      }
    }

    

    const bookingRequestId = new ObjectId();
    const now = new Date();

    const bookingRequest = {
      _id: bookingRequestId,
      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      customerCompany: customerCompany || null,
      customerId: session.user.id,
      jobEstimate: jobEstimateToSave,
      estimatedCost: estimatedCostToSave,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    const documentRecords = verifiedDocuments.map(
      (document) => {
        const documentId = new ObjectId();

        return {
          _id: documentId,
          bookingRequestId,
          jobId: null,
          uploadedBy: session.user.id,
          storageProvider: "r2",
          bucket: storageBucket,
          objectKey: document.objectKey,
          originalName: document.originalName,
          mimeType: document.mimeType,
          size: document.size,
          downloadPath:
            `/api/job-documents/${documentId.toString()}/download`,
          createdAt: now,
          updatedAt: now,
        };
      }
    );

    const databaseSession = client.startSession();

    try {
      await databaseSession.withTransaction(async () => {
        await db
          .collection("booking-requests")
          .insertOne(bookingRequest, {
            session: databaseSession,
          });

        if (documentRecords.length > 0) {
          await db
            .collection("job_documents")
            .insertMany(documentRecords, {
              session: databaseSession,
            });
        }
      });
    } finally {
      await databaseSession.endSession();
    }

    return NextResponse.json({
      success: true,
      bookingRequestId,
      documentCount: documentRecords.length,
      message: "Booking request submitted successfully",
    });
  } catch (error) {
    console.error("Error creating booking request:", error);

    return NextResponse.json(
      {
        message:
          "An internal error occurred while creating the booking request",
      },
      { status: 500 }
    );
  }
}
