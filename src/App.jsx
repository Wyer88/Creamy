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

const PRESET_LEADERS = [
  { name: 'CreamLord', pokes: 100 },
  { name: 'MilkyMischief', pokes: 42 },
  { name: 'SirSpill', pokes: 36 },
  { name: 'DairyDuke', pokes: 28 },
  { name: 'FoamFrenzy', pokes: 24 },
  { name: 'LactoseLegend', pokes: 20 },
  { name: 'ButterBuddy', pokes: 18 },
  { name: 'CreamyCeleste', pokes: 12 },
];

const INITIAL_DONUTS = [
  { id: 'donut-0', left: '12%', top: '9%', size: 120, image: 'images/donuts-noback.png' },
  { id: 'donut-1', left: '10%', top: '4%', size: 110, image: 'images/donuts-noback1.png' },
  { id: 'donut-2', left: '52%', top: '5%', size: 120, image: 'images/donuts-noback2.png' },
  { id: 'donut-3', left: '65%', top: '18%', size: 118, image: 'images/donuts-noback3.png' },
  { id: 'donut-4', left: '32%', top: '21%', size: 100, image: 'images/donuts-noback4.png' },
  { id: 'donut-5', left: '20%', top: '25%', size: 108, image: 'images/donuts-noback5.png' },
];

const createDonuts = () => INITIAL_DONUTS.map((item) => ({ ...item }));

const assetPath = (relativePath) => {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return `${normalizedBase}${normalizedPath}`;
};

