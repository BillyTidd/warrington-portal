"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Users,
  Phone,
  Mail,
  ExternalLink,
  Truck,
  Crown,
  Wrench,
  HardHat,
  PoundSterling,
  CheckCircle,
  XCircle,
  MapPin,
  Clock,
  Calendar,
  FileText,
  Moon,
  Sun,
  Hash,
  Navigation,
  Paperclip,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { toast } from "sonner";
import type { BookingRequest, EstimatedCost } from "@/types/booking";
import type { Session } from "next-auth";
import type { JobDocument } from "@/types/job-document";

interface JobRequestDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  request: any | null;
  isAdmin: boolean;
  session: Session | null;
  onUpdateStatus: (
    status: "approved" | "rejected",
    requestId: string,
    adminNotes: string,
    estimatedCost?: EstimatedCost
  ) => Promise<void>;
  onDocumentDeleted: (documentId: string) => void;
  isUpdating: boolean;
}

const getWorkerIcon = (workerType: string) => {
  switch (workerType) {
    case "team-leader":
      return Crown;
    case "general-fitter":
      return Wrench;
    case "labourer":
      return HardHat;
    default:
      return Users;
  }
};

const getWorkerLabel = (workerType: string) => {
  switch (workerType) {
    case "team-leader":
      return "Team Leader";
    case "general-fitter":
      return "General Fitter";
    case "labourer":
      return "Labourer/Assistant";
    default:
      return workerType;
  }
};

const getStatusBadge = (status: string) => {
  if (status === "pending") {
    return <StatusBadge status={status} label="Pending Review" />;
  }
  if (status === "converted") {
    return <StatusBadge status={status} label="Job Created" />;
  }
  return <StatusBadge status={status} />;
};

