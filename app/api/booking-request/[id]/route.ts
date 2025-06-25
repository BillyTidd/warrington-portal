import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { status, adminNotes, reviewedBy, reviewedByName } = await request.json()

    if (!["approved", "rejected", "converted"].includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()

    // Get the booking request first
    const bookingRequest = await db.collection("booking-requests").findOne({ _id: new ObjectId(params.id) })

    if (!bookingRequest) {
      return NextResponse.json({ message: "Booking request not found" }, { status: 404 })
    }

    // Update the booking request status
    const updateResult = await db.collection("booking-requests").updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          status,
          adminNotes: adminNotes || null,
          reviewedBy,
          reviewedByName,
          updatedAt: new Date(),
        },
      },
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ message: "Booking request not found" }, { status: 404 })
    }

    let jobId = null

    // If approved, create a job in the job portal
    if (status === "approved") {
      try {
        // Find the customer in the users collection
        const customer = await db.collection("users").findOne({
          email: bookingRequest.customerEmail,
        })

        // Create job data from booking request
        const jobData = {
          jobName: `${bookingRequest.jobEstimate.jobType || "Service"} - ${bookingRequest.customerName}`,
          assignDate: bookingRequest.jobEstimate.jobDate,
          expireDate: bookingRequest.jobEstimate.jobDate, // Same day for now, admin can edit later
          status: "pending",
          description:
            bookingRequest.jobEstimate.jobDescription ||
            `${bookingRequest.jobEstimate.jobType} job for ${bookingRequest.customerName}`,
          clientPrice: bookingRequest.estimatedCost.totalCost,

          // Client information
          clientId: customer?._id?.toString() || null,
          clientName: bookingRequest.customerName,
          clientEmail: bookingRequest.customerEmail,
          clientPhone: bookingRequest.customerPhone,
          clientCompany: bookingRequest.customerCompany || null,

          // Job details from estimate
          estimatedWorkers: bookingRequest.jobEstimate.numberOfWorkers,
          estimatedHours: bookingRequest.jobEstimate.numberOfHours,
          jobLocation: bookingRequest.jobEstimate.jobLocation,
          jobType: bookingRequest.jobEstimate.jobType,

          // Cost breakdown
          estimatedCosts: {
            laborCost: bookingRequest.estimatedCost.laborCost,
            materialCost: bookingRequest.estimatedCost.materialCost,
            travelCost: bookingRequest.estimatedCost.travelCost,
            totalCost: bookingRequest.estimatedCost.totalCost,
          },

          // Workers array (empty initially, admin can assign later)
          workers: [],

          // Metadata
          createdBy: reviewedBy,
          createdByName: reviewedByName,
          createdAt: new Date(),
          updatedAt: new Date(),
          progressLogs: [],

          // Link back to original booking request
          bookingRequestId: params.id,

          // Admin notes from approval
          adminNotes: adminNotes || null,
        }

        // Insert the job
        const jobResult = await db.collection("jobs").insertOne(jobData)
        jobId = jobResult.insertedId.toString()

        // Update the booking request to mark it as converted and link to job
        await db.collection("booking-requests").updateOne(
          { _id: new ObjectId(params.id) },
          {
            $set: {
              status: "converted",
              convertedToJobId: jobId,
              convertedAt: new Date(),
            },
          },
        )

        console.log(`Successfully created job ${jobId} from booking request ${params.id}`)
      } catch (jobCreationError) {
        console.error("Error creating job from booking request:", jobCreationError)
        // Don't fail the entire request if job creation fails
        // The booking request is still marked as approved
      }
    }

    return NextResponse.json({
      success: true,
      message: `Booking request ${status} successfully`,
      jobId: jobId,
      jobCreated: status === "approved" && jobId !== null,
    })
  } catch (error) {
    console.error("Error updating booking request:", error)
    return NextResponse.json({ message: "Failed to update booking request" }, { status: 500 })
  }
}
