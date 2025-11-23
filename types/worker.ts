export interface WorkerType {
  _id: string;
  name: string;
  value: string; // Unique identifier (e.g., "team-leader", "general-fitter")
  dayRate: number;
  overtimeRate: number;
  icon?: string; // Icon name (e.g., "Crown", "Wrench", "HardHat")
  createdAt: Date | string;
  updatedAt: Date | string;
}
