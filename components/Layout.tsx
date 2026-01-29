import * as React from 'react';
import { LayoutDashboard, Package, CalendarDays } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activePage: 'book' | 'dashboard' | 'inventory';
  onNavigate: (page: 'book' | 'dashboard' | 'inventory') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('book')}>
            <div className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg">sw</div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              ParkingPro <span className="text-indigo-600">sw</span>
            </h1>
          </div>
          <nav className="flex gap-4 md:gap-8 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
            <button onClick={() => onNavigate('dashboard')} className={`flex items-center gap-2 transition-colors ${activePage === 'dashboard' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : 'hover:text-indigo-400'}`}>
              <LayoutDashboard size={14} /> Dashboard
            </button>
            <button onClick={() => onNavigate('inventory')} className={`flex items-center gap-2 transition-colors ${activePage === 'inventory' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : 'hover:text-indigo-400'}`}>
              <Package size={14} /> Inventory
            </button>
            <button onClick={() => onNavigate('book')} className={`flex items-center gap-2 transition-colors ${activePage === 'book' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : 'hover:text-indigo-400'}`}>
              <CalendarDays size={14} /> Booking
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
      <footer className="bg-white border-t border-slate-200 p-6 text-center text-slate-400 text-[10px] uppercase font-bold tracking-widest">
        <p>&copy; {new Date().getFullYear()} ParkingPro sw Management</p>
      </footer>
    </div>
  );
};
