import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-navy-900 text-navy-300 mt-auto relative overflow-hidden">
      {/* Subtle gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center justify-center gap-2.5 mb-4 sm:justify-start">
              <img
                src="/image/AneVision_logo.png"
                alt="Logo Anevision"
                className="w-9 h-9 object-cover rounded-xl bg-white/10"
              />
              <span className="text-lg font-extrabold text-white tracking-tight">
                Ane<span className="text-primary-400">vision</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-navy-400 max-w-xs">
              Skrining Awal Risiko Anemia melalui Analisis Citra Mata dan Kuku Berbasis Kecerdasan Buatan
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">
              Tautan Cepat
            </h4>
            <ul className="space-y-3">
              {[
                { label: "Beranda", href: "/" },
                { label: "Skrining", href: "/screening" },
                { label: "Tentang", href: "/about" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-navy-400 hover:text-primary-400 transition-base link-underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Disclaimer */}
          <div>
            <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">
              Penafian
            </h4>
            <p className="text-xs leading-relaxed text-navy-400">
              Anevision merupakan alat skrining awal berbasis AI dan bukan merupakan sistem diagnosis medis.
              Hasil harus dikonfirmasi melalui uji hemoglobin laboratorium dan evaluasi medis profesional.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-10 pt-8 border-t border-navy-800/80">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-navy-500 flex items-center gap-1">
              &copy; {new Date().getFullYear()} Tim Riset Anevision.
              <Heart className="w-3 h-3 text-red-400/60 inline" />
              Hak cipta dilindungi.
            </p>
            <p className="text-[11px] text-navy-600">
              Skrining Awal Risiko Anemia Berbasis AI
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
