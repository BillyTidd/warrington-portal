export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import emailjs from "@emailjs/nodejs";

// Initialize EmailJS with environment variables
emailjs.init({
  publicKey: process.env.EMAILJS_PUBLIC_KEY,
  privateKey: process.env.EMAILJS_PRIVATE_KEY,
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { job } = body;

    // Validate required fields
    if (!job) {
      return NextResponse.json({ error: "Missing job data" }, { status: 400 });
    }

    // Format completion date
    const completionDate = new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const completionTime = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Get job date
    const jobDate = job.jobEstimate?.jobDate
      ? new Date(job.jobEstimate.jobDate).toLocaleDateString("en-GB", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Not specified";

    // Format workers list
    const workersList =
      job.workers?.map((w: any) => w.workerName || "Unknown").join(", ") ||
      "Not assigned";

    // Calculate job summary
    const totalCost =
      job.jobEstimate?.totalCost || job.estimatedCost?.totalCost || 0;
    const laborCost =
      job.jobEstimate?.laborCost || job.estimatedCost?.laborCost || 0;
    const travelCost =
      job.jobEstimate?.travelCost || job.estimatedCost?.travelCost || 0;

    // Get recipient email - check all possible field names
    const recipientEmail =
      job.clientEmail || job.customerEmail || job.email || "";
    console.log("Recipient email:", recipientEmail);
    console.log("Job email fields:", {
      clientEmail: job.clientEmail,
      customerEmail: job.customerEmail,
      email: job.email,
    });

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "No recipient email found in job data" },
        { status: 400 }
      );
    }
    console.log("recipientEmail", recipientEmail);

    // Prepare email template parameters
    const templateParams = {
      // Recipient email (required by EmailJS)
      to_email: recipientEmail,
      // CC email
      cc_email: "billy@warringtoninstalls.co.uk",

      // Customer Information
      customer_name: job.clientName || job.customerName || "Customer",
      customer_email: recipientEmail,
      customer_phone: job.clientPhone || job.customerPhone || "Not provided",
      customer_company:
        job.clientCompany || job.customerCompany || "Not provided",

      // Job Details
      job_id: job._id || "",
      job_type: job.jobEstimate?.jobType || job.jobType || "Not specified",
      job_description:
        job.jobEstimate?.jobDescription || job.jobDescription || "Not provided",
      job_date: jobDate,
      job_reference: job.jobEstimate?.jobReference || "N/A",

      // Team & Workers
      team:
        job.jobEstimate?.team === "london"
          ? "London Team"
          : "National Team",
      shift:
        job.jobEstimate?.jobShift === "night" ? "Night Shift" : "Day Shift",
      workers: workersList,

      // Cost Summary
      labor_cost: `£${laborCost.toFixed(2)}`,
      travel_cost: `£${travelCost.toFixed(2)}`,
      total_cost: `£${totalCost.toFixed(2)}`,

      // Completion Details
      completion_date: completionDate,
      completion_time: completionTime,
      completed_by: session.user.name || session.user.email || "Team Member",

      // Email subject
      subject: `Job Completed: ${job.jobEstimate?.jobType || job.jobType || "Job"} - ${job.clientName || job.customerName || "Customer"}`,
    };

    // Send email using EmailJS
    const response = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID!,
      process.env.EMAILJS_JOB_COMPLETION_TEMPLATE_ID!, // You'll need to add this env var
      templateParams
    );

    return NextResponse.json({
      success: true,
      message: "Job completion email sent successfully",
      response,
    });
  } catch (error) {
    console.error("Error sending job completion email:", error);
    return NextResponse.json(
      { error: "Failed to send email", details: error },
      { status: 500 }
    );
  }
}
