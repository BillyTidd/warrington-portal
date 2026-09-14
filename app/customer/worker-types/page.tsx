"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BadgePoundSterling, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Layout } from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CustomerWorkerType } from "@/types/customer-worker-type";

export default function CustomerWorkerTypesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [workerTypes, setWorkerTypes] = useState<
    CustomerWorkerType[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?type=customer");
      return;
    }

    if (
      status === "authenticated" &&
      session.user.role !== "customer"
    ) {
      router.replace("/job-portal");
      return;
    }

    if (status !== "authenticated" || !session.user.id) {
      return;
    }

    const loadWorkerTypes = async () => {
      try {
        const response = await fetch(
          `/api/v1/customers/${session.user.id}/worker-types`,
          { cache: "no-store" }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load rates");
        }

        setWorkerTypes(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to load rates"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkerTypes();
  }, [router, session?.user?.id, session?.user?.role, status]);

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgePoundSterling className="h-5 w-5" />
              Worker Types &amp; Rates
            </CardTitle>
            <CardDescription>
              These are the worker types and charges available to your
              account. Contact Warrington&apos;s if you need a change.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : workerTypes.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">
                No worker types are currently available.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker Type</TableHead>
                      <TableHead className="text-right">Day Rate</TableHead>
                      <TableHead className="text-right">
                        Overtime Rate
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workerTypes.map((workerType) => (
                      <TableRow key={workerType._id}>
                        <TableCell className="font-medium">
                          {workerType.name}
                        </TableCell>
                        <TableCell className="text-right">
                          £{Number(workerType.dayRate).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          £{Number(workerType.overtimeRate).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
