"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle, XCircle, Clock, MapPin, Users, Calendar, Briefcase } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type ConfirmationStatus = "pending" | "confirmed" | "declined";

interface ConfirmationData {
  workerName: string;
  status: ConfirmationStatus;
  workerResponse: "yes" | "no" | null;
  workerMessage: string | null;
  respondedAt: string | null;
}

interface JobData {
  jobName: string;
  jobDate: string | null;
  jobLocation: string;
  numberOfWorkers: number | null;
  jobType: string | null;
  jobShift: "day" | "night" | null;
}

type PageState = "loading" | "ready" | "submitting" | "done" | "already_responded" | "error";

export default function ConfirmPage({ params }: { params: { token: string } }) {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);
  const [job, setJob] = useState<JobData | null>(null);
  const [message, setMessage] = useState("");
  const [selectedResponse, setSelectedResponse] = useState<"yes" | "no" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetch(`/api/confirm/${params.token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          setErrorMessage(data.error || "Invalid or expired link");
          setPageState("error");
          return;
        }
        const data = await res.json();
        setConfirmation(data.confirmation);
        setJob(data.job);
        setPageState(data.confirmation.status !== "pending" ? "already_responded" : "ready");
      })
      .catch(() => {
        setErrorMessage("Something went wrong. Please try again.");
        setPageState("error");
      });
  }, [params.token]);

  const handleSubmit = async (response: "yes" | "no") => {
    setSelectedResponse(response);
    setPageState("submitting");

    try {
      const res = await fetch(`/api/confirm/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response, message: message.trim() || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) {
          setPageState("already_responded");
          return;
        }
        throw new Error(data.error || "Failed to submit");
      }

      setConfirmation((prev) => prev ? ({
        ...prev,
        status: response === "yes" ? "confirmed" : "declined",
        workerResponse: response,
        workerMessage: message.trim() || null,
        respondedAt: new Date().toISOString(),
      }) : prev);
      setPageState("done");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit. Please try again.");
      setPageState("error");
    }
  };

  const formattedDate = job?.jobDate
    ? new Date(job.jobDate).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "TBC";

  if (pageState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-amber-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="w-full max-w-md text-center bg-white dark:bg-gray-900 rounded-2xl shadow-md p-8">
          <XCircle className="h-14 w-14 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Link Invalid</h2>
          <p className="text-gray-500 dark:text-gray-400">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (pageState === "already_responded") {
    const isConfirmed = confirmation?.workerResponse === "yes";
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="w-full max-w-md text-center bg-white dark:bg-gray-900 rounded-2xl shadow-md p-8">
          {isConfirmed ? (
            <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle className="h-14 w-14 text-red-400 mx-auto mb-4" />
          )}
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Already Responded</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-3">
            You already {isConfirmed ? "confirmed" : "declined"} this job request.
          </p>
          {confirmation?.workerMessage && (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
              Your message: "{confirmation.workerMessage}"
            </p>
          )}
        </div>
      </div>
    );
  }

  if (pageState === "done") {
    const isConfirmed = selectedResponse === "yes";
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="w-full max-w-md text-center bg-white dark:bg-gray-900 rounded-2xl shadow-md p-8">
          {isConfirmed ? (
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          )}
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            {isConfirmed ? "Confirmed!" : "Response Sent"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {isConfirmed
              ? "You have confirmed your availability for this job. We'll be in touch."
              : "You have declined this job request. Thank you for letting us know."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-400 dark:text-gray-500">Warrington Portal</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Confirmation</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Hi {confirmation?.workerName}, please confirm your availability below.
          </p>
        </div>

        {/* Job Details */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950 px-5 py-4 border-b border-amber-100 dark:border-amber-900">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">{job?.jobName}</h2>
            </div>
            {job?.jobType && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 ml-7">{job.jobType}</p>
            )}
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Date</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Location</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{job?.jobLocation}</p>
              </div>
            </div>
            {job?.numberOfWorkers && (
              <div className="flex items-start gap-3">
                <Users className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Workers Required</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{job.numberOfWorkers}</p>
                </div>
              </div>
            )}
            {job?.jobShift && (
              <Badge
                variant="outline"
                className={
                  job.jobShift === "night"
                    ? "text-indigo-600 border-indigo-300 dark:text-indigo-400 dark:border-indigo-700"
                    : "text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700"
                }
              >
                {job.jobShift === "night" ? "Night Shift" : "Day Shift"}
              </Badge>
            )}
          </div>
        </div>

        {/* Optional Message */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm px-5 py-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            Message (optional)
          </label>
          <Textarea
            placeholder="Add any notes or questions..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={500}
            className="resize-none"
          />
          {message && (
            <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/500</p>
          )}
        </div>

        {/* Response Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleSubmit("yes")}
            disabled={pageState === "submitting"}
            className="flex items-center justify-center gap-2 h-14 text-base font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pageState === "submitting" && selectedResponse === "yes" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                Yes, Available
              </>
            )}
          </button>
          <button
            onClick={() => handleSubmit("no")}
            disabled={pageState === "submitting"}
            className="flex items-center justify-center gap-2 h-14 text-base font-medium rounded-lg bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pageState === "submitting" && selectedResponse === "no" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <XCircle className="h-5 w-5" />
                Not Available
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 pb-4">
          <Clock className="h-3 w-3 inline mr-1" />
          Please respond as soon as possible
        </p>
      </div>
    </div>
  );
}