function App() {
  const heroRef = useRef(null);
  const creamyRef = useRef(null);
  const rippleCanvasRef = useRef(null);
  const captionTimer = useRef(null);
  const glowTimer = useRef(null);
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
  const [username, setUsername] = useState('');
  const [pokeCount, setPokeCount] = useState(0);
  const [videoOpen, setVideoOpen] = useState(false);
  const [isHoveringBelly, setIsHoveringBelly] = useState(false);
  const [donuts, setDonuts] = useState(createDonuts);
  const [laserShots, setLaserShots] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const prefersReducedMotion = usePrefersReducedMotion();
  const isCoarsePointer = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(pointer: coarse)').matches;
  }, []);
  const creamyVideoHref = useMemo(() => assetPath('video/creamy-teaser.mov'), []);
  const displayName = username.trim() || 'Guest';
  const handleNameChange = useCallback((event) => {
    setUsername(event.target.value.slice(0, 32));
  }, []);
  const videoRef = useRef(null);
  const laserTimers = useRef([]);
  const leaderboard = useMemo(() => {
    const others = PRESET_LEADERS.filter((entry) => entry.name !== displayName);
    const combined = [...others, { name: displayName, pokes: pokeCount }];
    return combined.sort((a, b) => b.pokes - a.pokes).slice(0, 8);
  }, [displayName, pokeCount]);
  const totalDonuts = INITIAL_DONUTS.length;
  const donutsEliminated = totalDonuts - donuts.length;
  const missionComplete = pokeCount >= 10 && donutsEliminated >= totalDonuts;
  const showMissionBanner = missionComplete && !bannerDismissed;
  const handleReset = useCallback(() => {
    setUsername('');
    setPokeCount(0);
    setDonuts(createDonuts());
    setLaserShots([]);
    window.sessionStorage.removeItem('creamy-username');
    window.sessionStorage.removeItem('creamy-pokes');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(max-width: 768px)');
    const apply = (matches) => {
      setIsMobile(matches);
      setSidebarOpen(matches ? false : true);
    };
    apply(mq.matches);
    const handler = (event) => apply(event.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
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
    let audioElement = audioElementRef.current;
    if (!audioElement) {
      audioElement = new Audio(assetPath('audio/giggle.m4a'));
      audioElement.preload = 'auto';
      audioElementRef.current = audioElement;
    }

    const playElement = () => {
      audioElement.currentTime = 0;
      audioElement.play().catch(() => {
        audioElementRef.current = null;
        synthGiggle();
      });
    };

    if (audioElement.readyState >= 2) {
      playElement();
    } else {
      const handleReady = () => playElement();
      audioElement.addEventListener('canplaythrough', handleReady, { once: true });
      audioElement.load();
    }
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
      creamy.classList.add('belly-poked');
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

      window.clearTimeout(glowTimer.current);
      glowTimer.current = window.setTimeout(() => {
        creamyRef.current?.classList.remove('belly-poked');
      }, prefersReducedMotion ? 180 : 420);
    },
    [playGiggle, prefersReducedMotion, showCaption, spawnRipple]
  );

  const handlePointerMove = useCallback(
    (event) => {
      const heroPoint = getPointInElement(heroRef.current, event.clientX, event.clientY);
      if (!heroPoint) return;
      const creamyPoint = getPointInElement(creamyRef.current, event.clientX, event.clientY);
      const hoveringBelly =
        creamyPoint?.within &&
        creamyPoint.x >= BELLY_ZONE.minX &&
        creamyPoint.x <= BELLY_ZONE.maxX &&
        creamyPoint.y >= BELLY_ZONE.minY &&
        creamyPoint.y <= BELLY_ZONE.maxY;
      setIsHoveringBelly(Boolean(hoveringBelly));
      updateParallax(heroPoint);
    },
    [updateParallax]
  );

  const handlePointerLeave = useCallback(() => {
    updateParallax({ x: 0.5, y: 0.5 });
    setIsHoveringBelly(false);
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
        setPokeCount((count) => count + 1);
        triggerPoke(heroPoint, creamyPoint);
      } else {
        spawnRipple(heroPoint, tappedCreamy ? 0.6 : 0.4);
      }
      setIsHoveringBelly(Boolean(inBelly));
    },
    [triggerPoke, spawnRipple]
  );

  const playLaserSound = useCallback(() => {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.22);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }, [ensureAudioContext]);

  const handleDonutClick = useCallback(
    (donut, event) => {
      event.stopPropagation();
      if (donut.evaporating) return;
      const hero = heroRef.current;
      const creamy = creamyRef.current;
      if (!hero || !creamy) return;
      const heroRect = hero.getBoundingClientRect();
      const creamyRect = creamy.getBoundingClientRect();
      const donutRect = event.currentTarget.getBoundingClientRect();

      const toHeroCoords = (point) => ({
        x: point.x - heroRect.left,
        y: point.y - heroRect.top,
      });

      const targetPoint = toHeroCoords({
        x: donutRect.left + donutRect.width / 2,
        y: donutRect.top + donutRect.height / 2,
      });

      const leftEye = toHeroCoords({
        x: creamyRect.left + creamyRect.width * 0.42,
        y: creamyRect.top + creamyRect.height * 0.27,
      });

      const rightEye = toHeroCoords({
        x: creamyRect.left + creamyRect.width * 0.58,
        y: creamyRect.top + creamyRect.height * 0.28,
      });

      const timestamp = Date.now();
      const prefix = `${donut.id}-${timestamp}`;
      const newShots = [
        { id: `${prefix}-L`, start: leftEye, end: targetPoint },
        { id: `${prefix}-R`, start: rightEye, end: targetPoint },
      ];
      setLaserShots((shots) => [...shots, ...newShots]);
      playLaserSound();

      const timerId = window.setTimeout(() => {
        setLaserShots((shots) => shots.filter((shot) => !shot.id.startsWith(prefix)));
      }, 700);
      laserTimers.current.push(timerId);

      setDonuts((current) =>
        current.map((item) => (item.id === donut.id ? { ...item, evaporating: true } : item))
      );
      const removeId = window.setTimeout(() => {
        setDonuts((current) => current.filter((item) => item.id !== donut.id));
      }, 520);
      laserTimers.current.push(removeId);
    },
    [playLaserSound]
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

  useEffect(
    () => () => {
      window.clearTimeout(captionTimer.current);
      window.clearTimeout(glowTimer.current);
      laserTimers.current.forEach((id) => window.clearTimeout(id));
      laserTimers.current = [];
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const audio = new Audio(assetPath('audio/giggle.m4a'));
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
    if (typeof window === 'undefined') return undefined;
    const storedName = window.sessionStorage.getItem('creamy-username');
    const storedPokes = window.sessionStorage.getItem('creamy-pokes');
    if (storedName) setUsername(storedName);
    if (storedPokes) {
      const parsed = Number.parseInt(storedPokes, 10);
      if (!Number.isNaN(parsed)) setPokeCount(parsed);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('creamy-username', username);
  }, [username]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('creamy-pokes', String(pokeCount));
  }, [pokeCount]);

  useEffect(() => {
    if (!videoOpen && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [videoOpen]);

  useEffect(() => {
    if (!missionComplete) {
      setBannerDismissed(false);
    }
  }, [missionComplete]);

  useEffect(() => {
    updateParallax({ x: 0.5, y: 0.5 });
  }, [updateParallax]);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-night text-white">
      {showMissionBanner && (
        <div className="mission-banner glass-panel">
          <button
            type="button"
            className="close-icon"
            aria-label="Dismiss mission banner"
            onClick={() => setBannerDismissed(true)}
          >
            ×
          </button>
          <p className="text-xs uppercase tracking-[0.4em] text-creamyRose">Mission complete</p>
          <p className="mt-2 text-sm text-white">
            Congratulations! You've made Creamy's day! You poked his belly 10 times and helped him fetch all his missing
            donuts. You truly are amazing.
          </p>
          <img
            src={assetPath('images/goldendonut-noback.png')}
            alt="Golden donut"
            className="mt-3 w-full max-w-[200px] drop-shadow-creamy"
          />
        </div>
      )}
      {videoOpen && (
        <div className="video-overlay" onClick={() => setVideoOpen(false)}>
          <div className="video-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between text-white/80">
              <span className="text-sm uppercase tracking-[0.35em]">Creamy teaser</span>
              <button type="button" className="close-icon" onClick={() => setVideoOpen(false)} aria-label="Close video">
                ×
              </button>
            </div>
            <video
              ref={videoRef}
              className="video-player"
              controls
              autoPlay
              playsInline
              loop
              src={creamyVideoHref}
            />
          </div>
        </div>
      )}
      {isMobile && !sidebarOpen && (
        <button type="button" className="hud-toggle glass-button" onClick={() => setSidebarOpen(true)}>
          Stats & Pokes
        </button>
      )}
      {sidebarOpen && (
        <div
          className={`mission-column ${isMobile ? 'mobile' : ''} fixed right-6 top-6 z-30 flex w-72 flex-col items-stretch gap-3`}
        >
          {isMobile && (
            <div className="hud-header">
              <span>Stats & Pokes</span>
              <button type="button" className="close-icon" aria-label="Close stats" onClick={() => setSidebarOpen(false)}>
                ×
              </button>
            </div>
          )}
          <a
            href="https://x.com/milkmancreamy"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-button shadow-lg transition-transform duration-700 ease-out hover:-translate-y-0.5"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" focusable="false">
              <path
                d="M18.244 2H21l-6.46 7.386L22 22h-6.59l-4.61-6.09L5.29 22H2l6.98-7.995L2 2h6.59l4.25 5.65L18.244 2Zm-2.313 18h1.55L7.16 4h-1.6l10.37 16Z"
                fill="currentColor"
              />
            </svg>
            <span>@milkmancreamy</span>
          </a>
          <button
            type="button"
            className="glass-button justify-between shadow-lg transition-transform duration-700 ease-out hover:-translate-y-0.5"
            onClick={() => setVideoOpen(true)}
          >
            <span>Watch Creamy</span>
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" focusable="false">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
          </button>
          <div className="glass-panel">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Belly pokes</p>
            <p className="mt-1 text-3xl font-semibold text-white">{pokeCount}</p>
            <p className="text-xs text-white/60">This session • {displayName}</p>
          </div>
          <div className="glass-panel">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Donuts eliminated</p>
            <p className="mt-1 text-3xl font-semibold text-white">{donutsEliminated}</p>
            <p className="text-xs text-white/60">
              {totalDonuts - donutsEliminated} remaining • max {totalDonuts}
            </p>
          </div>
          <div className="glass-panel overflow-hidden">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Top Poke Pros</p>
            <table className="leaderboard-table">
              <tbody>
                {leaderboard.map((entry, index) => (
                  <tr key={`${entry.name}-${index}`}>
                    <td>{index + 1}</td>
                    <td className="truncate">{entry.name}</td>
                    <td className="text-right">{entry.pokes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="glass-button justify-center" onClick={handleReset}>
            Reset session
          </button>
        </div>
      )}
      <div
        ref={heroRef}
        className="hero-sheen relative flex min-h-[160vh] flex-col items-center justify-start px-4 pb-32 pt-0 sm:px-10"
        style={{ '--hero-photo': `url(${assetPath('images/creamy_original.jpg')})` }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onWheel={handleWheel}
      >
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          <canvas ref={rippleCanvasRef} className="h-full w-full opacity-80" />
        </div>
        <div className="donut-layer absolute inset-0 z-30">
          {laserShots.map((shot) => {
            const dx = shot.end.x - shot.start.x;
            const dy = shot.end.y - shot.start.y;
            const length = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
              <span
                key={shot.id}
                className="laser-beam"
                style={{
                  left: `${shot.start.x}px`,
                  top: `${shot.start.y}px`,
                  width: `${length}px`,
                  transform: `rotate(${angle}deg)`,
                }}
              />
            );
          })}
          {donuts.map((donut) => (
            <button
              key={donut.id}
              type="button"
              className={`donut ${donut.evaporating ? 'evaporating' : ''}`}
              style={{
                left: donut.left,
                top: donut.top,
                width: `${donut.size}px`,
                height: `${donut.size}px`,
                backgroundImage: `url(${assetPath(donut.image)})`,
              }}
              onClick={(event) => handleDonutClick(donut, event)}
              aria-label={`Evaporate ${donut.id} donut`}
            >
              <span className="donut-hole" />
            </button>
          ))}
        </div>

        <div className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-12 pb-12">
          <div className="order-1 relative isolate -mt-6 flex w-full items-start justify-center sm:-mt-4">
            <img
              ref={creamyRef}
              src={assetPath('images/creamy_cutout.png')}
              alt="Creamy posing with playful energy"
              className="creamy-figure h-auto w-[min(96vw,1200px)] max-h-[165vh] select-none object-contain object-top drop-shadow-creamy"
              draggable={false}
            />
            <span
              className={`belly-guidance pointer-events-none absolute left-1/2 top-[50%] z-10 h-[24%] w-[46%] -translate-x-1/2 -translate-y-[45%] rounded-[45%] ${isHoveringBelly ? 'is-active' : ''}`}
              aria-hidden="true"
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

          <div className="session-panel relative z-10 mt-2 w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-5 text-left shadow-2xl backdrop-blur">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Tag your session</p>
            <label className="mt-3 block text-sm text-white/80" htmlFor="creamy-username">
              Username
            </label>
            <input
              id="creamy-username"
              name="creamy-username"
              type="text"
              autoComplete="off"
              maxLength={32}
              value={username}
              onChange={handleNameChange}
              placeholder="e.g. MilkyMischief"
              className="mt-1 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-base text-white placeholder-white/40 outline-none focus:border-creamyRose focus:bg-white/15"
            />
            <button
              type="button"
              className="glass-button mt-4 w-full justify-between"
              aria-live="polite"
            >
              <span>{displayName}</span>
              <span className="text-white/80 text-sm">Pokes {pokeCount}</span>
            </button>
          </div>
        </div>
        </div>

        <div className="pointer-events-none absolute bottom-16 left-1/2 z-20 -translate-x-1/2" aria-live="polite">
          {captionActive && (
            <div key={captionTick} className="caption-bubble animate-caption text-center">
              “hehehe dat tickles me, Creamy”
            </div>
          )}
        </div>

      </div>
    </main>
  );
}

export default App;
