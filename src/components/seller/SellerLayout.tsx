// src/components/seller/SellerLayout.tsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SellerSidebar from './SellerSidebar';
import SellerHeader from './SellerHeader';

export const SellerLayout = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <div className="h-screen w-screen bg-[#F8F5EE] flex flex-col lg:flex-row antialiased selection:bg-[#8B3A2B]/10 selection:text-[#8B3A2B] overflow-hidden">
            {/* Sidebar Component */}
            <SellerSidebar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {/* Floating Top Header */}
                <SellerHeader setIsMobileOpen={setIsMobileOpen} />

                {/* Main Viewport Scroll Container */}
                <main className="flex-1 p-4 sm:p-6 pt-2 overflow-y-auto">
                    <div className="w-full max-w-7xl mx-auto pb-12">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default SellerLayout;