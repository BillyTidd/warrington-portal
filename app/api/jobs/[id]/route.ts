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
      return NextResponse.json(
        { message: "Please log in to continue." },
        { status: 401 }
      );
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

    // Check if user has access to this job
    if (session.user.role !== "admin" && job.userId !== session.user.id) {
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

    // Check if user has permission to edit this job
    const existingJob = await db
      .collection("jobs")
      .findOne({ _id: new ObjectId(id) });
    if (!existingJob) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    if (
      session.user.role !== "admin" &&
      existingJob.userId !== session.user.id
    ) {
      return NextResponse.json(
        { message: "You don't have permission to edit this job" },
        { status: 403 }
      );
    }

    // If userId is changed, look up the user to get their name
    if (jobData.userId && jobData.userId !== existingJob.userId) {
      try {
        const user = await db
          .collection("users")
          .findOne({ _id: new ObjectId(jobData.userId) });
        if (user) {
          jobData.workerName = user.name;
        }
      } catch (error) {
        console.error("Error looking up user:", error);
      }
    }

    // Remove _id from the update object to prevent the immutable field error
    const { _id, ...jobDataWithoutId } = jobData;

    // Add updated info
    const jobToUpdate = {
      ...jobDataWithoutId,
      updatedBy: session.user.id,
      updatedByName: session.user.name,
      updatedAt: new Date(),
    };

    const result = await db
      .collection("jobs")
      .updateOne({ _id: new ObjectId(id) }, { $set: jobToUpdate });

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

    // Check if user is admin
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

    const result = await db.collection("jobs").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Job deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error in DELETE /api/jobs/${params.id}:`, error);
    return NextResponse.json(
      { message: "An error occurred while deleting the job" },
      { status: 500 }
    );
  }
}
