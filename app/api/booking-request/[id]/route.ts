import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { BookingRequest, EstimatedCost } from "@/types/booking";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { status, adminNotes, estimatedCost } = await request.json();
    const client = await clientPromise;
    const db = client.db();
    const bookingRequestId = new ObjectId(params.id);

    // Get the booking request first
    const bookingRequest = await db
      .collection<any>("booking-requests")
      .findOne({ _id: bookingRequestId });

    if (!bookingRequest) {
      return NextResponse.json(
        { message: "Booking request not found" },
        { status: 404 }
      );
    }

    // Validate status
    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    // Prepare update fields
    const updateFields: { [key: string]: any } = {
      status,
      adminNotes: adminNotes || null,
      reviewedBy: session.user.id,
      reviewedByName: session.user.name,
      updatedAt: new Date(),
    };

    // Determine which estimated cost to use
    let finalEstimatedCost: EstimatedCost;

    if (estimatedCost) {
      // Admin updated the costs - use the new values
      finalEstimatedCost = {
        laborCost: Number.parseFloat(estimatedCost.laborCost) || 0,
        materialCost: Number.parseFloat(estimatedCost.materialCost) || 0,
        travelCost: Number.parseFloat(estimatedCost.travelCost) || 0,
        totalCost: Number.parseFloat(estimatedCost.totalCost) || 0,
        breakdown: bookingRequest.estimatedCost.breakdown, // Preserve existing breakdown
      };
      updateFields.estimatedCost = finalEstimatedCost;
      console.log("Using updated estimated cost:", finalEstimatedCost);
    } else {
      // No cost changes - use existing costs but ensure materialCost is defined
      finalEstimatedCost = {
        ...bookingRequest.estimatedCost,
        materialCost: bookingRequest.estimatedCost.materialCost || 0,
      };
      console.log("Using original estimated cost:", finalEstimatedCost);
    }

    let jobId = null;
    let jobCreated = false;

    // If approved, create a job
    if (status === "approved") {
      try {
        // Find the customer
        const customer = await db.collection("users").findOne({
          email: bookingRequest.customerEmail,
        });

        // Handle both old (single postcode) and new (multiple postcodes) formats
        let postCode = null;
        let postcodes = [];

        // New format: postcodes array
        if (
          bookingRequest.jobEstimate.postcodes &&
          Array.isArray(bookingRequest.jobEstimate.postcodes)
        ) {
          // Filter out empty postcodes
          postcodes = bookingRequest.jobEstimate.postcodes.filter(
            (pc: string) => pc?.trim()
          );
          // Set the first postcode as the default
          postCode = postcodes.length > 0 ? postcodes[0] : null;
        }
        // Old format: extract from toAddress
        else if (bookingRequest?.estimatedCost?.breakdown?.travel?.toAddress) {
          const toAddress =
            bookingRequest.estimatedCost.breakdown.travel.toAddress;
          const postcodeMatch = toAddress.match(
            /([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i
          );
          postCode = postcodeMatch ? postcodeMatch[0].toUpperCase() : null;
          if (postCode) {
            postcodes = [postCode];
          }
        }
        // Fallback: extract from single postcode field (very old format)
        else if (bookingRequest.jobEstimate.postcode) {
          postCode = bookingRequest.jobEstimate.postcode;
          postcodes = [postCode];
        }

        // Create job data
        const jobData = {
          jobName: `${bookingRequest.jobEstimate.jobType || "Service"} - ${
            bookingRequest.customerName
          }`,
          assignDate: bookingRequest.jobEstimate.jobDate,
          expireDate: bookingRequest.jobEstimate.jobDate,
          status: "pending",
          description:
            bookingRequest.jobEstimate.jobDescription ||
            `${bookingRequest.jobEstimate.jobType} job for ${bookingRequest.customerName}`,
          clientPrice: finalEstimatedCost.totalCost,

          // Client information
          clientId: customer?._id?.toString() || null,
          clientName: bookingRequest.customerName,
          clientEmail: bookingRequest.customerEmail,
          clientPhone: bookingRequest.customerPhone,
          clientCompany: bookingRequest.customerCompany || null,

          // Job details
          estimatedWorkers: bookingRequest.jobEstimate.numberOfWorkers,
          estimatedHours: bookingRequest.jobEstimate.numberOfHours,
          jobLocation: bookingRequest.jobEstimate.jobLocation,
          jobType: bookingRequest.jobEstimate.jobType,

          // Transfer full jobEstimate object to preserve all data including postcodes array
          jobEstimate: {
            ...bookingRequest.jobEstimate,
            postcodes: postcodes, // Ensure postcodes array is available
          },

          // Cost breakdown - use the final estimated cost
          estimatedCosts: {
            laborCost: finalEstimatedCost.laborCost,
            materialCost: finalEstimatedCost.materialCost || 0,
            travelCost: finalEstimatedCost.travelCost,
            postCode, // Default postcode for backward compatibility
            postcodes, // NEW: postcodes array for multi-location support
          },

          // Workers array (empty initially)
          workers: [],

          // Metadata
          createdBy: session.user.id,
          createdByName: session.user.name,
          createdAt: new Date(),
          updatedAt: new Date(),
          progressLogs: [],

          // Link back to original booking request
          bookingRequestId: params.id,
          adminNotes: adminNotes || null,
        };
        const jobResult = await db.collection("jobs").insertOne(jobData);
        jobId = jobResult.insertedId.toString();

        // Update booking request to converted status
        updateFields.status = "converted";
        updateFields.convertedToJobId = jobId;
        updateFields.convertedAt = new Date();

        jobCreated = true;
        console.log(
          `Successfully created job ${jobId} from booking request ${params.id} with total cost: £${finalEstimatedCost.totalCost}`
        );
      } catch (jobCreationError) {
        console.error(
          "Error creating job from booking request:",
          jobCreationError
        );
        // Continue with the booking request update even if job creation fails
      }
    }

    // Update the booking request
    const updateResult = await db
      .collection("booking-requests")
      .updateOne({ _id: bookingRequestId }, { $set: updateFields });

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { message: "Booking request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: estimatedCost
        ? `Booking request ${status} with updated pricing`
        : `Booking request ${status} successfully`,
      jobId: jobId,
      jobCreated: jobCreated,
      priceUpdated: !!estimatedCost,
    });
  } catch (error) {
    console.error("Error updating booking request:", error);
    return NextResponse.json(
      { message: "Failed to update booking request" },
      { status: 500 }
    );
  }
}
