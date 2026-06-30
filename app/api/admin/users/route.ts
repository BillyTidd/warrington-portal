import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import clientPromise from '@/lib/mongodb'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db()
    
    let users

    if (session.user.role === 'admin') {
      // Get all users for admin
      users = await db.collection('users').find({}).toArray()
    } else {
      // Get only the current user for employees
      users = await db.collection('users').find({ email: session.user.email }).toArray()
    }

    // Transform the data to ensure proper serialization
    const sanitizedUsers = users.map(user => ({
      _id: user._id.toString(),
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'employee',
      isApproved: !!user.isApproved,
      createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
      phone: user.phone || '',
      whatsappNumber: user.whatsappNumber || '',
    }))

    return NextResponse.json(sanitizedUsers)
  } catch (error) {
    console.error('Error in users API:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}