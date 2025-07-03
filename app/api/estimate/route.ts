import { type NextRequest, NextResponse } from "next/server";

interface EstimateRequest {
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

// Updated pricing structure
const WORKER_RATES = {
  "team-leader": {
    dayRate: 240, // £240 per day (0-10 hours)
    overtimeRate: 24, // £24 per hour after 10 hours
    label: "Team Leader",
  },
  "general-fitter": {
    dayRate: 220, // £220 per day (0-10 hours)
    overtimeRate: 22, // £22 per hour after 10 hours
    label: "General Fitter",
  },
  labourer: {
    dayRate: 200, // £200 per day (0-10 hours)
    overtimeRate: 20, // £20 per hour after 10 hours
    label: "Labourer/Assistant Fitter",
  },
};

const VEHICLE_RATES = {
  "luton-van": 0.75, // £0.75 per mile
  "medium-van": 0.65, // £0.65 per mile
  "small-van": 0.55, // £0.55 per mile
};

const JOB_TYPE_MULTIPLIERS = {
  emergency: 1.5,
  "out-of-hours": 1.3,
  complex: 1.2,
  standard: 1.0,
};

const MATERIAL_PERCENTAGE = 15; // 15% of labor cost

export async function POST(request: NextRequest) {
  try {
    const body: EstimateRequest = await request.json();

    const {
      numberOfWorkers,
      numberOfHours,
      jobType,
      workerTypes = [],
      vehicleType = "medium-van",
      estimatedDistance = 20,
    } = body;

    // Validate required fields
    if (!numberOfWorkers || !numberOfHours) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure we have worker types for each worker
    const finalWorkerTypes = [...workerTypes];
    while (finalWorkerTypes.length < numberOfWorkers) {
      finalWorkerTypes.push("general-fitter"); // Default to general fitter
    }
    finalWorkerTypes.splice(numberOfWorkers); // Remove excess

    // Calculate labor costs with detailed breakdown
    const laborBreakdown: LaborBreakdown[] = [];
    let totalLaborCost = 0;

    finalWorkerTypes.forEach((workerType) => {
      const rates = WORKER_RATES[workerType as keyof typeof WORKER_RATES];
      if (!rates) return;

      const regularHours = Math.min(numberOfHours, 10);
      const overtimeHours = Math.max(numberOfHours - 10, 0);

      const regularCost = rates.dayRate; // Full day rate for up to 10 hours
      const overtimeCost = overtimeHours * rates.overtimeRate;
      const totalWorkerCost = regularCost + overtimeCost;

      laborBreakdown.push({
        type: rates.label,
        hours: numberOfHours,
        dayRate: rates.dayRate,
        overtimeHours,
        overtimeRate: rates.overtimeRate,
        cost: totalWorkerCost,
      });

      totalLaborCost += totalWorkerCost;
    });

    // Apply job type multiplier
    const jobTypeKey =
      jobType?.toLowerCase().replace(/[^a-z]/g, "") || "standard";
    const multiplier =
      JOB_TYPE_MULTIPLIERS[jobTypeKey as keyof typeof JOB_TYPE_MULTIPLIERS] ||
      1.0;
    const adjustedLaborCost = totalLaborCost * multiplier;

    // Calculate material cost (percentage of labor)
    const materialCost = (adjustedLaborCost * MATERIAL_PERCENTAGE) / 100;

    // Calculate travel cost
    const vehicleRate =
      VEHICLE_RATES[vehicleType as keyof typeof VEHICLE_RATES] ||
      VEHICLE_RATES["medium-van"];
    const travelCost = estimatedDistance * vehicleRate;

    // Calculate total
    const totalCost = adjustedLaborCost + materialCost + travelCost;

    const estimate: CostEstimate = {
      laborCost: adjustedLaborCost,
      materialCost,
      travelCost,
      totalCost,
      breakdown: {
        labor: laborBreakdown,
        material: {
          percentage: MATERIAL_PERCENTAGE,
          cost: materialCost,
        },
        travel: {
          distance: estimatedDistance,
          vehicleType,
          rate: vehicleRate,
          cost: travelCost,
        },
        jobTypeMultiplier: multiplier,
        jobType: jobType || "Standard",
      },
    };

    return NextResponse.json({
      success: true,
      estimate,
    });
  } catch (error) {
    console.error("Error calculating estimate:", error);
    return NextResponse.json(
      { error: "Failed to calculate estimate" },
      { status: 500 }
    );
  }
}
