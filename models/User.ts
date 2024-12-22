import { ObjectId } from 'mongodb'

export interface User {
  _id: ObjectId
  name: string
  email: string
  password: string
  role: 'employee' | 'admin'
  isApproved: boolean
}

export interface ClientData {
  _id: ObjectId
  userId: ObjectId
  date: Date
  client: string
  description: string
  mileage: number
  expenses: number
  overtime: number
  sustenance: number
}