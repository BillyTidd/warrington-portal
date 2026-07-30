import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";

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
  postcodes: string[];
  team?: string;
  londonStartingPoint?: string;
  jobReference?: string;
  jobShift?: string;
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

// Function to calculate round-trip distance and duration using Google Directions API
async function calculateRoundTrip(
  fromAddress: string,
  postcodes: string[]
): Promise<{ distance: number; duration: number }> {
  try {
    // If no Google Maps API key, use fallback
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.log("No Google Maps API key found, using fallback estimation");
      const totalDistance = postcodes.reduce(
        (sum, pc) => sum + estimateDistanceByPostcode(pc),
        0
      );
      // Estimate 2x for round trip and roughly 30 mph average
      return {
        distance: Math.round(totalDistance * 2 * 100) / 100,
        duration: Math.round(((totalDistance * 2) / 30) * 60), // minutes
      };
    }

    // Filter out empty postcodes
    const validPostcodes = postcodes.filter((pc) => pc?.trim());
    if (validPostcodes.length === 0) {
      return { distance: 0, duration: 0 };
    }

    // Build waypoints string (all postcodes except the last one become waypoints)
    const waypoints =
      validPostcodes.length > 1
        ? `optimize:false|${validPostcodes.join("|")}`
        : undefined;

    // Build URL for Directions API
    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
      fromAddress
    )}&destination=${encodeURIComponent(
      fromAddress
    )}&mode=driving&units=imperial&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    if (waypoints) {
      url += `&waypoints=${encodeURIComponent(waypoints)}`;
    } else {
      // If only one postcode, make it a waypoint and return to origin
      url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
        fromAddress
      )}&destination=${encodeURIComponent(
        fromAddress
      )}&waypoints=${encodeURIComponent(
        validPostcodes[0]
      )}&mode=driving&units=imperial&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      console.error("Google Directions API request failed:", response.status);
      const totalDistance = validPostcodes.reduce(
        (sum, pc) => sum + estimateDistanceByPostcode(pc),
        0
      );
      return {
        distance: Math.round(totalDistance * 2 * 100) / 100,
        duration: Math.round(((totalDistance * 2) / 30) * 60),
      };
    }

    const data = await response.json();

    if (data.status === "OK" && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      let totalDistanceMeters = 0;
      let totalDurationSeconds = 0;

      // Sum up all legs
      route.legs.forEach((leg: any) => {
        totalDistanceMeters += leg.distance.value;
        totalDurationSeconds += leg.duration.value;
      });

      const distanceInMiles =
        Math.round(totalDistanceMeters * 0.000621371 * 100) / 100;
      const durationInMinutes = Math.round(totalDurationSeconds / 60);

      console.log(
        `Round-trip calculation: ${totalDistanceMeters} meters = ${distanceInMiles} miles, ${totalDurationSeconds} seconds = ${durationInMinutes} minutes`
      );

      return {
        distance: distanceInMiles,
        duration: durationInMinutes,
      };
    } else {
      console.error(
        "Google Directions API error:",
        data.status,
        data.error_message
      );
      const totalDistance = validPostcodes.reduce(
        (sum, pc) => sum + estimateDistanceByPostcode(pc),
        0
      );
      return {
        distance: Math.round(totalDistance * 2 * 100) / 100,
        duration: Math.round(((totalDistance * 2) / 30) * 60),
      };
    }
  } catch (error) {
    console.error("Error calculating round-trip:", error);
    const totalDistance = postcodes.reduce(
      (sum, pc) => sum + estimateDistanceByPostcode(pc),
      0
    );
    return {
      distance: Math.round(totalDistance * 2 * 100) / 100,
      duration: Math.round(((totalDistance * 2) / 30) * 60),
    };
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
      jobDate,
      jobType,
      workerTypes = [],
      vehicleType = "medium-van",
      postcodes,
      team = "default",
      londonStartingPoint = "",
      jobShift = "day",
    } = body;

    // Detect weekend (Sat=6, Sun=0) using local date parsing to avoid UTC offset issues
    const isWeekend = (() => {
      if (!jobDate) return false;
      const [y, m, d] = jobDate.split("-").map(Number);
      const day = new Date(y, m - 1, d).getDay();
      return day === 0 || day === 6;
    })();
    const isNightShift = jobShift === "night";
    const weekendMultiplier = isWeekend ? 1.5 : 1.0;
    const shiftMultiplier = isNightShift ? 1.5 : 1.0;
    const combinedShiftMultiplier = weekendMultiplier * shiftMultiplier;

    const isLondonTeam = team === "london";
    const fromAddress =
      isLondonTeam && londonStartingPoint.trim()
        ? londonStartingPoint.trim()
        : COMPANY_ADDRESS;

    // Validate required fields
    if (
      !numberOfWorkers ||
      !numberOfHours ||
      !postcodes ||
      postcodes.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: numberOfWorkers, numberOfHours, and postcodes are required",
        },
        { status: 400 }
      );
    }

    // Filter out empty postcodes
    const validPostcodes = postcodes.filter((pc) => pc?.trim());
    if (validPostcodes.length === 0) {
      return NextResponse.json(
        { error: "At least one valid postcode is required" },
        { status: 400 }
      );
    }

    // Validate postcode format (basic UK postcode validation)
    const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
    for (const postcode of validPostcodes) {
      if (!postcodeRegex.test(postcode.trim())) {
        return NextResponse.json(
          { error: `Invalid UK postcode format: ${postcode}` },
          { status: 400 }
        );
      }
    }

    // Calculate round-trip distance and duration
    const { distance, duration } = await calculateRoundTrip(
      fromAddress,
      validPostcodes.map((pc) => pc.trim())
    );

    // Calculate travel hours (rounded up to nearest whole hour)
    const durationHours = Math.ceil(duration / 60);

    // Fetch worker types from database
    const client = await clientPromise;
    const db = client.db();

    const workerTypesFromDb = await db
      .collection("worker-types")
      .find({})
      .toArray();

    const vehiclesFromDb = await db.collection("vehicles").find({}).toArray();

    // Create worker rates map from database
    const WORKER_RATES: {
      [key: string]: { dayRate: number; overtimeRate: number; label: string };
    } = {};
    workerTypesFromDb.forEach((wt: any) => {
      WORKER_RATES[wt.value] = {
        dayRate: wt.dayRate,
        overtimeRate: wt.overtimeRate,
        label: wt.name,
      };
    });

    // Create vehicle rates map from database
    const VEHICLE_RATES: { [key: string]: number } = {};
    vehiclesFromDb.forEach((v: any) => {
      const vehicleKey = v.name.toLowerCase().replace(/\s+/g, "-");
      VEHICLE_RATES[vehicleKey] = v.pricePerMile;
    });

    // Ensure we have worker types for each worker
    const finalWorkerTypes = [...workerTypes];
    const defaultWorkerType = workerTypesFromDb[0]?.value || "general-fitter";
    while (finalWorkerTypes.length < numberOfWorkers) {
      finalWorkerTypes.push(defaultWorkerType);
    }
    finalWorkerTypes.splice(numberOfWorkers); // Remove excess

    // Add travel hours to total hours for labor calculation — London uses a flat
    // travel rate and doesn't bill travel time, so only add it for other teams
    const totalHoursWithTravel = isLondonTeam
      ? numberOfHours
      : numberOfHours + durationHours;

    // Calculate labor costs with detailed breakdown
    const laborBreakdown: LaborBreakdown[] = [];
    let totalLaborCost = 0;

    finalWorkerTypes.forEach((workerType) => {
      const rates = WORKER_RATES[workerType];
      if (!rates) {
        console.log(`Worker type not found: ${workerType}`);
        return;
      }

      const overtimeHours = Math.max(totalHoursWithTravel - 10, 0);
      const regularCost = rates.dayRate; // Full day rate for up to 10 hours
      const overtimeCost = overtimeHours * rates.overtimeRate;
      const totalWorkerCost = regularCost + overtimeCost;

      laborBreakdown.push({
        type: rates.label,
        hours: totalHoursWithTravel,
        dayRate: rates.dayRate,
        overtimeHours,
        overtimeRate: rates.overtimeRate,
        cost: totalWorkerCost,
      });

      totalLaborCost += totalWorkerCost;
    });

    // Apply job type multiplier + shift/weekend multipliers
    const jobTypeKey =
      jobType?.toLowerCase().replace(/[^a-z]/g, "") || "standard";
    const multiplier =
      JOB_TYPE_MULTIPLIERS[jobTypeKey as keyof typeof JOB_TYPE_MULTIPLIERS] ||
      1.0;
    const adjustedLaborCost =
      totalLaborCost * multiplier * combinedShiftMultiplier;

    // Calculate travel cost — flat £50 for London, distance-based otherwise
    const vehicleRate = isLondonTeam
      ? 30
      : VEHICLE_RATES[vehicleType as keyof typeof VEHICLE_RATES] ||
        VEHICLE_RATES["medium-van"] ||
        0;
    const travelCost = isLondonTeam ? 50 : distance * vehicleRate;

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
          duration,
          durationHours,
          vehicleType,
          rate: vehicleRate,
          cost: travelCost,
          fromAddress,
          waypoints: validPostcodes,
        },
        jobTypeMultiplier: multiplier,
        jobType: jobType || "Standard",
        isWeekend,
        isNightShift,
        shiftMultiplier,
        weekendMultiplier,
        combinedShiftMultiplier,
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
