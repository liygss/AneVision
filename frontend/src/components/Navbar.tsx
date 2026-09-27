import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const navLinks = [
  { to: "/", label: "Beranda" },
  { to: "/demo", label: "Demo" },
  { to: "/screening", label: "Skrining" },
  { to: "/about", label: "Tentang" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <nav className={cn(
      "sticky top-0 z-50 transition-smooth border-b",
      scrolled
        ? "bg-white/88 backdrop-blur-xl border-navy-100/50 shadow-[0_1px_3px_rgba(16,42,67,0.06)]"
        : "bg-white/50 backdrop-blur-lg border-transparent"
    )}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/image/AneVision_logo.png"
              alt="Logo Anevision"
              className="w-9 h-9 object-cover rounded-xl shadow-md shadow-primary-500/15 group-hover:shadow-lg group-hover:shadow-primary-500/25 transition-smooth group-hover:scale-105"
            />
            <span className="text-xl font-extrabold text-navy-900 tracking-tight">
              Ane<span className="text-gradient">vision</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "relative px-4 py-2 rounded-lg text-sm font-medium transition-base",
                  location.pathname === link.to
                    ? "text-primary-700"
                    : "text-navy-600 hover:text-navy-900 hover:bg-navy-50/70"
                )}
              >
                {link.label}
                {location.pathname === link.to && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            ))}
            <Link
              to="/screening"
              className="ml-3 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-semibold hover:from-primary-700 hover:to-primary-800 transition-smooth shadow-md shadow-primary-600/15 hover:shadow-lg hover:shadow-primary-600/25 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Mulai Skrining
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-navy-600 hover:bg-navy-50 transition-base focus-ring"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden border-t border-navy-100/40 bg-white/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                >
                  <Link
                    to={link.to}
                    className={cn(
                      "block px-4 py-3 rounded-xl text-sm font-medium transition-base",
                      location.pathname === link.to
                        ? "bg-primary-50 text-primary-700"
                        : "text-navy-700 hover:bg-navy-50"
                    )}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: navLinks.length * 0.05 }}
              >
                <Link
                  to="/screening"
                  className="block px-4 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-semibold text-center mt-2 shadow-md shadow-primary-600/20"
                >
                  Mulai Skrining
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
