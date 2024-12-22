const bcrypt = require('bcrypt')
const { MongoClient } = require('mongodb')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') })

// Log to debug environment loading
console.log('Checking environment...')
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI)

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local')
}

async function seedAdmin() {
  try {
    console.log('Connecting to MongoDB...')
    const client = await MongoClient.connect(process.env.MONGODB_URI)
    const db = client.db()

    // Admin user details
    const adminEmail = 'admin@example.com'
    const adminPassword = 'admin123' // Change this to a secure password

    // Check if admin already exists
    const existingAdmin = await db.collection('users').findOne({ email: adminEmail })

    if (existingAdmin) {
      console.log('Admin user already exists')
      await client.close()
      return
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 10)

    await db.collection('users').insertOne({
      name: 'Admin User',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      isApproved: true,
      createdAt: new Date(),
    })

    console.log('Admin user created successfully:')
    console.log('Email:', adminEmail)
    console.log('Password:', adminPassword)
    
    await client.close()
  } catch (error) {
    console.error('Error seeding admin user:', error)
    process.exit(1)
  }
}

seedAdmin()