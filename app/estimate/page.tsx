"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
    MapPin,
    Users,
    Clock,
    Calculator,
    ArrowRight,
    LogIn,
    UserPlus,
    CheckCircle,
    AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface EstimateData {
    numberOfWorkers: number;
    numberOfHours: number;
    jobDate: string;
    jobLocation: string;
    jobType: string;
    jobDescription: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerCompany: string;
}

interface CostEstimate {
    laborCost: number;
    materialCost: number;
    travelCost: number;
    totalCost: number;
}

export default function EstimatePage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [formData, setFormData] = useState<EstimateData>({
        numberOfWorkers: 1,
        numberOfHours: 8,
        jobDate: "",
        jobLocation: "",
        jobType: "",
        jobDescription: "",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        customerCompany: "",
    });

    const [estimate, setEstimate] = useState<CostEstimate | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [isBooking, setIsBooking] = useState(false);

    // Auto-fill customer info if logged in
    useEffect(() => {
        if (session?.user?.role === "customer") {
            setFormData((prev) => ({
                ...prev,
                customerName: session.user.name || "",
                customerEmail: session.user.email || "",
            }));
        }

        // Check for pending booking data
        const pendingBooking = localStorage.getItem("pendingBooking");
        if (pendingBooking && session?.user?.role === "customer") {
            const bookingData = JSON.parse(pendingBooking);
            setFormData(bookingData.jobEstimate);
            setEstimate(bookingData.estimatedCost);
            localStorage.removeItem("pendingBooking");
            toast.info(
                "Your estimate has been restored. You can now submit your booking request."
            );
        }
    }, [session]);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]:
                name === "numberOfWorkers" || name === "numberOfHours"
                    ? Number(value)
                    : value,
        }));
    };

    const calculateEstimate = async () => {
        if (
            !formData.numberOfWorkers ||
            !formData.numberOfHours ||
            !formData.jobDate ||
            !formData.jobLocation
        ) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsCalculating(true);
        try {
            const response = await fetch("/api/estimate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) throw new Error("Failed to calculate estimate");

            const data = await response.json();
            setEstimate(data.estimate);
            toast.success("Estimate calculated successfully!");
        } catch (error) {
            console.error("Error calculating estimate:", error);
            toast.error("Failed to calculate estimate");
        } finally {
            setIsCalculating(false);
        }
    };

    const handleBookNow = async () => {
        if (!estimate) {
            toast.error("Please calculate estimate first");
            return;
        }

        // Check if user is logged in as customer
        if (!session?.user || session.user.role !== "customer") {
            // Store estimate data in localStorage and redirect to login
            localStorage.setItem(
                "pendingBooking",
                JSON.stringify({
                    jobEstimate: formData,
                    estimatedCost: estimate,
                })
            );
            router.push("/auth/login?type=customer&returnUrl=/estimate");
            return;
        }

        // Fixed validation - check for actual content, not just existence
        const hasName =
            formData.customerName && formData.customerName.trim() !== "";
        const hasEmail =
            formData.customerEmail && formData.customerEmail.trim() !== "";
        const hasPhone =
            formData.customerPhone && formData.customerPhone.trim() !== "";

        if (!hasName || !hasEmail || !hasPhone) {
            // Show specific missing fields
            const missingFields = [];
            if (!hasName) missingFields.push("Full Name");
            if (!hasEmail) missingFields.push("Email");
            if (!hasPhone) missingFields.push("Phone Number");

            toast.error(`Please fill in: ${missingFields.join(", ")}`);
            return;
        }

        setIsBooking(true);
        try {
            const response = await fetch("/api/booking-request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerName: formData.customerName,
                    customerEmail: formData.customerEmail,
                    customerPhone: formData.customerPhone,
                    customerCompany: formData.customerCompany,
                    jobEstimate: formData,
                    estimatedCost: estimate,
                }),
            });

            if (!response.ok) throw new Error("Failed to submit booking request");

            const data = await response.json();
            toast.success("Booking request submitted successfully!");

            // Redirect to job requests page
            router.push("/admin/job-requests");
        } catch (error) {
            console.error("Error submitting booking request:", error);
            toast.error("Failed to submit booking request");
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
            {/* Header */}
            <header className="bg-gray-800/90 backdrop-blur-sm shadow-lg border-b border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                                JobPro Services
                            </h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            {session?.user ? (
                                <div className="flex items-center space-x-4">
                                    <span className="text-sm text-gray-300">
                                        Welcome, {session.user.name}
                                    </span>
                                    {session.user.role === "customer" ? (
                                        <Link href="/customer/dashboard">
                                            <Button
                                                size="sm"
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                Dashboard
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Link href="/job-portal">
                                            <Button
                                                size="sm"
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                Portal
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <Link href="/login?type=customer">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-gray-300 hover:text-white hover:bg-gray-700"
                                        >
                                            <LogIn className="h-4 w-4 mr-2" />
                                            Login
                                        </Button>
                                    </Link>
                                    <Link href="/signup?type=customer">
                                        <Button
                                            size="sm"
                                            className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700"
                                        >
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            Sign Up
                                        </Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-4">
                        Get Your Job Estimate
                        <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                            {" "}
                            Instantly
                        </span>
                    </h1>
                    <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                        Professional services with transparent pricing. Fill out the form
                        below to get an instant estimate for your project.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Estimation Form */}
                    <Card className="shadow-2xl bg-gray-800/50 backdrop-blur-sm border-gray-700">
                        <CardHeader className="border-b border-gray-700">
                            <CardTitle className="flex items-center text-white">
                                <Calculator className="h-5 w-5 mr-2 text-blue-400" />
                                Job Estimation Form
                            </CardTitle>
                            <CardDescription className="text-gray-400">
                                Provide details about your project to get an accurate estimate
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 p-6">
                            {/* Job Details */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white">
                                    Job Details
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="numberOfWorkers" className="text-gray-300">
                                            Number of Workers *
                                        </Label>
                                        <Input
                                            id="numberOfWorkers"
                                            name="numberOfWorkers"
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={formData.numberOfWorkers}
                                            onChange={handleInputChange}
                                            className="mt-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="numberOfHours" className="text-gray-300">
                                            Number of Hours *
                                        </Label>
                                        <Input
                                            id="numberOfHours"
                                            name="numberOfHours"
                                            type="number"
                                            min="1"
                                            max="24"
                                            value={formData.numberOfHours}
                                            onChange={handleInputChange}
                                            className="mt-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="jobDate" className="text-gray-300">
                                        Job Date *
                                    </Label>
                                    <Input
                                        id="jobDate"
                                        name="jobDate"
                                        type="date"
                                        value={formData.jobDate}
                                        onChange={handleInputChange}
                                        className="mt-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                        min={format(new Date(), "yyyy-MM-dd")}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="jobLocation" className="text-gray-300">
                                        Job Location *
                                    </Label>
                                    <Input
                                        id="jobLocation"
                                        name="jobLocation"
                                        placeholder="Enter job location"
                                        value={formData.jobLocation}
                                        onChange={handleInputChange}
                                        className="mt-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="jobType" className="text-gray-300">
                                        Job Type
                                    </Label>
                                    <Input
                                        id="jobType"
                                        name="jobType"
                                        placeholder="e.g., Installation, Maintenance, Repair"
                                        value={formData.jobType}
                                        onChange={handleInputChange}
                                        className="mt-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="jobDescription" className="text-gray-300">
                                        Job Description
                                    </Label>
                                    <Textarea
                                        id="jobDescription"
                                        name="jobDescription"
                                        placeholder="Describe the work to be done..."
                                        value={formData.jobDescription}
                                        onChange={handleInputChange}
                                        className="mt-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* Customer Information */}
                            <div className="space-y-4 border-t border-gray-700 pt-6">
                                <h3 className="text-lg font-semibold text-white">
                                    Your Information
                                </h3>

                                <div>
                                    <Label htmlFor="customerName" className="text-gray-300">
                                        Full Name *
                                    </Label>
                                    <Input
                                        id="customerName"
                                        name="customerName"
                                        placeholder="Enter your full name"
                                        value={formData.customerName}
                                        onChange={handleInputChange}
                                        className="mt-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                        disabled={session?.user?.role === "customer"}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="customerEmail" className="text-gray-300">
                                        Email Address *
                                    </Label>
                                    <Input
                                        id="customerEmail"
                                        name="customerEmail"
                                        type="email"
                                        placeholder="Enter your email"
                                        value={formData.customerEmail}
                                        onChange={handleInputChange}
                                        className="mt-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                        disabled={session?.user?.role === "customer"}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="customerPhone" className="text-gray-300">
                                        Phone Number *
                                    </Label>
                                    <Input
                                        id="customerPhone"
                                        name="customerPhone"
                                        type="tel"
                                        placeholder="Enter your phone number"
                                        value={formData.customerPhone}
                                        onChange={handleInputChange}
                                        className="mt-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="customerCompany" className="text-gray-300">
                                        Company (Optional)
                                    </Label>
                                    <Input
                                        id="customerCompany"
                                        name="customerCompany"
                                        placeholder="Enter company name"
                                        value={formData.customerCompany}
                                        onChange={handleInputChange}
                                        className="mt-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <Button
                                onClick={calculateEstimate}
                                disabled={isCalculating}
                                className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 transition-all duration-300"
                                size="lg"
                            >
                                {isCalculating ? "Calculating..." : "Calculate Estimate"}
                                <Calculator className="h-4 w-4 ml-2" />
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Estimate Results */}
                    <div className="space-y-6">
                        {/* Sample Services */}
                        <Card className="shadow-2xl bg-gray-800/50 backdrop-blur-sm border-gray-700">
                            <CardHeader className="border-b border-gray-700">
                                <CardTitle className="text-white">Our Services</CardTitle>
                                <CardDescription className="text-gray-400">
                                    Professional services we provide
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-3">
                                        <Users className="h-5 w-5 text-blue-400" />
                                        <div>
                                            <h4 className="font-medium text-white">
                                                Installation Services
                                            </h4>
                                            <p className="text-sm text-gray-400">
                                                Professional installation by certified technicians
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <Clock className="h-5 w-5 text-emerald-400" />
                                        <div>
                                            <h4 className="font-medium text-white">
                                                Maintenance & Repair
                                            </h4>
                                            <p className="text-sm text-gray-400">
                                                Regular maintenance and emergency repairs
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <MapPin className="h-5 w-5 text-purple-400" />
                                        <div>
                                            <h4 className="font-medium text-white">
                                                On-Site Services
                                            </h4>
                                            <p className="text-sm text-gray-400">
                                                We come to your location
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Enhanced Estimate Display */}
                        {estimate && (
                            <Card className="shadow-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-900/30 to-green-900/30 backdrop-blur-sm">
                                <CardHeader className="bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-t-lg border-b border-emerald-500/50">
                                    <CardTitle className="flex items-center text-xl">
                                        <CheckCircle className="h-6 w-6 mr-2" />
                                        Your Professional Estimate
                                    </CardTitle>
                                    <CardDescription className="text-emerald-100">
                                        Detailed breakdown based on your requirements
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    {/* Job Summary */}
                                    <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                                        <h4 className="font-semibold text-white mb-3 flex items-center">
                                            <AlertCircle className="h-4 w-4 mr-2 text-blue-400" />
                                            Job Summary
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Workers:</span>
                                                <span className="font-medium text-white">
                                                    {formData.numberOfWorkers}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Hours:</span>
                                                <span className="font-medium text-white">
                                                    {formData.numberOfHours}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Date:</span>
                                                <span className="font-medium text-white">
                                                    {format(new Date(formData.jobDate), "MMM d, yyyy")}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Type:</span>
                                                <span className="font-medium text-white">
                                                    {formData.jobType || "General"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cost Breakdown */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-white mb-3">
                                            Cost Breakdown
                                        </h4>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg border border-gray-600">
                                                <div className="flex items-center">
                                                    <Users className="h-4 w-4 mr-2 text-blue-400" />
                                                    <span className="text-gray-300">Labor Cost</span>
                                                </div>
                                                <span className="font-semibold text-lg text-white">
                                                    £{estimate.laborCost.toFixed(2)}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg border border-gray-600">
                                                <div className="flex items-center">
                                                    <Calculator className="h-4 w-4 mr-2 text-purple-400" />
                                                    <span className="text-gray-300">Material Cost</span>
                                                </div>
                                                <span className="font-semibold text-lg text-white">
                                                    £{estimate.materialCost.toFixed(2)}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg border border-gray-600">
                                                <div className="flex items-center">
                                                    <MapPin className="h-4 w-4 mr-2 text-orange-400" />
                                                    <span className="text-gray-300">Travel Cost</span>
                                                </div>
                                                <span className="font-semibold text-lg text-white">
                                                    £{estimate.travelCost.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        <Separator className="my-4 bg-gray-600" />

                                        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg">
                                            <span className="text-xl font-bold">Total Estimate:</span>
                                            <span className="text-2xl font-bold">
                                                £{estimate.totalCost.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-3 pt-6">
                                        <Button
                                            onClick={handleBookNow}
                                            disabled={isBooking}
                                            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 transition-all duration-300"
                                            size="lg"
                                        >
                                            {isBooking
                                                ? "Submitting..."
                                                : session?.user?.role === "customer"
                                                    ? "Submit Job Request"
                                                    : "Login to Book"}
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </Button>

                                        {!session?.user && (
                                            <div className="grid grid-cols-2 gap-2">
                                                <Link href="/login?type=customer">
                                                    <Button
                                                        variant="outline"
                                                        className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                                                    >
                                                        <LogIn className="h-4 w-4 mr-2" />
                                                        Login
                                                    </Button>
                                                </Link>
                                                <Link href="/signup?type=customer">
                                                    <Button
                                                        variant="outline"
                                                        className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                                                    >
                                                        <UserPlus className="h-4 w-4 mr-2" />
                                                        Sign Up
                                                    </Button>
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {/* Disclaimer */}
                                    <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
                                        <p className="text-xs text-blue-300">
                                            <strong>Note:</strong> This is an estimated quote. Final
                                            pricing may vary based on site conditions and specific
                                            requirements. Valid for 30 days.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Why Choose Us */}
                        <Card className="shadow-2xl bg-gray-800/50 backdrop-blur-sm border-gray-700">
                            <CardHeader className="border-b border-gray-700">
                                <CardTitle className="text-white">Why Choose Us?</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <Badge
                                            variant="secondary"
                                            className="bg-emerald-900/50 text-emerald-300 border-emerald-700"
                                        >
                                            ✓
                                        </Badge>
                                        <span className="text-sm text-gray-300">
                                            Licensed & Insured
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Badge
                                            variant="secondary"
                                            className="bg-emerald-900/50 text-emerald-300 border-emerald-700"
                                        >
                                            ✓
                                        </Badge>
                                        <span className="text-sm text-gray-300">
                                            24/7 Customer Support
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Badge
                                            variant="secondary"
                                            className="bg-emerald-900/50 text-emerald-300 border-emerald-700"
                                        >
                                            ✓
                                        </Badge>
                                        <span className="text-sm text-gray-300">
                                            Transparent Pricing
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Badge
                                            variant="secondary"
                                            className="bg-emerald-900/50 text-emerald-300 border-emerald-700"
                                        >
                                            ✓
                                        </Badge>
                                        <span className="text-sm text-gray-300">
                                            Quality Guarantee
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
