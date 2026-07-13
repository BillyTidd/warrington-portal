"use client";

import type React from "react";
import { Suspense } from "react";
import { useState } from "react";
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
function SignupForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    company: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCustomerSignup = searchParams.get("type") === "customer";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          role: isCustomerSignup ? "customer" : "employee",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create account");
      }

      toast.success("Account created successfully! Please login.");
      router.push(`/login${isCustomerSignup ? "?type=customer" : ""}`);
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create account"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-8 bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
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

          {isCustomerSignup && (
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
            {isCustomerSignup ? "Create Customer Account" : "Sign Up"}
          </CardTitle>
          <CardDescription>
            {isCustomerSignup
              ? "Create an account to submit job requests and track progress"
              : "Create your account to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="Enter your email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                required={isCustomerSignup}
                placeholder="Enter your phone number"
              />
            </div>
            {isCustomerSignup && (
              <div className="space-y-2">
                <Label htmlFor="company">Company (Optional)</Label>
                <Input
                  id="company"
                  name="company"
                  type="text"
                  value={formData.company}
                  onChange={handleInputChange}
                  placeholder="Enter company name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="Enter your password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                placeholder="Confirm your password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={`/login${isCustomerSignup ? "?type=customer" : ""}`}
              className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
            >
              Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

// Loading fallback component
function SignupLoading() {
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
export default function Signup() {
  return (
    <Suspense fallback={<SignupLoading />}>
      <SignupForm />
    </Suspense>
  );
}
