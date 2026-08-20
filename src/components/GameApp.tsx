import { Heart, Map, Pause, Play, Sparkle, Timer } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { APP_NAME, formatTime, museById, readBest } from "@/game/content";
import type { GameHandle, HudState } from "@/game/engine";
import { cn } from "@/lib/utils";

function tryPointerLock(el: HTMLCanvasElement | null) {
  if (!el || typeof el.requestPointerLock !== "function") return;
  try {
    const ret = el.requestPointerLock() as Promise<void> | void;
    if (ret && typeof ret.catch === "function") void ret.catch(() => {});
  } catch {
    /* preview iframe may deny pointer lock */
  }
}

export function GameApp() {
  const viewRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const lookDrag = useRef<{ id: number; x: number; y: number } | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [how, setHow] = useState(false);
  const [locked, setLocked] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const [best, setBest] = useState<number | null>(null);

  useEffect(() => {
    let g: GameHandle | null = null;
    let dead = false;
    void import("@/game/engine").then(({ createGame }) => {
      if (dead || !viewRef.current || !miniRef.current) return;
      try {
        g = createGame({
          view: viewRef.current,
          minimap: miniRef.current,
          emit: (e) => {
            if (e.type === "hud") setHud(e.state);
            if (e.type === "muse") {
              setWrong(null);
              setLine(null);
            }
            if (e.type === "result") {
              if (e.ok) setLine("The path opens.");
              else {
                setWrong("miss");
                setLine("Not quite.");
              }
            }
          },
        });
        gameRef.current = g;
        setHud(g.getState());
      } catch (err) {
        console.error(err);
      }
    });
    const tick = window.setInterval(() => {
      const s = gameRef.current?.getState();
      if (s) setHud({ ...s });
    }, 200);
    return () => {
      dead = true;
      window.clearInterval(tick);
      g?.dispose();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onLock = () => setLocked(Boolean(document.pointerLockElement));
    document.addEventListener("pointerlockchange", onLock);
    return () => document.removeEventListener("pointerlockchange", onLock);
  }, []);

  useEffect(() => {
    const gameKeys = new Set([
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "KeyE",
      "Space",
    ]);
    const down = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g) return;
      if (e.code === "Escape") {
        const s = g.getState();
        if (s.phase === "playing") g.pause();
        else if (s.phase === "paused") g.resume();
        else if (s.phase === "encounter") g.dismissMuse();
        return;
      }
      if (e.code === "KeyE" || e.code === "Space") {
        if (g.getState().phase === "playing") {
          e.preventDefault();
          g.interact();
        }
      }
      if (gameKeys.has(e.code)) {
        e.preventDefault();
        g.setKey(e.code, true);
      }
    };
    const up = (e: KeyboardEvent) => gameRef.current?.setKey(e.code, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const play = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    setBest(readBest());
    setHow(false);
    setWrong(null);
    setLine(null);
    g.start();
    tryPointerLock(viewRef.current);
  }, []);

  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g) return;
    const s = g.getState();
    if (s.phase === "title") return;
    if (s.phase === "playing" && e.pointerType === "mouse") {
      tryPointerLock(viewRef.current);
    }
    if (s.phase === "playing") {
      lookDrag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    }
  };

  const onCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g) return;
    if (document.pointerLockElement === viewRef.current) {
      g.applyLook(e.movementX, e.movementY);
      return;
    }
    const drag = lookDrag.current;
    if (!drag || drag.id !== e.pointerId) return;
    g.applyLook(e.clientX - drag.x, e.clientY - drag.y);
    drag.x = e.clientX;
    drag.y = e.clientY;
  };

  const endLook = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (lookDrag.current?.id === e.pointerId) lookDrag.current = null;
  };

  const phase = hud?.phase ?? "title";
  const muse = hud?.museId ? museById(hud.museId) : undefined;
  const playing = phase === "playing";

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas
        ref={viewRef}
        className="absolute inset-0 h-full w-full touch-none"
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={endLook}
        onPointerCancel={endLook}
      />

      <canvas
        ref={miniRef}
        width={176}
        height={176}
        className={cn(
          "pointer-events-none absolute right-4 bottom-4 z-10 h-36 w-36 rounded-xl border border-border/80 shadow-[0_8px_30px_rgba(0,0,0,0.28)] md:h-44 md:w-44",
          phase === "title" ? "opacity-0" : "opacity-100",
        )}
        aria-hidden
      />

      {playing && hud && <Hud hud={hud} locked={locked} onPause={() => gameRef.current?.pause()} />}

      {playing && hud?.prompt && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-border bg-surface/90 px-4 py-2 text-sm text-fg backdrop-blur-sm">
          {hud.prompt === "exit" ? "Walk into the portal" : "Approach to charm"}
        </div>
      )}

      {playing && <TouchStick onChange={(x, y) => gameRef.current?.setMoveAxis(x, y)} />}

      {phase === "title" && (
        <TitleScreen
          how={how}
          ready={Boolean(hud)}
          onHow={() => setHow((v) => !v)}
          onPlay={play}
        />
      )}

      {phase === "paused" && (
        <Modal>
          <h2 className="font-display text-3xl tracking-tight">Paused</h2>
          <p className="mt-2 text-sm text-muted">The maze waits.</p>
          <div className="mt-6 flex flex-col gap-2">
            <Button size="lg" onClick={() => gameRef.current?.resume()}>
              Resume
            </Button>
            <Button variant="secondary" onClick={() => gameRef.current?.restart()}>
              New maze
            </Button>
          </div>
        </Modal>
      )}

      {phase === "encounter" && muse && hud && (
        <Encounter
          muse={muse}
          hearts={hud.hearts}
          hint={hud.hint}
          line={line}
          wrong={wrong}
          onPick={(id) => {
            const res = gameRef.current?.answer(id);
            if (res?.ok) setLine(muse.success);
            else if (res) setLine(muse.fail);
          }}
          onBack={() => gameRef.current?.dismissMuse()}
        />
      )}

      {phase === "win" && hud && (
        <Modal>
          <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
            Exit found
          </p>
          <h2 className="mt-2 font-display text-4xl tracking-tight">You made it</h2>
          <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
            <Stat label="Time" value={formatTime(hud.time)} />
            <Stat label="Stars" value={`${hud.stars}/${hud.starTotal}`} />
            <Stat label="Charmed" value={`${hud.charmed}/4`} />
          </dl>
          {(best != null || hud.time) && (
            <p className="mt-4 text-sm text-muted">
              Best {formatTime(Math.min(best ?? hud.time, hud.time))}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-2">
            <Button size="lg" onClick={() => gameRef.current?.restart()}>
              Play again
            </Button>
          </div>
        </Modal>
      )}

      {phase === "lose" && (
        <Modal>
          <h2 className="font-display text-4xl tracking-tight">Out of sparks</h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            A wrong guess spent the last spark. The muses still hold the halls.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button size="lg" onClick={() => gameRef.current?.restart()}>
              Try another maze
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-elevated px-2 py-3">
      <dt className="text-[11px] tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-bg/55 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-[0_16px_50px_rgba(0,0,0,0.35)] md:p-8">
        {children}
      </div>
    </div>
  );
}

function Hud({
  hud,
  locked,
  onPause,
}: {
  hud: HudState;
  locked: boolean;
  onPause: () => void;
}) {
  return (
    <>
      <div className="pointer-events-none absolute top-4 left-4 z-10 flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface/85 px-2.5 py-1.5 backdrop-blur-sm">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart
              key={i}
              className={cn("size-4", i < hud.hearts ? "fill-heart text-heart" : "text-subtle")}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/85 px-2.5 py-1.5 text-sm tabular-nums backdrop-blur-sm">
          <Sparkle className="size-3.5 text-accent" />
          {hud.stars}/{hud.starTotal}
        </div>
      </div>
      <div className="pointer-events-none absolute top-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-lg border border-border bg-surface/85 px-3 py-1.5 text-sm tabular-nums backdrop-blur-sm">
        <Timer className="size-3.5 text-muted" />
        {formatTime(hud.time)}
      </div>
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <div className="pointer-events-none hidden items-center gap-1.5 rounded-lg border border-border bg-surface/85 px-2.5 py-1.5 text-xs text-muted backdrop-blur-sm md:flex">
          <Map className="size-3.5" />
          Explored {Math.round((hud.explored / hud.cellTotal) * 100)}%
        </div>
        <Button variant="secondary" size="sm" onClick={onPause} aria-label="Pause">
          <Pause className="size-4" />
        </Button>
      </div>
      {!locked && (
        <p className="pointer-events-none absolute bottom-4 left-4 hidden text-xs text-muted md:block">
          Click to look · WASD move · Esc pause
        </p>
      )}
    </>
  );
}

function TitleScreen({
  how,
  ready,
  onHow,
  onPlay,
}: {
  how: boolean;
  ready: boolean;
  onHow: () => void;
  onPlay: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-bg via-bg/55 to-transparent p-5 md:justify-center md:p-12">
      <header className="absolute top-4 right-4">
        <AuthChip />
      </header>
      <div className="max-w-lg rounded-xl border border-border bg-surface/90 p-6 backdrop-blur-sm md:p-8">
        <p className="text-xs font-medium tracking-[0.2em] text-muted uppercase">Third-person maze</p>
        <h1 className="mt-2 font-display text-4xl leading-none tracking-tight md:text-5xl">
          {APP_NAME}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
          Wander pastel corridors, collect hidden stars, and charm four original muses by naming
          the accessory that completes their look. Find the glowing exit before your sparks run out.
        </p>
        {how && (
          <ul className="mt-4 space-y-2 text-sm text-fg">
            <li>WASD or stick to move. Mouse or drag to look.</li>
            <li>Stars light the halls. The minimap fills as you explore.</li>
            <li>Each muse asks one riddle. The clue is on their outfit.</li>
            <li>Three sparks. A miss costs one. Reach the teal portal to win.</li>
          </ul>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button size="lg" onClick={onPlay} disabled={!ready} className="sm:flex-1">
            <Play className="size-4" />
            Play
          </Button>
          <Button variant="secondary" size="lg" onClick={onHow} className="sm:flex-1">
            {how ? "Hide guide" : "How to play"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Encounter({
  muse,
  hearts,
  hint,
  line,
  wrong,
  onPick,
  onBack,
}: {
  muse: NonNullable<ReturnType<typeof museById>>;
  hearts: number;
  hint: boolean;
  line: string | null;
  wrong: string | null;
  onPick: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-stretch justify-center bg-bg/70 p-3 backdrop-blur-[2px] md:p-8">
      <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.4)] md:flex-row">
        <div className="relative h-48 shrink-0 bg-elevated md:h-auto md:w-[42%]">
          <video
            key={muse.id}
            className="h-full w-full object-cover"
            src={muse.video}
            poster={muse.portrait}
            autoPlay
            loop
            muted
            playsInline
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/80 to-transparent p-4">
            <p className="text-xs tracking-[0.16em] text-muted uppercase">{muse.title}</p>
            <p className="font-display text-2xl">{muse.name}</p>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 md:p-7">
          <div className="flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                className={cn("size-4", i < hearts ? "fill-heart text-heart" : "text-subtle")}
              />
            ))}
          </div>
          <p className="text-sm leading-relaxed text-fg">{line ?? muse.greeting}</p>
          {hint && <p className="text-sm text-muted">{muse.hint}</p>}
          <div className="mt-auto flex flex-col gap-2">
            {muse.options.map((opt) => (
              <Button
                key={opt.id}
                variant="choice"
                size="choice"
                className="w-full justify-start"
                onClick={() => onPick(opt.id)}
              >
                {opt.label}
              </Button>
            ))}
            <Button variant="ghost" onClick={onBack}>
              Step back
            </Button>
          </div>
          {wrong && <span className="sr-only">Wrong accessory</span>}
        </div>
      </div>
    </div>
  );
}

function AuthChip() {
  const { isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-8 w-24 animate-pulse rounded-md bg-elevated" />;
  }
  return (
    <div className="rounded-lg border border-border bg-surface/90 px-3 py-1.5 text-sm backdrop-blur-sm">
      <SignedIn>
        <UserButton />
      </SignedIn>
      <SignedOut>
        <a href="/login" className="text-sm text-fg hover:text-accent">
          Sign in
        </a>
      </SignedOut>
    </div>
  );
}

function TouchStick({ onChange }: { onChange: (x: number, y: number) => void }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, on: false });

  const end = () => {
    setKnob({ x: 0, y: 0, on: false });
    onChange(0, 0);
  };

  const move = (clientX: number, clientY: number) => {
    const el = base.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    const cx = b.left + b.width / 2;
    const cy = b.top + b.height / 2;
    let x = (clientX - cx) / (b.width / 2);
    let y = (cy - clientY) / (b.height / 2);
    const m = Math.hypot(x, y);
    if (m > 1) {
      x /= m;
      y /= m;
    }
    setKnob({ x, y, on: true });
    onChange(x, y);
  };

  return (
    <div
      ref={base}
      className="absolute bottom-6 left-4 z-10 h-28 w-28 rounded-full border border-border bg-surface/45 backdrop-blur-sm md:hidden"
      onPointerDown={(e) => {
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        move(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e.clientX, e.clientY);
      }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="absolute top-1/2 left-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg/80"
        style={{
          transform: `translate(calc(-50% + ${knob.x * 36}px), calc(-50% + ${-knob.y * 36}px))`,
        }}
      />
    </div>
  );
}
