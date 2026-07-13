import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Clock, Receipt, BarChart3 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function Home() {
  const session = await getServerSession();

  if (session) {
    redirect("/create-entry");
  }

  const features = [
    {
      icon: Clock,
      title: "Track Time",
      description: "Log work entries and hours with ease",
    },
    {
      icon: Receipt,
      title: "Manage Expenses",
      description: "Record mileage, overtime and expenses in one place",
    },
    {
      icon: BarChart3,
      title: "See the Big Picture",
      description: "Reports and dashboards that keep everyone aligned",
    },
  ];

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 sm:py-24">
        <Image
          src="/new-logo-light.jpg"
          alt="Warrington Portal"
          width={220}
          height={80}
          className="mb-8 dark:hidden"
          priority
        />
        <Image
          src="/new-logo-dark.png"
          alt="Warrington Portal"
          width={220}
          height={80}
          className="mb-8 hidden dark:block"
          priority
        />

        <h1 className="text-3xl sm:text-5xl font-bold leading-snug sm:leading-tight text-center text-gray-900 dark:text-white max-w-7xl">
          Time &amp; Job Management, Simplified
        </h1>
        <p className="mt-4 text-base sm:text-lg text-center text-gray-600 dark:text-gray-400 max-w-xl">
          Track work, manage jobs and keep your team on the same page — all in
          one portal.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-10">
          <Button asChild size="lg">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/signup">Sign Up</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 max-w-4xl w-full">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col items-center text-center gap-3 p-6 rounded-xl bg-white/60 dark:bg-white/5 border border-amber-100 dark:border-white/10 backdrop-blur-sm"
            >
              <div className="h-11 w-11 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
                <feature.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <footer className="py-6 text-center text-sm text-gray-500 dark:text-gray-500">
        &copy; {new Date().getFullYear()} Warrington Portal. All rights
        reserved.
      </footer>
    </main>
  );
}
