import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Activity, Cpu, ShieldCheck, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

export type LoadingState = 'BOOT' | 'REVEAL' | 'READY';

interface MetricCounterProps {
  target: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
  minWidth?: string;
}

/**
 * Jitter-Free Monospace Numeric Counter
 * SPEC 4: Locked min-width, font-mono, and tabular-nums eliminate layout shuddering.
 */
const MetricCounter: React.FC<MetricCounterProps> = ({
  target,
  suffix = '',
  decimals = 0,
  duration = 1.6,
  minWidth = '5.5rem',
}) => {
  const [val, setVal] = useState(0);
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const obj = { value: 0 };
    const tween = gsap.to(obj, {
      value: target,
      duration,
      ease: 'power3.out',
      onUpdate: () => {
        setVal(obj.value);
      },
    });

    return () => {
      tween.kill();
    };
  }, [target, duration]);

  return (
    <span
      ref={nodeRef}
      style={{ minWidth }}
      className="inline-block font-mono tabular-nums tracking-tight text-white font-bold"
    >
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
};

/**
 * SPEC 3: BootLogo Component
 * Strictly unmounted when loadingState transitions to 'REVEAL' to purge GPU memory buffers.
 */
const BootLogo: React.FC<{ onBootComplete: () => void }> = ({ onBootComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoTextRef = useRef<HTMLHeadingElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: onBootComplete,
      });

      tl.fromTo(
        logoTextRef.current,
        { opacity: 0, y: 30, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power4.out' }
      )
        .fromTo(
          progressBarRef.current,
          { scaleX: 0 },
          { scaleX: 1, duration: 1.2, ease: 'power2.inOut', transformOrigin: 'left center' },
          '-=0.3'
        )
        .to(containerRef.current, {
          opacity: 0,
          scale: 1.04,
          duration: 0.45,
          ease: 'power3.in',
        });
    }, containerRef);

    return () => ctx.revert();
  }, [onBootComplete]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center space-y-6 w-full max-w-md px-6 py-12"
      style={{ backfaceVisibility: 'hidden', transform: 'translate3d(0,0,0)' }}
    >
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-3 h-3 rounded-full bg-black animate-pulse" />
        <span className="font-mono text-xs uppercase tracking-widest text-[#737373]">
          System Boot Sequence
        </span>
      </div>

      <h1
        ref={logoTextRef}
        className="text-4xl md:text-5xl font-black tracking-[0.25em] text-[#0A0A0A] uppercase"
      >
        DATAFLOW
      </h1>

      {/* High-Precision Hardware Accelerated Boot Bar */}
      <div className="w-48 h-1 bg-black/10 rounded-full overflow-hidden">
        <div
          ref={progressBarRef}
          className="w-full h-full bg-[#0A0A0A] rounded-full"
        />
      </div>

      <p className="font-mono text-xs text-[#A3A3A3] tracking-wider uppercase">
        Initializing High-Speed I/O Bus...
      </p>
    </div>
  );
};

interface CardMetric {
  id: string;
  tag: string;
  icon: React.ReactNode;
  val: number;
  suffix: string;
  decimals?: number;
  sublabel: string;
  badge: string;
}

const METRICS_DATA: CardMetric[] = [
  {
    id: 'c1',
    tag: 'MODULE 01 // INGESTION',
    icon: <Activity className="w-4 h-4 text-[#38BDF8]" />,
    val: 842.0,
    suffix: ' MB/s',
    decimals: 1,
    sublabel: 'NVMe Asynchronous Stream',
    badge: 'LOSSLESS',
  },
  {
    id: 'c2',
    tag: 'MODULE 02 // BIOMETRICS',
    icon: <Cpu className="w-4 h-4 text-[#10E79D]" />,
    val: 100.0,
    suffix: '%',
    decimals: 0,
    sublabel: 'Multi-Camera Alignment',
    badge: 'ACTIVE',
  },
  {
    id: 'c3',
    tag: 'MODULE 03 // PIPELINE',
    icon: <Zap className="w-4 h-4 text-[#F59E0B]" />,
    val: 32,
    suffix: ' THREADS',
    decimals: 0,
    sublabel: 'Concurrent Worker Pool',
    badge: 'OPTIMAL',
  },
  {
    id: 'c4',
    tag: 'MODULE 04 // INTEGRITY',
    icon: <ShieldCheck className="w-4 h-4 text-[#818CF8]" />,
    val: 102,
    suffix: ' STREAMS',
    decimals: 0,
    sublabel: 'Multi-Sheet Report Fusion',
    badge: 'ZERO-ERR',
  },
];

