import * as React from 'react';
import { Layout } from './components/Layout';
import { Booking, Suggestion, SplitSuggestion, Apartment, ParkingSlot } from './types';
import { getParkingSuggestions, getSplitParkingSuggestions } from './utils/parkingLogic';
import { format, isWithinInterval, addDays, isSameDay } from 'date-fns';
import { 
  Calendar, Car, Plus, AlertCircle, Sparkles, Search, ArrowRight, Clock, 
  TrendingUp, ArrowDownCircle, ArrowUpCircle
} from 'lucide-react';

const { useState, useEffect, useMemo, useCallback } = React;
const API_BASE = "https://sheetdb.io/api/v1/l5p4a56wupgs6";

const App: React.FC = () => {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<'book' | 'dashboard' | 'inventory'>('book');
  const [activeTab, setActiveTab] = useState<'book' | 'history'>('book');

  // Form State (נשאר בדיוק אותו דבר כמו שאתה אוהב)
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
    const fetchData = async () => {
      try {
        setLoading(true);
        const [aptRes, bookRes] = await Promise.all([
          fetch(`${API_BASE}?sheet=apartments`),
          fetch(`${API_BASE}?sheet=bookings`)
        ]);
        const rawApts = await aptRes.json();
        const rawBooks = await bookRes.json();
        setApartments(rawApts.map((item: any) => ({ id: `apt-${item.apt}`, name: `Apartment ${item.apt}`, hasParking: item.slot !== "N/A", parkingSlotId: item.slot !== "N/A" ? `ps-${item.apt}` : undefined })));
        setSlots(rawApts.filter((item: any) => item.slot !== "N/A").map((item: any) => ({ id: `ps-${item.apt}`, name: `Slot ${item.slot}`, floor: item.floor !== "N/A" ? item.floor : undefined, ownerApartmentId: `apt-${item.apt}` })));
        setBookings(Array.isArray(rawBooks) ? rawBooks : []);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  // לוגיקת בחירה אוטומטית לפי מספר (התוספת שביקשת קודם)
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
    const newBooking = { id: `book-${Date.now()}`, apartmentId: selectedApt, parkingSlotId: slotId, startDate: d ? d.start : fullStartISO, endDate: d ? d.end : fullEndISO, guestName: guestName || 'Guest' };
    await fetch(`${API_BASE}?sheet=bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: [newBooking] }) });
    setBookings(prev => [...prev, newBooking]);
    if (!d || d.end === fullEndISO) { setSelectedApt(''); setSearchTerm(''); setEndDate(''); setActiveTab('history'); }
  }, [selectedApt, fullStartISO, fullEndISO, guestName]);

  // --- דף דשבורד (Dashboard) עם מחוג ונרות ---
  const renderDashboard = () => {
    const now = new Date();
    const occupiedCount = bookings.filter(b => isWithinInterval(now, { start: new Date(b.startDate), end: new Date(b.endDate) })).length;
    const occupancyPercent = (occupiedCount / slots.length) * 100;
    
    const checkIns = bookings.filter(b => isSameDay(new Date(b.startDate), now)).map(b => apartments.find(a => a.id === b.apartmentId)?.name.replace(/\D/g, ''));
    const checkOuts = bookings.filter(b => isSameDay(new Date(b.endDate), now)).map(b => apartments.find(a => a.id === b.apartmentId)?.name.replace(/\D/g, ''));

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* מחוג תפוסה */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
             <p className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest text-center">Current Occupancy</p>
             <div className="relative w-48 h-24 overflow-hidden mb-2">
                <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[16px] border-slate-100"></div>
                <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[16px] border-indigo-500 transition-all duration-1000" 
                     style={{ clipPath: `inset(0 0 50% 0)`, transform: `rotate(${(occupancyPercent * 1.8) - 180}deg)` }}></div>
                <div className="absolute bottom-0 w-full text-center">
                   <span className="text-2xl font-black text-rose-500">{occupiedCount}</span>
                   <span className="text-xl font-bold text-slate-300 mx-1">/</span>
                   <span className="text-2xl font-black text-emerald-500">{slots.length}</span>
                </div>
             </div>
             <p className="text-[10px] font-bold text-slate-400 mt-2">{Math.round(occupancyPercent)}% Capacity</p>
          </div>

          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
               <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl"><ArrowDownCircle size={24}/></div>
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Arrivals Today</p>
                  <p className="text-lg font-bold text-slate-700">{checkIns.length > 0 ? checkIns.join(', ') : 'None'}</p>
               </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
               <div className="bg-rose-50 text-rose-600 p-3 rounded-2xl"><ArrowUpCircle size={24}/></div>
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Departures Today</p>
                  <p className="text-lg font-bold text-slate-700">{checkOuts.length > 0 ? checkOuts.join(', ') : 'None'}</p>
               </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
             <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2"><TrendingUp size={14}/> Weekly Arrivals</h3>
             <div className="flex items-end justify-between h-32 gap-3">
                {[0,1,2,3,4,5,6].map(d => {
                  const date = addDays(now, d);
                  const arrivals = bookings.filter(b => isSameDay(new Date(b.startDate), date)).length;
                  return (
                    <div key={d} className="flex-grow flex flex-col items-center group">
                       <span className="text-[10px] font-bold text-indigo-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{arrivals}</span>
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

  // --- דף מלאי (Inventory) - כרטיסיות כמו בבוקינג ---
  const renderInventory = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-bottom-4">
      {slots.map(slot => {
        const occ = bookings.find(b => b.parkingSlotId === slot.id && isWithinInterval(new Date(), { start: new Date(b.startDate), end: new Date(b.endDate) }));
        return (
          <div key={slot.id} className={`p-6 rounded-2xl border-2 flex flex-col justify-between h-40 transition-all ${occ ? 'border-rose-100 bg-rose-50/20' : 'border-emerald-100 bg-emerald-50/20'}`}>
            <div>
              <div className="flex justify-between items-start">
                <h4 className="font-black text-slate-800 text-lg">{slot.name}</h4>
                <span className={`text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter ${occ ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                  {occ ? 'Occupied' : 'Available'}
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Floor {slot.floor || 'N/A'}</p>
            </div>
            {occ && (
              <div className="flex items-center gap-2 text-rose-700">
                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></div>
                <p className="text-xs font-bold truncate">Guest: {occ.guestName}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <Layout activePage={activePage} onNavigate={(p) => setActivePage(p)}>
      {activePage === 'dashboard' ? renderDashboard() : activePage === 'inventory' ? renderInventory() : (
        <>
          <div className="flex gap-4 mb-8 border-b border-slate-200">
            <button onClick={() => setActiveTab('book')} className={`pb-4 px-6 font-bold text-xs uppercase tracking-widest ${activeTab === 'book' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-400'}`}>Book Parking</button>
            <button onClick={() => setActiveTab('history')} className={`pb-4 px-6 font-bold text-xs uppercase tracking-widest ${activeTab === 'history' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-400'}`}>Log ({bookings.length})</button>
          </div>

          {activeTab === 'book' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Plus size={18} className="text-indigo-600" /> Reservation</h2>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Apartment Number *</label>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="e.g. 12" className="w-full pl-9 pr-4 py-3 border border-slate-100 rounded-xl bg-slate-50 text-sm font-bold text-indigo-600 outline-none focus:border-indigo-500" />
                      </div>
                      {selectedApt && <p className="mt-2 text-[10px] font-bold text-emerald-600 tracking-wide uppercase italic">✓ {apartments.find(a=>a.id===selectedApt)?.name} Selected</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Guest Name</label>
                      <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full px-4 py-3 border border-slate-100 rounded-xl bg-slate-50 outline-none text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">In</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 border border-slate-100 rounded-lg bg-slate-50 text-[10px]" />
                        <input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} className="w-full p-2 border border-slate-100 rounded-lg bg-slate-50 text-[10px]" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Out</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 border border-slate-100 rounded-lg bg-slate-50 text-[10px]" />
                        <input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className="w-full p-2 border border-slate-100 rounded-lg bg-slate-50 text-[10px]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 min-h-[450px]">
                  <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Search size={18} className="text-indigo-600" /> Available Slots</h2>
                  {!(selectedApt && endDate) ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-300">
                      <div className="bg-slate-50 p-6 rounded-full mb-4"><Calendar size={32} className="opacity-10" /></div>
                      <p className="text-sm font-medium italic uppercase tracking-widest">Complete form to see options</p>
                    </div>
                  ) : (suggestions.length > 0 || splitSuggestions.length > 0) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {suggestions.map(sug => (
                        <div key={sug.slotId} className={`p-6 rounded-2xl border-2 flex flex-col justify-between transition-all ${sug.isPriority ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-100 hover:border-indigo-200'}`}>
                          <div>
                            <h4 className="font-bold text-slate-800 flex items-center gap-2">{sug.slotName} {sug.isPriority && <span className="bg-indigo-600 text-[8px] text-white px-1.5 py-0.5 rounded font-bold uppercase">Owner</span>}</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Floor {sug.floor || 'N/A'}</p>
                          </div>
                          <button onClick={() => handleAddBooking(sug.slotId)} className="mt-6 w-full py-3 bg-slate-800 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-colors">Book Now</button>
                        </div>
                      ))}
                      {splitSuggestions.map((split, i) => (
                        <div key={i} className="p-6 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 flex flex-col gap-4 shadow-sm">
                          <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase">
                            <span>{split.firstSlot.slotName}</span> <ArrowRight size={12}/> <span>{split.secondSlot.slotName}</span>
                          </div>
                          <button onClick={() => { handleAddBooking(split.firstSlot.slotId, { start: fullStartISO, end: `${split.splitDate}T12:00` }); handleAddBooking(split.secondSlot.slotId, { start: `${split.splitDate}T12:00`, end: fullEndISO }); }} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-colors">Book Split Stay</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-rose-500">
                      <AlertCircle size={32} className="mb-4" />
                      <p className="font-bold uppercase text-[10px]">No spots available for these dates.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left font-bold">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                  <tr><th className="px-8 py-4">Unit</th><th className="px-8 py-4">Guest</th><th className="px-8 py-4">Slot</th><th className="px-8 py-4">Dates</th><th className="px-8 py-4 text-center">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[12px]">
                  {bookings.length === 0 ? <tr><td colSpan={5} className="py-20 text-center text-slate-300 italic font-medium">Empty log.</td></tr> : 
                   [...bookings].reverse().map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5 text-slate-700">{apartments.find(a=>a.id===b.apartmentId)?.name}</td>
                      <td className="px-8 py-5 text-slate-500">{b.guestName}</td>
                      <td className="px-8 py-5"><span className="bg-indigo-50 text-indigo-700 text-[10px] px-3 py-1 rounded-lg border border-indigo-100">{slots.find(s=>s.id===b.parkingSlotId)?.name}</span></td>
                      <td className="px-8 py-5 text-slate-400 font-mono text-[10px]">{format(new Date(b.startDate), 'MMM dd')} - {format(new Date(b.endDate), 'MMM dd')}</td>
                      <td className="px-8 py-5 text-center"><button onClick={() => { if(confirm('Delete?')) fetch(`${API_BASE}/id/${b.id}?sheet=bookings`, {method:'DELETE'}).then(()=>setBookings(bookings.filter(x=>x.id!==b.id)))}} className="text-rose-500 font-bold text-[10px] uppercase">Delete</button></td>
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
