import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { sounds } from '@/lib/sound';
import type { GameProps } from './registry';

type Direction = 'up' | 'down' | 'left' | 'right';
type Phase = 'ready' | 'running' | 'paused' | 'over';

const GRID = 18;
const CELL = 22;
const SIZE = GRID * CELL;

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down', down: 'up', left: 'right', right: 'left',
};

const DIFFICULTIES: {
  id: 'relaxed' | 'classic' | 'fast';
  label: string;
  start: number;
  floor: number;
  decay: number;
}[] = [
  { id: 'relaxed', label: 'Relaxed', start: 210, floor: 120, decay: 2 },
  { id: 'classic', label: 'Classic', start: 150, floor: 80, decay: 4 },
  { id: 'fast', label: 'Fast', start: 105, floor: 55, decay: 6 },
];

const BEST_KEY = 'portfolio_snake_best';

interface Point { x: number; y: number }

function readBest(): number {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeBest(score: number) {
  try { localStorage.setItem(BEST_KEY, String(score)); } catch { /* private mode */ }
}

export default function Snake({ onScore }: GameProps) {
  const [difficulty, setDifficulty] = useState<'relaxed' | 'classic' | 'fast'>('classic');
  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const snakeRef = useRef<Point[]>([]);
  const foodRef = useRef<Point>({ x: 0, y: 0 });
  const directionRef = useRef<Direction>('right');
  const queuedRef = useRef<Direction>('right');
  const runningRef = useRef(false);
  const scoreRef = useRef(0);
  const lastStepRef = useRef(0);
  const speedRef = useRef(150);
  const bestRef = useRef(0);

  const config = DIFFICULTIES.find((entry) => entry.id === difficulty) ?? DIFFICULTIES[1];

  const reset = useCallback(() => {
    const middle = Math.floor(GRID / 2);
    snakeRef.current = [
      { x: middle - 1, y: middle },
      { x: middle - 2, y: middle },
      { x: middle - 3, y: middle },
    ];
    directionRef.current = 'right';
    queuedRef.current = 'right';
    scoreRef.current = 0;
    speedRef.current = config.start;
    setScore(0);
    placeFood();
    setPhase('ready');
    runningRef.current = false;
    paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.start]);

  const placeFood = () => {
    const occupied = new Set(snakeRef.current.map((cell) => cell.y * GRID + cell.x));
    const free: number[] = [];
    for (let i = 0; i < GRID * GRID; i += 1) if (!occupied.has(i)) free.push(i);
    const pick = free.length > 0 ? free[Math.floor(Math.random() * free.length)] : 0;
    foodRef.current = { x: pick % GRID, y: Math.floor(pick / GRID) };
  };

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Match the backing store to the device so the board is not blurry on
    // retina while the CSS size stays responsive.
    if (canvas.width !== SIZE * dpr) {
      canvas.width = SIZE * dpr;
      canvas.height = SIZE * dpr;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, SIZE, SIZE);

    context.fillStyle = 'rgba(16,18,25,0.022)';
    context.fillRect(0, 0, SIZE, SIZE);

    context.strokeStyle = 'rgba(16,18,25,0.05)';
    context.lineWidth = 1;
    for (let i = 1; i < GRID; i += 1) {
      context.beginPath();
      context.moveTo(i * CELL, 0);
      context.lineTo(i * CELL, SIZE);
      context.stroke();
      context.beginPath();
      context.moveTo(0, i * CELL);
      context.lineTo(SIZE, i * CELL);
      context.stroke();
    }

    const food = foodRef.current;
    const foodGradient = context.createRadialGradient(
      food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, 1,
      food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL,
    );
    foodGradient.addColorStop(0, '#fd8e77');
    foodGradient.addColorStop(1, '#c03a26');
    context.fillStyle = foodGradient;
    context.beginPath();
    context.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * 0.34, 0, Math.PI * 2);
    context.fill();

    snakeRef.current.forEach((segment, index) => {
      const ratio = 1 - index / Math.max(snakeRef.current.length, 1);
      const gradient = context.createLinearGradient(
        segment.x * CELL, segment.y * CELL,
        segment.x * CELL + CELL, segment.y * CELL + CELL,
      );
      gradient.addColorStop(0, index === 0 ? '#0c6899' : '#12a2de');
      gradient.addColorStop(1, index === 0 ? '#10567c' : '#0a82bd');
      context.fillStyle = gradient;
      context.globalAlpha = 0.55 + ratio * 0.45;
      roundRect(context, segment.x * CELL + 2, segment.y * CELL + 2, CELL - 4, CELL - 4, 5);
      context.fill();
    });
    context.globalAlpha = 1;
  }, []);

  const endGame = useCallback(() => {
    runningRef.current = false;
    setPhase('over');
    sounds.error();
    const final = scoreRef.current;
    if (final > bestRef.current) {
      bestRef.current = final;
      setBest(final);
      writeBest(final);
    }
    onScore?.(final);
  }, [onScore]);

  const step = useCallback(() => {
    const direction = queuedRef.current;
    if (direction !== OPPOSITE[directionRef.current]) directionRef.current = direction;

    const head = snakeRef.current[0];
    const next: Point = { x: head.x, y: head.y };
    if (directionRef.current === 'up') next.y -= 1;
    if (directionRef.current === 'down') next.y += 1;
    if (directionRef.current === 'left') next.x -= 1;
    if (directionRef.current === 'right') next.x += 1;

    if (next.x < 0 || next.y < 0 || next.x >= GRID || next.y >= GRID) { endGame(); return; }

    const eating = next.x === foodRef.current.x && next.y === foodRef.current.y;
    // Moving into the cell the tail is vacating this tick is legal.
    const body = eating ? snakeRef.current : snakeRef.current.slice(0, -1);
    if (body.some((segment) => segment.x === next.x && segment.y === next.y)) { endGame(); return; }

    snakeRef.current = [next, ...snakeRef.current];
    if (eating) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      // Read from a ref, not state: the loop must not be torn down and rebuilt
      // every time a pellet is eaten.
      speedRef.current = Math.max(config.floor, config.start - scoreRef.current * config.decay);
      placeFood();
      sounds.success();
    } else {
      snakeRef.current.pop();
    }
  }, [config.decay, config.floor, config.start, endGame]);

  // One rAF loop for the whole session. It reads `speedRef` every frame, so
  // changing speed never tears the effect down.
  useEffect(() => {
    let frame = 0;
    const loop = (timestamp: number) => {
      if (runningRef.current && timestamp - lastStepRef.current >= speedRef.current) {
        lastStepRef.current = timestamp;
        step();
      }
      paint();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [step, paint]);

  // Auto-pause when the board is off-screen or the tab is hidden, so a game is
  // never lost to a background tab.
  useEffect(() => {
    const board = boardRef.current;
    if (!board || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) return;
      if (phase === 'running') {
        runningRef.current = false;
        setPhase('paused');
      }
    }, { threshold: 0.15 });
    observer.observe(board);
    return () => observer.disconnect();
  }, [phase]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && phase === 'running') {
        runningRef.current = false;
        setPhase('paused');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [phase]);

  useEffect(() => {
    bestRef.current = readBest();
    setBest(bestRef.current);
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  const start = () => {
    if (phase === 'over') { reset(); }
    if (phase === 'ready' || phase === 'over') lastStepRef.current = performance.now();
    runningRef.current = true;
    setPhase('running');
    sounds.click();
  };

  const togglePause = () => {
    if (phase === 'running') {
      runningRef.current = false;
      setPhase('paused');
      sounds.click();
      return;
    }
    if (phase === 'paused') {
      lastStepRef.current = performance.now();
      runningRef.current = true;
      setPhase('running');
      sounds.click();
    }
  };

  const steer = (direction: Direction) => {
    if (phase === 'over') {
      // Explicit start only. Previously any arrow press after a game over
      // silently restarted it, bypassing the Play again button.
      reset();
      lastStepRef.current = performance.now();
      runningRef.current = true;
      setPhase('running');
      sounds.click();
      return;
    }
    if (phase === 'ready') { start(); }
    queuedRef.current = direction;
    sounds.click();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const map: Record<string, Direction> = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right',
      W: 'up', S: 'down', A: 'left', D: 'right',
    };
    const direction = map[event.key];
    if (!direction) return;
    event.preventDefault();
    steer(direction);
    // Deliberately does NOT re-focus the container: the old implementation did,
    // which yanked focus off the D-pad button just pressed and killed its
    // focus ring.
  };

  const statusText = phase === 'ready' ? 'Ready when you are'
    : phase === 'running' ? 'Running'
      : phase === 'paused' ? 'Paused'
        : 'Game over';

  return (
    <div className="card card-sheen w-full max-w-lg rounded-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold tracking-tight text-[var(--ink)]">Snake</h3>
          <p className="text-xs text-[var(--muted)]">Arrow keys or WASD. Best run: {best}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {phase === 'running' && (
            <button type="button" onClick={togglePause} onMouseEnter={() => sounds.hover()} className="btn btn-ghost h-9 min-h-0 px-3 text-xs">
              <Pause size={13} aria-hidden="true" /> Pause
            </button>
          )}
          {phase === 'paused' && (
            <button type="button" onClick={togglePause} onMouseEnter={() => sounds.hover()} className="btn btn-ghost h-9 min-h-0 px-3 text-xs">
              <Play size={13} aria-hidden="true" /> Resume
            </button>
          )}
          <button type="button" onClick={reset} onMouseEnter={() => sounds.hover()} className="btn btn-ghost h-9 min-h-0 px-3 text-xs">
            <RotateCcw size={13} aria-hidden="true" /> Restart
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1" role="group" aria-label="Difficulty">
          {DIFFICULTIES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={difficulty === entry.id}
              onClick={() => { sounds.click(); setDifficulty(entry.id); }}
              className="filter-pill"
            >
              {entry.label}
            </button>
          ))}
        </div>
        <p role="status" aria-live="polite" className="font-display text-2xl font-bold tracking-tight text-[var(--accent)]">
          {score}
        </p>
      </div>

      <div ref={boardRef} className="relative mx-auto mt-4 w-full max-w-[22rem]">
        <div
          onKeyDown={onKeyDown}
          tabIndex={0}
          role="application"
          aria-label="Snake board. Use the arrow keys or WASD to steer."
          className="rounded-panel outline-offset-4"
        >
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            style={{ width: '100%', height: 'auto', display: 'block' }}
            className="w-full rounded-panel border border-[var(--line)] bg-[var(--surface)]"
            role="img"
            aria-label={`Snake board. Score ${score}. ${statusText}.`}
          />
        </div>

        {phase !== 'running' && (
          <div className="absolute inset-0 grid place-items-center rounded-panel bg-[rgba(255,255,255,0.82)] backdrop-blur-sm">
            <div className="px-6 text-center">
              <p className="font-display text-base font-bold text-[var(--ink)]">
                {phase === 'over' ? `Game over — ${score}` : phase === 'paused' ? 'Paused' : 'Snake'}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {phase === 'over' ? 'Press Restart or an arrow key.' : 'Press start, then steer.'}
              </p>
              <button type="button" onClick={start} onMouseEnter={() => sounds.hover()} className="btn btn-primary mt-4 h-9 min-h-0 px-4 text-xs">
                {phase === 'over' ? 'Play again' : phase === 'paused' ? 'Resume' : 'Start'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Touch controls. Real buttons so they are keyboard-reachable too; the
          on-screen arrow keys are not a pointer-only affordance. */}
      <div className="mx-auto mt-4 grid max-w-[16rem] grid-cols-3 gap-1.5">
        <span />
        <button
          type="button"
          onClick={() => steer('up')}
          onMouseEnter={() => sounds.hover()}
          className="btn-icon mx-auto"
          aria-label="Move up"
        >
          ▲
        </button>
        <span />
        <button
          type="button"
          onClick={() => steer('left')}
          onMouseEnter={() => sounds.hover()}
          className="btn-icon mx-auto"
          aria-label="Move left"
        >
          ◀
        </button>
        <button
          type="button"
          onClick={() => steer('down')}
          onMouseEnter={() => sounds.hover()}
          className="btn-icon mx-auto"
          aria-label="Move down"
        >
          ▼
        </button>
        <button
          type="button"
          onClick={() => steer('right')}
          onMouseEnter={() => sounds.hover()}
          className="btn-icon mx-auto"
          aria-label="Move right"
        >
          ▶
        </button>
      </div>
    </div>
  );
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  if (typeof context.roundRect === 'function') {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    return;
  }
  // Safari < 16 has no roundRect; fall back to a plain rect rather than crash.
  context.beginPath();
  context.rect(x, y, width, height);
}
