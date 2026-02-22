import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Page Not Found | CallSphere",
  description: "The page you are looking for does not exist or has been moved.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <Nav />
      <main
        id="main"
        className="relative flex min-h-[60vh] flex-col items-center justify-center px-6 text-center"
      >
        <h1 className="text-7xl font-bold text-slate-900">404</h1>
        <p className="mt-4 text-xl text-slate-600">
          This page doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Back to Home
          </Link>
          <Link
            href="/contact"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Contact Us
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
