"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
    Users,
    Calculator,
    ArrowRight,
    LogIn,
    UserPlus,
    CheckCircle,
    AlertCircle,
    Truck,
    Wrench,
    HardHat,
    Crown,
    EyeOff,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";

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
    workerTypes: string[];
    vehicleType: string;
    estimatedDistance: number;
}

interface LaborBreakdown {
    type: string;
    hours: number;
    dayRate: number;
    overtimeHours: number;
    overtimeRate: number;
    cost: number;
}

interface CostEstimate {
    laborCost: number;
    materialCost: number;
    travelCost: number;
    totalCost: number;
    breakdown: {
        labor: LaborBreakdown[];
        material: {
            percentage: number;
            cost: number;
        };
        travel: {
            distance: number;
            vehicleType: string;
            rate: number;
            cost: number;
        };
        jobTypeMultiplier: number;
        jobType: string;
    };
}

const workerTypeOptions = [
    { value: "team-leader", label: "Team Leader", icon: Crown, rate: "£240/day" },
    {
        value: "general-fitter",
        label: "General Fitter",
        icon: Wrench,
        rate: "£220/day",
    },
    {
        value: "labourer",
        label: "Labourer/Assistant",
        icon: HardHat,
        rate: "£200/day",
    },
];

const vehicleOptions = [
    { value: "luton-van", label: "Luton Van/Large Van", rate: "£0.75/mile" },
    { value: "medium-van", label: "Medium Van", rate: "£0.65/mile" },
    { value: "small-van", label: "Small Van/Car", rate: "£0.55/mile" },
];

