"use client";

import type React from "react";
import { Suspense } from "react";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

// Separate component that uses useSearchParams
function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/";
  const isCustomerLogin = searchParams.get("type") === "customer";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Logged in successfully");

        // Redirect based on user role and return URL
        if (returnUrl !== "/") {
          router.push(returnUrl);
        } else if (isCustomerLogin) {
          router.push("/customer/dashboard");
        } else {
          router.push("/job-portal");
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Card className="w-full max-w-md shadow-lg border-amber-100 dark:border-white/10">
        <CardHeader className="text-center">
          <Link href="/" className="flex justify-center mb-2">
            <Image
              src="/new-logo-light.jpg"
              alt="Warrington Portal"
              width={160}
              height={58}
              className="dark:hidden"
            />
            <Image
              src="/new-logo-dark.png"
              alt="Warrington Portal"
              width={160}
              height={58}
              className="hidden dark:block"
            />
          </Link>

          {isCustomerLogin && (
            <div className="flex justify-center mb-2">
              <Link href="/estimate">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Estimate
                </Button>
              </Link>
            </div>
          )}

          <CardTitle className="text-2xl">
            {isCustomerLogin ? "Customer Login" : "Login"}
          </CardTitle>
          <CardDescription>
            {isCustomerLogin
              ? "Login to submit your job request and track progress"
              : "Enter your credentials to access your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Log In"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              href={`/signup${isCustomerLogin ? "?type=customer" : ""}`}
              className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

// Loading fallback component
function LoginLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Card className="w-full max-w-md shadow-lg border-amber-100 dark:border-white/10">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main component with Suspense boundary
export default function Login() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}
