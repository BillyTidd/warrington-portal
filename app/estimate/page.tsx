"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  Users,
  Calculator,
  LogIn,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Truck,
  Wrench,
  HardHat,
  Crown,
  MapPin,
  Navigation,
  Lock,
  ArrowRight,
  Plus,
  X,
  Clock,
  Paperclip,
  FileText as FileTextIcon,
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
import { redirect, useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import Image from "next/image";
import type { CustomerSiteManager } from "@/types/customer-site-manager";

interface EstimateData {
  numberOfWorkers: number;
  numberOfHours: number;
  jobDate: string;
  jobType: string;
  jobDescription: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompany: string;
  workerTypes: string[];
  vehicleType: string;
  postcodes: string[];
  team: string;
  jobReference: string;
  londonStartingPoint: string;
  jobShift: string;
  manager_id: string;
  manager: string;
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
  travelCost: number;
  totalCost: number;
  breakdown: {
    labor: LaborBreakdown[];
    travel: {
      distance: number;
      duration: number;
      durationHours: number;
      vehicleType: string;
      rate: number;
      cost: number;
      fromAddress: string;
      waypoints: string[];
    };
    jobTypeMultiplier: number;
    jobType: string;
    isWeekend: boolean;
    isNightShift: boolean;
    shiftMultiplier: number;
    weekendMultiplier: number;
    combinedShiftMultiplier: number;
  };
}

const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024;
const MAX_DOCUMENTS_PER_ESTIMATE = 10;

const ALLOWED_DOCUMENT_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "xlsx",
  "csv",
];

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function getDocumentMimeType(file: File) {
  if (file.type) {
    return file.type;
  }

  const extension = getFileExtension(file.name);

  const fallbackMimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    xlsx:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv",
  };

  return fallbackMimeTypes[extension] || "application/octet-stream";
}

function getFileIdentifier(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}


// Icon mapping for dynamic worker types
const iconMap: { [key: string]: any } = {
  Crown,
  Wrench,
  HardHat,
  Users,
};

