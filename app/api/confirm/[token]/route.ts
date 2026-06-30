import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const client = await clientPromise
    const db = client.db()

    const confirmation = await db
      .collection('worker-confirmations')
      .findOne({ token: params.token })

    if (!confirmation) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    const job = await db
      .collection('jobs')
      .findOne({ _id: new ObjectId(confirmation.jobId) })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({
      confirmation: {
        workerName: confirmation.workerName,
        status: confirmation.status,
        workerResponse: confirmation.workerResponse,
        workerMessage: confirmation.workerMessage,
        respondedAt: confirmation.respondedAt,
      },
      job: {
        jobName: job.jobName || 'Unnamed Job',
        jobDate: job.jobEstimate?.jobDate ?? null,
        jobLocation: job.jobEstimate?.jobLocation || job.jobLocation || 'TBC',
        numberOfWorkers: job.jobEstimate?.numberOfWorkers ?? null,
        jobType: job.jobEstimate?.jobType ?? null,
        jobShift: job.jobEstimate?.jobShift ?? null,
      },
    })
  } catch (error) {
    console.error('Error fetching confirmation:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { response, message } = await req.json() as {
      response: 'yes' | 'no'
      message?: string
    }

    if (!['yes', 'no'].includes(response)) {
      return NextResponse.json({ error: 'Invalid response' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()

    const confirmation = await db
      .collection('worker-confirmations')
      .findOne({ token: params.token })

    if (!confirmation) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    if (confirmation.status !== 'pending') {
      return NextResponse.json({ error: 'Already responded' }, { status: 409 })
    }

    await db.collection('worker-confirmations').updateOne(
      { token: params.token },
      {
        $set: {
          status: response === 'yes' ? 'confirmed' : 'declined',
          workerResponse: response,
          workerMessage: message?.trim() || null,
          respondedAt: new Date(),
        },
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting confirmation:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
