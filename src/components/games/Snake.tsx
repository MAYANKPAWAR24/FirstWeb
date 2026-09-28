import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { sounds } from '@/lib/sound';

const GRID = 18;
const CELL = 22;
const SIZE = GRID * CELL;
const START_SPEED = 150;
const MIN_SPEED = 70;

type Point = { x: number; y: number };
type Direction = 'up' | 'down' | 'left' | 'right';

const Deltas: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const opposite: Record<Direction, Direction> = {
  up: 'down', down: 'up', left: 'right', right: 'left',
};

const CONTROLS: { direction: Direction; label: string; className: string }[] = [
  { direction: 'up', label: '↑', className: 'col-start-2 row-start-1' },
  { direction: 'left', label: '←', className: 'col-start-1 row-start-2' },
  { direction: 'down', label: '↓', className: 'col-start-2 row-start-2' },
  { direction: 'right', label: '→', className: 'col-start-3 row-start-2' },
];

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
  W: 'up', S: 'down', A: 'left', D: 'right',
};

const START_SNAKE: Point[] = [
  { x: 8, y: 9 },
  { x: 7, y: 9 },
  { x: 6, y: 9 },
];

function randomFood(snake: Point[]): Point {
  const open: Point[] = [];
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      if (!snake.some((part) => part.x === x && part.y === y)) open.push({ x, y });
    }
  }
  return open.length > 0 ? open[Math.floor(Math.random() * open.length)] : { x: 0, y: 0 };
}

function paintBoard(
  canvas: HTMLCanvasElement | null,
  snake: Point[],
  food: Point,
) {
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = 'rgba(0, 113, 227, 0.03)';
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.strokeStyle = 'rgba(29, 29, 31, 0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < GRID; i += 1) {
    ctx.moveTo(i * CELL + 0.5, 0);
    ctx.lineTo(i * CELL + 0.5, SIZE);
    ctx.moveTo(0, i * CELL + 0.5);
    ctx.lineTo(SIZE, i * CELL + 0.5);
  }
  ctx.stroke();

  ctx.fillStyle = '#a34553';
  ctx.beginPath();
  ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * 0.3, 0, Math.PI * 2);
  ctx.fill();

  snake.forEach((part, index) => {
    const inset = index === 0 ? 2.5 : 4;
    const gradient = ctx.createLinearGradient(
      part.x * CELL, part.y * CELL, (part.x + 1) * CELL, (part.y + 1) * CELL
    );
    gradient.addColorStop(0, index === 0 ? '#147c8a' : 'rgba(20, 124, 138, 0.55)');
    gradient.addColorStop(1, index === 0 ? '#0071e3' : 'rgba(0, 113, 227, 0.35)');
    ctx.fillStyle = gradient;
    // `roundRect` is recent; fall back to a square on older engines.
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(part.x * CELL + inset, part.y * CELL + inset, CELL - inset * 2, CELL - inset * 2, 7);
      ctx.fill();
    } else {
      ctx.fillRect(part.x * CELL + inset, part.y * CELL + inset, CELL - inset * 2, CELL - inset * 2);
    }
  });
}

/**
 * Snake on a single canvas: the loop never re-renders React, it only redraws
 * pixels. It pauses itself when scrolled out of view or when the tab is hidden.
 */
