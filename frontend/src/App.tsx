import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Screening from "@/pages/Screening";
import Results from "@/pages/Results";
import About from "@/pages/About";
import Demo from "@/pages/Demo";

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1"
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/screening" element={<Screening />} />
          <Route path="/results" element={<Results />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-white focus:text-primary-800 focus:font-semibold focus:text-sm focus:shadow-lg focus:border focus:border-primary-200"
        >
          Lompat ke konten utama
        </a>
        <Navbar />
        <main id="main" className="flex-1">
          <AnimatedRoutes />
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
