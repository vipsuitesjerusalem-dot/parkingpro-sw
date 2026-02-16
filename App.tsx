import * as React from 'react';
import { Layout } from './components/Layout';
import { Booking, Suggestion, SplitSuggestion, Apartment, ParkingSlot } from './types';
import { getParkingSuggestions, getSplitParkingSuggestions } from './utils/parkingLogic';
import { format, isWithinInterval, addDays, isSameDay, parseISO, isAfter } from 'date-fns';
import { 
  Calendar, Car, Plus, AlertCircle, Sparkles, Search, ArrowRight, Clock, 
  TrendingUp, ArrowDownCircle, ArrowUpCircle
} from 'lucide-react';

const { useState, useEffect, useMemo, useCallback } = React;

// הקישור החדש שלך
const API_BASE = "https://script.google.com/macros/s/AKfycbwTd7r0lZGY9T9D6Vu6IlGZ_KBys-nFja0_OdbeH-iw7R6H1M8vn9bY_xIUi4q49DJV/exec";

const VIDEO_URL = "https://res.cloudinary.com/dgwgzsohp/video/upload/v1769956614/grok-video-b8430f84-14c4-4242-9796-333addc4e0da_kwpwwv.mp4";

const App: React.FC = () => {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false); 
  const [activePage, setActivePage] = useState<'book' | 'dashboard' | 'inventory'>('book');
  const [activeTab, setActiveTab] = useState<'book' | 'history'>('book');

  const [selectedApt, setSelectedApt] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [checkInTime, setCheckInTime] = useState<string>('16:00');
  const [endDate, setEndDate] = useState<string>(''); 
  const [checkOutTime, setCheckOutTime] = useState<string>('11:00');
  const [guestName, setGuestName] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [splitSuggestions, setSplitSuggestions] = useState<SplitSuggestion[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), 2800);

    const fetchData = async () => {
      try {
        // משיכת נתונים משני הגיליונות
        const [aptRes, bookRes] = await Promise.all([
          fetch(`${API_BASE}?sheet=apartments`),
          fetch(`${API_BASE}?sheet=bookings`)
        ]);
        
        const rawApts = await aptRes.json();
        const rawBooks = await bookRes.json();
        
        if (Array.isArray(rawApts)) {
          // מיפוי הדירות לפי המבנה בגיליון: apt, floor, slot
          setApartments(rawApts.map((item: any) => ({ 
            id: `apt-${item.apt}`, 
            name: `Apartment ${item.apt}`, 
            hasParking: String(item.slot) !== "N/A", 
            parkingSlotId: String(item.slot) !== "N/A" ? `ps-${item.apt}` : undefined 
          })));
          
          // מיפוי החניות
          setSlots(rawApts.filter((item: any) => String(item.slot) !== "N/A").map((item: any) => ({ 
            id: `ps-${item.apt}`, 
            name: `Slot ${item.slot}`, 
            floor: item.floor !== "N/A" ? item.floor : undefined, 
            ownerApartmentId: `apt-${item.apt}` 
          })));
        }
        
        setBookings(Array.isArray(rawBooks) ? rawBooks : []);
      } catch (e) { 
        console.error("Fetch error:", e); 
      } finally { 
        setLoading(false); 
      }
    };

    fetchData();
    return () => clearTimeout(timer);
  }, []);

  const showSplash = loading || !minTimeElapsed;

  const currentOccupiedCount = useMemo(() => {
    const now = new Date();
    return slots.filter(slot => 
      bookings.some(b => b.parkingSlotId === slot.id && isWithinInterval(now, { start: parseISO(b.startDate), end: parseISO(b.endDate) }))
    ).length;
  }, [slots, bookings]);

  useEffect(() => {
    if (searchTerm) {
      const exactMatch = apartments.find(apt => apt.name.replace(/\D/g, '') === searchTerm);
      if (exactMatch) setSelectedApt(exactMatch.id);
    }
  }, [searchTerm, apartments]);

  const fullStartISO = useMemo(() => startDate && checkInTime ? `${startDate}T${checkInTime}` : '', [startDate, checkInTime]);
  const fullEndISO = useMemo(() => endDate && checkOutTime ? `${endDate}T${checkOutTime}` : '', [endDate, checkOutTime]);

  useEffect(() => {
    if (selectedApt && fullStartISO && fullEndISO && endDate !== '') {
      const singleResults = getParkingSuggestions(selectedApt, fullStartISO, fullEndISO, apartments, slots, bookings);
      setSuggestions(singleResults);
      setSplitSuggestions(singleResults.length === 0 ? getSplitParkingSuggestions(selectedApt, fullStartISO, fullEndISO, apartments, slots, bookings) : []);
    } else { setSuggestions([]); setSplitSuggestions([]); }
  }, [selectedApt, fullStartISO, fullEndISO, bookings, apartments, slots, endDate]);

  const handleAddBooking = useCallback(async (slotId: string, d?: {start: string, end: string}) => {
    const newBooking = { 
      id: String(Date.now()), 
      apartmentId: selectedApt, 
      parkingSlotId: slotId, 
      startDate: d ? d.start : fullStartISO, 
      endDate: d ? d.end : fullEndISO, 
      guestName: guestName || 'Guest' 
    };
    
    setBookings(prev => [...prev, newBooking]);
    
    // שליחה לגוגל סקריפט
    await fetch(API_BASE, { 
      method: 'POST', 
      mode: 'no-cors', // חשוב לעבודה מול Google Script POST
      body: JSON.stringify({ action: 'add', sheet: 'bookings', data: newBooking }) 
    });
    
    if (!d || d.end === fullEndISO) { 
      setSelectedApt(''); 
      setSearchTerm(''); 
      setEndDate(''); 
      setGuestName('');
      setStartDate(format(new Date(), 'yyyy-MM-dd'));
      setCheckInTime('16:00');
      setCheckOutTime('11:00');
      setActiveTab('history'); 
    }
  }, [selectedApt, fullStartISO, fullEndISO, guestName]);

  const removeBooking = async (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
    await fetch(API_BASE, { 
      method: 'POST', 
      mode: 'no-cors',
      body: JSON.stringify({ action: 'delete', sheet: 'bookings', id: id }) 
    });
  };

  // ... שאר פונקציות ה-Render (renderBookingBadge, renderDashboard, renderInventory וכו') נשארות כפי שהיו בקוד שלך
  // (השמטתי אותן כאן כדי לחסוך מקום, אבל הן צריכות להישאר בדיוק אותו דבר)

  const renderBookingBadge = (b: Booking, type: 'in' | 'out') => {
    const aptNum = apartments.find(a => a.id === b.apartmentId)?.name.replace(/\D/g, '');
    const slotName = slots.find(s => s.id === b.parkingSlotId)?.name.replace('Slot ', '');
    const colorClass = type === 'in' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100';
    return (
      <div key={b.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${colorClass} text-[11px] font-bold shadow-sm`}>
        <span className="opacity-60">Apt</span> <span>{aptNum}</span>
        <ArrowRight size={10} className="opacity-40" />
        <span className="opacity-60">Slot</span> <span>{slotName}</span>
      </div>
    );
  };

  const renderDashboard = () => {
    const now = new Date();
    const occupancyPercent = (currentOccupiedCount / slots.length) * 100;
    const checkInsToday = bookings.filter(b => isSameDay(parseISO(b.startDate), now));
    const checkOutsToday = bookings.filter(b => isSameDay(parseISO(b.endDate), now));

    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest text-center">Current Occupancy</p>
              <div className="relative w-48 h-24 overflow-hidden mb-2">
                 <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[16px] border-slate-100"></div>
                 <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[16px] border-indigo-500 transition-all duration-1000" 
                      style={{ clipPath: `inset(0 0 50% 0)`, transform: `rotate(${(occupancyPercent * 1.8) - 180}deg)` }}></div>
                 <div className="absolute bottom-0 w-full text-center">
                    <span className="text-2xl font-black text-rose-500">{currentOccupiedCount}</span>
                    <span className="text-xl font-bold text-slate-300 mx-1">/</span>
                    <span className="text-2xl font-black text-emerald-500">{slots.length}</span>
                 </div>
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-2">{Math.round(occupancyPercent)}% Capacity</p>
          </div>
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm min-h-[100px]">
                <div className="flex items-center gap-3 mb-3">
                   <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl"><ArrowDownCircle size={20}/></div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Arrivals Today</p>
                </div>
                <div className="flex flex-wrap gap-2">
                   {checkInsToday.length > 0 ? checkInsToday.map(b => renderBookingBadge(b, 'in')) : <p className="text-sm text-slate-300 italic">No arrivals</p>}
                </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm min-h-[100px]">
                <div className="flex items-center gap-3 mb-3">
                   <div className="bg-rose-50 text-rose-600 p-2 rounded-xl"><ArrowUpCircle size={20}/></div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Departures Today</p>
                </div>
                <div className="flex flex-wrap gap-2">
                   {checkOutsToday.length > 0 ? checkOutsToday.map(b => renderBookingBadge(b, 'out')) : <p className="text-sm text-slate-300 italic">No departures</p>}
                </div>
            </div>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
             <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2"><TrendingUp size={14}/> Weekly Arrivals</h3>
             <div className="flex items-end justify-between h-32 gap-3">
                {[0,1,2,3,4,5,6].map(d => {
                  const date = addDays(now, d);
                  const arrivals = bookings.filter(b => isSameDay(parseISO(b.startDate), date)).length;
                  return (
                    <div key={d} className="flex-grow flex flex-col items-center group">
                       <span className="text-[10px] font-bold text-indigo-600 mb-1">{arrivals}</span>
                       <div className="w-full bg-slate-50 rounded-full h-24 relative overflow-hidden">
                          <div className="absolute bottom-0 w-full bg-indigo-500 rounded-full transition-all duration-700" style={{ height: `${(arrivals/5)*100}%`, minHeight: arrivals > 0 ? '10%' : '0' }}></div>
                       </div>
                       <span className="text-[8px] font-bold text-slate-400 mt-2 uppercase">{format(date, 'EEE')}</span>
                    </div>
                  )
                })}
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderInventory = () => {
    const now = new Date();
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-bottom-4">
        {slots.map(slot => {
          const currentBook = bookings.find(b => b.parkingSlotId === slot.id && isWithinInterval(now, { start: parseISO(b.startDate), end: parseISO(b.endDate) }));
          const upcomingToday = !currentBook && bookings.find(b => b.parkingSlotId === slot.id && isSameDay(parseISO(b.startDate), now) && isAfter(parseISO(b.startDate), now));
          const nextFutureBook = !currentBook && !upcomingToday && bookings
            .filter(b => b.parkingSlotId === slot.id && isAfter(parseISO(b.startDate), now))
            .sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime())[0];
          
          let statusColor = "border-emerald-100 bg-emerald-50/20";
          let badgeColor = "bg-emerald-500";
          let statusText = "Available";
          let timeInfo = nextFutureBook ? `Free until: ${format(parseISO(nextFutureBook.startDate), 'MMM dd, HH:mm')}` : "Available Forever";
          
          if (currentBook) {
            statusColor = "border-rose-200 bg-rose-50/30";
            badgeColor = "bg-rose-500";
            statusText = "Occupied";
            timeInfo = `Until: ${format(parseISO(currentBook.endDate), 'MMM dd, HH:mm')}`;
          } else if (upcomingToday) {
            statusColor = "border-amber-200 bg-amber-50/30";
            badgeColor = "bg-amber-500";
            statusText = "Arriving Today";
            timeInfo = `Starts: ${format(parseISO(upcomingToday.startDate), 'HH:mm')}`;
          }

          const activeBooking = currentBook || upcomingToday;
          const aptName = activeBooking ? apartments.find(a => a.id === activeBooking.apartmentId)?.name.replace(/\D/g, '') : '';
          const ownerAptName = apartments.find(a => a.id === slot.ownerApartmentId)?.name.replace(/\D/g, '') || 'N/A';

          return (
            <div key={slot.id} className={`p-6 rounded-2xl border-2 flex flex-col justify-between h-[220px] transition-all ${statusColor}`}>
              <div>
                <div className="flex justify-between items-start">
                  <h4 className="font-black text-slate-800 text-lg">{slot.name}</h4>
                  <span className={`text-[8px] font-black px-2 py-1 rounded uppercase text-white ${badgeColor}`}>
                    {statusText}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 mt-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Floor {slot.floor || 'N/A'}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Owner: Apt {ownerAptName}</p>
                </div>
              </div>
              
              <div className="mt-2">
                {activeBooking && (
                  <div className="mb-2 p-2 bg-white/60 rounded-xl border border-white/50 shadow-sm">
                    <span className="inline-block bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded mb-1.5 uppercase tracking-wide">
                      Currently
                    </span>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Apt {aptName}</p>
                    <p className="text-[11px] font-bold text-slate-500 truncate">{activeBooking.guestName}</p>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                  <Clock size={12} />
                  <span className="text-[10px] font-bold italic">{timeInfo}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ... כאן מופיע ה-JSX הסופי (Splash ו-Layout)
  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center">
        <div className="w-48 h-48 md:w-64 md:h-64 overflow-hidden rounded-full flex items-center justify-center bg-slate-50 shadow-xl border-4 border-white">
          <video src={VIDEO_URL} autoPlay loop muted playsInline className="w-full h-full object-cover" />
        </div>
        <div className="mt-12 flex flex-col items-center gap-3">
           <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 animate-pulse">Syncing Database</p>
           <div className="w-16 h-[2px] bg-indigo-500/10 rounded-full overflow-hidden">
              <div className="w-full h-full bg-indigo-600 animate-loading-bar"></div>
           </div>
        </div>
        <style>{`
          @keyframes loading-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
          .animate-loading-bar { animation: loading-bar 2s infinite ease-in-out; }
        `}</style>
      </div>
    );
  }

  return (
    <Layout activePage={activePage} onNavigate={(p) => setActivePage(p)}>
      {activePage === 'dashboard' ? renderDashboard() : activePage === 'inventory' ? renderInventory() : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
              <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600"><Car size={24} /></div>
              <div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-tight mb-1">Total Free Spots</p>
                <h3 className="text-3xl font-bold text-slate-800">
                  {slots.length - currentOccupiedCount} <span className="text-slate-300 text-xl font-normal">/ {slots.length}</span>
                </h3>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4 md:col-span-2">
              <div className="bg-amber-50 p-3 rounded-xl text-amber-600"><Sparkles size={24} /></div>
              <div className="flex-grow">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-tight mb-1">Live Management</p>
                <p className="text-slate-600 leading-relaxed italic text-sm">Real-time sync enabled. Data is current.</p>
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
                      <div className="space-y-1">
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-4 py-2 border border-slate-100 rounded-t-xl bg-slate-50 text-sm font-medium outline-none" />
                        </div>
                        <select value={selectedApt} onChange={(e) => setSelectedApt(e.target.value)} className="w-full px-4 py-3 border border-slate-100 rounded-b-xl bg-white text-sm outline-none">
                          <option value="">Select Apartment</option>
                          {apartments.filter(a => !searchTerm || a.name.includes(searchTerm)).map(apt => (
                            <option key={apt.id} value={apt.id}>{apt.name} {apt.hasParking ? '✓' : ''}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Guest Name</label>
                      <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full px-4 py-3 border border-slate-100 rounded-xl bg-slate-50 outline-none text-sm" />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Check-in *</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3 border border-slate-100 rounded-xl bg-slate-50 text-xs" />
                          <input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} className="w-full p-3 border border-slate-100 rounded-xl bg-slate-50 text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Check-out *</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-3 border border-slate-100 rounded-xl bg-slate-50 text-xs" />
                          <input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className="w-full p-3 border border-slate-100 rounded-xl bg-slate-50 text-xs" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 min-h-[400px]">
                  <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Search size={18} className="text-indigo-600" /> Available Slots</h2>
                  {!(selectedApt && endDate) ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-300">
                      <div className="bg-slate-50 p-6 rounded-full mb-4"><Calendar size={32} className="opacity-30" /></div>
                      <p className="text-sm font-medium">Complete form to see options</p>
                    </div>
                  ) : (suggestions.length > 0) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {suggestions.map(sug => {
                         const ownerAptName = apartments.find(a => a.id === slots.find(s => s.id === sug.slotId)?.ownerApartmentId)?.name.replace(/\D/g, '') || 'N/A';
                         return (
                          <div key={sug.slotId} className={`p-6 rounded-2xl border flex flex-col justify-between transition-all ${sug.isPriority ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                            <div>
                              <h4 className="font-bold text-slate-800 flex items-center gap-2">{sug.slotName} {sug.isPriority && <span className="bg-indigo-600 text-white text-[8px] px-1.5 py-0.5 rounded uppercase font-bold">Owner</span>}</h4>
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Floor {sug.floor || 'N/A'}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Owner: Apt {ownerAptName}</p>
                            </div>
                            <button onClick={() => handleAddBooking(sug.slotId)} className="mt-6 w-full py-3 bg-slate-800 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-colors">Book Now</button>
                          </div>
                         );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-rose-500 font-bold">
                      <AlertCircle size={32} className="mb-4" />
                      <p>No spots available for these dates.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b">
                  <tr><th className="px-8 py-4">Unit</th><th className="px-8 py-4">Guest</th><th className="px-8 py-4">Slot</th><th className="px-8 py-4">Dates</th><th className="px-8 py-4 text-center">Delete</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...bookings].reverse().map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="px-8 py-5 font-bold text-slate-700">{apartments.find(a=>a.id===b.apartmentId)?.name}</td>
                      <td className="px-8 py-5 text-slate-500">{b.guestName}</td>
                      <td className="px-8 py-5"><span className="bg-indigo-50 text-indigo-700 text-[10px] px-3 py-1 rounded-lg font-bold border border-indigo-100">{slots.find(s=>s.id===b.parkingSlotId)?.name}</span></td>
                      <td className="px-8 py-5 text-slate-400 font-mono text-[10px]">{format(parseISO(b.startDate), 'MMM dd, HH:mm')} - {format(parseISO(b.endDate), 'MMM dd, HH:mm')}</td>
                      <td className="px-8 py-5 text-center"><button onClick={() => { if(confirm('Delete?')) removeBooking(b.id)}} className="px-4 py-2 text-rose-600 border border-rose-200 rounded-lg text-[10px] font-bold uppercase"> DELETE </button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default App;
