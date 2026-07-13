"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ClipboardList, Package, Receipt, DollarSign, Clock, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Layout } from "@/components/Layout"

interface DashboardStats {
    totalRequests: number
    pendingRequests: number
    approvedRequests: number
    activeJobs: number
    completedJobs: number
    totalSpent: number
    recentRequests: any[]
    recentJobs: any[]
}

export default function CustomerDashboard() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (status === "authenticated") {
            if (session?.user?.role !== "customer") {
                router.push("/job-portal")
                return
            }
            fetchDashboardData()
        }
    }, [session, status])

    const fetchDashboardData = async () => {
        try {
            const response = await fetch("/api/customer/dashboard")
            if (!response.ok) throw new Error("Failed to fetch dashboard data")

            const data = await response.json()
            setStats(data)
        } catch (error) {
            console.error("Error fetching dashboard data:", error)
        } finally {
            setIsLoading(false)
        }
    }

    if (status === "loading" || isLoading) {
        return (
            <Layout>
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            </Layout>
        )
    }

    if (session?.user?.role !== "customer") {
        return null
    }

    return (
        <Layout>
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold">Welcome back, {session?.user?.name}!</h1>
                    <p className="text-muted-foreground">Here's an overview of your job requests and projects.</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                            <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.totalRequests || 0}</div>
                            <p className="text-xs text-muted-foreground">Job requests submitted</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.pendingRequests || 0}</div>
                            <p className="text-xs text-muted-foreground">Awaiting review</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.activeJobs || 0}</div>
                            <p className="text-xs text-muted-foreground">Currently in progress</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">£{stats?.totalSpent?.toFixed(2) || "0.00"}</div>
                            <p className="text-xs text-muted-foreground">Across all projects</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Job Requests */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ClipboardList className="h-5 w-5" />
                                Recent Job Requests
                            </CardTitle>
                            <CardDescription>Your latest job requests and their status</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {stats?.recentRequests?.length ? (
                                <div className="space-y-4">
                                    {stats.recentRequests.slice(0, 3).map((request) => (
                                        <div key={request._id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex-1">
                                                <p className="font-medium">{request.jobEstimate?.jobType || "Job Request"}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {request.jobEstimate?.jobLocation} • {format(new Date(request.createdAt), "MMM d, yyyy")}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={request.status} />
                                                <span className="text-sm font-medium">£{request.estimatedCost?.totalCost?.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                    <Link href="/admin/job-requests">
                                        <Button variant="outline" className="w-full">
                                            View All Requests
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground">No job requests yet</p>
                                    <Link href="/estimate">
                                        <Button className="mt-2">Create Your First Request</Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Jobs */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Active Jobs
                            </CardTitle>
                            <CardDescription>Jobs currently in progress</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {stats?.recentJobs?.length ? (
                                <div className="space-y-4">
                                    {stats.recentJobs.slice(0, 3).map((job) => (
                                        <div key={job._id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex-1">
                                                <p className="font-medium">{job.jobName}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Due: {format(new Date(job.expireDate), "MMM d, yyyy")}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={job.status} />
                                                <span className="text-sm font-medium">£{job.clientPrice?.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                    <Link href="/job-portal">
                                        <Button variant="outline" className="w-full">
                                            View All Jobs
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground">No active jobs</p>
                                    <p className="text-sm text-muted-foreground">Jobs will appear here once approved</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}

            </div>
        </Layout>
    )
}
