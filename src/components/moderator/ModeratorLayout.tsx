// src/components/moderator/ModeratorLayout.tsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ModeratorSidebar from './ModeratorSidebar';
import ModeratorHeader from './ModeratorHeader';

const ModeratorLayout = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#F8F5EE] flex flex-col lg:flex-row antialiased selection:bg-[#8B3A2B]/10 selection:text-[#8B3A2B]">
            {/* Sidebar Component */}
            <ModeratorSidebar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
            />

            {/* Main Section */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen">
                {/* Floating Top Header Bar */}
                <ModeratorHeader setIsMobileOpen={setIsMobileOpen} />

                {/* Main Page Content Area */}
                <main className="flex-1 p-4 sm:p-6 lg:p-6 pt-2 sm:pt-2 lg:pt-2 overflow-y-auto">
                    <div className="w-full h-full max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ModeratorLayout;