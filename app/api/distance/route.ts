import { type NextRequest, NextResponse } from "next/server";

// Fixed company address - this will be the default "from" location
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
    const { calculationMethod, miles, toPostcode, fromPostcode } =
      await request.json();

    // Handle direct miles calculation
    if (calculationMethod === "miles") {
      if (!miles || isNaN(Number.parseFloat(miles))) {
        return NextResponse.json(
          { message: "Missing or invalid miles value" },
          { status: 400 }
        );
      }

      const distance = Number.parseFloat(miles);
      return NextResponse.json({ distance });
    }

    // Handle postcode-based calculation (existing logic)
    if (calculationMethod === "postcode") {
      if (!toPostcode) {
        return NextResponse.json(
          { message: "Missing required field: toPostcode" },
          { status: 400 }
        );
      }

      // Use provided fromPostcode or default to COMPANY_ADDRESS
      const origin = fromPostcode || COMPANY_ADDRESS;

      const distanceOneWay = await calculateDistance(origin, toPostcode.trim());
      const distanceReturn = await calculateDistance(toPostcode.trim(), origin);
      const distance = distanceOneWay + distanceReturn;
      return NextResponse.json({ distance });
    }

    // Fallback for backward compatibility (when no calculationMethod is specified)
    if (!toPostcode) {
      return NextResponse.json(
        { message: "Missing required field: toPostcode" },
        { status: 400 }
      );
    }

    // Use provided fromPostcode or default to COMPANY_ADDRESS
    const origin = fromPostcode || COMPANY_ADDRESS;

    const distance = await calculateDistance(origin, toPostcode.trim());

    return NextResponse.json({ distance });
  } catch (error) {
    console.error("Error in distance API:", error);
    return NextResponse.json(
      { message: "Failed to calculate distance" },
      { status: 500 }
    );
  }
}
