"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/Layout";
import { toast } from "sonner"

interface User {
  _id: string;
  name: string;
  email: string;
  isApproved: boolean;
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const response = await fetch("/api/admin/users");
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        console.error("Invalid data format:", data);
        toast.error('Invalid data format received')
      }
    }
  };

  const approveUser = async (userId: string) => {
    const response = await fetch("/api/admin/approve-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (response.ok) {
      fetchUsers();
    }
  };

  if (!session || session.user.role !== "admin") {
    return <div>Access denied. Admin only.</div>;
  }

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            {users
              .filter((user) => !user.isApproved)
              .map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <Button onClick={() => approveUser(user._id)}>Approve</Button>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
