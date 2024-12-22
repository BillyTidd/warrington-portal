import { NextResponse } from 'next/server'
import { hash } from 'bcrypt'
import clientPromise from '@/lib/mongodb'

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()
    const client = await clientPromise
    const db = client.db()

    const existingUser = await db.collection('users').findOne({ email })
    if (existingUser) {
      return NextResponse.json({ message: 'User already exists' }, { status: 400 })
    }

    const hashedPassword = await hash(password, 10)
    const result = await db.collection('users').insertOne({
      name,
      email,
      password: hashedPassword,
      role: 'employee',
      isApproved: false,
    })

    return NextResponse.json({ message: 'User created successfully', userId: result.insertedId }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'An error occurred during sign up' }, { status: 500 })
  }
}