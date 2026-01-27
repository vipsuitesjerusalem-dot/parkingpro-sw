
import { Apartment, ParkingSlot } from './types';
import { RAW_APARTMENT_DATA } from './parkingData';

export const APARTMENTS: Apartment[] = RAW_APARTMENT_DATA.map(item => ({
  id: `apt-${item.apt}`,
  name: `Apartment ${item.apt}`,
  hasParking: item.slot !== "N/A",
  parkingSlotId: item.slot !== "N/A" ? `ps-${item.apt}` : undefined
}));

export const PARKING_SLOTS: ParkingSlot[] = RAW_APARTMENT_DATA
  .filter(item => item.slot !== "N/A")
  .map(item => ({
    id: `ps-${item.apt}`,
    name: `Slot ${item.slot}`,
    floor: item.floor !== "N/A" ? item.floor : undefined,
    ownerApartmentId: `apt-${item.apt}`
  }));
