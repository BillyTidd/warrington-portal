import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function Home() {
  const session = await getServerSession();

  if (session) {
    redirect("/create-entry");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Welcome to Time Tracker</h1>
      <p className="text-xl mb-8">
        Manage your work time and expenses efficiently
      </p>
      <div className="flex space-x-4">
        <Button asChild>
          <Link href="/login">Login</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/signup">Sign Up</Link>
        </Button>
      </div>
    </main>
  );
}
