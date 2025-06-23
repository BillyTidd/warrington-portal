import { type NextRequest, NextResponse } from "next/server";

// Dummy calculation function - you can update these values later
function calculateJobEstimate(data: any) {
  const { numberOfWorkers, numberOfHours, jobLocation, jobType } = data;

  // Base rates (these are dummy values - update as needed)
  const baseHourlyRate = 25; // £25 per hour per worker
  const materialCostPercentage = 0.15; // 15% of labor cost
  const travelCostBase = 50; // Base travel cost
  const travelCostPerMile = 0.45; // Cost per mile (dummy calculation)

  // Calculate labor cost
  const laborCost = numberOfWorkers * numberOfHours * baseHourlyRate;

  // Calculate material cost (percentage of labor cost)
  const materialCost = laborCost * materialCostPercentage;

  // Calculate travel cost (dummy calculation based on location)
  // In real implementation, you might use Google Maps API for distance
  const estimatedDistance = jobLocation.length * 2; // Dummy distance calculation
  const travelCost = travelCostBase + estimatedDistance * travelCostPerMile;

  // Job type multiplier (dummy values)
  let jobTypeMultiplier = 1;
  const jobTypeLower = jobType?.toLowerCase() || "";
  if (jobTypeLower.includes("emergency") || jobTypeLower.includes("urgent")) {
    jobTypeMultiplier = 1.5;
  } else if (
    jobTypeLower.includes("complex") ||
    jobTypeLower.includes("specialized")
  ) {
    jobTypeMultiplier = 1.3;
  }

  // Apply job type multiplier to labor cost
  const adjustedLaborCost = laborCost * jobTypeMultiplier;

  // Calculate total
  const totalCost = adjustedLaborCost + materialCost + travelCost;

  return {
    laborCost: adjustedLaborCost,
    materialCost,
    travelCost,
    totalCost,
  };
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    const requiredFields = [
      "numberOfWorkers",
      "numberOfHours",
      "jobDate",
      "jobLocation",
    ];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate numeric fields
    if (data.numberOfWorkers < 1 || data.numberOfWorkers > 20) {
      return NextResponse.json(
        { message: "Number of workers must be between 1 and 20" },
        { status: 400 }
      );
    }

    if (data.numberOfHours < 1 || data.numberOfHours > 24) {
      return NextResponse.json(
        { message: "Number of hours must be between 1 and 24" },
        { status: 400 }
      );
    }

    // Calculate estimate
    const estimate = calculateJobEstimate(data);

    return NextResponse.json({
      success: true,
      estimate,
      message: "Estimate calculated successfully",
    });
  } catch (error) {
    console.error("Error calculating estimate:", error);
    return NextResponse.json(
      { message: "Failed to calculate estimate" },
      { status: 500 }
    );
  }
}
