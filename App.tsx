
import * as React from 'react';
import { Layout } from './components/Layout';
import { APARTMENTS, PARKING_SLOTS } from './constants';
import { Booking, Suggestion, SplitSuggestion } from './types';
import { getParkingSuggestions, getSplitParkingSuggestions } from './utils/parkingLogic';
import { format, addDays } from 'date-fns';
import { getParkingInsight } from './services/geminiService';
import { 
  Calendar, 
  Car, 
  Plus, 
  AlertCircle, 
  Sparkles,
  Search,
  Info,
  ArrowRight,
  Clock
} from 'lucide-react';

const { useState, useEffect, useMemo, useCallback } = React;

/**
 * Main Application Component
 * Fixed JSX errors by using * as React to correctly resolve JSX.IntrinsicElements namespace
 * for standard HTML elements in environments where default imports may not expose the global JSX type.
 */
const App: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedApt, setSelectedApt] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [checkInTime, setCheckInTime] = useState<string>('16:00');
  const [endDate, setEndDate] = useState<string>(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [checkOutTime, setCheckOutTime] = useState<string>('11:00');
  const [guestName, setGuestName] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [splitSuggestions, setSplitSuggestions] = useState<SplitSuggestion[]>([]);
  const [activeTab, setActiveTab] = useState<'book' | 'history'>('book');
  const [aiInsight, setAiInsight] = useState<string>('');

  const fullStartISO = useMemo(() => startDate && checkInTime ? `${startDate}T${checkInTime}` : '', [startDate, checkInTime]);
  const fullEndISO = useMemo(() => endDate && checkOutTime ? `${endDate}T${checkOutTime}` : '', [endDate, checkOutTime]);

  // Update suggestions whenever selection or dates change
  useEffect(() => {
    if (selectedApt && fullStartISO && fullEndISO) {
      const singleResults = getParkingSuggestions(selectedApt, fullStartISO, fullEndISO, APARTMENTS, PARKING_SLOTS, bookings);
      setSuggestions(singleResults);
      if (singleResults.length === 0) {
        setSplitSuggestions(getSplitParkingSuggestions(selectedApt, fullStartISO, fullEndISO, APARTMENTS, PARKING_SLOTS, bookings));
      } else {
        setSplitSuggestions([]);
      }
    } else {
      setSuggestions([]);
      setSplitSuggestions([]);
    }
  }, [selectedApt, fullStartISO, fullEndISO, bookings]);

  // Fetch AI-powered insights on load and when bookings change
  useEffect(() => {
    const fetchInsight = async () => {
      const insight = await getParkingInsight(PARKING_SLOTS.length, bookings.length, bookings);
      if (insight) setAiInsight(insight);
    };
    fetchInsight();
  }, [bookings.length]);

  const handleAddBooking = useCallback((slotId: string, customDates?: { start: string, end: string }) => {
    if (!selectedApt || !fullStartISO || !fullEndISO) return;
    const newBooking: Booking = {
      id: `book-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      apartmentId: selectedApt,
      parkingSlotId: slotId,
      startDate: customDates ? customDates.start : fullStartISO,
      endDate: customDates ? customDates.end : fullEndISO,
      guestName: guestName.trim() || 'Guest'
    };
    setBookings(prev => [...prev, newBooking]);
    if (!customDates || customDates.end === fullEndISO) {
       setSelectedApt('');
       setGuestName('');
       setActiveTab('history');
    }
  }, [selectedApt, fullStartISO, fullEndISO, guestName]);

  // Removes a booking from the local log
  const removeBooking = (id: string) => {
    setBookings(bookings.filter(b => b.id !== id));
  };

  const isFormValid = useMemo(() => !!selectedApt && !!startDate && !!checkInTime && !!endDate && !!checkOutTime, [selectedApt, startDate, checkInTime, endDate, checkOutTime]);

  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
          <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600"><Car size={24} /></div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-tight mb-1">Free Spots</p>
            <h3 className="text-3xl font-bold text-slate-800">{PARKING_SLOTS.length - bookings.length} <span className="text-slate-300 text-xl font-normal">/ {PARKING_SLOTS.length}</span></h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4 md:col-span-2">
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600"><Sparkles size={24} /></div>
          <div className="flex-grow">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-tight mb-1">ParkingPro sw Insight</p>
            <p className="text-slate-600 leading-relaxed italic text-sm">{aiInsight || "Operations running smoothly today."}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-8 border-b border-slate-200">
        <button onClick={() => setActiveTab('book')} className={`pb-4 px-6 font-bold text-xs uppercase tracking-widest ${activeTab === 'book' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-400'}`}>Book Parking</button>
        <button onClick={() => setActiveTab('history')} className={`pb-4 px-6 font-bold text-xs uppercase tracking-widest ${activeTab === 'history' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-400'}`}>Log ({bookings.length})</button>
      </div>

      {activeTab === 'book' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Plus size={18} className="text-indigo-600" /> Reservation</h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Apartment *</label>
                  <select value={selectedApt} onChange={(e) => setSelectedApt(e.target.value)} className="w-full px-4 py-3 border border-slate-100 rounded-xl bg-slate-50 font-medium text-slate-700 outline-none">
                    <option value="">Select Apartment</option>
                    {APARTMENTS.map(apt => <option key={apt.id} value={apt.id}>{apt.name} {apt.hasParking ? '✓' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Guest Name</label>
                  <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full px-4 py-3 border border-slate-100 rounded-xl bg-slate-50 outline-none" placeholder="e.g. John Doe" />
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Check-in *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full pl-9 pr-3 py-3 border border-slate-100 rounded-xl bg-slate-50 outline-none text-xs" />
                      </div>
                      <div className="relative">
                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} className="w-full pl-9 pr-3 py-3 border border-slate-100 rounded-xl bg-slate-50 outline-none text-xs" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Check-out *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full pl-9 pr-3 py-3 border border-slate-100 rounded-xl bg-slate-50 outline-none text-xs" />
                      </div>
                      <div className="relative">
                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className="w-full pl-9 pr-3 py-3 border border-slate-100 rounded-xl bg-slate-50 outline-none text-xs" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 min-h-[400px]">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Search size={18} className="text-indigo-600" /> Available Slots</h2>
              {!isFormValid ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-300">
                  <div className="bg-slate-50 p-6 rounded-full mb-4"><Calendar size={32} className="opacity-30" /></div>
                  <p className="text-sm font-medium">Complete form to see options</p>
                </div>
              ) : (suggestions.length > 0 || splitSuggestions.length > 0) ? (
                <div className="space-y-6">
                  {suggestions.map(sug => (
                    <div key={sug.slotId} className={`p-6 rounded-2xl border flex flex-col justify-between transition-all ${sug.isPriority ? 'border-indigo-600 bg-indigo-50/50 shadow-indigo-100 shadow-lg' : 'border-slate-100 bg-white shadow-sm hover:border-slate-300'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-slate-800 flex items-center gap-2">{sug.slotName}{sug.isPriority && <span className="bg-indigo-600 text-white text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">Owner</span>}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Floor {sug.floor || 'N/A'}</p>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-100 text-indigo-400"><Car size={16} /></div>
                      </div>
                      <button disabled={!isFormValid} onClick={() => handleAddBooking(sug.slotId)} className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${isFormValid ? 'bg-slate-800 text-white hover:bg-black' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>Book Now</button>
                    </div>
                  ))}
                  {splitSuggestions.map((split, i) => (
                    <div key={i} className="p-6 rounded-2xl border border-slate-100 bg-white flex flex-col gap-4 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-center text-xs text-slate-400 font-bold uppercase tracking-tight">
                        <div className="flex flex-col"><span className="text-slate-800">{split.firstSlot.slotName}</span><span className="font-normal italic text-[10px]">Until {split.splitDate}</span></div>
                        <ArrowRight size={14} className="mx-4 text-slate-200" />
                        <div className="flex flex-col text-right"><span className="text-slate-800">{split.secondSlot.slotName}</span><span className="font-normal italic text-[10px]">From {split.splitDate}</span></div>
                      </div>
                      <button disabled={!isFormValid} onClick={() => { handleAddBooking(split.firstSlot.slotId, { start: fullStartISO, end: `${split.splitDate}T12:00` }); handleAddBooking(split.secondSlot.slotId, { start: `${split.splitDate}T12:00`, end: fullEndISO }); }} className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${isFormValid ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>Book Split Stay</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-rose-500 font-bold">
                  <div className="bg-rose-50 p-6 rounded-full mb-4"><AlertCircle size={32} /></div>
                  <p>No spots available for these dates.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
              <tr><th className="px-8 py-4">Unit</th><th className="px-8 py-4">Guest</th><th className="px-8 py-4">Slot</th><th className="px-8 py-4">Dates</th><th className="px-8 py-4 text-center">Delete</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-300 italic font-medium">No bookings found in log.</td></tr>
              ) : (
                [...bookings].reverse().map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 font-bold text-slate-700">{APARTMENTS.find(a=>a.id===b.apartmentId)?.name}</td>
                    <td className="px-8 py-5 text-slate-500">{b.guestName}</td>
                    <td className="px-8 py-5"><span className="bg-indigo-50 text-indigo-700 text-[10px] px-3 py-1 rounded-lg font-bold border border-indigo-100 shadow-sm">{PARKING_SLOTS.find(s=>s.id===b.parkingSlotId)?.name}</span></td>
                    <td className="px-8 py-5 text-slate-400 font-mono text-[10px]">{format(new Date(b.startDate), 'MMM dd, HH:mm')} - {format(new Date(b.endDate), 'MMM dd, HH:mm')}</td>
                    <td className="px-8 py-5 text-center">
                      <button onClick={() => removeBooking(b.id)} className="px-4 py-2 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors text-xs font-bold uppercase"> DELETE </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
};

export default App;
