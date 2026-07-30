export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "customer") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db()

    // Get customer's booking requests
    const bookingRequests = await db
      .collection("booking-requests")
      .find({ customerEmail: session.user.email })
      .sort({ createdAt: -1 })
      .toArray()

    // Get customer's jobs (jobs created from approved requests)
    const jobs = await db
      .collection("jobs")
      .find({ clientId: session.user.id })
      .sort({ createdAt: -1 })
      .toArray()

    // Calculate stats
    const totalRequests = bookingRequests.length
    const pendingRequests = bookingRequests.filter((req) => req.status === "pending").length
    const approvedRequests = bookingRequests.filter((req) => req.status === "approved").length
    const activeJobs = jobs.filter((job) => ["pending", "in-progress"].includes(job.status)).length
    const completedJobs = jobs.filter((job) => job.status === "completed").length

    // Calculate total spent (from completed jobs, with the 10% client markup applied)
    const totalSpent = jobs
      .filter((job) => job.status === "completed")
      .reduce((sum, job) => sum + (job.clientPrice || 0) * 1.1, 0)

    return NextResponse.json({
      totalRequests,
      pendingRequests,
      approvedRequests,
      activeJobs,
      completedJobs,
      totalSpent,
      recentRequests: bookingRequests.slice(0, 5),
      recentJobs: jobs.slice(0, 5),
    })
  } catch (error) {
    console.error("Error fetching customer dashboard data:", error)
    return NextResponse.json({ message: "Failed to fetch dashboard data" }, { status: 500 })
  }
}
