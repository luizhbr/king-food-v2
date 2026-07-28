"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const MENU_URL = "https://kingfood.fe-v2.ola.click/products";
const WA_URL = "https://wa.me/12673107535";
const GROUP_URL = "https://chat.whatsapp.com/LtoVNE9AJ2u2nlrlruTxhd";
const MAPS_URL = "https://maps.app.goo.gl/GR2gpipSMqZdH9Xy5";
const INSTAGRAM_URL = "https://instagram.com/king.food_delivery";
const LOGO = "/logo-kingfood.png.png";
const INSTALL_DISMISS_KEY = "kf_install_dismissed";

type Tab = "home" | "menu" | "hours";

const SIDE_LINKS: {
  label: string;
  icon: string;
  action?: "hours";
  href?: string;
}[] = [
  { label: "Entrar no grupo", icon: "💬", href: GROUP_URL },
  { label: "Instagram", icon: "📸", href: INSTAGRAM_URL },
  { label: "Horários e entrega", icon: "🕐", action: "hours" },
  { label: "Fale conosco", icon: "📱", href: WA_URL },
];

const HOURS = [
  { day: 0, label: "Domingo", hours: "6:00 PM – 10:30 PM" },
  { day: 1, label: "Segunda-feira", hours: "7:00 PM – 10:00 PM" },
  { day: 2, label: "Terça-feira", hours: "7:00 PM – 10:30 PM" },
  { day: 3, label: "Quarta-feira", hours: "7:00 PM – 10:00 PM" },
  { day: 4, label: "Quinta-feira", hours: "7:00 PM – 10:00 PM" },
  { day: 5, label: "Sexta-feira", hours: "Fechado" },
  { day: 6, label: "Sábado", hours: "9:00 PM – 11:00 PM" },
];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    __kfDeferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function InstallModal({
  open,
  onInstall,
  onDismiss,
}: {
  open: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onDismiss} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-black/90 backdrop-blur-xl p-6 shadow-2xl text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFD100]">
          <img src={LOGO} alt="" className="h-11 w-11 object-contain" />
        </div>
        <h2 id="install-title" className="text-lg font-extrabold text-white">
          Instale nosso app
        </h2>
        <p className="mt-2 text-sm text-white/60 leading-relaxed">
          Peça mais rápido direto da tela inicial do seu celular.
        </p>
        <button
          type="button"
          onClick={onInstall}
          className="mt-5 w-full rounded-2xl bg-[#FFD100] py-3.5 text-sm font-bold text-black shadow-lg shadow-[#FFD100]/20 active:scale-[0.98] transition"
        >
          Instalar agora
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 w-full py-2.5 text-sm font-medium text-white/40 hover:text-white/70 transition"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [showLogo, setShowLogo] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [iframeReady, setIframeReady] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [installPlatform, setInstallPlatform] = useState<"android" | "ios" | "desktop">("android");
  const [scrolled, setScrolled] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const loadingDone = useRef(false);
  const mainRef = useRef<HTMLElement>(null);
  const ctaPrimaryRef = useRef<HTMLButtonElement>(null);
  const ctaSecondaryRef = useRef<HTMLAnchorElement>(null);
  const today = new Date().getDay();

  const tryShowModal = useCallback(() => {
    const dismissed = sessionStorage.getItem(INSTALL_DISMISS_KEY) === "1";
    if (dismissed) return;
    if (!deferredPrompt.current && !window.__kfDeferredPrompt) return;
    setCanInstall(true);
    if (loadingDone.current) setShowInstallModal(true);
  }, []);

  useEffect(() => {
    const logoTimer = setTimeout(() => setShowLogo(true), 100);
    const safetyTimer = setTimeout(() => {
      loadingDone.current = true;
      setLoading(false);
      const dismissed = sessionStorage.getItem(INSTALL_DISMISS_KEY) === "1";
      if (!dismissed && (deferredPrompt.current || window.__kfDeferredPrompt)) {
        setCanInstall(true);
        setShowInstallModal(true);
      }
    }, 1800);

    // Fallback: show custom install banner after 3s if no beforeinstallprompt
    const bannerTimer = setTimeout(() => {
      const dismissed = sessionStorage.getItem(INSTALL_DISMISS_KEY) === "1";
      if (dismissed) return;
      if (deferredPrompt.current || window.__kfDeferredPrompt) return; // native prompt will handle it

      // Detect platform
      const ua = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
      const isAndroid = /Android/.test(ua);
      const isDesktop = !isIOS && !isAndroid;
      setInstallPlatform(isIOS ? "ios" : isAndroid ? "android" : "desktop");
      setShowInstallBanner(true);
    }, 3000);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(safetyTimer);
      clearTimeout(bannerTimer);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen || showInstallModal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen, showInstallModal]);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 80);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [tab]);

  // Alive CTA buttons: random autonomous movement + magnetic mouse effect
  useEffect(() => {
    if (tab !== "home") return;

    const buttons = [ctaPrimaryRef.current, ctaSecondaryRef.current].filter(Boolean) as HTMLElement[];
    if (buttons.length === 0) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const isTouch = window.matchMedia("(pointer: coarse)").matches;

    const states = buttons.map(() => ({
      cx: 0, cy: 0, cs: 1, cr: 0,
      tx: 0, ty: 0, ts: 1, tr: 0,
      nextChange: 0,
      hovering: false,
      mx: 0, my: 0,
    }));

    const mouseHandlers = buttons.map((btn, i) => {
      const onMove = (e: MouseEvent) => {
        states[i].hovering = true;
        const rect = btn.getBoundingClientRect();
        states[i].mx = e.clientX - rect.left - rect.width / 2;
        states[i].my = e.clientY - rect.top - rect.height / 2;
      };
      const onLeave = () => { states[i].hovering = false; };
      if (!isTouch) {
        btn.addEventListener("mousemove", onMove);
        btn.addEventListener("mouseleave", onLeave);
      }
      return { onMove, onLeave };
    });

    let rafId: number;
    const animate = (time: number) => {
      buttons.forEach((btn, i) => {
        const s = states[i];

        if (s.hovering && !isTouch) {
          // Magnetic: follow mouse
          s.tx = s.mx * 0.15;
          s.ty = s.my * 0.2;
          s.ts = 1.05;
          s.tr = s.mx * 0.02;
        } else {
          // Random autonomous movement
          if (time > s.nextChange) {
            s.tx = (Math.random() - 0.5) * 10;
            s.ty = (Math.random() - 0.5) * 8;
            s.ts = 1 + Math.random() * 0.03;
            s.tr = (Math.random() - 0.5) * 2;
            s.nextChange = time + 1500 + Math.random() * 2000;
          }
        }

        // Smooth interpolation
        s.cx += (s.tx - s.cx) * 0.06;
        s.cy += (s.ty - s.cy) * 0.06;
        s.cs += (s.ts - s.cs) * 0.06;
        s.cr += (s.tr - s.cr) * 0.06;

        btn.style.transform = `translate(${s.cx}px, ${s.cy}px) scale(${s.cs}) rotate(${s.cr}deg)`;
      });
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      if (!isTouch) {
        mouseHandlers.forEach(({ onMove, onLeave }, i) => {
          buttons[i].removeEventListener("mousemove", onMove);
          buttons[i].removeEventListener("mouseleave", onLeave);
        });
      }
    };
  }, [tab]);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (isStandalone) {
      setCanInstall(false);
      setShowInstallModal(false);
      return;
    }

    const adoptPrompt = (evt: BeforeInstallPromptEvent | null | undefined) => {
      if (!evt) return;
      try { evt.preventDefault(); } catch {}
      deferredPrompt.current = evt;
      window.__kfDeferredPrompt = evt;
      setCanInstall(true);
      tryShowModal();
    };

    adoptPrompt(window.__kfDeferredPrompt ?? null);

    const onKfBip = () => adoptPrompt(window.__kfDeferredPrompt ?? null);
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      adoptPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      window.__kfDeferredPrompt = null;
      deferredPrompt.current = null;
      setCanInstall(false);
      setShowInstallModal(false);
    };

    window.addEventListener("kf-beforeinstallprompt", onKfBip);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then((reg) => { reg.update().catch(() => {}); })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener("kf-beforeinstallprompt", onKfBip);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [tryShowModal]);

  const handleInstall = async () => {
    const promptEvent = deferredPrompt.current || (window.__kfDeferredPrompt as BeforeInstallPromptEvent | null);
    if (!promptEvent) { setShowInstallModal(false); return; }
    setShowInstallModal(false);
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === "accepted") {
        deferredPrompt.current = null;
        window.__kfDeferredPrompt = null;
        setCanInstall(false);
      }
    } catch {}
  };

  const dismissInstallModal = () => {
    sessionStorage.setItem(INSTALL_DISMISS_KEY, "1");
    setShowInstallModal(false);
  };

  const openMenu = () => {
    setDrawerOpen(false);
    setIframeReady(false);
    setTab("menu");
  };

  const goHome = () => {
    setTab("home");
    setIframeReady(false);
  };

  const headerSubtitle =
    tab === "menu" ? "Cardápio" : tab === "hours" ? "Horários" : "Açaí • Delivery";

  if (loading) {
    return (
      <>
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FFD100]">
          <div className={`flex flex-col items-center transition-all duration-700 ease-out ${showLogo ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}>
            <img src={LOGO} alt="King Food" className="w-44 h-44 object-contain drop-shadow-md" />
          </div>
          <div className={`mt-8 transition-opacity duration-500 delay-300 ${showLogo ? "opacity-100" : "opacity-0"}`}>
            <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
        <InstallModal open={showInstallModal} onInstall={handleInstall} onDismiss={dismissInstallModal} />
      </>
    );
  }

  return (
    <div
      className="flex flex-col h-screen overflow-hidden relative"
      style={{
        background: `linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.15) 100%), url('/bg-acai.jpg') center/cover no-repeat`,
      }}
    >
      {/* Header */}
      <header className={`shrink-0 z-40 text-white border-b transition-all duration-300 ${scrolled || tab !== "home" ? "bg-black/60 backdrop-blur-md border-white/10" : "bg-transparent border-transparent"}`}>
        <div className="flex items-center justify-between px-4 py-2 max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-3">
            {/* Hamburger - mobile only */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-xl hover:bg-white/10 transition active:scale-90"
              aria-label="Abrir menu"
            >
              <span className="block w-5 h-0.5 bg-white rounded" />
              <span className="block w-5 h-0.5 bg-white rounded" />
              <span className="block w-5 h-0.5 bg-white rounded" />
            </button>
            <button type="button" onClick={goHome} className={`flex items-center gap-2.5 active:scale-95 transition-all duration-300 ${scrolled || tab !== "home" ? "opacity-100" : "opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto"}`}>
              <img src={LOGO} alt="King Food" className="w-8 h-8 object-contain rounded-lg" />
              <div className="leading-tight text-left">
                <p className="font-bold text-sm tracking-tight">King Food</p>
                <p className="text-[10px] text-white/50">{headerSubtitle}</p>
              </div>
            </button>
          </div>

          {/* Inline nav - desktop only */}
          <nav className="hidden md:flex items-center gap-1">
            <button type="button" onClick={goHome} className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${tab === "home" ? "text-[#FFD100]" : "text-white/60 hover:text-white hover:bg-white/10"}`}>Início</button>
            <button type="button" onClick={openMenu} className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${tab === "menu" ? "text-[#FFD100]" : "text-white/60 hover:text-white hover:bg-white/10"}`}>Cardápio</button>
            <button type="button" onClick={() => setTab("hours")} className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${tab === "hours" ? "text-[#FFD100]" : "text-white/60 hover:text-white hover:bg-white/10"}`}>Horários</button>
            <a href={GROUP_URL} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition">Grupo</a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition">Instagram</a>
            <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="ml-1 px-4 py-2 rounded-lg text-sm font-bold bg-[#25D366] text-white hover:bg-[#25D366]/90 transition">WhatsApp</a>
          </nav>

          {tab !== "home" && (
            <button
              type="button"
              onClick={goHome}
              className="md:hidden text-xs font-semibold text-white/70 px-3 py-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition"
            >
              ← Início
            </button>
          )}
        </div>
      </header>

      {/* Drawer overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 ${drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Drawer */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-[80%] max-w-xs bg-black border-r border-white/10 shadow-2xl transition-transform duration-300 ease-out ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-4 py-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="King Food" className="w-10 h-10 object-contain rounded-lg" />
            <div>
              <p className="font-bold text-white">King Food</p>
              <p className="text-xs text-white/40">Menu</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition active:scale-90"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <nav className="py-2">
          {SIDE_LINKS.map((link) =>
            link.action === "hours" ? (
              <button
                key={link.label}
                type="button"
                onClick={() => { setDrawerOpen(false); setTab("hours"); }}
                className="w-full text-left px-5 py-4 text-sm font-medium text-white/80 hover:bg-[#FFD100] hover:text-black border-b border-white/5 transition active:bg-[#FFD100]/80"
              >
                <span className="mr-3">{link.icon}</span>
                {link.label}
              </button>
            ) : (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setDrawerOpen(false)}
                className="block w-full text-left px-5 py-4 text-sm font-medium text-white/80 hover:bg-[#FFD100] hover:text-black border-b border-white/5 transition active:bg-[#FFD100]/80"
              >
                <span className="mr-3">{link.icon}</span>
                {link.label}
              </a>
            )
          )}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <p className="text-xs text-white/30 text-center">Entrega em até 40 min • Columbus, OH</p>
        </div>
      </aside>

      {/* Menu tab */}
      {tab === "menu" ? (
        <div className="flex-1 relative min-h-0 bg-white max-w-5xl mx-auto w-full md:pb-0 pb-14">
          {!iframeReady && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black px-6">
              <div className="w-10 h-10 border-4 border-[#FFD100] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-white/60">Carregando cardápio...</p>
              <a href={MENU_URL} className="text-sm font-semibold text-[#FFD100] underline">
                Abrir em nova aba
              </a>
            </div>
          )}
          <iframe
            src={MENU_URL}
            className="absolute inset-0 w-full h-full border-0"
            title="Cardápio King Food"
            allow="payment"
            onLoad={() => setIframeReady(true)}
          />
        </div>
      ) : tab === "hours" ? (
        <main className="flex-1 overflow-y-auto px-4 py-5 max-w-2xl mx-auto w-full md:pb-6 pb-14">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-2xl" aria-hidden>🕐</span>
            <h2 className="text-lg font-extrabold text-white">Horários e entrega</h2>
          </div>
          <ul className="rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
            {HOURS.map((row) => {
              const isToday = row.day === today;
              const closed = row.hours === "Fechado";
              return (
                <li
                  key={row.day}
                  className={`flex items-center justify-between gap-3 px-4 py-3.5 ${isToday ? "bg-[#FFD100]/10" : "bg-transparent"}`}
                >
                  <span className={`text-sm ${isToday ? "font-bold text-[#FFD100]" : "font-medium text-white/80"}`}>
                    {row.label}{isToday ? " · hoje" : ""}
                  </span>
                  <span className={`text-sm tabular-nums ${isToday ? "font-bold text-[#FFD100]" : closed ? "text-white/30" : "text-white/60"}`}>
                    {row.hours}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-bold text-white">Entrega</p>
            <p className="text-sm text-white/60 mt-1">Em até 40 min • Columbus, OH</p>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex text-sm font-semibold text-[#FFD100]"
            >
              Ver no Google Maps →
            </a>
          </div>
        </main>
      ) : (
        /* Home tab */
        <main ref={mainRef} className="flex-1 overflow-y-auto md:pb-6 pb-14">
          <div className="max-w-sm md:max-w-4xl mx-auto flex flex-col md:flex-row md:items-center md:gap-12 text-center md:text-left px-5 pt-6 pb-4 md:pt-16">
            {/* Left: logo + title + CTA */}
            <div className="flex flex-col items-center md:items-start flex-1">
              {/* Logo */}
              <img src={LOGO} alt="King Food" className="w-20 h-20 md:w-32 md:h-32 object-contain mb-3 rounded-2xl" />

              {/* Title */}
              <h1 className="text-2xl md:text-4xl font-extrabold text-white mb-1 tracking-tight">King Food</h1>
              <p className="text-sm md:text-base text-white/50 mb-3">Açaí Premium • Columbus, OH</p>

              {/* Description */}
              <p className="text-sm md:text-base text-white/70 leading-relaxed mb-5 max-w-md">
                Açaí brasileiro feito com ingredientes premium. Delivery em Columbus.
              </p>

              {/* Primary CTA */}
              <button
                type="button"
                onClick={openMenu}
                ref={ctaPrimaryRef}
                className="w-full md:w-auto md:min-w-[220px] bg-[#FFD100] hover:bg-[#FFD100]/90 text-black font-bold py-3.5 rounded-2xl text-base shadow-lg shadow-[#FFD100]/20 active:scale-[0.98] transition will-change-transform"
              >
                Ver cardápio →
              </button>

              {/* Secondary CTA */}
              <a
                href={GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                ref={ctaSecondaryRef}
                className="w-full md:w-auto md:min-w-[220px] mt-2.5 border border-white/20 text-white font-bold py-3 rounded-2xl text-base text-center hover:bg-white/5 active:scale-[0.98] transition will-change-transform"
              >
                Entrar no grupo
              </a>

              {/* Install */}
              {canInstall && (
                <button
                  type="button"
                  onClick={() => setShowInstallModal(true)}
                  className="mt-2 text-sm font-medium text-white/40 hover:text-white/70 py-1.5 transition"
                >
                  + Instalar app
                </button>
              )}
            </div>

            {/* Right: info cards (desktop only) */}
            <div className="hidden md:flex flex-col gap-4 flex-1 mt-0">
              {/* Google rating */}
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 active:scale-[0.98] transition"
              >
                <div className="shrink-0 w-10 h-10 rounded-full border border-white/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-[#4285F4]">G</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Google</p>
                  <p className="text-sm text-[#FFD100]">★★★★★ 5.0</p>
                  <p className="text-xs text-white/40">Ver no Google Maps</p>
                </div>
              </a>

              {/* Contact cards */}
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-3.5 hover:bg-white/10 active:scale-[0.97] transition"
                >
                  <WhatsAppIcon className="w-5 h-5 text-[#25D366] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">WhatsApp</p>
                    <p className="text-[10px] text-white/40">Falar agora</p>
                  </div>
                </a>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-3.5 hover:bg-white/10 active:scale-[0.97] transition"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="url(#ig-grad)" strokeWidth="2">
                    <defs>
                      <linearGradient id="ig-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f09433" />
                        <stop offset="50%" stopColor="#e6683c" />
                        <stop offset="100%" stopColor="#dc2743" />
                      </linearGradient>
                    </defs>
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="url(#ig-grad)" stroke="none" />
                  </svg>
                  <div>
                    <p className="text-xs font-bold text-white">Instagram</p>
                    <p className="text-[10px] text-white/40">@king.food_delivery</p>
                  </div>
                </a>
              </div>

              {/* Hours summary */}
              <button
                type="button"
                onClick={() => setTab("hours")}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 active:scale-[0.98] transition text-left"
              >
                <span className="text-2xl" aria-hidden>🕐</span>
                <div>
                  <p className="text-sm font-bold text-white">Horários e entrega</p>
                  <p className="text-xs text-white/40">Em até 40 min • Columbus, OH</p>
                </div>
              </button>
            </div>
          </div>

          {/* Mobile-only info cards (below CTAs) */}
          <div className="md:hidden">
            {/* Google rating */}
            <div className="w-full mt-5 text-left px-5">
              <h2 className="text-sm font-extrabold text-white mb-2.5">Avaliações</h2>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 active:scale-[0.98] transition"
              >
                <div className="shrink-0 w-9 h-9 rounded-full border border-white/10 flex items-center justify-center">
                  <span className="text-base font-bold text-[#4285F4]">G</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Google</p>
                  <p className="text-sm text-[#FFD100]">★★★★★ 5.0</p>
                  <p className="text-xs text-white/40">Ver no Google Maps</p>
                </div>
              </a>
            </div>

            {/* Contact links */}
            <div className="w-full mt-4 text-left px-5">
              <h2 className="text-sm font-extrabold text-white mb-2.5">Contato</h2>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-3.5 hover:bg-white/10 active:scale-[0.97] transition"
                >
                  <WhatsAppIcon className="w-5 h-5 text-[#25D366] shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">WhatsApp</p>
                    <p className="text-[10px] text-white/40">Falar agora</p>
                  </div>
                </a>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-3.5 hover:bg-white/10 active:scale-[0.97] transition"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="url(#ig-grad-m)" strokeWidth="2">
                    <defs>
                      <linearGradient id="ig-grad-m" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f09433" />
                        <stop offset="50%" stopColor="#e6683c" />
                        <stop offset="100%" stopColor="#dc2743" />
                      </linearGradient>
                    </defs>
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="url(#ig-grad-m)" stroke="none" />
                  </svg>
                  <div>
                    <p className="text-xs font-bold text-white">Instagram</p>
                    <p className="text-[10px] text-white/40">@king.food_delivery</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </main>
      )}

      <InstallModal open={showInstallModal} onInstall={handleInstall} onDismiss={dismissInstallModal} />

      {/* Custom install banner (fallback for non-Chrome browsers) */}
      {showInstallBanner && !showInstallModal && (
        <div className="fixed bottom-0 left-0 right-0 z-[90] md:bottom-0 px-4 pb-16 md:pb-4">
          <div className="mx-auto max-w-sm rounded-2xl border border-white/10 bg-black/90 backdrop-blur-xl p-4 shadow-2xl flex items-center gap-3">
            <div className="shrink-0 w-11 h-11 rounded-xl bg-[#FFD100] flex items-center justify-center">
              <img src={LOGO} alt="" className="w-8 h-8 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Instale o King Food</p>
              <p className="text-xs text-white/50 leading-snug">
                {installPlatform === "ios"
                  ? "Toque em Compartilhar → Adicionar à Tela de Início"
                  : installPlatform === "android"
                  ? "Adicione à tela inicial para acesso rápido"
                  : "Instale como app no seu navegador"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (installPlatform === "android" && deferredPrompt.current) {
                  handleInstall();
                } else {
                  setShowInstallBanner(false);
                  sessionStorage.setItem(INSTALL_DISMISS_KEY, "1");
                }
              }}
              className="shrink-0 rounded-xl bg-[#FFD100] px-3 py-2 text-xs font-bold text-black active:scale-95 transition"
            >
              {installPlatform === "ios" ? "Ver" : "Instalar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowInstallBanner(false);
                sessionStorage.setItem(INSTALL_DISMISS_KEY, "1");
              }}
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 transition"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Floating WhatsApp - mobile only */}
      <a
        href={WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="md:hidden fixed z-[45] right-4 bottom-16 w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#25D366]/90 text-white shadow-lg shadow-[#25D366]/30 flex items-center justify-center active:scale-90 transition"
        aria-label="WhatsApp"
      >
        <WhatsAppIcon className="w-7 h-7" />
      </a>

      {/* Bottom nav - mobile only, fixed at bottom */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-xl border-t border-white/10 px-4 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-evenly max-w-md mx-auto">
          <button
            type="button"
            onClick={goHome}
            className={`flex flex-col items-center gap-0.5 min-w-[80px] py-1 rounded-lg transition active:scale-90 ${tab === "home" ? "text-[#FFD100]" : "text-white/40"}`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12l9-9 9 9" />
              <path d="M5 10v10h14V10" />
            </svg>
            <span className="text-[10px] font-semibold">Início</span>
          </button>
          <button
            type="button"
            onClick={openMenu}
            className={`flex flex-col items-center gap-0.5 min-w-[80px] py-1 rounded-lg transition active:scale-90 ${tab === "menu" ? "text-[#FFD100]" : "text-white/40"}`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <line x1="8" y1="8" x2="16" y2="8" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="8" y1="16" x2="13" y2="16" />
            </svg>
            <span className="text-[10px] font-semibold">Cardápio</span>
          </button>
        </div>
      </nav>
    </div>
  );
}