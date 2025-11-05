import "./globals.css";
import type { Metadata } from "next";
import Providers from "./provider";
import dynamic from "next/dynamic";

// Dynamically import the Toaster component without SSR
const Toaster = dynamic(() => import("sonner").then(mod => mod.Toaster), {
  ssr: false,
});

export const metadata: Metadata = {
  title: "Warrington's Installations Limited",
  description: "Warrington's Installations Limited",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <Toaster /> {/* Include Toaster here */}
        </Providers>
      </body>
    </html>
  );
}
