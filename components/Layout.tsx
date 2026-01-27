
import * as React from 'react';

/**
 * Fixed JSX errors by using * as React to correctly resolve JSX.IntrinsicElements namespace
 * in environments with strict type checking or non-interop imports.
 */
export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl shadow-indigo-100 shadow-lg">
              sw
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              ParkingPro <span className="text-indigo-600">sw</span>
            </h1>
          </div>
          <nav className="hidden md:flex gap-6 text-slate-500 font-medium text-sm uppercase tracking-wider">
            <span className="hover:text-indigo-600 transition-colors cursor-pointer">Dashboard</span>
            <span className="hover:text-indigo-600 transition-colors cursor-pointer">Inventory</span>
          </nav>
        </div>
      </header>
      <main className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <footer className="bg-white border-t border-slate-200 p-6 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} ParkingPro sw Management Systems. All rights reserved.</p>
      </footer>
    </div>
  );
};