/**
 * SPEC 5: Cascading Horizontal 3D Deck of Black Credit-Card Style Data Modules
 */
const DashboardStage: React.FC<{
  loadingState: LoadingState;
  onReady: () => void;
}> = ({ loadingState, onReady }) => {
  const deckRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const actionBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = cardsRef.current.filter(Boolean);

      // Hardware acceleration setup
      gsap.set(cards, {
        transformPerspective: 1000,
        backfaceVisibility: 'hidden',
        force3D: true,
      });

      const tl = gsap.timeline({
        onComplete: onReady,
      });

      // Cascading Fanout Deck Animation
      tl.fromTo(
        cards,
        {
          y: 220,
          opacity: 0,
          scale: 0.82,
          rotationZ: (i) => -15 + i * 10,
        },
        {
          y: (i) => Math.abs(i - 1.5) * 8, // slight arch curve
          opacity: 1,
          scale: 1,
          rotationZ: (i) => (i - 1.5) * 4.8, // -7.2deg, -2.4deg, +2.4deg, +7.2deg
          duration: 1.1,
          stagger: 0.12,
          ease: 'power3.out',
        }
      ).fromTo(
        actionBtnRef.current,
        { opacity: 0, y: 18, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.5)' },
        '-=0.4'
      );
    }, deckRef);

    return () => ctx.revert();
  }, [onReady]);

  return (
    <div
      ref={deckRef}
      className="w-full flex-1 flex flex-col justify-between items-center py-6 px-4 relative z-10"
    >
      {/* Dynamic Telemetry Status Chip */}
      <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-black/[0.04] border border-black/[0.08] backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-[#10E79D] animate-ping" />
        <span className="font-mono text-xs font-semibold text-[#404040] uppercase tracking-wider">
          {loadingState === 'READY' ? 'Pipeline Primed & Lossless' : 'Synthesizing Architecture...'}
        </span>
      </div>

      {/* CASCADING HORIZONTAL FANOUT DECK */}
      <div className="w-full max-w-5xl h-64 md:h-72 flex items-center justify-center relative perspective-[1200px] my-auto">
        {METRICS_DATA.map((item, idx) => (
          <div
            key={item.id}
            ref={(el) => { cardsRef.current[idx] = el; }}
            style={{
              transform: 'translate3d(0,0,0)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
            className="absolute w-64 md:w-72 h-40 md:h-44 rounded-2xl bg-[#0A0A0A] text-white p-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.55)] border border-white/[0.12] border-t-white/[0.25] flex flex-col justify-between transition-shadow hover:shadow-[0_30px_70px_-10px_rgba(0,0,0,0.7)] group cursor-pointer"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {item.icon}
                <span className="font-mono text-[10px] font-bold text-[#A3A3A3] tracking-wider">
                  {item.tag}
                </span>
              </div>
              <span className="font-mono text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-white/10 text-white/90 border border-white/15">
                {item.badge}
              </span>
            </div>

            {/* Jitter-Free Monospace Number Value */}
            <div className="my-1">
              <div className="text-2xl md:text-3xl font-extrabold flex items-baseline">
                <MetricCounter
                  target={item.val}
                  suffix={item.suffix}
                  decimals={item.decimals}
                  duration={1.2 + idx * 0.2}
                />
              </div>
              <p className="text-xs text-[#737373] font-medium mt-1">
                {item.sublabel}
              </p>
            </div>

            {/* Bottom Status Edge */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-[10px] font-mono text-[#A3A3A3]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-[#10E79D]" />
                Zero Variance
              </span>
              <span className="text-white/40 group-hover:text-white/80 transition-colors">
                CH 0{idx + 1}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Shimmer Launch Trigger Button */}
      <div className="w-full flex flex-col items-center space-y-3 pb-2">
        <button
          ref={actionBtnRef}
          onClick={() => {
            alert('Dataflow Studio Environment Initialized!');
          }}
          className="relative group overflow-hidden px-8 py-3.5 rounded-full bg-[#0A0A0A] text-white font-semibold text-xs md:text-sm tracking-wider uppercase shadow-[0_15px_35px_rgba(0,0,0,0.25)] border border-black hover:scale-105 active:scale-95 transition-all duration-200 flex items-center space-x-3"
        >
          {/* Shimmer light sweep */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          <span>Launch Studio Workspace</span>
          <ArrowRight className="w-4 h-4 text-[#38BDF8] group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="font-mono text-[10px] text-[#737373] tracking-widest uppercase">
          [ 32 NVMe Worker Threads Active • High-Throughput Matrix Ready ]
        </p>
      </div>
    </div>
  );
};

/**
 * MASTER COMPONENT: DataflowTransitionFix
 * Implements SPEC 1-5 with standard Tailwind flexbox constraints, rigid typography gaps,
 * conditional rendering memory purge, and hardware-accelerated 3D GSAP card fanout.
 */
export const DataflowTransitionFix: React.FC = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>('BOOT');

  // Trigger phase progression
  const handleBootComplete = () => {
    setLoadingState('REVEAL');
  };

  const handleStageReady = () => {
    setLoadingState('READY');
  };

  return (
    /* SPEC 1: Layout Method — Strict standard Tailwind flexbox constraints */
    <div className="h-screen w-screen overflow-hidden bg-[#F5F5F5] flex flex-col justify-between items-center relative select-none">
      {/* Ambient Radial Mesh Depth Backing */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60 z-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 0%, rgba(0,0,0,0.03) 0%, transparent 70%), radial-gradient(circle at 50% 100%, rgba(0,0,0,0.04) 0%, transparent 60%)',
        }}
      />

      {/* =================================================================== */}
      {/* SPEC 2: TEXT STRENGTH — Brand Header Group with Rigid Gaps          */}
      {/* =================================================================== */}
      <header className="w-full pt-10 pb-4 px-6 flex flex-col items-center justify-center text-center relative z-20">
        <h1 className="text-3xl md:text-5xl font-black tracking-[0.28em] text-[#0A0A0A] uppercase leading-none">
          DATAFLOW
        </h1>
        {/* Rigid Margin Separator to Prevent Overlapping */}
        <div className="h-3 md:h-4" />
        <h2 className="text-xs md:text-sm font-semibold tracking-[0.35em] text-[#737373] uppercase leading-none">
          The Founder Studio
        </h2>
      </header>

      {/* =================================================================== */}
      {/* SPEC 3: MEMORY PURGE — Absolute Conditional Virtual DOM Unmounting  */}
      {/* =================================================================== */}
      <main className="w-full flex-1 flex flex-col items-center justify-center relative z-10 overflow-hidden">
        {loadingState === 'BOOT' ? (
          <BootLogo onBootComplete={handleBootComplete} />
        ) : (
          <DashboardStage
            loadingState={loadingState}
            onReady={handleStageReady}
          />
        )}
      </main>

      {/* Footer System Telemetry Pin */}
      <footer className="w-full py-4 px-8 flex justify-between items-center text-[10px] font-mono text-[#A3A3A3] uppercase tracking-wider relative z-20 border-t border-black/[0.05]">
        <span>SYS.PROD_ENV // NL-MATRIX</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10E79D]" />
          TELEMETRY LOCK 100%
        </span>
        <span>CORE V5.0</span>
      </footer>
    </div>
  );
};

export default DataflowTransitionFix;
