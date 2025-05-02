import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid job ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const job = await db.collection("jobs").findOne({ _id: new ObjectId(id) });

    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    // Check if user has permission to view this job
    // Admins can view all jobs, regular users can only view jobs assigned to them
    const isAdmin = session.user.role === "admin";

    // Check if user is in the workers array (new format) or matches userId (old format)
    const isAssigned = job.workers
      ? job.workers.some((worker: any) => worker.userId === session.user.id)
      : job.userId === session.user.id;

    if (!isAdmin && !isAssigned) {
      return NextResponse.json(
        { message: "You don't have permission to view this job" },
        { status: 403 }
      );
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error(`Error in GET /api/jobs/${params.id}:`, error);
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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid job ID" }, { status: 400 });
    }

    const jobData = await req.json();
    const client = await clientPromise;
    const db = client.db();

    // Check if job exists and user has permission to update it
    const existingJob = await db
      .collection("jobs")
      .findOne({ _id: new ObjectId(id) });
    if (!existingJob) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    // Only admins can update job details
    // Regular users can only update status
    const isAdmin = session.user.role === "admin";

    // Check if user is in the workers array (new format) or matches userId (old format)
    const isAssigned = existingJob.workers
      ? existingJob.workers.some(
          (worker: any) => worker.userId === session.user.id
        )
      : existingJob.userId === session.user.id;

    if (!isAdmin && !isAssigned) {
      return NextResponse.json(
        { message: "You don't have permission to update this job" },
        { status: 403 }
      );
    }

    // If not admin, only allow updating the status
    let updateData = {};
    if (isAdmin) {
      // Handle conversion from old format to new format if needed
      if (!jobData.workers && jobData.userId) {
        jobData.workers = [
          {
            userId: jobData.userId,
            workerName: jobData.workerName,
          },
        ];
      }

      // Admin can update all fields
      const { _id, ...jobDataWithoutId } = jobData;
      updateData = jobDataWithoutId;
    } else {
      // Regular users can only update status
      updateData = { status: jobData.status };
    }

    // Add updated metadata
    updateData = {
      ...updateData,
      updatedBy: session.user.id,
      updatedByName: session.user.name,
      updatedAt: new Date(),
    };

    const result = await db
      .collection("jobs")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    const updatedJob = await db
      .collection("jobs")
      .findOne({ _id: new ObjectId(id) });

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error(`Error in PUT /api/jobs/${params.id}:`, error);
    return NextResponse.json(
      { message: "An error occurred while updating the job" },
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
