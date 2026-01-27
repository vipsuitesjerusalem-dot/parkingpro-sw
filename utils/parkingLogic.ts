
import { Apartment, ParkingSlot, Booking, Suggestion, SplitSuggestion } from '../types';
import { areIntervalsOverlapping, eachDayOfInterval, format, addDays, isSameDay } from 'date-fns';

export const isSlotAvailable = (
  slotId: string,
  startDate: string,
  endDate: string,
  bookings: Booking[]
): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return !bookings.some(booking => {
    if (booking.parkingSlotId !== slotId) return false;
    
    const bStart = new Date(booking.startDate);
    const bEnd = new Date(booking.endDate);

    return areIntervalsOverlapping(
      { start, end },
      { start: bStart, end: bEnd }
    );
  });
};

export const getParkingSuggestions = (
  apartmentId: string,
  startDate: string,
  endDate: string,
  apartments: Apartment[],
  slots: ParkingSlot[],
  bookings: Booking[]
): Suggestion[] => {
  const targetApt = apartments.find(a => a.id === apartmentId);
  if (!targetApt) return [];

  const suggestions: Suggestion[] = [];

  // 1. Check if the apartment has its own parking and if it's free
  if (targetApt.hasParking && targetApt.parkingSlotId) {
    const ownSlot = slots.find(s => s.id === targetApt.parkingSlotId);
    if (ownSlot && isSlotAvailable(ownSlot.id, startDate, endDate, bookings)) {
      suggestions.push({
        slotId: ownSlot.id,
        slotName: ownSlot.name,
        floor: ownSlot.floor,
        isPriority: true
      });
    }
  }

  // 2. Find all other available slots
  const otherAvailableSlots = slots
    .filter(slot => slot.id !== targetApt.parkingSlotId)
    .filter(slot => isSlotAvailable(slot.id, startDate, endDate, bookings))
    .map(slot => ({
      slotId: slot.id,
      slotName: slot.name,
      floor: slot.floor,
      isPriority: false
    }));

  return [...suggestions, ...otherAvailableSlots];
};

/**
 * Finds combinations of two slots that cover the full requested duration.
 * It iterates through potential split dates.
 */
export const getSplitParkingSuggestions = (
  apartmentId: string,
  startDate: string,
  endDate: string,
  apartments: Apartment[],
  slots: ParkingSlot[],
  bookings: Booking[]
): SplitSuggestion[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Only search if the stay is at least 2 days
  const days = eachDayOfInterval({ start, end });
  if (days.length < 2) return [];

  const results: SplitSuggestion[] = [];
  const targetApt = apartments.find(a => a.id === apartmentId);

  // Try splitting the stay at each possible day
  // We skip the last day as split point because that would be a single slot case
  for (let i = 1; i < days.length - 1; i++) {
    const splitDate = format(days[i], 'yyyy-MM-dd');
    
    // Find all slots available for part 1
    const part1Slots = slots.filter(s => isSlotAvailable(s.id, startDate, splitDate, bookings));
    // Find all slots available for part 2
    const part2Slots = slots.filter(s => isSlotAvailable(s.id, splitDate, endDate, bookings));

    if (part1Slots.length > 0 && part2Slots.length > 0) {
      // Pick the best match for each part (priority slot first if available)
      const bestSlot1 = part1Slots.find(s => s.id === targetApt?.parkingSlotId) || part1Slots[0];
      const bestSlot2 = part2Slots.find(s => s.id === targetApt?.parkingSlotId) || part2Slots[0];

      // Ensure we don't just suggest the same slot if it's available for both (that's a single slot case)
      if (bestSlot1.id !== bestSlot2.id) {
         results.push({
           firstSlot: { slotId: bestSlot1.id, slotName: bestSlot1.name, floor: bestSlot1.floor, isPriority: bestSlot1.id === targetApt?.parkingSlotId },
           secondSlot: { slotId: bestSlot2.id, slotName: bestSlot2.name, floor: bestSlot2.floor, isPriority: bestSlot2.id === targetApt?.parkingSlotId },
           splitDate
         });
         
         // We only want a few good options
         if (results.length >= 3) break;
      }
    }
  }

  return results;
};
