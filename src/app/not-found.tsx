// src/app/not-found.tsx
import Link from "next/link";
import { Diamond } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
      <div className="w-14 h-14 rounded-2xl bg-[#1a1f36] flex items-center justify-center mb-6">
        <Diamond className="w-7 h-7 text-[#d4a843]" />
      </div>
      <h1 className="text-6xl font-black text-[#1a1f36] mb-2">404</h1>
      <p className="text-xl font-semibold text-gray-600 mb-2">Page not found</p>
      <p className="text-gray-400 text-sm mb-8 text-center max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link href="/" className="px-5 py-2.5 bg-[#1a1f36] text-white text-sm font-semibold rounded-xl hover:bg-[#1a1f36]/90 transition-colors">
          Go home
        </Link>
        <Link href="/login" className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors">
          Sign in
        </Link>
      </div>
    </div>
  );
}