export default function EstimatePage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const router = useRouter();
  const [showEstimate, setShowEstimate] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // Dynamic data state
  const [workerTypeOptions, setWorkerTypeOptions] = useState<any[]>([]);
  const [vehicleOptions, setVehicleOptions] = useState<any[]>([]);
  const [loadingDynamicData, setLoadingDynamicData] = useState(true);

  const [formData, setFormData] = useState<EstimateData>({
    numberOfWorkers: 1,
    numberOfHours: 8,
    jobDate: "",
    jobType: "",
    jobDescription: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCompany: "",
    workerTypes: [""],
    vehicleType: "",
    postcodes: [""],
    team: "default",
    jobReference: "",
    londonStartingPoint: "",
    jobShift: "day",
    manager_id: "",
    manager: "",
  });

  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);
  const [isDraggingDocuments, setIsDraggingDocuments] = useState(false);
  const isLoggedIn = !!session?.user;
  const isCustomer = session?.user?.role === "customer";
  const isLondon = formData.team === "london";
  // const showManagerDropdown = session?.user?.email === "zemishk101@gmail.com";
  const showManagerDropdown = true;




  const [siteManagers, setSiteManagers] = useState<
    CustomerSiteManager[]
  >([]);

  const [isLoadingManagers, setIsLoadingManagers] =
    useState(false);

  const isWeekendDate = (() => {
    if (!formData.jobDate) return false;
    const [y, m, d] = formData.jobDate.split("-").map(Number);
    const day = new Date(y, m - 1, d).getDay();
    return day === 0 || day === 6;
  })();

  // Fetch dynamic worker types and vehicles
  useEffect(() => {
    const fetchDynamicData = async () => {
      try {
        // Fetch worker types
        const workerTypesRes = await fetch("/api/worker-types");
        if (workerTypesRes.ok) {
          const workerTypesData = await workerTypesRes.json();
          const mappedWorkerTypes = workerTypesData.map((wt: any) => ({
            value: wt.value,
            label: wt.name,
            icon: iconMap[wt.icon] || HardHat,
          }));
          setWorkerTypeOptions(mappedWorkerTypes);

          // Set default worker type
          if (mappedWorkerTypes.length > 0) {
            setFormData((prev) => ({
              ...prev,
              workerTypes: [mappedWorkerTypes[0].value],
            }));
          }
        }

        // Fetch vehicles
        const vehiclesRes = await fetch("/api/vehicles");
        if (vehiclesRes.ok) {
          const vehiclesData = await vehiclesRes.json();
          const mappedVehicles = vehiclesData.map((v: any) => ({
            value: v.name.toLowerCase().replace(/\s+/g, "-"),
            label: v.name,
          }));
          setVehicleOptions(mappedVehicles);

          // Set default vehicle
          if (mappedVehicles.length > 0) {
            setFormData((prev) => ({
              ...prev,
              vehicleType: mappedVehicles[0].value,
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching dynamic data:", error);
        toast.error("Failed to load worker types and vehicles");
      } finally {
        setLoadingDynamicData(false);
      }
    };

    fetchDynamicData();
  }, []);





  useEffect(() => {
    const fetchManagers = async () => {
      if (
        status !== "authenticated" ||
        session?.user?.role !== "customer" ||
        !session.user.id
      ) {
        setSiteManagers([]);
        return;
      }

      setIsLoadingManagers(true);

      try {
        const response = await fetch(
          `/api/v1/customers/${session.user.id}/managers`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load managers"
          );
        }

        setSiteManagers(
          Array.isArray(data) ? data : []
        );
      } catch (error) {
        console.error(
          "Unable to load managers:",
          error
        );

        toast.error("Unable to load your managers");
      } finally {
        setIsLoadingManagers(false);
      }
    };

    fetchManagers();
  }, [
    status,
    session?.user?.id,
    session?.user?.role,
  ]);





  // Debug log
  useEffect(() => {
    if (session?.user?.role === "employee") {
      router.push("/job-portal");
    }
  }, [session, isLoggedIn, isCustomer]);

  // Auto-fill customer info if logged in
  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (isCustomer && session?.user?.id) {
          const res = await fetch(`/api/admin/users/${session.user.id}`);
          const data = await res.json();

          if (res.ok) {
            setFormData((prev) => ({
              ...prev,
              customerName: data.name || "",
              customerEmail: data.email || "",
              customerPhone: data.phone || "",
              customerCompany: data.company || "",
            }));
          } else {
            console.error("Failed to fetch user:", data.error);
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();

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
    const defaultWorkerType =
      workerTypeOptions.length > 0 ? workerTypeOptions[0].value : "";

    if (currentTypes.length < formData.numberOfWorkers) {
      // Add more workers (default to first worker type available)
      while (currentTypes.length < formData.numberOfWorkers) {
        currentTypes.push(defaultWorkerType);
      }
    } else if (currentTypes.length > formData.numberOfWorkers) {
      // Remove excess workers
      currentTypes.splice(formData.numberOfWorkers);
    }
    setFormData((prev) => ({ ...prev, workerTypes: currentTypes }));
  }, [formData.numberOfWorkers, workerTypeOptions]);

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

    if (formData.team === "london" && !formData.londonStartingPoint?.trim()) {
      errors.push("Job starting point is required for London jobs");
    }

    // Additional postcodes are optional for London jobs because
    // the London job starting point is already required.
    const validPostcodes = formData.postcodes.filter(
      (postcode) => postcode?.trim()
    );

    // Default-team jobs still require at least one postcode because
    // their travel distance and cost are calculated from Northampton.
    if (formData.team !== "london" && validPostcodes.length === 0) {
      errors.push("At least one job postcode is required");
    }

    // Validate each postcode format
    const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
    formData.postcodes.forEach((postcode, index) => {
      if (postcode?.trim() && !postcodeRegex.test(postcode.trim())) {
        errors.push(`Postcode ${index + 1} is not a valid UK postcode`);
      }
    });

    if (!formData.customerName?.trim()) {
      errors.push("Your full name is required");
    }
    if (!formData.customerEmail?.trim()) {
      errors.push("Your email address is required");
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
        name === "numberOfWorkers" || name === "numberOfHours"
          ? Number(value)
          : value,
    }));
  };

  const handleWorkerTypeChange = (index: number, value: string) => {
    const newWorkerTypes = [...formData.workerTypes];
    newWorkerTypes[index] = value;
    setFormData((prev) => ({ ...prev, workerTypes: newWorkerTypes }));
  };

  const handlePostcodeChange = (index: number, value: string) => {
    const newPostcodes = [...formData.postcodes];
    newPostcodes[index] = value;
    setFormData((prev) => ({ ...prev, postcodes: newPostcodes }));
  };

  const addPostcode = () => {
    if (formData.postcodes.length < 25) {
      setFormData((prev) => ({ ...prev, postcodes: [...prev.postcodes, ""] }));
    } else {
      toast.error("Maximum 25 postcodes allowed");
    }
  };

  const removePostcode = (index: number) => {
    if (formData.postcodes.length > 1) {
      const newPostcodes = formData.postcodes.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, postcodes: newPostcodes }));
    } else {
      toast.error("At least one postcode is required");
    }
  };

  const calculateEstimate = async () => {
    console.log("Calculate estimate clicked, session:", session);

    // Check if user is logged in first
    if (!isLoggedIn) {
      toast.error("Please log in to calculate estimates");
      setShowLoginDialog(true);
      return;
    }

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
      console.log("Making API call to /api/estimate");
      const response = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      console.log("API response status:", response.status);
      const data = await response.json();
      console.log("API response data:", data);

      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated
          toast.error("Authentication failed. Please log in again.");
          setShowLoginDialog(true);
          return;
        }
        throw new Error(data.error || "Failed to calculate estimate");
      }

      setEstimate(data.estimate);
      setShowEstimate(true);
      toast.success("Estimate calculated successfully!");
    } catch (error: any) {
      console.error("Error calculating estimate:", error);
      toast.error(
        error.message || "Failed to calculate estimate. Please try again."
      );
    } finally {
      setIsCalculating(false);
    }
  };






  const handleDocumentSelection = (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) {
      return;
    }

    const invalidTypeFile = selectedFiles.find((file) => {
      const extension = getFileExtension(file.name);

      return !ALLOWED_DOCUMENT_EXTENSIONS.includes(extension);
    });

    if (invalidTypeFile) {
      toast.error(
        `${invalidTypeFile.name} is not supported. Only PDF, PNG, JPG, XLSX and CSV files are allowed.`
      );
      return;
    }

    const oversizedFile = selectedFiles.find(
      (file) => file.size > MAX_DOCUMENT_SIZE
    );

    if (oversizedFile) {
      toast.error(
        `${oversizedFile.name} exceeds the maximum size of 25 MB.`
      );
      return;
    }

    const emptyFile = selectedFiles.find((file) => file.size <= 0);

    if (emptyFile) {
      toast.error(`${emptyFile.name} is empty and cannot be uploaded.`);
      return;
    }

    const uniqueNewFiles = selectedFiles.filter((newFile) => {
      const newFileId = getFileIdentifier(newFile);

      return !documentFiles.some(
        (existingFile) => getFileIdentifier(existingFile) === newFileId
      );
    });

    if (documentFiles.length + uniqueNewFiles.length >
        MAX_DOCUMENTS_PER_ESTIMATE) {
      toast.error(
        `You can attach a maximum of ${MAX_DOCUMENTS_PER_ESTIMATE} files to one estimate.`
      );
      return;
    }

    if (uniqueNewFiles.length < selectedFiles.length) {
      toast.info("Duplicate files were not added again.");
    }

    setDocumentFiles((currentFiles) => [
      ...currentFiles,
      ...uniqueNewFiles,
    ]);
  };









  const uploadDocument = async (file: File) => {
    const mimeType = getDocumentMimeType(file);

    const presignResponse = await fetch(
      "/api/job-documents/presign",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          mimeType,
          size: file.size,
        }),
      }
    );

    const presignData = await presignResponse
      .json()
      .catch(() => null);

    if (!presignResponse.ok) {
      if (presignResponse.status === 401) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      throw new Error(
        presignData?.message ||
          `Unable to prepare ${file.name} for upload.`
      );
    }

    const uploadResponse = await fetch(presignData.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Failed to upload ${file.name}. Please check the R2 CORS configuration.`
      );
    }

    return {
      objectKey: presignData.objectKey,
      originalName: file.name,
      mimeType,
      size: file.size,
    };
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
      setIsUploadingDocuments(true);

      let uploadedDocuments: Array<{
        objectKey: string;
        originalName: string;
        mimeType: string;
        size: number;
      }> = [];

      if (documentFiles.length > 0) {
        setIsUploadingDocuments(true);

        try {
          uploadedDocuments = await Promise.all(
            documentFiles.map((file) => uploadDocument(file))
          );
        } catch (uploadError: any) {
          console.error("Document upload failed:", uploadError);

          toast.error(
            uploadError.message ||
              "One or more documents could not be uploaded."
          );

          return;
        } finally {
          setIsUploadingDocuments(false);
        }
      }



      // Submit booking request to database
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
        documents: uploadedDocuments,
      }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Your session has expired. Please log in again.");
          router.push("/login?type=customer&returnUrl=/estimate");
          return;
        }
        const errorData = await response.json().catch(() => null);
        toast.error(
          errorData?.message ||
            "Failed to submit booking request. Please try again."
        );
        return;
      }

      // Send email notification via server-side API
      fetch("/api/send-estimation-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimateData: formData,
          estimate: estimate,
        }),
      }).catch((error) => {
        // Email failed but booking succeeded - log and continue
        console.error("Failed to send email notification:", error);
      });

      toast.success("Booking request submitted successfully!");
      setDocumentFiles([]);
      router.push("/admin/job-requests");
    } catch (error) {
      console.error("Error submitting booking request:", error);
      toast.error(
        "Something went wrong while submitting your request. Please check your connection and try again."
      );
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
      className={`min-h-screen transition-colors duration-300 ${
        theme === "dark"
          ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
          : "bg-gradient-to-br from-slate-50 via-white to-slate-100"
      }`}
    >
      {/* Header */}
      <header
        className={`shadow-lg border-b transition-colors duration-300 ${
          theme === "dark"
            ? "bg-slate-800/90 backdrop-blur-sm border-slate-700"
            : "bg-white/90 backdrop-blur-sm border-slate-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 py-3 sm:h-16">
            <div className="flex items-center">
              <h1
                className={`text-xl sm:text-2xl font-bold ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}
              >
                Warrington's Estimate
              </h1>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              {session?.user ? (
                <div className="flex items-center flex-wrap gap-2">
                  <span
                    className={`text-sm ${
                      theme === "dark" ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    Welcome, {session.user.name}
                  </span>
                  {isCustomer ? (
                    <Link href="/customer/dashboard">
                      <Button size="sm">Dashboard</Button>
                    </Link>
                  ) : (
                    <Link href="/job-portal">
                      <Button size="sm">Portal</Button>
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
                    <Button size="sm">
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
          <Image
            src={
              theme === "dark"
                ? "/estimate-logo-light.jpg"
                : "/estimate-logo-light.jpg"
            }
            alt="Logo"
            width={150}
            height={150}
            className="mb-8 mx-auto"
          />
          <h1
            className={`text-3xl md:text-5xl font-bold mb-4 ${
              theme === "dark" ? "text-white" : "text-slate-900"
            }`}
          >
            Warrington's Job Estimation
          </h1>
          <p
            className={`text-xl max-w-3xl mx-auto ${
              theme === "dark" ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Get accurate, transparent pricing for your project with our
            professional estimation tool.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Estimation Form */}
          <Card
            className={`shadow-xl border-0 ${
              theme === "dark"
                ? "bg-slate-800/50 backdrop-blur-sm"
                : "bg-white/80 backdrop-blur-sm"
            }`}
          >
            <CardHeader
              className={`${
                theme === "dark"
                  ? "bg-gradient-to-r from-slate-700 to-slate-600"
                  : "bg-gradient-to-r from-slate-100 to-slate-50"
              } rounded-t-lg`}
            >
              <CardTitle
                className={`flex items-center text-xl ${
                  theme === "dark" ? "text-white" : "text-slate-900"
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
                Provide detailed information about your project
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Job Details */}
              <div className="space-y-4">
                <h3
                  className={`text-lg font-semibold flex items-center pt-4 ${
                    theme === "dark" ? "text-white" : "text-slate-900"
                  }`}
                >
                  <Wrench className="h-5 w-5 mr-2" />
                  Job Details
                </h3>

                {/* Manager dropdown — only for jun@gmail.com */}
                
                


                {isCustomer && (
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <Label
                        className={
                          theme === "dark"
                            ? "text-slate-200"
                            : "text-slate-700"
                        }
                      >
                        Manager
                      </Label>

                      <Link
                        href="/customer/managers"
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        Manage managers
                      </Link>
                    </div>

                    <Select
                      value={formData.manager_id || "none"}
                      disabled={isLoadingManagers}
                      onValueChange={(value) => {
                        if (value === "none") {
                          setFormData((current) => ({
                            ...current,
                            manager_id: "",
                            manager: "",
                          }));

                          return;
                        }

                        const selectedManager = siteManagers.find(
                          (manager) => manager._id === value
                        );

                        setFormData((current) => ({
                          ...current,
                          manager_id: value,
                          manager:
                            selectedManager?.fullName || "",
                        }));
                      }}
                    >
                      <SelectTrigger
                        className={`mt-1 ${
                          theme === "dark"
                            ? "bg-slate-700 border-slate-600 text-white"
                            : "bg-white border-slate-300 text-slate-900"
                        }`}
                      >
                        <SelectValue
                          placeholder={
                            isLoadingManagers
                              ? "Loading managers..."
                              : "Select a manager"
                          }
                        />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="none">
                          No manager selected
                        </SelectItem>

                        {siteManagers.map((manager) => (
                          <SelectItem
                            key={manager._id}
                            value={manager._id}
                          >
                            {manager.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {!isLoadingManagers &&
                      siteManagers.length === 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          No active managers found. Create one
                          from the Managers page.
                        </p>
                      )}
                  </div>
                )}



                {/* Team Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label
                      className={
                        theme === "dark" ? "text-slate-200" : "text-slate-700"
                      }
                    >
                      Team *
                    </Label>
                    <Select
                      value={formData.team}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          team: value,
                          londonStartingPoint: "",
                        }))
                      }
                    >
                      <SelectTrigger
                        className={`mt-1 ${
                          theme === "dark"
                            ? "bg-slate-700 border-slate-600 text-white"
                            : "bg-white border-slate-300 text-slate-900"
                        }`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="london">London</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className={`mt-1 ${
                        theme === "dark"
                          ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                          : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
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
                      className={`mt-1 ${
                        theme === "dark"
                          ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                          : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
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
                          className={`text-sm font-medium w-20 ${
                            theme === "dark"
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
                            className={`flex-1 ${
                              theme === "dark"
                                ? "bg-slate-700 border-slate-600 text-white"
                                : "bg-white border-slate-300 text-slate-900"
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
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className={`mt-1 ${
                        theme === "dark"
                          ? "bg-slate-700 border-slate-600 text-white"
                          : "bg-white border-slate-300 text-slate-900"
                      }`}
                      min={format(new Date(), "yyyy-MM-dd")}
                      required
                    />
                    {isWeekendDate && (
                      <p className="mt-1 text-xs font-medium text-amber-500">
                        Weekend — ×1.5 rate applies
                      </p>
                    )}
                  </div>
                  <div>
                    <Label
                      className={
                        theme === "dark" ? "text-slate-200" : "text-slate-700"
                      }
                    >
                      Shift *
                    </Label>
                    <Select
                      value={formData.jobShift}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, jobShift: value }))
                      }
                    >
                      <SelectTrigger
                        className={`mt-1 ${
                          theme === "dark"
                            ? "bg-slate-700 border-slate-600 text-white"
                            : "bg-white border-slate-300 text-slate-900"
                        }`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day (06:00 – 18:00)</SelectItem>
                        <SelectItem value="night">
                          Night (18:00 – 06:00) — ×1.5
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="vehicleType"
                      className={`${
                        theme === "dark" ? "text-slate-200" : "text-slate-700"
                      } ${isLondon ? "opacity-50" : ""}`}
                    >
                      Vehicle Type
                      {isLondon && (
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          (£30 flat — London)
                        </span>
                      )}
                    </Label>
                    <Select
                      value={formData.vehicleType}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, vehicleType: value }))
                      }
                      disabled={isLondon}
                    >
                      <SelectTrigger
                        className={`mt-1 ${
                          theme === "dark"
                            ? "bg-slate-700 border-slate-600 text-white"
                            : "bg-white border-slate-300 text-slate-900"
                        } ${isLondon ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* London Starting Point */}
                {isLondon && (
                  <div>
                    <Label
                      htmlFor="londonStartingPoint"
                      className={
                        theme === "dark" ? "text-slate-200" : "text-slate-700"
                      }
                    >
                      Job Starting Point *
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="londonStartingPoint"
                        name="londonStartingPoint"
                        placeholder="Enter starting address for this London job"
                        value={formData.londonStartingPoint}
                        onChange={handleInputChange}
                        className={`pl-10 ${
                          theme === "dark"
                            ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                            : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
                        }`}
                      />
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                )}

                <div>
                  <Label
                    className={
                      theme === "dark" ? "text-slate-200" : "text-slate-700"
                    }
                  >
                    {isLondon
                      ? "Additional Job Postcodes (Optional)"
                      : "Job Postcodes *"}
                  </Label>
                  <div className="space-y-2 mt-2">
                    {formData.postcodes.map((postcode, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <Input
                            placeholder={
                              isLondon
                                ? `Optional additional postcode ${index + 1}`
                                : `Postcode ${index + 1} (e.g., NN1 1AA)`
                            }
                            value={postcode}
                            onChange={(e) =>
                              handlePostcodeChange(index, e.target.value)
                            }
                            className={`pl-10 ${
                              theme === "dark"
                                ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
                            }`}
                          />
                          <Navigation className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        </div>
                        {formData.postcodes.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removePostcode(index)}
                            className={
                              theme === "dark"
                                ? "bg-slate-700 border-slate-600 hover:bg-red-900 hover:border-red-700"
                                : "bg-white border-slate-300 hover:bg-red-50 hover:border-red-300"
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPostcode}
                      className={`w-full ${
                        theme === "dark"
                          ? "bg-slate-700 border-slate-600 hover:bg-slate-600 text-white"
                          : "bg-white border-slate-300 hover:bg-slate-50 text-slate-900"
                      }`}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {isLondon
                        ? "Add Optional Postcode"
                        : "Add Another Postcode"}
                    </Button>
                  </div>
                  <p
                    className={`text-xs mt-2 ${
                      theme === "dark"
                        ? "text-slate-400"
                        : "text-slate-500"
                    }`}
                  >
                    {isLondon
                      ? "Optional: add postcodes only if this job includes additional stops after the selected starting point."
                      : "Required: round-trip distance and travel time are calculated automatically from our Northampton office."}
                  </p>
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
                    className={`mt-1 ${
                      theme === "dark"
                        ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                        : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
                    }`}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="jobReference"
                    className={
                      theme === "dark" ? "text-slate-200" : "text-slate-700"
                    }
                  >
                    Job Reference
                  </Label>
                  <Input
                    id="jobReference"
                    name="jobReference"
                    placeholder="e.g., JOB-001"
                    value={formData.jobReference}
                    onChange={handleInputChange}
                    className={`mt-1 ${
                      theme === "dark"
                        ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                        : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
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
                    className={`mt-1 ${
                      theme === "dark"
                        ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                        : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
                    }`}
                    rows={3}
                  />
                </div>
              </div>

              {/* Customer Information - Commented out as per requirement */}
              {/* If user is logged in, their data will be auto-populated from the useEffect hook (lines 208-230) */}
              {/* If user is not logged in, empty data will be passed */}
              {/* <div className="space-y-4 border-t pt-6">
                <h3
                  className={`text-lg font-semibold flex items-center ${
                    theme === "dark" ? "text-white" : "text-slate-900"
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
                      className={`mt-1 ${
                        theme === "dark"
                          ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                          : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
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
                      className={`mt-1 ${
                        theme === "dark"
                          ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                          : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
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
                      Phone Number (Optional)
                    </Label>
                    <Input
                      id="customerPhone"
                      name="customerPhone"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={formData.customerPhone}
                      onChange={handleInputChange}
                      className={`mt-1 ${
                        theme === "dark"
                          ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                          : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
                      }`}
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
                      className={`mt-1 ${
                        theme === "dark"
                          ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                          : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
                      }`}
                    />
                  </div>
                </div>
              </div> */}

              <Button
                onClick={calculateEstimate}
                disabled={isCalculating}
                className="w-full"
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
            {/* Company Address Info */}
            <Card
              className={`shadow-xl border-0 ${
                theme === "dark"
                  ? "bg-slate-800/50 backdrop-blur-sm"
                  : "bg-white/80 backdrop-blur-sm"
              }`}
            >
              <CardHeader>
                <CardTitle
                  className={`flex items-center ${
                    theme === "dark" ? "text-white" : "text-slate-900"
                  }`}
                >
                  <MapPin className="h-5 w-5 mr-2" />
                  Our Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-sm ${
                    theme === "dark" ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  <p className="font-medium mb-2">Travel calculated from:</p>
                  {isLondon ? (
                    formData.londonStartingPoint ? (
                      <p className="font-medium text-blue-500">
                        {formData.londonStartingPoint}
                      </p>
                    ) : (
                      <p className="italic text-slate-400">
                        Enter job starting point in the form
                      </p>
                    )
                  ) : (
                    <>
                      <p>Unit 7, Matts Lodge Farm</p>
                      <p>Grooms Lane, Northampton</p>
                      <p>NN6 8NN</p>
                    </>
                  )}
                  <p className="mt-2 text-xs">
                    Distance automatically calculated using your postcode via
                    Google Maps
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Estimate Results - Show actual pricing for logged in users */}
            {showEstimate && estimate && (
              <Card
                className={`shadow-xl border-2 ${
                  theme === "dark"
                    ? "border-green-400 bg-slate-800/90"
                    : "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50"
                }`}
              >
                <CardHeader
                  className={`${
                    theme === "dark"
                      ? "bg-gradient-to-r from-green-700 to-emerald-700"
                      : "bg-gradient-to-r from-green-600 to-emerald-600"
                  } text-white rounded-t-lg mb-2`}
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
                    className={`mb-6 p-4 rounded-lg border ${
                      theme === "dark"
                        ? "bg-slate-700/50 border-slate-600"
                        : "bg-white border-green-200"
                    }`}
                  >
                    <h4
                      className={`font-semibold mb-3 flex items-center ${
                        theme === "dark" ? "text-white" : "text-slate-900"
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
                          className={`font-medium ${
                            theme === "dark" ? "text-white" : "text-slate-900"
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
                          className={`font-medium ${
                            theme === "dark" ? "text-white" : "text-slate-900"
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
                          className={`font-medium ${
                            theme === "dark" ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {format(new Date(formData.jobDate), "MMM d, yyyy")}
                        </span>
                      </div>
                      {formData.team !== "london" && (
                        <div className="flex justify-between">
                          <span
                            className={
                              theme === "dark"
                                ? "text-slate-300"
                                : "text-slate-600"
                            }
                          >
                            Round-Trip Distance:
                          </span>
                          <span
                            className={`font-medium ${
                              theme === "dark" ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {estimate.breakdown.travel.distance} miles
                          </span>
                        </div>
                      )}
                      {!isLondon && (
                        <div className="flex justify-between">
                          <span
                            className={
                              theme === "dark"
                                ? "text-slate-300"
                                : "text-slate-600"
                            }
                          >
                            Travel Time:
                          </span>
                          <span
                            className={`font-medium ${
                              theme === "dark" ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {Math.floor(estimate.breakdown.travel.duration / 60)}h{" "}
                            {estimate.breakdown.travel.duration % 60}m
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span
                          className={
                            theme === "dark"
                              ? "text-slate-300"
                              : "text-slate-600"
                          }
                        >
                          Stops:
                        </span>
                        <span
                          className={`font-medium ${
                            theme === "dark" ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {estimate.breakdown.travel.waypoints.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rate Adjustments */}
                  {(estimate.breakdown.isWeekend ||
                    estimate.breakdown.isNightShift) && (
                    <div
                      className={`mb-6 p-4 rounded-lg border ${
                        theme === "dark"
                          ? "bg-amber-900/20 border-amber-700"
                          : "bg-amber-50 border-amber-200"
                      }`}
                    >
                      <h4
                        className={`font-semibold mb-3 flex items-center ${
                          theme === "dark" ? "text-amber-300" : "text-amber-800"
                        }`}
                      >
                        Rate Adjustments Applied
                      </h4>
                      <div className="space-y-1 text-sm">
                        {estimate.breakdown.isWeekend && (
                          <div className="flex justify-between items-center">
                            <span
                              className={
                                theme === "dark"
                                  ? "text-amber-200"
                                  : "text-amber-700"
                              }
                            >
                              Weekend Rate (Sat/Sun):
                            </span>
                            <span className="font-semibold text-amber-500">
                              ×{estimate.breakdown.weekendMultiplier.toFixed(1)}
                            </span>
                          </div>
                        )}
                        {estimate.breakdown.isNightShift && (
                          <div className="flex justify-between items-center">
                            <span
                              className={
                                theme === "dark"
                                  ? "text-amber-200"
                                  : "text-amber-700"
                              }
                            >
                              Night Shift Rate (18:00–06:00):
                            </span>
                            <span className="font-semibold text-amber-500">
                              ×{estimate.breakdown.shiftMultiplier.toFixed(1)}
                            </span>
                          </div>
                        )}
                        {estimate.breakdown.isWeekend &&
                          estimate.breakdown.isNightShift && (
                            <div className="flex justify-between items-center border-t border-amber-300 pt-1 mt-1">
                              <span
                                className={`font-medium ${
                                  theme === "dark"
                                    ? "text-amber-100"
                                    : "text-amber-800"
                                }`}
                              >
                                Combined Multiplier:
                              </span>
                              <span className="font-bold text-amber-500">
                                ×
                                {estimate.breakdown.combinedShiftMultiplier.toFixed(
                                  2
                                )}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Labor Breakdown */}
                  <div className="mb-6">
                    <h4
                      className={`font-semibold mb-3 flex items-center ${
                        theme === "dark" ? "text-white" : "text-slate-900"
                      }`}
                    >
                      <Users className="h-4 w-4 mr-2 text-blue-600" />
                      Labor Breakdown
                    </h4>
                    <div className="space-y-2">
                      {estimate.breakdown.labor.map((worker, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            theme === "dark"
                              ? "bg-slate-700/30 border-slate-600"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span
                              className={`font-medium ${
                                theme === "dark"
                                  ? "text-white"
                                  : "text-slate-900"
                              }`}
                            >
                              {worker.type}
                            </span>
                            <span className="font-semibold text-lg">
                              £{worker.cost.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span
                                className={
                                  theme === "dark"
                                    ? "text-slate-400"
                                    : "text-slate-500"
                                }
                              >
                                Day Rate (up to 10 hours):
                              </span>
                              <span>£{worker.dayRate.toFixed(2)}</span>
                            </div>
                            {worker.overtimeHours > 0 && (
                              <div className="flex justify-between">
                                <span
                                  className={
                                    theme === "dark"
                                      ? "text-slate-400"
                                      : "text-slate-500"
                                  }
                                >
                                  Overtime ({worker.overtimeHours}h @ £
                                  {worker.overtimeRate}/h):
                                </span>
                                <span>
                                  £
                                  {(
                                    worker.overtimeHours * worker.overtimeRate
                                  ).toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cost Summary */}
                  <div className="space-y-3">
                    <div
                      className={`flex justify-between items-center p-3 rounded-lg border ${
                        theme === "dark"
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
                          Labor Cost
                        </span>
                      </div>
                      <span className="font-semibold text-lg">
                        £{estimate.laborCost.toFixed(2)}
                      </span>
                    </div>

                    <div
                      className={`flex justify-between items-center p-3 rounded-lg border ${
                        theme === "dark"
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
                          {formData.team === "london" ? (
                            <>
                              Travel Cost{" "}
                              <span className="text-xs text-slate-400">
                                (London flat rate)
                              </span>
                            </>
                          ) : (
                            <>
                              Travel Cost ({estimate.breakdown.travel.distance}{" "}
                              miles @ £{estimate.breakdown.travel.rate}/mile)
                            </>
                          )}
                        </span>
                      </div>
                      <span className="font-semibold text-lg">
                        £{estimate.travelCost.toFixed(2)}
                      </span>
                    </div>

                    {!isLondon && (
                      <div
                        className={`p-3 rounded-lg border ${
                          theme === "dark"
                            ? "bg-blue-900/20 border-blue-700"
                            : "bg-blue-50 border-blue-200"
                        }`}
                      >
                        <div className="flex items-center mb-2">
                          <Clock className="h-4 w-4 mr-2 text-blue-600" />
                          <span
                            className={`text-sm font-medium ${
                              theme === "dark" ? "text-blue-200" : "text-blue-800"
                            }`}
                          >
                            Time Breakdown
                          </span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span
                              className={
                                theme === "dark"
                                  ? "text-blue-300"
                                  : "text-blue-700"
                              }
                            >
                              Work Hours:
                            </span>
                            <span className="font-medium">
                              {formData.numberOfHours} hours
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span
                              className={
                                theme === "dark"
                                  ? "text-blue-300"
                                  : "text-blue-700"
                              }
                            >
                              Travel Time (added):
                            </span>
                            <span className="font-medium">
                              {estimate.breakdown.travel.durationHours} hours
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-1">
                            <span
                              className={
                                theme === "dark"
                                  ? "text-blue-200"
                                  : "text-blue-800"
                              }
                            >
                              <strong>Total Billable Hours:</strong>
                            </span>
                            <span className="font-bold">
                              {formData.numberOfHours +
                                estimate.breakdown.travel.durationHours}{" "}
                              hours
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator className="my-4" />

                  <div
                    className={`flex justify-between items-center p-4 rounded-lg ${
                      theme === "dark"
                        ? "bg-gradient-to-r from-green-700 to-emerald-700"
                        : "bg-gradient-to-r from-green-600 to-emerald-600"
                    } text-white`}
                  >
                    <span className="text-xl font-bold">Total Estimate:</span>
                    <span className="text-3xl font-bold">
                      £{estimate.totalCost.toFixed(2)}
                    </span>
                  </div>

 
 


                  {/* Estimate Document Upload */}
                  <div className="mt-4 space-y-3">
                    <Label
                      className={`flex items-center gap-2 ${
                        theme === "dark" ? "text-slate-200" : "text-slate-700"
                      }`}
                    >
                      <Paperclip className="h-4 w-4" />
                      Project Documents (Optional)
                    </Label>

                    <p
                      className={`text-xs ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Upload PDF, PNG, JPG, XLSX or CSV files. Maximum 25 MB
                      per file and 10 files per estimate.
                    </p>

                    <div
                      onDragEnter={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setIsDraggingDocuments(true);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setIsDraggingDocuments(true);
                      }}
                      onDragLeave={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setIsDraggingDocuments(false);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setIsDraggingDocuments(false);

                        const droppedFiles = Array.from(
                          event.dataTransfer.files || []
                        );

                        handleDocumentSelection(droppedFiles);
                      }}
                      className={`rounded-lg border-2 border-dashed transition-colors ${
                        isDraggingDocuments
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                          : theme === "dark"
                            ? "border-slate-600 hover:border-blue-500"
                            : "border-slate-300 hover:border-blue-400"
                      }`}
                    >
                      <input
                        id="estimate-document-input"
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"
                        className="hidden"
                        disabled={isBooking || isUploadingDocuments}
                        onChange={(event) => {
                          const selectedFiles = Array.from(
                            event.target.files || []
                          );

                          handleDocumentSelection(selectedFiles);

                          event.target.value = "";
                        }}
                      />

                      <label
                        htmlFor="estimate-document-input"
                        className="flex cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center"
                      >
                        <Paperclip
                          className={`h-7 w-7 ${
                            isDraggingDocuments
                              ? "text-blue-500"
                              : "text-slate-400"
                          }`}
                        />

                        <span
                          className={`text-sm font-medium ${
                            theme === "dark"
                              ? "text-slate-200"
                              : "text-slate-700"
                          }`}
                        >
                          Drag and drop files here
                        </span>

                        <span className="text-xs text-muted-foreground">
                          or click to select files
                        </span>
                      </label>
                    </div>

                    {documentFiles.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Selected files ({documentFiles.length})
                          </span>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isBooking || isUploadingDocuments}
                            onClick={() => setDocumentFiles([])}
                          >
                            Remove all
                          </Button>
                        </div>

                        {documentFiles.map((file, index) => (
                          <div
                            key={getFileIdentifier(file)}
                            className={`flex items-center gap-3 rounded-lg border p-3 ${
                              theme === "dark"
                                ? "border-slate-600 bg-slate-700/50"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <FileTextIcon className="h-5 w-5 flex-shrink-0 text-blue-500" />

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {file.name}
                              </p>

                              <p className="text-xs text-muted-foreground">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={isBooking || isUploadingDocuments}
                              onClick={() => {
                                setDocumentFiles((currentFiles) =>
                                  currentFiles.filter(
                                    (_, fileIndex) => fileIndex !== index
                                  )
                                );
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>








                  <div className="mt-6">
                    <Button
                      onClick={handleBookNow}
                      disabled={isBooking || isUploadingDocuments}
                      className="w-full"
                      size="lg"
                    >
                      {isUploadingDocuments
                        ? `Uploading ${documentFiles.length} document${
                            documentFiles.length === 1 ? "" : "s"
                          }...`
                        : isBooking
                          ? "Submitting..."
                          : "Submit Job Request"}
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                  </div>

                  {/* Disclaimer */}
                  <div
                    className={`mt-4 p-3 rounded-lg border ${
                      theme === "dark"
                        ? "bg-blue-900/20 border-blue-700 text-blue-200"
                        : "bg-blue-50 border-blue-200 text-blue-800"
                    }`}
                  >
                    <p className="text-xs">
                      <strong>Note:</strong> Professional estimate with
                      transparent pricing. Materials handled as expenses during
                      job execution. Quote valid for 30 days.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Why Choose Us */}
            <Card
              className={`shadow-xl border-0 ${
                theme === "dark"
                  ? "bg-slate-800/50 backdrop-blur-sm"
                  : "bg-white/80 backdrop-blur-sm"
              }`}
            >
              <CardHeader>
                <CardTitle
                  className={`flex items-center ${
                    theme === "dark" ? "text-white" : "text-slate-900"
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
                        className={`text-sm ${
                          theme === "dark" ? "text-slate-200" : "text-slate-700"
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

      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent
          className={`sm:max-w-md ${
            theme === "dark"
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-slate-200"
          }`}
        >
          <DialogHeader>
            <DialogTitle
              className={`flex items-center ${
                theme === "dark" ? "text-white" : "text-slate-900"
              }`}
            >
              <Lock className="h-5 w-5 mr-2" />
              Authentication Required
            </DialogTitle>
            <DialogDescription
              className={theme === "dark" ? "text-slate-300" : "text-slate-600"}
            >
              Please log in to calculate estimates and view pricing details. Our
              pricing information is confidential and only available to
              registered customers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Button
              onClick={() => handleLoginRedirect("login")}
              className="w-full"
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
              Continue Without Pricing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
