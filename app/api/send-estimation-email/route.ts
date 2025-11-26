import { NextResponse } from "next/server";
import emailjs from "@emailjs/nodejs";

// Initialize EmailJS with environment variables
emailjs.init({
  publicKey: process.env.EMAILJS_PUBLIC_KEY,
  privateKey: process.env.EMAILJS_PRIVATE_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { estimateData, estimate } = body;

    // Validate required fields
    if (!estimateData || !estimate) {
      return NextResponse.json(
        { error: "Missing required estimation data" },
        { status: 400 }
      );
    }

    // Format postcodes list
    const postcodesList = estimateData.postcodes
      ?.filter((pc: string) => pc?.trim())
      .map((pc: string, index: number) => `${index + 1}. ${pc}`)
      .join("\n");

    // Format labor breakdown
    const laborBreakdown = estimate.breakdown.labor
      .map(
        (labor: any) =>
          `- ${labor.type}: ${labor.hours} hours (${
            labor.overtimeHours
          } overtime) = £${labor.cost.toFixed(2)}`
      )
      .join("\n");

    // Get current timestamp
    const currentTime = new Date().toLocaleString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Prepare email template parameters
    const templateParams = {
      // Customer Information
      customer_name: estimateData.customerName,
      customer_email: estimateData.customerEmail,
      customer_phone: estimateData.customerPhone || "Not provided",
      customer_company: estimateData.customerCompany || "Not provided",

      // Job Details
      job_type: estimateData.jobType,
      job_description: estimateData.jobDescription || "Not provided",
      job_date: new Date(estimateData.jobDate).toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      job_location: estimateData.jobLocation || "See postcodes below",

      // Job Requirements
      number_of_workers: estimateData.numberOfWorkers,
      number_of_hours: estimateData.numberOfHours,
      vehicle_type: estimateData.vehicleType,

      // Postcodes
      postcodes_list: postcodesList || "Not provided",
      postcodes_count:
        estimateData.postcodes?.filter((pc: string) => pc?.trim()).length || 0,

      // Cost Breakdown
      labor_breakdown: laborBreakdown,
      labor_cost: `£${estimate.laborCost.toFixed(2)}`,
      travel_cost: `£${estimate.travelCost.toFixed(2)}`,
      total_cost: `£${estimate.totalCost.toFixed(2)}`,

      // Travel Details
      travel_distance: `${estimate.breakdown.travel.distance} miles`,
      travel_duration: `${Math.floor(
        estimate.breakdown.travel.duration / 60
      )}h ${estimate.breakdown.travel.duration % 60}m`,
      travel_duration_hours: `${estimate.breakdown.travel.durationHours} hours`,

      // Submission Time
      submission_date: new Date().toLocaleDateString("en-GB"),
      submission_time: new Date().toLocaleTimeString("en-GB"),
      time: currentTime,

      // Email subject
      subject: `New Job Estimation Request from ${estimateData.customerName}`,
    };

    // Send email using EmailJS
    const response = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID!,
      process.env.EMAILJS_TEMPLATE_ID!,
      templateParams
    );

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
      response,
    });
  } catch (error) {
    console.error("Error sending estimation email:", error);
    return NextResponse.json(
      { error: "Failed to send email", details: error },
      { status: 500 }
    );
  }
}
