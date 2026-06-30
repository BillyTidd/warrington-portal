export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const taskData = await req.json();
    const client = await clientPromise;
    const db = client.db();

    // Get user details to check permissions
    const user = await db.collection("users").findOne({ email: session.user.email });
    
    // Check if user has permission to update this task
    const task = await db.collection("tasks").findOne({ _id: new ObjectId(params.id) });
    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    if (user?.role !== "admin" && task.userId !== user?._id.toString()) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    // Remove _id from taskData to avoid the MongoDB error
    const { _id, ...updateData } = taskData;

    const result = await db
      .collection("tasks")
      .updateOne({ _id: new ObjectId(params.id) }, { $set: updateData });

    const updatedTask = await db
      .collection("tasks")
      .findOne({ _id: new ObjectId(params.id) });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error in PUT /api/tasks/[id]:", error);
    return NextResponse.json(
      { message: "An error occurred while updating the task" },
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

    const client = await clientPromise;
    const db = client.db();

    // Get user details to check permissions
    const user = await db.collection("users").findOne({ email: session.user.email });
    
    // Check if user has permission to delete this task
    const task = await db.collection("tasks").findOne({ _id: new ObjectId(params.id) });
    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    if (user?.role !== "admin" && task.userId !== user?._id.toString()) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const result = await db
      .collection("tasks")
      .deleteOne({ _id: new ObjectId(params.id) });

    return NextResponse.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error in DELETE /api/tasks/[id]:", error);
    return NextResponse.json(
      { message: "An error occurred while deleting the task" },
      { status: 500 }
    );
  }
}