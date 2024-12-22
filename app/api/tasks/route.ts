import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { message: "Please log in to continue." },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Get user details to check role
    const user = await db
      .collection("users")
      .findOne({ email: session.user.email });

    // Prepare filter based on user role
    const filter =
      user?.role === "admin"
        ? {} // Admin sees all tasks
        : { userId: user?._id.toString() }; // Regular users see only their tasks
    const tasks = await db
      .collection("tasks")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    // Transform the data to ensure proper serialization
    const sanitizedTasks = tasks.map((task) => ({
      _id: task._id.toString(),
      ticketName: task.ticketName || "",
      userName: task.userName || "",
      userId: task.userId || "",
      clientName: task.clientName || "",
      assignDate: task.assignDate
        ? new Date(task.assignDate).toISOString()
        : "",
      deadline: task.deadline ? new Date(task.deadline).toISOString() : "",
      description: task.description || "",
      taskStatus: task.taskStatus || "normal",
      taskProgress: task.taskProgress || "pending",
      createdAt: task.createdAt
        ? new Date(task.createdAt).toISOString()
        : new Date().toISOString(),
    }));

    return NextResponse.json(sanitizedTasks);
  } catch (error) {
    console.error("Error in GET /api/tasks:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching tasks" },
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

    const taskData = await req.json();
    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("tasks").insertOne({
      ...taskData,
      createdAt: new Date(),
    });

    const newTask = await db
      .collection("tasks")
      .findOne({ _id: result.insertedId });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/tasks:", error);
    return NextResponse.json(
      { message: "An error occurred while creating the task" },
      { status: 500 }
    );
  }
}
