
export interface Apartment {
  id: string;
  name: string;
  hasParking: boolean;
  parkingSlotId?: string;
}

export interface ParkingSlot {
  id: string;
  name: string;
  floor?: string;
  ownerApartmentId: string;
}

export interface Booking {
  id: string;
  apartmentId: string;
  parkingSlotId: string;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  guestName?: string;
}

export interface Suggestion {
  slotId: string;
  slotName: string;
  floor?: string;
  isPriority: boolean; // True if it's the apartment's own slot
}

export interface SplitSuggestion {
  firstSlot: Suggestion;
  secondSlot: Suggestion;
  splitDate: string;
}
