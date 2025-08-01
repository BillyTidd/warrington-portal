export interface Vehicle {
  _id: string;
  name: string;
  type: string;
  pricePerMile: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface VehicleUsage {
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  pricePerMile: number;
  fromPostcode: string; // This will be the company address
  toPostcode: string;
  distance: number;
  totalCost: number;
}
