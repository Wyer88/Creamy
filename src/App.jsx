import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const BELLY_ZONE = {
  minX: 0.34,
  maxX: 0.66,
  minY: 0.38,
  maxY: 0.78,
};

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const getPointInElement = (element, clientX, clientY) => {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  const rawX = (clientX - rect.left) / rect.width;
  const rawY = (clientY - rect.top) / rect.height;
  return {
    x: clamp(rawX),
    y: clamp(rawY),
    within: rawX >= 0 && rawX <= 1 && rawY >= 0 && rawY <= 1,
    rect,
  };
};

const usePrefersReducedMotion = () => {
  const getInitial = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  const [prefers, setPrefers] = useState(getInitial);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event) => setPrefers(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefers;
};

function App() {
  const heroRef = useRef(null);
  const creamyRef = useRef(null);
  const rippleCanvasRef = useRef(null);
  const captionTimer = useRef(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });
  const rippleStore = useRef({
    ripples: [],
    ratio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    ctx: null,
  });
  const audioCtxRef = useRef(null);
  const audioElementRef = useRef(null);

  const [captionTick, setCaptionTick] = useState(0);
  const [captionActive, setCaptionActive] = useState(false);

  const prefersReducedMotion = usePrefersReducedMotion();
  const isCoarsePointer = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(pointer: coarse)').matches;
  }, []);

  const updateParallax = useCallback(
    (point = pointerRef.current, depth = 0) => {
      const creamy = creamyRef.current;
      if (!creamy) return;

      const intensity = prefersReducedMotion ? 0 : 1;
      const safePoint = {
        x: clamp(point.x),
        y: clamp(point.y),
      };
      pointerRef.current = safePoint;

      const tiltX = (0.5 - safePoint.y) * (isCoarsePointer ? 8 : 12) * intensity;
      const tiltY = (safePoint.x - 0.5) * (isCoarsePointer ? 12 : 18) * intensity;
      const moveX = (safePoint.x - 0.5) * (isCoarsePointer ? 18 : 30) * intensity;
      const moveY = (safePoint.y - 0.5) * (isCoarsePointer ? 14 : 24) * intensity;
      const depthOffset = clamp(depth, -18, 18) * intensity;

      creamy.style.transform = `perspective(1200px) translate3d(${moveX}px, ${moveY}px, ${depthOffset}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    },
    [isCoarsePointer, prefersReducedMotion]
  );

  const ensureAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const synthGiggle = useCallback(() => {
    const ctx = ensureAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const outputGain = ctx.createGain();

    carrier.type = 'triangle';
    carrier.frequency.setValueAtTime(340, now);
    carrier.frequency.exponentialRampToValueAtTime(460, now + 0.18);

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(10, now);
    modulator.frequency.exponentialRampToValueAtTime(7, now + 0.4);

    modGain.gain.setValueAtTime(90, now);
    modulator.connect(modGain).connect(carrier.frequency);

    outputGain.gain.setValueAtTime(0, now);
    outputGain.gain.linearRampToValueAtTime(0.45, now + 0.04);
    outputGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    carrier.connect(outputGain).connect(ctx.destination);

    carrier.start(now);
    modulator.start(now);
    carrier.stop(now + 0.7);
    modulator.stop(now + 0.7);
  }, [ensureAudioContext]);

  const playGiggle = useCallback(() => {
    const audioElement = audioElementRef.current;
    if (audioElement && audioElement.readyState >= 2) {
      audioElement.currentTime = 0;
      audioElement.play().catch(() => {
        audioElementRef.current = null;
        synthGiggle();
      });
      return;
    }
    synthGiggle();
  }, [synthGiggle]);

  const spawnRipple = useCallback(
    (point, intensity = 1) => {
      if (prefersReducedMotion) return;
      const hero = heroRef.current;
      const canvas = rippleCanvasRef.current;
      const store = rippleStore.current;
      if (!hero || !canvas || !store.ctx) return;

      const rect = hero.getBoundingClientRect();
      const ratio = store.ratio;
      const scale = clamp(intensity, 0.3, 2);
      const xPx = clamp(point.x) * rect.width * ratio;
      const yPx = clamp(point.y) * rect.height * ratio;

      store.ripples.push({
        x: xPx,
        y: yPx,
        radius: 16 * ratio,
        growth: (isCoarsePointer ? 7 : 11) * ratio * (0.6 + 0.4 * scale),
        alpha: 0.55 + 0.25 * scale,
      });
    },
    [isCoarsePointer, prefersReducedMotion]
  );

  const showCaption = useCallback(() => {
    setCaptionTick((tick) => tick + 1);
    setCaptionActive(true);
    window.clearTimeout(captionTimer.current);
    captionTimer.current = window.setTimeout(() => setCaptionActive(false), 1800);
  }, []);

  const triggerPoke = useCallback(
    (heroPoint, creamyPoint = { x: 0.5, y: 0.6 }) => {
      const creamy = creamyRef.current;
      if (!creamy) return;
      const baseTransform = creamy.style.transform;
      const dx = (heroPoint.x - 0.5) * 28;
      const dy = (heroPoint.y - 0.5) * 22;
      const skewX = (heroPoint.x - 0.5) * 6;
      const skewY = (0.5 - creamyPoint.y) * 4;

      creamy.animate(
        [
          {
            transform: `${baseTransform} translate3d(${dx}px, ${dy}px, 14px) scale3d(0.93, 0.97, 1) skew(${skewX}deg, ${skewY}deg)`,
          },
          {
            transform: `${baseTransform} translate3d(${dx * -0.2}px, ${dy * -0.25}px, 6px) scale3d(1.03, 1.01, 1) skew(${skewX * -0.3}deg, ${skewY * -0.4}deg)`,
          },
          { transform: baseTransform },
        ],
        {
          duration: prefersReducedMotion ? 240 : 420,
          easing: 'cubic-bezier(.2,.7,.2,1.25)',
        }
      );

      spawnRipple(heroPoint, 1.25);
      playGiggle();
      showCaption();
    },
    [playGiggle, prefersReducedMotion, showCaption, spawnRipple]
  );

  const handlePointerMove = useCallback(
    (event) => {
      const heroPoint = getPointInElement(heroRef.current, event.clientX, event.clientY);
      if (!heroPoint) return;
      updateParallax(heroPoint);
    },
    [updateParallax]
  );

  const handlePointerLeave = useCallback(() => {
    updateParallax({ x: 0.5, y: 0.5 });
  }, [updateParallax]);

  const handleWheel = useCallback(
    (event) => {
      const heroPoint = getPointInElement(heroRef.current, event.clientX, event.clientY);
      if (!heroPoint) return;
      const depthKick = clamp(-event.deltaY / 35, -16, 16);
      updateParallax(heroPoint, depthKick);
      spawnRipple(heroPoint, Math.min(Math.abs(event.deltaY) / 150, 2));
    },
    [spawnRipple, updateParallax]
  );

  const handlePointerDown = useCallback(
    (event) => {
      const heroPoint = getPointInElement(heroRef.current, event.clientX, event.clientY);
      if (!heroPoint) return;

      const creamyPoint = getPointInElement(creamyRef.current, event.clientX, event.clientY);
      const tappedCreamy = creamyPoint?.within;
      const inBelly =
        tappedCreamy &&
        creamyPoint.x >= BELLY_ZONE.minX &&
        creamyPoint.x <= BELLY_ZONE.maxX &&
        creamyPoint.y >= BELLY_ZONE.minY &&
        creamyPoint.y <= BELLY_ZONE.maxY;

      if (inBelly) {
        triggerPoke(heroPoint, creamyPoint);
      } else {
        spawnRipple(heroPoint, tappedCreamy ? 0.6 : 0.4);
      }
    },
    [triggerPoke, spawnRipple]
  );

  useEffect(() => {
    const hero = heroRef.current;
    const canvas = rippleCanvasRef.current;
    if (!hero || !canvas) return undefined;

    const ctx = canvas.getContext('2d');
    rippleStore.current.ctx = ctx;

    const resize = () => {
      const rect = hero.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      rippleStore.current.ratio = ratio;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resize();
    window.addEventListener('resize', resize);

    let frame;
    const render = () => {
      const { ripples } = rippleStore.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        const ripple = ripples[i];
        ripple.radius += ripple.growth;
        ripple.alpha *= 0.965;
        if (ripple.alpha <= 0.01) {
          ripples.splice(i, 1);
          continue;
        }
        const gradient = ctx.createRadialGradient(
          ripple.x,
          ripple.y,
          ripple.radius * 0.35,
          ripple.x,
          ripple.y,
          ripple.radius
        );
        gradient.addColorStop(0, `rgba(255,255,255,${0.35 * ripple.alpha})`);
        gradient.addColorStop(0.6, `rgba(255,182,193,${0.25 * ripple.alpha})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      frame = window.requestAnimationFrame(render);
    };

    frame = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      rippleStore.current.ripples.length = 0;
    };
  }, []);

  useEffect(() => () => window.clearTimeout(captionTimer.current), []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const audio = new Audio('/audio/giggle.m4a');
    audio.preload = 'auto';
    const markUnavailable = () => {
      audioElementRef.current = null;
    };
    audio.addEventListener('error', markUnavailable);
    audioElementRef.current = audio;
    return () => {
      audio.removeEventListener('error', markUnavailable);
    };
  }, []);

  useEffect(() => {
    updateParallax({ x: 0.5, y: 0.5 });
  }, [updateParallax]);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-night text-white">
      <div
        ref={heroRef}
        className="hero-sheen relative flex min-h-[160vh] flex-col items-center justify-start px-4 pb-32 pt-0 sm:px-10"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onWheel={handleWheel}
      >
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          <canvas ref={rippleCanvasRef} className="h-full w-full opacity-80" />
        </div>

        <div className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-12 pb-12">
          <div className="order-1 relative isolate -mt-6 flex w-full items-start justify-center sm:-mt-4">
            <img
              ref={creamyRef}
              src="/images/creamy_cutout.png"
              alt="Creamy posing with playful energy"
              className="h-auto w-[min(96vw,1200px)] max-h-[165vh] select-none object-contain object-top drop-shadow-creamy"
              draggable={false}
            />
            <span className="pointer-events-none absolute inset-0 -z-10 rounded-[40%] bg-white/10 blur-[110px]" />
          </div>

          <div className="order-2 flex flex-col items-center gap-4 text-center">
            <span className="text-sm uppercase tracking-[0.4em] text-creamyRose/80">Creamy</span>
            <h1 className="max-w-2xl text-4xl font-semibold text-white sm:text-5xl">
              Premium milkman mischief in one playful page
            </h1>
            <p className="max-w-xl text-balance text-base text-white/70 sm:text-lg">
              Scroll to send silky ripples, poke the belly for a giggle, and glide through a tactile vignette that feels
              alive yet refined.
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-16 left-1/2 z-20 -translate-x-1/2" aria-live="polite">
          {captionActive && (
            <div key={captionTick} className="caption-bubble animate-caption text-center">
              “hehehe dat tickles me, Creamy”
            </div>
          )}
        </div>

        <a
          href="https://x.com/milkmancreamy"
          target="_blank"
          rel="noopener noreferrer"
          className="glass-button fixed right-6 top-6 z-30 animate-float shadow-lg transition-transform duration-700 ease-out hover:-translate-y-0.5"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" focusable="false">
            <path
              d="M18.244 2H21l-6.46 7.386L22 22h-6.59l-4.61-6.09L5.29 22H2l6.98-7.995L2 2h6.59l4.25 5.65L18.244 2Zm-2.313 18h1.55L7.16 4h-1.6l10.37 16Z"
              fill="currentColor"
            />
          </svg>
          <span>@milkmancreamy</span>
        </a>
      </div>
    </main>
  );
}

export default App;
