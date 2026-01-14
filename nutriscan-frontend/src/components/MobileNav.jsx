import { Link, useLocation } from "react-router-dom";

export default function MobileNav() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Don't show mobile nav on login/register pages
  if (location.pathname === "/login" || location.pathname === "/register") {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50">
      <div className="flex items-center justify-around px-2 py-2">
        <Link
          to="/today"
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
            isActive("/today")
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-medium">Today</span>
        </Link>

        <Link
          to="/scan"
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
            isActive("/scan")
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <span className="text-xs font-medium">Scan</span>
        </Link>

        <Link
          to="/meals"
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
            isActive("/meals")
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="text-xs font-medium">Meals</span>
        </Link>

        <Link
          to="/summary"
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
            isActive("/summary")
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-xs font-medium">Summary</span>
        </Link>

        <Link
          to="/profile"
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
            isActive("/profile")
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-xs font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  );
}