export default function EstimatePage() {
    const { data: session } = useSession();
    const { theme } = useTheme();
    const router = useRouter();
    const [showEstimate, setShowEstimate] = useState(false);
    const [showLoginDialog, setShowLoginDialog] = useState(false);

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
        workerTypes: ["general-fitter"],
        vehicleType: "medium-van",
        estimatedDistance: 20,
    });

    const [estimate, setEstimate] = useState<CostEstimate | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [isBooking, setIsBooking] = useState(false);

    const isLoggedIn = !!session?.user;
    const isCustomer = session?.user?.role === "customer";

    // Auto-fill customer info if logged in
    useEffect(() => {
        if (isCustomer) {
            setFormData((prev) => ({
                ...prev,
                customerName: session.user.name || "",
                customerEmail: session.user.email || "",
            }));
        }

        // Check for pending booking data
        const pendingBooking = localStorage.getItem("pendingBooking");
        if (pendingBooking && isCustomer) {
            const bookingData = JSON.parse(pendingBooking);
            setFormData(bookingData.jobEstimate);
            setEstimate(bookingData.estimatedCost);
            localStorage.removeItem("pendingBooking");
            toast.info(
                "Your estimate has been restored. You can now submit your booking request."
            );
        }
    }, [session, isCustomer]);

    // Update worker types array when number of workers changes
    useEffect(() => {
        const currentTypes = [...formData.workerTypes];
        if (currentTypes.length < formData.numberOfWorkers) {
            // Add more workers (default to general-fitter)
            while (currentTypes.length < formData.numberOfWorkers) {
                currentTypes.push("general-fitter");
            }
        } else if (currentTypes.length > formData.numberOfWorkers) {
            // Remove excess workers
            currentTypes.splice(formData.numberOfWorkers);
        }
        setFormData((prev) => ({ ...prev, workerTypes: currentTypes }));
    }, [formData.numberOfWorkers]);

    const validateForm = () => {
        const errors = [];

        if (!formData.numberOfWorkers || formData.numberOfWorkers < 1) {
            errors.push("Number of workers is required");
        }
        if (!formData.numberOfHours || formData.numberOfHours < 1) {
            errors.push("Number of hours is required");
        }
        if (!formData.jobDate) {
            errors.push("Job date is required");
        }
        if (!formData.jobLocation?.trim()) {
            errors.push("Job location is required");
        }
        if (!formData.customerName?.trim()) {
            errors.push("Your full name is required");
        }
        if (!formData.customerEmail?.trim()) {
            errors.push("Your email address is required");
        }
        if (!formData.customerPhone?.trim()) {
            errors.push("Your phone number is required");
        }

        // Validate email format
        if (
            formData.customerEmail &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)
        ) {
            errors.push("Please enter a valid email address");
        }

        // Validate date is not in the past
        if (formData.jobDate && new Date(formData.jobDate) < new Date()) {
            errors.push("Job date cannot be in the past");
        }

        return errors;
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]:
                name === "numberOfWorkers" ||
                    name === "numberOfHours" ||
                    name === "estimatedDistance"
                    ? Number(value)
                    : value,
        }));
    };

    const handleWorkerTypeChange = (index: number, value: string) => {
        const newWorkerTypes = [...formData.workerTypes];
        newWorkerTypes[index] = value;
        setFormData((prev) => ({ ...prev, workerTypes: newWorkerTypes }));
    };

    const calculateEstimate = async () => {
        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            toast.error(
                <div>
                    <div className="font-semibold mb-2">
                        Please fix the following errors:
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                        {validationErrors.map((error, index) => (
                            <li key={index} className="text-sm">
                                {error}
                            </li>
                        ))}
                    </ul>
                </div>,
                { duration: 6000 }
            );
            return;
        }

        setIsCalculating(true);
        try {
            const response = await fetch("/api/estimate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to calculate estimate");
            }

            setEstimate(data.estimate);
            setShowEstimate(true);
            toast.success("Estimate calculated successfully!");

            // Show login dialog if user is not logged in
            if (!isLoggedIn) {
                setTimeout(() => {
                    setShowLoginDialog(true);
                }, 1000);
            }
        } catch (error: any) {
            console.error("Error calculating estimate:", error);
            toast.error(
                error.message || "Failed to calculate estimate. Please try again."
            );
        } finally {
            setIsCalculating(false);
        }
    };

    const handleBookNow = async () => {
        if (!estimate) {
            toast.error("Please calculate estimate first");
            return;
        }

        if (!isCustomer) {
            localStorage.setItem(
                "pendingBooking",
                JSON.stringify({
                    jobEstimate: formData,
                    estimatedCost: estimate,
                })
            );
            router.push("/login?type=customer&returnUrl=/estimate");
            return;
        }

        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            toast.error(
                <div>
                    <div className="font-semibold mb-2">
                        Please complete your information:
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                        {validationErrors.map((error, index) => (
                            <li key={index} className="text-sm">
                                {error}
                            </li>
                        ))}
                    </ul>
                </div>,
                { duration: 6000 }
            );
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

            toast.success("Booking request submitted successfully!");
            router.push("/admin/job-requests");
        } catch (error) {
            console.error("Error submitting booking request:", error);
            toast.error("Failed to submit booking request. Please try again.");
        } finally {
            setIsBooking(false);
        }
    };

    const handleLoginRedirect = (type: "login" | "signup") => {
        if (estimate) {
            localStorage.setItem(
                "pendingBooking",
                JSON.stringify({
                    jobEstimate: formData,
                    estimatedCost: estimate,
                })
            );
        }
        router.push(`/${type}?type=customer&returnUrl=/estimate`);
    };

    return (
        <div
            className={`min-h-screen transition-colors duration-300 ${theme === "dark"
                    ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
                    : "bg-gradient-to-br from-slate-50 via-white to-slate-100"
                }`}
        >
            {/* Header */}
            <header
                className={`shadow-lg border-b transition-colors duration-300 ${theme === "dark"
                        ? "bg-slate-800/90 backdrop-blur-sm border-slate-700"
                        : "bg-white/90 backdrop-blur-sm border-slate-200"
                    }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <h1
                                className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"
                                    }`}
                            >
                                JobPro Services
                            </h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            {session?.user ? (
                                <div className="flex items-center space-x-4">
                                    <span
                                        className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"
                                            }`}
                                    >
                                        Welcome, {session.user.name}
                                    </span>
                                    {isCustomer ? (
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
                                        <Button variant="ghost" size="sm">
                                            <LogIn className="h-4 w-4 mr-2" />
                                            Login
                                        </Button>
                                    </Link>
                                    <Link href="/signup?type=customer">
                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
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
                    <h1
                        className={`text-5xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-slate-900"
                            }`}
                    >
                        Professional Job Estimation
                    </h1>
                    <p
                        className={`text-xl max-w-3xl mx-auto ${theme === "dark" ? "text-slate-300" : "text-slate-600"
                            }`}
                    >
                        Get accurate, transparent pricing for your project with our
                        professional estimation tool. Detailed breakdowns and competitive
                        rates.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Estimation Form */}
                    <Card
                        className={`shadow-xl border-0 ${theme === "dark"
                                ? "bg-slate-800/50 backdrop-blur-sm"
                                : "bg-white/80 backdrop-blur-sm"
                            }`}
                    >
                        <CardHeader
                            className={`${theme === "dark"
                                    ? "bg-gradient-to-r from-slate-700 to-slate-600"
                                    : "bg-gradient-to-r from-slate-100 to-slate-50"
                                } rounded-t-lg`}
                        >
                            <CardTitle
                                className={`flex items-center text-xl ${theme === "dark" ? "text-white" : "text-slate-900"
                                    }`}
                            >
                                <Calculator className="h-6 w-6 mr-3" />
                                Job Estimation Form
                            </CardTitle>
                            <CardDescription
                                className={
                                    theme === "dark" ? "text-slate-300" : "text-slate-600"
                                }
                            >
                                Provide detailed information about your project for accurate
                                pricing
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {/* Job Details */}
                            <div className="space-y-4">
                                <h3
                                    className={`text-lg font-semibold flex items-center ${theme === "dark" ? "text-white" : "text-slate-900"
                                        }`}
                                >
                                    <Wrench className="h-5 w-5 mr-2" />
                                    Job Details
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label
                                            htmlFor="numberOfWorkers"
                                            className={
                                                theme === "dark" ? "text-slate-200" : "text-slate-700"
                                            }
                                        >
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
                                            className={`mt-1 ${theme === "dark"
                                                    ? "bg-slate-700 border-slate-600 text-white"
                                                    : "bg-white border-slate-300"
                                                }`}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label
                                            htmlFor="numberOfHours"
                                            className={
                                                theme === "dark" ? "text-slate-200" : "text-slate-700"
                                            }
                                        >
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
                                            className={`mt-1 ${theme === "dark"
                                                    ? "bg-slate-700 border-slate-600 text-white"
                                                    : "bg-white border-slate-300"
                                                }`}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Worker Types */}
                                <div className="space-y-3">
                                    <Label
                                        className={
                                            theme === "dark" ? "text-slate-200" : "text-slate-700"
                                        }
                                    >
                                        Worker Types *
                                    </Label>
                                    {Array.from({ length: formData.numberOfWorkers }).map(
                                        (_, index) => (
                                            <div key={index} className="flex items-center space-x-3">
                                                <span
                                                    className={`text-sm font-medium w-20 ${theme === "dark"
                                                            ? "text-slate-300"
                                                            : "text-slate-600"
                                                        }`}
                                                >
                                                    Worker {index + 1}:
                                                </span>
                                                <Select
                                                    value={
                                                        formData.workerTypes[index] || "general-fitter"
                                                    }
                                                    onValueChange={(value) =>
                                                        handleWorkerTypeChange(index, value)
                                                    }
                                                >
                                                    <SelectTrigger
                                                        className={`flex-1 ${theme === "dark"
                                                                ? "bg-slate-700 border-slate-600 text-white"
                                                                : "bg-white border-slate-300"
                                                            }`}
                                                    >
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {workerTypeOptions.map((option) => (
                                                            <SelectItem
                                                                key={option.value}
                                                                value={option.value}
                                                            >
                                                                <div className="flex items-center space-x-2">
                                                                    <option.icon className="h-4 w-4" />
                                                                    <span>{option.label}</span>
                                                                    <Badge variant="secondary" className="ml-2">
                                                                        {option.rate}
                                                                    </Badge>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label
                                            htmlFor="jobDate"
                                            className={
                                                theme === "dark" ? "text-slate-200" : "text-slate-700"
                                            }
                                        >
                                            Job Date *
                                        </Label>
                                        <Input
                                            id="jobDate"
                                            name="jobDate"
                                            type="date"
                                            value={formData.jobDate}
                                            onChange={handleInputChange}
                                            className={`mt-1 ${theme === "dark"
                                                    ? "bg-slate-700 border-slate-600 text-white"
                                                    : "bg-white border-slate-300"
                                                }`}
                                            min={format(new Date(), "yyyy-MM-dd")}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label
                                            htmlFor="estimatedDistance"
                                            className={
                                                theme === "dark" ? "text-slate-200" : "text-slate-700"
                                            }
                                        >
                                            Distance (miles)
                                        </Label>
                                        <Input
                                            id="estimatedDistance"
                                            name="estimatedDistance"
                                            type="number"
                                            min="1"
                                            value={formData.estimatedDistance}
                                            onChange={handleInputChange}
                                            className={`mt-1 ${theme === "dark"
                                                    ? "bg-slate-700 border-slate-600 text-white"
                                                    : "bg-white border-slate-300"
                                                }`}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label
                                        htmlFor="vehicleType"
                                        className={
                                            theme === "dark" ? "text-slate-200" : "text-slate-700"
                                        }
                                    >
                                        Vehicle Type
                                    </Label>
                                    <Select
                                        value={formData.vehicleType}
                                        onValueChange={(value) =>
                                            setFormData((prev) => ({ ...prev, vehicleType: value }))
                                        }
                                    >
                                        <SelectTrigger
                                            className={`mt-1 ${theme === "dark"
                                                    ? "bg-slate-700 border-slate-600 text-white"
                                                    : "bg-white border-slate-300"
                                                }`}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {vehicleOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    <div className="flex items-center justify-between w-full">
                                                        <span>{option.label}</span>
                                                        <Badge variant="outline" className="ml-2">
                                                            {option.rate}
                                                        </Badge>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label
                                        htmlFor="jobLocation"
                                        className={
                                            theme === "dark" ? "text-slate-200" : "text-slate-700"
                                        }
                                    >
                                        Job Location *
                                    </Label>
                                    <Input
                                        id="jobLocation"
                                        name="jobLocation"
                                        placeholder="Enter job location"
                                        value={formData.jobLocation}
                                        onChange={handleInputChange}
                                        className={`mt-1 ${theme === "dark"
                                                ? "bg-slate-700 border-slate-600 text-white"
                                                : "bg-white border-slate-300"
                                            }`}
                                        required
                                    />
                                </div>

                                <div>
                                    <Label
                                        htmlFor="jobType"
                                        className={
                                            theme === "dark" ? "text-slate-200" : "text-slate-700"
                                        }
                                    >
                                        Job Type
                                    </Label>
                                    <Input
                                        id="jobType"
                                        name="jobType"
                                        placeholder="e.g., Installation, Maintenance, Repair, Emergency"
                                        value={formData.jobType}
                                        onChange={handleInputChange}
                                        className={`mt-1 ${theme === "dark"
                                                ? "bg-slate-700 border-slate-600 text-white"
                                                : "bg-white border-slate-300"
                                            }`}
                                    />
                                </div>

                                <div>
                                    <Label
                                        htmlFor="jobDescription"
                                        className={
                                            theme === "dark" ? "text-slate-200" : "text-slate-700"
                                        }
                                    >
                                        Job Description
                                    </Label>
                                    <Textarea
                                        id="jobDescription"
                                        name="jobDescription"
                                        placeholder="Describe the work to be done..."
                                        value={formData.jobDescription}
                                        onChange={handleInputChange}
                                        className={`mt-1 ${theme === "dark"
                                                ? "bg-slate-700 border-slate-600 text-white"
                                                : "bg-white border-slate-300"
                                            }`}
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* Customer Information */}
                            <div className="space-y-4 border-t pt-6">
                                <h3
                                    className={`text-lg font-semibold flex items-center ${theme === "dark" ? "text-white" : "text-slate-900"
                                        }`}
                                >
                                    <Users className="h-5 w-5 mr-2" />
                                    Your Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label
                                            htmlFor="customerName"
                                            className={
                                                theme === "dark" ? "text-slate-200" : "text-slate-700"
                                            }
                                        >
                                            Full Name *
                                        </Label>
                                        <Input
                                            id="customerName"
                                            name="customerName"
                                            placeholder="Enter your full name"
                                            value={formData.customerName}
                                            onChange={handleInputChange}
                                            className={`mt-1 ${theme === "dark"
                                                    ? "bg-slate-700 border-slate-600 text-white"
                                                    : "bg-white border-slate-300"
                                                }`}
                                            disabled={isCustomer}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <Label
                                            htmlFor="customerEmail"
                                            className={
                                                theme === "dark" ? "text-slate-200" : "text-slate-700"
                                            }
                                        >
                                            Email Address *
                                        </Label>
                                        <Input
                                            id="customerEmail"
                                            name="customerEmail"
                                            type="email"
                                            placeholder="Enter your email"
                                            value={formData.customerEmail}
                                            onChange={handleInputChange}
                                            className={`mt-1 ${theme === "dark"
                                                    ? "bg-slate-700 border-slate-600 text-white"
                                                    : "bg-white border-slate-300"
                                                }`}
                                            disabled={isCustomer}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <Label
                                            htmlFor="customerPhone"
                                            className={
                                                theme === "dark" ? "text-slate-200" : "text-slate-700"
                                            }
                                        >
                                            Phone Number *
                                        </Label>
                                        <Input
                                            id="customerPhone"
                                            name="customerPhone"
                                            type="tel"
                                            placeholder="Enter your phone number"
                                            value={formData.customerPhone}
                                            onChange={handleInputChange}
                                            className={`mt-1 ${theme === "dark"
                                                    ? "bg-slate-700 border-slate-600 text-white"
                                                    : "bg-white border-slate-300"
                                                }`}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <Label
                                            htmlFor="customerCompany"
                                            className={
                                                theme === "dark" ? "text-slate-200" : "text-slate-700"
                                            }
                                        >
                                            Company (Optional)
                                        </Label>
                                        <Input
                                            id="customerCompany"
                                            name="customerCompany"
                                            placeholder="Enter company name"
                                            value={formData.customerCompany}
                                            onChange={handleInputChange}
                                            className={`mt-1 ${theme === "dark"
                                                    ? "bg-slate-700 border-slate-600 text-white"
                                                    : "bg-white border-slate-300"
                                                }`}
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={calculateEstimate}
                                disabled={isCalculating}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                                size="lg"
                            >
                                {isCalculating
                                    ? "Calculating..."
                                    : "Calculate Professional Estimate"}
                                <Calculator className="h-5 w-5 ml-2" />
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Pricing Information */}
                        <Card
                            className={`shadow-xl border-0 ${theme === "dark"
                                    ? "bg-slate-800/50 backdrop-blur-sm"
                                    : "bg-white/80 backdrop-blur-sm"
                                }`}
                        >
                            <CardHeader
                                className={`${theme === "dark"
                                        ? "bg-gradient-to-r from-blue-700 to-indigo-700"
                                        : "bg-gradient-to-r from-blue-600 to-indigo-600"
                                    } text-white rounded-t-lg`}
                            >
                                <CardTitle className="flex items-center">
                                    <Crown className="h-5 w-5 mr-2" />
                                    Our Professional Rates
                                </CardTitle>
                                <CardDescription className="text-blue-100">
                                    Transparent, competitive pricing structure
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    {workerTypeOptions.map((worker) => (
                                        <div
                                            key={worker.value}
                                            className={`flex items-center justify-between p-3 rounded-lg ${theme === "dark" ? "bg-slate-700/50" : "bg-slate-50"
                                                }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <worker.icon
                                                    className={`h-5 w-5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"
                                                        }`}
                                                />
                                                <span
                                                    className={`font-medium ${theme === "dark" ? "text-white" : "text-slate-900"
                                                        }`}
                                                >
                                                    {worker.label}
                                                </span>
                                            </div>
                                            <Badge variant="secondary">{worker.rate}</Badge>
                                        </div>
                                    ))}

                                    <Separator className="my-4" />

                                    <div
                                        className={`text-sm space-y-2 ${theme === "dark" ? "text-slate-300" : "text-slate-600"
                                            }`}
                                    >
                                        <p>
                                            <strong>Day Rate:</strong> 0-10 hours (full day rate)
                                        </p>
                                        <p>
                                            <strong>Overtime:</strong> £24/£22/£20 per hour after 10
                                            hours
                                        </p>
                                        <p>
                                            <strong>Materials:</strong> 15% of labor cost
                                        </p>
                                        <p>
                                            <strong>Travel:</strong> Based on vehicle type and
                                            distance
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Estimate Results */}
                        {showEstimate && estimate && (
                            <div className="relative">
                                {/* Blur overlay for non-logged-in users */}
                                {!isLoggedIn && (
                                    <div className="absolute inset-0 z-20 bg-black/10 backdrop-blur-sm rounded-lg" />
                                )}

                                <Card
                                    className={`shadow-xl border-2 ${theme === "dark"
                                            ? "border-green-400 bg-slate-800/90"
                                            : "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50"
                                        } ${!isLoggedIn ? "filter blur-[2px]" : ""}`}
                                >
                                    <CardHeader
                                        className={`${theme === "dark"
                                                ? "bg-gradient-to-r from-green-700 to-emerald-700"
                                                : "bg-gradient-to-r from-green-600 to-emerald-600"
                                            } text-white rounded-t-lg`}
                                    >
                                        <CardTitle className="flex items-center text-xl">
                                            <CheckCircle className="h-6 w-6 mr-2" />
                                            Professional Estimate
                                        </CardTitle>
                                        <CardDescription className="text-green-100">
                                            Detailed breakdown of your project costs
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        {/* Job Summary */}
                                        <div
                                            className={`mb-6 p-4 rounded-lg border ${theme === "dark"
                                                    ? "bg-slate-700/50 border-slate-600"
                                                    : "bg-white border-green-200"
                                                }`}
                                        >
                                            <h4
                                                className={`font-semibold mb-3 flex items-center ${theme === "dark" ? "text-white" : "text-slate-900"
                                                    }`}
                                            >
                                                <AlertCircle className="h-4 w-4 mr-2 text-blue-600" />
                                                Job Summary
                                            </h4>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="flex justify-between">
                                                    <span
                                                        className={
                                                            theme === "dark"
                                                                ? "text-slate-300"
                                                                : "text-slate-600"
                                                        }
                                                    >
                                                        Workers:
                                                    </span>
                                                    <span
                                                        className={`font-medium ${theme === "dark" ? "text-white" : "text-slate-900"
                                                            }`}
                                                    >
                                                        {formData.numberOfWorkers}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span
                                                        className={
                                                            theme === "dark"
                                                                ? "text-slate-300"
                                                                : "text-slate-600"
                                                        }
                                                    >
                                                        Hours:
                                                    </span>
                                                    <span
                                                        className={`font-medium ${theme === "dark" ? "text-white" : "text-slate-900"
                                                            }`}
                                                    >
                                                        {formData.numberOfHours}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span
                                                        className={
                                                            theme === "dark"
                                                                ? "text-slate-300"
                                                                : "text-slate-600"
                                                        }
                                                    >
                                                        Date:
                                                    </span>
                                                    <span
                                                        className={`font-medium ${theme === "dark" ? "text-white" : "text-slate-900"
                                                            }`}
                                                    >
                                                        {format(new Date(formData.jobDate), "MMM d, yyyy")}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span
                                                        className={
                                                            theme === "dark"
                                                                ? "text-slate-300"
                                                                : "text-slate-600"
                                                        }
                                                    >
                                                        Type:
                                                    </span>
                                                    <span
                                                        className={`font-medium ${theme === "dark" ? "text-white" : "text-slate-900"
                                                            }`}
                                                    >
                                                        {estimate.breakdown.jobType}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Detailed Labor Breakdown */}
                                        <div className="space-y-4 mb-6">
                                            <h4
                                                className={`font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"
                                                    }`}
                                            >
                                                Labor Breakdown
                                            </h4>
                                            {estimate.breakdown.labor.map((worker, index) => (
                                                <div
                                                    key={index}
                                                    className={`p-3 rounded-lg border ${theme === "dark"
                                                            ? "bg-slate-700/30 border-slate-600"
                                                            : "bg-white border-slate-200"
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span
                                                            className={`font-medium ${theme === "dark"
                                                                    ? "text-white"
                                                                    : "text-slate-900"
                                                                }`}
                                                        >
                                                            {worker.type}
                                                        </span>
                                                        <span className="font-bold text-lg">
                                                            £{worker.cost.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <div
                                                        className={`text-xs space-y-1 ${theme === "dark"
                                                                ? "text-slate-400"
                                                                : "text-slate-500"
                                                            }`}
                                                    >
                                                        <div>Day rate (up to 10hrs): £{worker.dayRate}</div>
                                                        {worker.overtimeHours > 0 && (
                                                            <div>
                                                                Overtime ({worker.overtimeHours}hrs): £
                                                                {worker.overtimeRate}/hr = £
                                                                {(
                                                                    worker.overtimeHours * worker.overtimeRate
                                                                ).toFixed(2)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Cost Summary */}
                                        <div className="space-y-3">
                                            <div
                                                className={`flex justify-between items-center p-3 rounded-lg border ${theme === "dark"
                                                        ? "bg-slate-700/30 border-slate-600"
                                                        : "bg-white border-slate-200"
                                                    }`}
                                            >
                                                <div className="flex items-center">
                                                    <Users className="h-4 w-4 mr-2 text-blue-600" />
                                                    <span
                                                        className={
                                                            theme === "dark"
                                                                ? "text-slate-200"
                                                                : "text-slate-700"
                                                        }
                                                    >
                                                        Total Labor Cost
                                                    </span>
                                                </div>
                                                <span className="font-semibold text-lg">
                                                    £{estimate.laborCost.toFixed(2)}
                                                </span>
                                            </div>

                                            <div
                                                className={`flex justify-between items-center p-3 rounded-lg border ${theme === "dark"
                                                        ? "bg-slate-700/30 border-slate-600"
                                                        : "bg-white border-slate-200"
                                                    }`}
                                            >
                                                <div className="flex items-center">
                                                    <Calculator className="h-4 w-4 mr-2 text-purple-600" />
                                                    <span
                                                        className={
                                                            theme === "dark"
                                                                ? "text-slate-200"
                                                                : "text-slate-700"
                                                        }
                                                    >
                                                        Materials ({estimate.breakdown.material.percentage}
                                                        %)
                                                    </span>
                                                </div>
                                                <span className="font-semibold text-lg">
                                                    £{estimate.materialCost.toFixed(2)}
                                                </span>
                                            </div>

                                            <div
                                                className={`flex justify-between items-center p-3 rounded-lg border ${theme === "dark"
                                                        ? "bg-slate-700/30 border-slate-600"
                                                        : "bg-white border-slate-200"
                                                    }`}
                                            >
                                                <div className="flex items-center">
                                                    <Truck className="h-4 w-4 mr-2 text-orange-600" />
                                                    <span
                                                        className={
                                                            theme === "dark"
                                                                ? "text-slate-200"
                                                                : "text-slate-700"
                                                        }
                                                    >
                                                        Travel ({estimate.breakdown.travel.distance} miles)
                                                    </span>
                                                </div>
                                                <span className="font-semibold text-lg">
                                                    £{estimate.travelCost.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        <Separator className="my-4" />

                                        <div
                                            className={`flex justify-between items-center p-4 rounded-lg ${theme === "dark"
                                                    ? "bg-gradient-to-r from-green-700 to-emerald-700"
                                                    : "bg-gradient-to-r from-green-600 to-emerald-600"
                                                } text-white`}
                                        >
                                            <span className="text-xl font-bold">Total Estimate:</span>
                                            <span className="text-3xl font-bold">
                                                £{estimate.totalCost.toFixed(2)}
                                            </span>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="space-y-3 pt-6">
                                            <Button
                                                onClick={handleBookNow}
                                                disabled={isBooking}
                                                className={`w-full ${theme === "dark"
                                                        ? "bg-gradient-to-r from-green-700 to-emerald-700 hover:from-green-800 hover:to-emerald-800"
                                                        : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                                    } text-white`}
                                                size="lg"
                                            >
                                                {isBooking
                                                    ? "Submitting..."
                                                    : isCustomer
                                                        ? "Submit Job Request"
                                                        : "Login to Book"}
                                                <ArrowRight className="h-4 w-4 ml-2" />
                                            </Button>

                                            {!session?.user && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button
                                                        variant="outline"
                                                        className="w-full bg-transparent"
                                                        onClick={() => handleLoginRedirect("login")}
                                                    >
                                                        <LogIn className="h-4 w-4 mr-2" />
                                                        Login
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full bg-transparent"
                                                        onClick={() => handleLoginRedirect("signup")}
                                                    >
                                                        <UserPlus className="h-4 w-4 mr-2" />
                                                        Sign Up
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Disclaimer */}
                                        <div
                                            className={`mt-4 p-3 rounded-lg border ${theme === "dark"
                                                    ? "bg-blue-900/20 border-blue-700 text-blue-200"
                                                    : "bg-blue-50 border-blue-200 text-blue-800"
                                                }`}
                                        >
                                            <p className="text-xs">
                                                <strong>Note:</strong> This is a professional estimate
                                                based on standard rates. Final pricing may vary based on
                                                site conditions and specific requirements. Quote valid
                                                for 30 days.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Why Choose Us */}
                        <Card
                            className={`shadow-xl border-0 ${theme === "dark"
                                    ? "bg-slate-800/50 backdrop-blur-sm"
                                    : "bg-white/80 backdrop-blur-sm"
                                }`}
                        >
                            <CardHeader>
                                <CardTitle
                                    className={`flex items-center ${theme === "dark" ? "text-white" : "text-slate-900"
                                        }`}
                                >
                                    <CheckCircle className="h-5 w-5 mr-2" />
                                    Why Choose Our Services?
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {[
                                        "Licensed & Fully Insured",
                                        "24/7 Customer Support",
                                        "Transparent Pricing",
                                        "Quality Guarantee",
                                        "Professional Team",
                                        "Competitive Rates",
                                    ].map((feature, index) => (
                                        <div key={index} className="flex items-center space-x-3">
                                            <Badge
                                                variant="secondary"
                                                className="bg-green-100 text-green-800"
                                            >
                                                ✓
                                            </Badge>
                                            <span
                                                className={`text-sm ${theme === "dark" ? "text-slate-200" : "text-slate-700"
                                                    }`}
                                            >
                                                {feature}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Login Dialog for non-logged-in users */}
            <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
                <DialogContent
                    className={`sm:max-w-md ${theme === "dark"
                            ? "bg-slate-800 border-slate-700"
                            : "bg-white border-slate-200"
                        }`}
                >
                    <DialogHeader>
                        <DialogTitle
                            className={`flex items-center ${theme === "dark" ? "text-white" : "text-slate-900"
                                }`}
                        >
                            <EyeOff className="h-5 w-5 mr-2" />
                            Login to View Full Estimate
                        </DialogTitle>
                        <DialogDescription
                            className={theme === "dark" ? "text-slate-300" : "text-slate-600"}
                        >
                            Sign in to see the complete pricing breakdown and submit your
                            booking request.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <Button
                            onClick={() => handleLoginRedirect("login")}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                            <LogIn className="h-4 w-4 mr-2" />
                            Login to Your Account
                        </Button>
                        <Button
                            onClick={() => handleLoginRedirect("signup")}
                            variant="outline"
                            className="w-full bg-transparent"
                        >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Create New Account
                        </Button>
                        <Button
                            onClick={() => setShowLoginDialog(false)}
                            variant="ghost"
                            className="w-full"
                        >
                            Continue Without Login
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
