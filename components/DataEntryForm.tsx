"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { toast } from "sonner";

const MILEAGE_RATE = 0.45;
const OVERTIME_RATE = 15.0;

const initialFormData = {
  date: format(new Date(), "yyyy-MM-dd"),
  client: "",
  description: "",
  mileage: { miles: "", amount: "" },
  expenses: { description: "", amount: "" },
  overtime: { hours: "", amount: "" },
  sustenance: { description: "", amount: "" },
  totalAmount: "",
};

interface Entry {
  _id?: string;
  date: string;
  client: string;
  description: string;
  mileage: { miles: string; amount: string };
  expenses: { description: string; amount: string };
  overtime: { hours: string; amount: string };
  sustenance: { description: string; amount: string };
  totalAmount: string;
}

interface Client {
  _id: string;
  name: string;
}

interface DataEntryFormProps {
  onSubmit: (formData: any) => void;
  initialData?: any | null;
  isModal?: boolean;
  isSubmitting: boolean;
}

type Field = {
  name: string;
  label: string;
  type: string;
  readOnly?: boolean;
  step?: string;
};

type Section = {
  title: string;
  key: keyof Entry;
  fields: Field[];
};

export function DataEntryForm({
  onSubmit,
  initialData = null,
  isModal = false,
  isSubmitting,
}: DataEntryFormProps) {
  const [formData, setFormData] = useState<Entry>(
    initialData || initialFormData
  );
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [
    formData.mileage.miles,
    formData.overtime.hours,
    formData.expenses.amount,
    formData.sustenance.amount,
  ]);

  const fetchClients = async () => {
    try {
      const response = await api.get("/clients");
      setClients(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      // setIsLoading(false)
    }
    // try {
    //   const response = await fetch("/api/clients");
    //   if (response.ok) {
    //     const data = await response.json();
    //     setClients(data);
    //   } else {
    //     console.error("Failed to fetch clients");
    //   }
    // } catch (error) {
    //   console.error("Error fetching clients:", error);
    // }
  };

  const calculateTotals = () => {
    const mileageAmount = formData.mileage.miles
      ? (parseFloat(formData.mileage.miles) * MILEAGE_RATE).toFixed(2)
      : "";
    const overtimeAmount = formData.overtime.hours
      ? (parseFloat(formData.overtime.hours) * OVERTIME_RATE).toFixed(2)
      : "";

    const total =
      (mileageAmount ? parseFloat(mileageAmount) : 0) +
      (formData.expenses.amount ? parseFloat(formData.expenses.amount) : 0) +
      (overtimeAmount ? parseFloat(overtimeAmount) : 0) +
      (formData.sustenance.amount ? parseFloat(formData.sustenance.amount) : 0);

    setFormData((prev) => ({
      ...prev,
      mileage: { ...prev.mileage, amount: mileageAmount },
      overtime: { ...prev.overtime, amount: overtimeAmount },
      totalAmount: total.toFixed(2),
    }));
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
    section?: keyof Entry
  ) => {
    const { name, value } = e.target;

    if (section) {
      setFormData((prev) => ({
        ...prev,
        [section]: {
          ...(prev[section] as Record<string, any>),
          [name]:
            name === "amount" || name === "miles" || name === "hours"
              ? value === ""
                ? ""
                : Math.max(0, parseFloat(value)).toString()
              : value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client) return toast.error("Client can't be empty...");
    onSubmit(formData);
    if (!initialData) {
      setFormData(initialFormData);
    }
  };

  const CardWrapper = isModal ? React.Fragment : Card;
  const ContentWrapper = isModal ? React.Fragment : CardContent;

  const formSections: Section[] = [
    {
      title: "Mileage",
      key: "mileage",
      fields: [
        { name: "miles", label: "Miles", type: "number", step: "any" },
        {
          name: "amount",
          label: "Amount (auto)",
          type: "text",
          readOnly: true,
        },
      ],
    },
    {
      title: "Expenses",
      key: "expenses",
      fields: [
        { name: "description", label: "Description", type: "text" },
        { name: "amount", label: "Amount", type: "number", step: "any" },
      ],
    },
    {
      title: "Overtime",
      key: "overtime",
      fields: [
        { name: "hours", label: "Hours", type: "number", step: "any" },
        {
          name: "amount",
          label: "Amount (auto)",
          type: "text",
          readOnly: true,
        },
      ],
    },
    // {
    //   title: "Sustenance",
    //   key: "sustenance",
    //   fields: [
    //     { name: "description", label: "Description", type: "text" },
    //     { name: "amount", label: "Amount", type: "number" },
    //   ],
    // },
  ];

  return (
    <CardWrapper>
      <CardHeader>
        <CardTitle>
          {initialData ? "Update Work Entry" : "New Work Entry"}
        </CardTitle>
        <CardDescription>Enter the details for your work entry</CardDescription>
      </CardHeader>
      <ContentWrapper>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select
                name="client"
                value={formData.client}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, client: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client._id} value={client.name}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">Work Description</Label>
              <Input
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                placeholder="Describe the work done"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalAmount">Total Amount (auto):</Label>
              <Input
                id="totalAmount"
                name="totalAmount"
                type="text"
                value={formData.totalAmount}
                readOnly
                className="w-full bg-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {formSections.map((section) => (
              <div key={section.key} className="space-y-4">
                <h3 className="text-lg font-semibold">{section.title}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {section.fields.map((field) => (
                    <div key={field.name} className="space-y-2">
                      <Label htmlFor={`${section.key}-${field.name}`}>
                        {field.label}
                      </Label>
                      <Input
                        id={`${section.key}-${field.name}`}
                        name={field.name}
                        type={field.type}
                        value={(formData[section.key] as any)[field.name]}
                        onChange={(e) => handleChange(e, section.key)}
                        readOnly={field.readOnly}
                        className={field.readOnly ? "bg-muted" : ""}
                        placeholder={field.type === "number" ? "" : ""}
                        min="0"
                        step={field.type === "number" ? field.step || "any" : undefined}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" className="px-6" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {initialData ? "Update Entry" : "Submit Entry"}
            </Button>
          </div>
        </form>
      </ContentWrapper>
    </CardWrapper>
  );
}
