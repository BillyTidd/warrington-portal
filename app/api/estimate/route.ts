import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

interface EstimateRequest {
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
  postcode: string;
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
      vehicleType: string;
      rate: number;
      cost: number;
      fromAddress: string;
      toAddress: string;
    };
    jobTypeMultiplier: number;
    jobType: string;
  };
}

// Updated pricing structure - only for authenticated users
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
  urgent: 1.3,
  complex: 1.2,
  specialized: 1.2,
  standard: 1.0,
};

// Fixed company address
const COMPANY_ADDRESS =
  "Unit 7, Matts Lodge Farm, Grooms Lane, Northampton, NN6 8NN";

// Function to calculate distance using Google Maps API
async function calculateDistance(
  fromAddress: string,
  toPostcode: string
): Promise<number> {
  try {
    // If no Google Maps API key, use fallback
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.log("No Google Maps API key found, using fallback estimation");
      return estimateDistanceByPostcode(toPostcode);
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
        fromAddress
      )}&destinations=${encodeURIComponent(toPostcode)}&units=imperial&key=${
        process.env.GOOGLE_MAPS_API_KEY
      }`
    );

    if (!response.ok) {
      console.error("Google Maps API request failed:", response.status);
      return estimateDistanceByPostcode(toPostcode);
    }

    const data = await response.json();
    console.log("Google Maps API response:", JSON.stringify(data, null, 2));

    if (data.status === "OK" && data.rows[0]?.elements[0]?.status === "OK") {
      const element = data.rows[0].elements[0];
      const distanceValue = element.distance.value; // in meters
      const distanceInMiles =
        Math.round(distanceValue * 0.000621371 * 100) / 100; // Convert to miles and round to 2 decimal places

      console.log(
        `Distance calculation: ${distanceValue} meters = ${distanceInMiles} miles`
      );
      return distanceInMiles;
    } else {
      console.error(
        "Google Maps API error:",
        data.status,
        data.rows[0]?.elements[0]?.status
      );
      return estimateDistanceByPostcode(toPostcode);
    }
  } catch (error) {
    console.error("Error calculating distance:", error);
    return estimateDistanceByPostcode(toPostcode);
  }
}

// Fallback distance estimation based on postcode areas
function estimateDistanceByPostcode(postcode: string): number {
  const postcodeArea = postcode
    .replace(/\s+/g, "")
    .substring(0, 2)
    .toUpperCase();

  // Rough distance estimates from Northampton (NN) to other major postcode areas
  const distanceMap: { [key: string]: number } = {
    NN: 10, // Local Northampton area
    MK: 25, // Milton Keynes
    CV: 35, // Coventry
    LE: 30, // Leicester
    OX: 45, // Oxford
    LU: 40, // Luton
    AL: 50, // St Albans
    WD: 55, // Watford
    EN: 60, // Enfield
    N: 70, // North London
    E: 75, // East London
    SE: 80, // South East London
    SW: 85, // South West London
    W: 75, // West London
    NW: 70, // North West London
    B: 60, // Birmingham
    DE: 50, // Derby
    NG: 55, // Nottingham
    PE: 65, // Peterborough
    CB: 70, // Cambridge
  };

  return distanceMap[postcodeArea] || 50; // Default to 50 miles if unknown
}

export async function POST(request: NextRequest) {
  try {
    // Get session without authOptions - use the default NextAuth configuration
    const session = await getServerSession();

    console.log("Session in API:", session); // Debug log

    if (!session?.user) {
      console.log("No session found, returning 401");
      return NextResponse.json(
        { error: "Authentication required to view pricing" },
        { status: 401 }
      );
    }

    const body: EstimateRequest = await request.json();

    const {
      numberOfWorkers,
      numberOfHours,
      jobType,
      workerTypes = [],
      vehicleType = "medium-van",
      postcode,
    } = body;

    // Validate required fields
    if (!numberOfWorkers || !numberOfHours || !postcode) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: numberOfWorkers, numberOfHours, and postcode are required",
        },
        { status: 400 }
      );
    }

    // Validate postcode format (basic UK postcode validation)
    const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
    if (!postcodeRegex.test(postcode.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid UK postcode" },
        { status: 400 }
      );
    }

    // Calculate distance from company address to job location using postcode
    const distance = await calculateDistance(COMPANY_ADDRESS, postcode.trim());

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

    // Calculate travel cost based on actual distance
    const vehicleRate =
      VEHICLE_RATES[vehicleType as keyof typeof VEHICLE_RATES] ||
      VEHICLE_RATES["medium-van"];
    const travelCost = distance * vehicleRate;

    // Calculate total (NO MATERIALS - removed as requested)
    const totalCost = adjustedLaborCost + travelCost;

    const estimate: CostEstimate = {
      laborCost: adjustedLaborCost,
      travelCost,
      totalCost,
      breakdown: {
        labor: laborBreakdown,
        travel: {
          distance,
          vehicleType,
          rate: vehicleRate,
          cost: travelCost,
          fromAddress: COMPANY_ADDRESS,
          toAddress: postcode,
        },
        jobTypeMultiplier: multiplier,
        jobType: jobType || "Standard",
      },
    };

    console.log(
      "Estimate calculated successfully for user:",
      session.user.email
    );

    return NextResponse.json({
      success: true,
      estimate,
      message: "Estimate calculated successfully",
    });
  } catch (error) {
    console.error("Error calculating estimate:", error);
    return NextResponse.json(
      { error: "Failed to calculate estimate. Please try again." },
      { status: 500 }
    );
  }
}
