import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { authOptions } from '@/lib/auth'


export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { _id, name, email, role, isApproved } = await req.json()
    const client = await clientPromise
    const db = client.db()

    await db.collection('users').updateOne(
      { _id: new ObjectId(_id) },
      { $set: { name, email, role, isApproved } }
    )

    return NextResponse.json({ message: 'User updated successfully' }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'An error occurred while updating the user' }, { status: 500 })
  }
}