export default function Snake() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const directionRef = useRef<Direction>('right');
  const pendingRef = useRef<Direction>('right');
  const snakeRef = useRef<Point[]>(START_SNAKE);
  const foodRef = useRef<Point>(randomFood(START_SNAKE));
  const runningRef = useRef(false);
  const scoreRef = useRef(0);
  const startedRef = useRef(false);
  const activeRef = useRef(false);
  const overRef = useRef(false);
  const lastStepRef = useRef(0);
  const frameRef = useRef(0);

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [active, setActive] = useState(false);

  scoreRef.current = score;
  startedRef.current = started;
  activeRef.current = active;
  overRef.current = over;
  const speed = Math.max(MIN_SPEED, START_SPEED - score * 4);
  const status = over ? 'Game over' : !started ? 'Ready when you are' : active ? 'Running' : 'Paused';

  const endGame = useCallback(() => {
    runningRef.current = false;
    setOver(true);
    setActive(false);
    setBest((current) => Math.max(current, scoreRef.current));
    sounds.error();
  }, []);

  const tick = useCallback(() => {
    const snake = snakeRef.current;
    directionRef.current = pendingRef.current;
    const delta = Deltas[directionRef.current];
    const head = { x: snake[0].x + delta.x, y: snake[0].y + delta.y };

    const eating = head.x === foodRef.current.x && head.y === foodRef.current.y;
    const body = eating ? snake : snake.slice(0, -1);
    const dead = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID
      || body.some((part) => part.x === head.x && part.y === head.y);
    if (dead) {
      endGame();
      return;
    }

    const nextSnake = [head, ...snake];
    if (eating) {
      foodRef.current = randomFood(nextSnake);
      scoreRef.current += 1;
      setScore(scoreRef.current);
      sounds.click();
    } else {
      nextSnake.pop();
    }
    snakeRef.current = nextSnake;
  }, [endGame]);

  // One rAF loop for the whole app session; it only advances the game while
  // `runningRef` is true, and always repaints (cheap) so the board is never blank.
  useEffect(() => {
    const loop = (timestamp: number) => {
      frameRef.current = requestAnimationFrame(loop);
      if (runningRef.current && timestamp - lastStepRef.current >= speed) {
        lastStepRef.current = timestamp;
        tick();
      }
      paintBoard(canvasRef.current, snakeRef.current, foodRef.current);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [speed, tick]);

  // Only burn frames while the game is actually on screen.
  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      runningRef.current = started && !over;
      setActive(started && !over);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (over || !startedRef.current) {
        runningRef.current = false;
        setActive(false);
        return;
      }
      runningRef.current = entry.isIntersecting;
      if (entry.isIntersecting) lastStepRef.current = performance.now();
      setActive(entry.isIntersecting);
    }, { threshold: 0.15 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [over, started]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) runningRef.current = false;
      else if (startedRef.current && !overRef.current) runningRef.current = activeRef.current;
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (over || !started) runningRef.current = false;
  }, [over, started]);

  const start = useCallback((initialDirection?: Direction) => {
    // A snake heading left would start nose-first into a wall, so flip it.
    const heading = initialDirection === 'left' ? 'right' : initialDirection ?? 'right';
    snakeRef.current = START_SNAKE;
    foodRef.current = randomFood(START_SNAKE);
    directionRef.current = heading;
    pendingRef.current = heading;
    scoreRef.current = 0;
    lastStepRef.current = performance.now();
    setScore(0);
    setOver(false);
    setStarted(true);
    runningRef.current = true;
    setActive(true);
    sounds.toggle();
  }, []);

  const steer = useCallback((next: Direction) => {
    if (!started || over) {
      start(next);
      return;
    }
    if (next !== opposite[directionRef.current]) pendingRef.current = next;
  }, [over, start, started]);

  // Keys are only captured while the board has focus, so arrow keys still
  // scroll the page everywhere else.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = KEY_MAP[event.key];
    if (!next) return;
    event.preventDefault();
    steer(next);
    containerRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={() => containerRef.current?.focus()}
      className="flex flex-col items-center gap-4 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
    >
      <div className="flex w-full max-w-sm items-center justify-between px-1 text-xs font-medium text-slate-600">
        <span>Score <span className="font-mono text-cyan-700">{score}</span></span>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-500">{status}</span>
        <span>Best <span className="font-mono text-violet-700">{best}</span></span>
      </div>

      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-3 shadow-[0_10px_30px_rgba(29,29,31,0.08)]">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          role="img"
          aria-label="Snake game board"
          className="h-auto w-full rounded-2xl"
        />

        {/* Nothing runs until the visitor starts: an auto-playing snake eats a
            wall in under two seconds and reads as a broken widget. */}
        {!started && !over && (
          <div className="absolute inset-3 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/85 backdrop-blur-sm">
            <p className="px-4 text-center text-sm text-slate-600">Eat the dots. Avoid the wall. Avoid the wall.</p>
            <button
              type="button"
              onClick={() => start()}
              className="btn-premium rounded-xl px-6 py-2.5 text-sm font-semibold text-slate-700"
            >
              Start
            </button>
          </div>
        )}

        {over && (
          <div className="mt-3 flex flex-col items-center gap-2">
            <p className="text-center text-sm font-medium text-slate-600">
              {score > 0 && score >= best ? 'New personal best. Annoyingly good.' : `Final score: ${score}`}
            </p>
            <button
              type="button"
              onClick={() => start()}
              className="btn-premium w-full rounded-xl py-2.5 text-sm font-semibold text-slate-700"
            >
              Play again
            </button>
          </div>
        )}
      </div>

      <div className="grid w-full max-w-[13rem] grid-cols-3 gap-2">
        {CONTROLS.map((control) => (
          <button
            key={control.direction}
            type="button"
            onClick={() => steer(control.direction)}
            aria-label={`Move ${control.direction}`}
            className={`${control.className} flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/85 text-lg text-slate-600 transition-colors hover:border-cyan-300 hover:text-cyan-700 active:scale-95`}
          >
            {control.label}
          </button>
        ))}
      </div>
      <p className="max-w-sm text-center text-xs text-slate-500">
        Start the run, then steer with the pad, the arrow keys or WASD. Walls are solid, unlike most relationships.
      </p>
    </div>
  );
}
