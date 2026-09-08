import { NextResponse } from "next/server";
import { hash } from "bcrypt";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const {
      name,
      email,
      password,
      role = "employee",
      phone,
      company,
    } = await req.json();
    const client = await clientPromise;
    const db = client.db();

    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 10);
    const result = await db.collection("users").insertOne({
      name,
      email,
      password: hashedPassword,
      role: role === "customer" ? "customer" : "employee", // Allow customer role
      isApproved: role === "customer" ? true : false, // Auto-approve customers
      phone: phone || null,
      company: company || null,
      createdAt: new Date(),
    });



    if (role === "customer") {
      const now = new Date();

      await db.collection("clients").updateOne(
        {
          customerAccountId: result.insertedId,
        },
        {
          $set: {
            name: company || name,
            customerAccountId: result.insertedId,
            updatedAt: now,
          },
          $setOnInsert: {
            description: "Customer portal account",
            createdAt: now,
          },
        },
        {
          upsert: true,
        }
      );
    }



    return NextResponse.json(
      {
        message: "User created successfully",
        userId: result.insertedId,
        role: role === "customer" ? "customer" : "employee",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "An error occurred during sign up" },
      { status: 500 }
    );
  }
}
