export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'
import { Db, ObjectId } from 'mongodb'
import twilio from 'twilio'

let indexesEnsured = false
async function ensureIndexes(db: Db) {
  if (indexesEnsured) return
  await db.collection('worker-confirmations').createIndex({ token: 1 }, { unique: true })
  await db.collection('worker-confirmations').createIndex({ jobId: 1 })
  indexesEnsured = true
}

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) throw new Error('Twilio credentials not configured')
  return twilio(sid, token)
}

function buildMessage(
  workerName: string,
  jobName: string,
  jobDate: string,
  jobLocation: string,
  confirmUrl: string,
  jobType: string,
  duration: string,
  postcodes: string[],
  description: string
) {
  const lines = [
    `Hi ${workerName}, you have been requested for a job.`,
    '',
    `Job: ${jobName}`,
    `Type: ${jobType}`,
    `Date: ${jobDate}`,
    `Duration: ${duration}`,
    `Location: ${jobLocation}`,
  ]

  if (postcodes.length > 0) {
    lines.push(`Postcode${postcodes.length > 1 ? 's' : ''}: ${postcodes.join(', ')}`)
  }

  if (description) {
    lines.push(`Details: ${description}`)
  }

  lines.push('', 'Please confirm your availability:', confirmUrl)

  return lines.join('\n')
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db()
    await ensureIndexes(db)

    const confirmations = await db
      .collection('worker-confirmations')
      .find({ jobId: params.id })
      .sort({ sentAt: -1 })
      .toArray()

    return NextResponse.json(
      confirmations.map((c) => ({ ...c, _id: c._id.toString() }))
    )
  } catch (error) {
    console.error('Error fetching confirmations:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workers, channel } = await req.json() as {
      workers: { workerId: string; workerName: string; phone: string; whatsappNumber?: string }[]
      channel: 'sms' | 'whatsapp'
    }

    if (!workers?.length || !channel) {
      return NextResponse.json({ error: 'Workers and channel are required' }, { status: 400 })
    }

    const dbClient = await clientPromise
    const db = dbClient.db()
    await ensureIndexes(db)

    const job = await db.collection('jobs').findOne({ _id: new ObjectId(params.id) })
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const twilioClient = getTwilioClient()
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    const jobName = job.jobName || 'Unnamed Job'
    const jobDate = job.jobEstimate?.jobDate
      ? new Date(job.jobEstimate.jobDate).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'TBC'
    const jobLocation = job.jobEstimate?.jobLocation || job.jobLocation || 'TBC'
    const jobType = job.jobType || job.jobEstimate?.jobType || 'General'
    const durationHours = job.estimatedHours ?? job.jobEstimate?.numberOfHours
    const duration = durationHours ? `${durationHours} hour${durationHours === 1 ? '' : 's'}` : 'TBC'
    const postcodes: string[] = (job.jobEstimate?.postcodes || job.postcodes || [])
      .filter((pc: string) => pc?.trim())
    const description = job.description || job.jobEstimate?.jobDescription || ''

    const results = await Promise.allSettled(
      workers.map(async (worker) => {
        const existing = await db.collection('worker-confirmations').findOne({
          jobId: params.id,
          workerId: worker.workerId,
          channel,
          status: 'pending',
        })
        if (existing) {
          return { workerId: worker.workerId, success: false, error: 'Already has a pending confirmation' }
        }

        const toNumber =
          channel === 'whatsapp'
            ? worker.whatsappNumber || worker.phone
            : worker.phone

        if (!toNumber) {
          return { workerId: worker.workerId, success: false, error: 'No phone number' }
        }

        const token = crypto.randomUUID()
        const confirmUrl = `${baseUrl}/confirm/${token}`
        const messageBody = buildMessage(
          worker.workerName,
          jobName,
          jobDate,
          jobLocation,
          confirmUrl,
          jobType,
          duration,
          postcodes,
          description
        )

        const from =
          channel === 'whatsapp'
            ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`
            : process.env.TWILIO_PHONE_NUMBER

        const to =
          channel === 'whatsapp' ? `whatsapp:${toNumber}` : toNumber

        try {
          if (channel === 'whatsapp') {
            const templateSid = process.env.TWILIO_WHATSAPP_TEMPLATE_SID
            if (!templateSid) throw new Error('TWILIO_WHATSAPP_TEMPLATE_SID is not configured')
            await twilioClient.messages.create({
              from: from!,
              to,
              contentSid: templateSid,
              contentVariables: JSON.stringify({
                '1': worker.workerName,
                '2': jobName,
                '3': jobDate,
                '4': jobLocation,
                '5': confirmUrl,
              }),
            })
          } else {
            await twilioClient.messages.create({ body: messageBody, from: from!, to })
          }
        } catch (twilioErr: any) {
          console.error(`Twilio error for ${worker.workerName} [${to}]:`, twilioErr?.message, twilioErr?.code)
          return { workerId: worker.workerId, success: false, error: twilioErr?.message || 'Twilio error' }
        }

        await db.collection('worker-confirmations').insertOne({
          jobId: params.id,
          workerId: worker.workerId,
          workerName: worker.workerName,
          workerPhone: toNumber,
          channel,
          token,
          status: 'pending',
          workerResponse: null,
          workerMessage: null,
          sentAt: new Date(),
          respondedAt: null,
          sentBy: session.user.id,
          sentByName: session.user.name,
        })

        return { workerId: worker.workerId, success: true }
      })
    )

    const summary = results.map((r) =>
      r.status === 'fulfilled' ? r.value : { success: false, error: (r.reason as Error).message }
    )

    return NextResponse.json({ results: summary })
  } catch (error: any) {
    console.error('Error sending confirmations:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