export function JobRequestDetailsModal({
  isOpen,
  onOpenChange,
  request,
  isAdmin,
  session,
  onUpdateStatus,
  onDocumentDeleted,
  isUpdating,
}: JobRequestDetailsModalProps) {
  const [adminNotes, setAdminNotes] = useState("");
  const [laborCost, setLaborCost] = useState<string>("");
  const [materialCost, setMaterialCost] = useState<string>("");
  const [travelCost, setTravelCost] = useState<string>("");
  // Track original values to detect changes
  const [originalLaborCost, setOriginalLaborCost] = useState<string>("");
  const [originalMaterialCost, setOriginalMaterialCost] = useState<string>("");
  const [originalTravelCost, setOriginalTravelCost] = useState<string>("");
  const [documentToDelete, setDocumentToDelete] =
    useState<JobDocument | null>(null);
  const [isDeletingDocument, setIsDeletingDocument] =
    useState(false);
  const isLondonRequest =
    request?.jobEstimate?.team === "london";

  useEffect(() => {
    if (request) {
      const labor = request.estimatedCost.laborCost.toFixed(2);
      const material = request.estimatedCost.materialCost
        ? request.estimatedCost.materialCost.toFixed(2)
        : "0.00";
      const travel =
        request.jobEstimate?.team === "london"
          ? "0.00"
          : request.estimatedCost.travelCost.toFixed(2);

      setAdminNotes(request.adminNotes || "");
      setLaborCost(labor);
      setMaterialCost(material);
      setTravelCost(travel);

      // Store original values
      setOriginalLaborCost(labor);
      setOriginalMaterialCost(material);
      setOriginalTravelCost(travel);
      setDocumentToDelete(null);
    }
  }, [request]);

  const totalCost =
    (Number.parseFloat(laborCost) || 0) +
    (Number.parseFloat(materialCost) || 0) +
    (isLondonRequest
      ? 0
      : Number.parseFloat(travelCost) || 0);

  // Check if prices have been changed
  const pricesChanged =
    laborCost !== originalLaborCost ||
    materialCost !== originalMaterialCost ||
    (!isLondonRequest && travelCost !== originalTravelCost);

  const handleStatusAction = async (status: "approved" | "rejected") => {
    if (!request || !isAdmin) return;

    let updatedEstimatedCost: EstimatedCost | undefined = undefined;

    // Only send updated costs if prices have actually changed
    if (pricesChanged) {
      updatedEstimatedCost = {
        laborCost: Number.parseFloat(laborCost) || 0,
        materialCost: Number.parseFloat(materialCost) || 0,
        travelCost: isLondonRequest
          ? 0
          : Number.parseFloat(travelCost) || 0,
        totalCost: totalCost,
        breakdown: request.estimatedCost.breakdown,
      };
    }

    await onUpdateStatus(
      status,
      request._id as any,
      adminNotes,
      updatedEstimatedCost
    );
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete || !isAdmin) {
      return;
    }

    setIsDeletingDocument(true);

    try {
      const response = await fetch(
        `/api/job-documents/${encodeURIComponent(
          documentToDelete._id
        )}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to remove document"
        );
      }

      onDocumentDeleted(documentToDelete._id);
      setDocumentToDelete(null);
      toast.success("Document removed successfully");
    } catch (error) {
      console.error("Document deletion failed:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to remove document"
      );
    } finally {
      setIsDeletingDocument(false);
    }
  };

  if (!request) return null;

  const isPending = request.status === "pending";
  const isConverted = request.status === "converted";

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        {/* Fixed Header */}
        <DialogHeader className="flex-shrink-0 p-6 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">Job Request Details</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Request ID: {request._id?.toString().slice(-8)}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {getStatusBadge(request.status)}
              {request.documents?.length > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  {request.documents.length} attachment
                  {request.documents.length === 1 ? "" : "s"}
                </Badge>
              )}

              {(!request.documents || request.documents.length === 0) &&
                request.pdfUrl && (
                  <Link
                    href={`/api/download-pdf?url=${encodeURIComponent(
                      request.pdfUrl
                    )}${
                      request.pdfFilename
                        ? `&filename=${encodeURIComponent(
                            request.pdfFilename
                          )}`
                        : ""
                    }`}
                    target="_blank"
                  >
                    <Button variant="outline" size="sm">
                      <FileText className="mr-2 h-4 w-4" />
                      {request.pdfFilename
                        ? `Download: ${request.pdfFilename}`
                        : "Download PDF"}
                    </Button>
                  </Link>
                )}
              {isConverted && request.convertedToJobId && (
                <Link href={`/job-portal/${request.convertedToJobId}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Job
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-4">




            {request.documents?.length > 0 && (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <Paperclip className="h-5 w-5" />

      <h3 className="text-lg font-semibold">
        Project Documents
      </h3>
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {request.documents.map((document: any) => {
        const isImage =
          document.mimeType?.startsWith("image/");

        return (
          <div
            key={document._id?.toString()}
            className="overflow-hidden rounded-lg border bg-muted/20"
          >
            {isImage && (
              <a
                href={document.downloadPath}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={document.downloadPath}
                  alt={document.originalName}
                  className="h-32 w-full object-cover"
                />
              </a>
            )}

            <div className="flex items-center gap-3 p-3">
              {!isImage && (
                <FileText className="h-8 w-8 flex-shrink-0 text-blue-500" />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {document.originalName}
                </p>

                <p className="text-xs text-muted-foreground">
                  {(Number(document.size || 0) /
                    1024 /
                    1024).toFixed(2)}{" "}
                  MB
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={document.downloadPath}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-1 h-4 w-4" />
                    Open
                  </Button>
                </a>

                {isAdmin && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950"
                    onClick={() =>
                      setDocumentToDelete(document)
                    }
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}




            {/* Customer & Job Info Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {isAdmin ? "Customer Details" : "Your Details"}
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{request.customerName}</p>
                      {request.customerCompany && (
                        <p className="text-muted-foreground text-xs">
                          {request.customerCompany}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <p>{request.customerEmail}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <p>{request.customerPhone}</p>
                  </div>
                </div>
              </div>

              {/* Job Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Job Information
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {format(
                          new Date(request.jobEstimate.jobDate),
                          "EEEE, MMMM d, yyyy"
                        )}
                      </p>
                      <p className="text-muted-foreground text-xs">Job Date</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      {/* Handle both old (single postcode) and new (multiple postcodes) */}
                      {request.jobEstimate.postcodes &&
                      request.jobEstimate.postcodes.length > 0 ? (
                        <>
                          <p className="font-medium">
                            {request.jobEstimate.postcodes.filter(
                              (pc: string) => pc?.trim()
                            ).length > 1
                              ? `${
                                  request.jobEstimate.postcodes.filter(
                                    (pc: string) => pc?.trim()
                                  ).length
                                } Job Locations`
                              : request.jobEstimate.postcodes[0]}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {request.jobEstimate.postcodes.filter(
                              (pc: string) => pc?.trim()
                            ).length > 1
                              ? "Multiple stops"
                              : "Single location"}
                          </p>
                        </>
                      ) : request.jobEstimate.postcode ? (
                        <>
                          <p className="font-medium">
                            {request.jobEstimate.jobLocation ||
                              request.jobEstimate.postcode}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {request.jobEstimate.postcode}
                          </p>
                        </>
                      ) : (
                        <p className="font-medium text-muted-foreground">
                          Location not specified
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {request.jobEstimate.numberOfWorkers} workers ×{" "}
                        {request.jobEstimate.numberOfHours} hours
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Resource Requirements
                      </p>
                    </div>
                  </div>

                  {/* Team & Shift */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {request.jobEstimate.team === "london" && (
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <Navigation className="h-3 w-3" />
                        London Team
                      </Badge>
                    )}
                    {request.jobEstimate.jobShift === "night" ? (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1 text-indigo-600 border-indigo-400"
                      >
                        <Moon className="h-3 w-3" />
                        Night Shift — ×1.5
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1 text-amber-600 border-amber-400"
                      >
                        <Sun className="h-3 w-3" />
                        Day Shift
                      </Badge>
                    )}
                    {request.estimatedCost?.breakdown?.isWeekend && (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1 text-orange-600 border-orange-400"
                      >
                        Weekend — ×1.5
                      </Badge>
                    )}
                    {request.estimatedCost?.breakdown?.combinedShiftMultiplier >
                      1 && (
                      <Badge className="bg-amber-500 text-white flex items-center gap-1">
                        Combined ×
                        {request.estimatedCost.breakdown.combinedShiftMultiplier.toFixed(
                          2
                        )}
                      </Badge>
                    )}
                  </div>

                  {/* Job Reference */}
                  {request.jobEstimate.jobReference && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <Hash className="h-4 w-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {request.jobEstimate.jobReference}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Job Reference
                        </p>
                      </div>
                    </div>
                  )}

                  {/* London Starting Point */}
                  {request.jobEstimate.londonStartingPoint && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Navigation className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {request.jobEstimate.londonStartingPoint}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          London Starting Point
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Customer Site Manager */}
                  {(
                    request.jobEstimate.manager ||
                    request.jobEstimate.managerDetails
                  ) && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                        <Users className="h-4 w-4 text-green-600" />
                      </div>

                      <div>
                        <p className="font-medium">
                          {request.jobEstimate.managerDetails
                            ?.fullName ||
                            request.jobEstimate.manager}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          Customer Site Manager
                        </p>

                        {request.jobEstimate.managerDetails
                          ?.email && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {
                              request.jobEstimate
                                .managerDetails.email
                            }
                          </p>
                        )}

                        {request.jobEstimate.managerDetails
                          ?.phone && (
                          <p className="text-xs text-muted-foreground">
                            {
                              request.jobEstimate
                                .managerDetails.phone
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Job Type & Workers */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Job Type & Workers</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium">Job Type</Label>
                  <div className="mt-1">
                    <Badge variant="secondary" className="text-sm">
                      {request.jobEstimate.jobType || "General Service"}
                    </Badge>
                  </div>
                </div>
                {request.jobEstimate.workerTypes &&
                  request.jobEstimate.workerTypes.length > 0 && (
                    <div className="flex-2">
                      <Label className="text-sm font-medium">
                        Worker Types Required
                      </Label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {request.jobEstimate.workerTypes.map(
                          (type: any, index: any) => {
                            const IconComponent = getWorkerIcon(type);
                            return (
                              <Badge
                                key={index}
                                variant="outline"
                                className="flex items-center gap-1"
                              >
                                <IconComponent className="h-3 w-3" />
                                {getWorkerLabel(type)}
                              </Badge>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}
              </div>
              {request.jobEstimate.team !== "london" &&
                request.jobEstimate.vehicleType && (
                <div>
                  <Label className="text-sm font-medium">
                    Vehicle Required
                  </Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {request.jobEstimate.vehicleType
                        .replace("-", " ")
                        .replace(/\b\w/g, (l: any) => l.toUpperCase())}
                    </span>
                    {request.estimatedCost.breakdown?.travel && (
                      <span className="text-sm text-muted-foreground">
                        ({request.estimatedCost.breakdown.travel.distance}{" "}
                        miles)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Postcodes Section - Handle both old (single postcode) and new (multiple postcodes) */}
            {(request.jobEstimate.postcode ||
              (request.jobEstimate.postcodes &&
                request.jobEstimate.postcodes.length > 0)) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {request.jobEstimate.postcodes &&
                    request.jobEstimate.postcodes.length > 1
                      ? "Job Locations (Multiple Stops)"
                      : "Job Location"}
                  </h3>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    {/* New jobs with multiple postcodes */}
                    {request.jobEstimate.postcodes &&
                    request.jobEstimate.postcodes.length > 0 ? (
                      <div className="space-y-2">
                        {request.jobEstimate.postcodes
                          .filter((pc: string) => pc?.trim())
                          .map((postcode: string, index: number) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-2 bg-background rounded border"
                            >
                              <Badge variant="outline" className="text-xs">
                                Stop {index + 1}
                              </Badge>
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {postcode}
                              </span>
                            </div>
                          ))}
                        {request.estimatedCost.breakdown?.travel
                          ?.durationHours && (
                          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                Travel Time:{" "}
                                {Math.floor(
                                  request.estimatedCost.breakdown.travel
                                    .duration / 60
                                )}
                                h{" "}
                                {request.estimatedCost.breakdown.travel
                                  .duration % 60}
                                m
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>
                                Round Trip:{" "}
                                {
                                  request.estimatedCost.breakdown.travel
                                    .distance
                                }{" "}
                                miles
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Old jobs with single postcode */
                      <p className="text-sm whitespace-pre-wrap flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {request.jobEstimate.postcode}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
            {/* Job Description */}
            {request.jobEstimate.jobDescription && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Job Description</h3>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">
                      {request.jobEstimate.jobDescription}
                    </p>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Cost Breakdown */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Cost Breakdown</h3>
                {isAdmin && isPending && pricesChanged && (
                  <Badge
                    variant="outline"
                    className="text-orange-600 border-orange-600"
                  >
                    Prices Modified
                  </Badge>
                )}
              </div>

              {isAdmin && isPending ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-4 font-medium">
                    You can adjust the costs before approving this request:
                  </p>
                  <div
                    className={`grid grid-cols-1 gap-4 ${
                      isLondonRequest
                        ? "sm:grid-cols-2"
                        : "sm:grid-cols-3"
                    }`}
                  >
                    <div>
                      <Label
                        htmlFor="laborCost"
                        className="text-sm font-medium dark:text-black"
                      >
                        Labor Cost
                      </Label>
                      <div className="relative mt-1">
                        <PoundSterling className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-black" />
                        <Input
                          id="laborCost"
                          type="number"
                          step="0.01"
                          min="0"
                          value={laborCost}
                          onChange={(e) => setLaborCost(e.target.value)}
                          className="pl-10 bg-background text-foreground border-input dark:text-black"
                        />
                      </div>
                    </div>
                    <div>
                      <Label
                        htmlFor="materialCost"
                        className="text-sm font-medium dark:text-black"
                      >
                        Material Cost
                      </Label>
                      <div className="relative mt-1">
                        <PoundSterling className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-black" />
                        <Input
                          id="materialCost"
                          type="number"
                          step="0.01"
                          min="0"
                          value={materialCost}
                          onChange={(e) => setMaterialCost(e.target.value)}
                          className="pl-10 bg-background text-foreground border-input dark:text-black"
                        />
                      </div>
                    </div>
                    {!isLondonRequest && (
                      <div>
                        <Label
                          htmlFor="travelCost"
                          className="text-sm font-medium dark:text-black"
                        >
                          Travel Cost
                        </Label>
                        <div className="relative mt-1">
                          <PoundSterling className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-black" />
                          <Input
                            id="travelCost"
                            type="number"
                            step="0.01"
                            min="0"
                            value={travelCost}
                            onChange={(e) => setTravelCost(e.target.value)}
                            className="pl-10 bg-background text-foreground border-input dark:text-black"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className={`grid grid-cols-1 gap-4 ${
                    isLondonRequest
                      ? "sm:grid-cols-2"
                      : "sm:grid-cols-3"
                  }`}
                >
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Labor Cost</p>
                    <p className="text-xl font-bold">
                      £{Number.parseFloat(laborCost).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Material Cost
                    </p>
                    <p className="text-xl font-bold">
                      £{Number.parseFloat(materialCost).toFixed(2)}
                    </p>
                  </div>
                  {!isLondonRequest && (
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Travel Cost
                      </p>
                      <p className="text-xl font-bold">
                        £{Number.parseFloat(travelCost).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-green-800">
                    Total Cost:
                  </span>
                  <span className="text-3xl font-bold text-green-600">
                    £{totalCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Notes */}
            {(isAdmin || request.adminNotes) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">
                    {isAdmin ? "Admin Notes" : "Notes from Admin"}
                  </h3>
                  {isAdmin && isPending ? (
                    <Textarea
                      placeholder="Add any notes about this request (optional)..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  ) : (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm">
                        {request.adminNotes || "No notes from admin."}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Request Timeline */}
            <Separator />
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Request Timeline</h3>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted:</span>
                  <span>
                    {format(
                      new Date(request.createdAt),
                      "MMM d, yyyy 'at' h:mm a"
                    )}
                  </span>
                </div>
                {request.reviewedBy && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reviewed by:</span>
                    <span>{request.reviewedByName}</span>
                  </div>
                )}
                {isConverted && request.convertedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Job Created:</span>
                    <span>
                      {format(
                        new Date(request.convertedAt),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Fixed Footer */}
        <DialogFooter className="flex-shrink-0 border-t p-6 pt-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="order-2 sm:order-1"
            >
              Close
            </Button>

            {isAdmin && isPending && (
              <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => handleStatusAction("rejected")}
                  disabled={isUpdating}
                  className="w-full sm:w-auto text-red-600 border-red-600 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleStatusAction("approved")}
                  disabled={isUpdating}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isUpdating ? "Creating Job..." : "Approve & Create Job"}
                </Button>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog
      open={Boolean(documentToDelete)}
      onOpenChange={(open) => {
        if (!open && !isDeletingDocument) {
          setDocumentToDelete(null);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Remove this document permanently?
          </AlertDialogTitle>

          <AlertDialogDescription>
            {documentToDelete?.originalName || "This document"} will be
            removed from the estimate and from private file storage. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeletingDocument}>
            Cancel
          </AlertDialogCancel>

          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            disabled={isDeletingDocument}
            onClick={(event) => {
              event.preventDefault();
              handleDeleteDocument();
            }}
          >
            {isDeletingDocument ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Removing...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Remove Document
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
