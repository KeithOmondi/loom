import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import { ChevronRight, Home } from 'lucide-react';

const AdminLayout = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();

  // Generate dynamic breadcrumbs based on active URL segments
  const pathSegments = location.pathname.split('/').filter(Boolean);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col antialiased text-neutral-900">
      <div className="flex flex-1 min-h-screen">
        {/* Navigation Sidebar */}
        <AdminSidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <AdminHeader onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />

          {/* Breadcrumbs Bar */}
          <div className="bg-white border-b border-neutral-200/80 px-4 sm:px-8 py-2.5 flex items-center gap-2 text-xs text-neutral-500 overflow-x-auto">
            <Link to="/super-admin" className="hover:text-neutral-900 flex items-center gap-1 font-medium">
              <Home size={13} />
              <span>Admin</span>
            </Link>
            {pathSegments.slice(1).map((segment, idx) => {
              const url = `/${pathSegments.slice(0, idx + 2).join('/')}`;
              const isLast = idx === pathSegments.length - 2;
              const formattedLabel = segment.replace(/-/g, ' ');

              return (
                <React.Fragment key={url}>
                  <ChevronRight size={12} className="text-neutral-300 shrink-0" />
                  {isLast ? (
                    <span className="font-semibold text-neutral-900 capitalize truncate">
                      {formattedLabel}
                    </span>
                  ) : (
                    <Link to={url} className="hover:text-neutral-900 capitalize font-medium truncate">
                      {formattedLabel}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Page Route Outlet Container */}
          <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;