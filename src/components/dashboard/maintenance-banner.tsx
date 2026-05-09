// src/components/dashboard/maintenance-banner.tsx
export function MaintenanceBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 text-xs font-medium text-center py-1.5 px-4">
      🔧 Diamond Booking is currently in maintenance mode. Some features may be temporarily unavailable.
    </div>
  );
}
