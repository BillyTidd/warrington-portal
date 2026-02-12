import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const url = request.nextUrl.searchParams.get("url");
    const customFilename = request.nextUrl.searchParams.get("filename");
    if (!url) {
      return NextResponse.json({ message: "No URL provided" }, { status: 400 });
    }

    console.log("Fetching PDF from:", url);

    // Fetch the PDF from Cloudinary with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/pdf,*/*",
      },
    });

    clearTimeout(timeoutId);
    console.log("Response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fetch error:", errorText);
      return NextResponse.json(
        {
          message: "Failed to fetch PDF",
          status: response.status,
          error: errorText,
        },
        { status: 500 }
      );
    }

    const pdfBuffer = await response.arrayBuffer();
    console.log("PDF buffer size:", pdfBuffer.byteLength);

    // Use custom filename if provided, ensure it ends with .pdf
    let filename = customFilename || url.split("/").pop() || "document.pdf";
    if (!filename.toLowerCase().endsWith(".pdf")) {
      filename = `${filename}.pdf`;
    }

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.byteLength.toString(),
      },
    });
  } catch (error: any) {
    console.error("Error downloading PDF:", error);
    return NextResponse.json(
      {
        message: "Failed to download PDF",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
