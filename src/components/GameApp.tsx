import {
  Copy,
  Heart,
  LogIn,
  Map,
  Mic,
  MicOff,
  Pause,
  Play,
  Sparkle,
  Sword,
  Timer,
  UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import {
  APP_NAME,
  SIZES,
  THEMES,
  formatTime,
  makeRoomCode,
  shrineById,
  readBest,
  type SizeId,
  type ThemeId,
} from "@/game/content";
import { ECHO_LABEL, type EchoStep } from "@/game/shrine";
import type { GameHandle, HudState, HuntSettings } from "@/game/engine";
import { P2PRoom, type PeerInfo } from "@/lib/multiplayer";
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

export function GameApp({ roomCode }: { roomCode?: string }) {
  const navigate = useNavigate();
  const viewRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const lookDrag = useRef<{ id: number; x: number; y: number } | null>(null);
  const p2pRef = useRef<P2PRoom | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [how, setHow] = useState(false);
  const [locked, setLocked] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [line, setLine] = useState<string | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [sizeId, setSizeId] = useState<SizeId>("medium");
  const [themeId, setThemeId] = useState<ThemeId>("victorian");
  const [aiCount, setAiCount] = useState(0);
  const [copied, setCopied] = useState<"link" | "code" | false>(false);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [joinNote, setJoinNote] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [readyIds, setReadyIds] = useState<Record<string, boolean>>({});
  const [matchLive, setMatchLive] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const [hostId, setHostId] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [voiceErr, setVoiceErr] = useState<string | null>(null);
  const selfIdRef = useRef(`p-${Math.random().toString(36).slice(2, 10)}`);
  const readyRef = useRef(false);
  const readyIdsRef = useRef<Record<string, boolean>>({});

  const isHost = useMemo(() => {
    if (!roomCode) return true;
    try {
      return sessionStorage.getItem("huntHost") === roomCode;
    } catch {
      return false;
    }
  }, [roomCode]);

  const settings: HuntSettings = useMemo(
    () => ({ sizeId, themeId, aiCount }),
    [sizeId, themeId, aiCount],
  );
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  readyRef.current = ready;
  readyIdsRef.current = readyIds;

  const lobbyPacket = useCallback(() => {
    const selfId = selfIdRef.current;
    const partyNames: Record<string, string> = {
      [selfId]: isHost ? "Host" : "Hunter",
      ...names,
    };
    return {
      t: "lobby" as const,
      size: settingsRef.current.sizeId,
      theme: settingsRef.current.themeId,
      ai: settingsRef.current.aiCount,
      ready: { ...readyIdsRef.current, [selfId]: isHost ? true : readyRef.current },
      names: partyNames,
      hostId: isHost ? selfId : hostId,
      live: matchLive,
    };
  }, [isHost, names, hostId, matchLive]);
  const lobbyPacketRef = useRef(lobbyPacket);
  lobbyPacketRef.current = lobbyPacket;

  useEffect(() => {
    let g: GameHandle | null = null;
    let dead = false;
    void import("@/game/engine").then(({ createGame }) => {
      if (dead || !viewRef.current || !miniRef.current) return;
      try {
        g = createGame({
          view: viewRef.current,
          minimap: miniRef.current,
          settings,
          emit: (e) => {
            if (e.type === "hud") setHud(e.state);
            if (e.type === "echo") {
              setWrong(null);
              setLine(null);
            }
            if (e.type === "result") {
              if (e.ok) setLine(`Armed: ${e.weaponName}`);
              else setWrong("miss");
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
    // created once; configure() applies later settings
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!line) return;
    const t = window.setTimeout(() => setLine(null), 2400);
    return () => window.clearTimeout(t);
  }, [line]);

  useEffect(() => {
    if (!roomCode) return;
    const selfId = selfIdRef.current;
    const host = isHost;
    const p2p = new P2PRoom({
      room: roomCode,
      selfId,
      name: host ? "Host" : "Hunter",
      onPeersChanged: (list) => {
        const capped = list.slice(0, 3);
        setPeers(capped);
        const g = gameRef.current;
        if (!g) return;
        for (const p of capped) g.syncPeer(p.id, p.name, true);
        if (host) {
          window.setTimeout(() => p2p.send(lobbyPacketRef.current()), 40);
        }
      },
      onChannelOpen: (peerId) => {
        if (host) p2p.send(lobbyPacketRef.current(), peerId);
        else {
          p2p.send({ t: "hello", name: "Hunter", ready: readyRef.current }, peerId);
        }
      },
      onMessage: (from, data) => {
        if (!data || typeof data !== "object") return;
        const msg = data as Record<string, unknown>;
        if (msg.t === "hello") {
          setNames((prev) => ({ ...prev, [from]: String(msg.name ?? "Hunter") }));
          setReadyIds((prev) => ({ ...prev, [from]: Boolean(msg.ready) }));
          if (host) p2p.send(lobbyPacketRef.current());
          return;
        }
        if (msg.t === "lobby") {
          const readyMap = (msg.ready as Record<string, boolean>) ?? {};
          setReadyIds(readyMap);
          if (typeof readyMap[selfId] === "boolean") setReady(Boolean(readyMap[selfId]));
          if (msg.names && typeof msg.names === "object") {
            setNames(msg.names as Record<string, string>);
          }
          if (typeof msg.hostId === "string") setHostId(msg.hostId);
          if (typeof msg.live === "boolean") setMatchLive(msg.live);
          const nextSize = (msg.size as SizeId) || settingsRef.current.sizeId;
          const nextTheme = (msg.theme as ThemeId) || settingsRef.current.themeId;
          const nextAi = typeof msg.ai === "number" ? msg.ai : settingsRef.current.aiCount;
          const changed =
            nextSize !== settingsRef.current.sizeId ||
            nextTheme !== settingsRef.current.themeId ||
            nextAi !== settingsRef.current.aiCount;
          if (msg.size) setSizeId(nextSize);
          if (msg.theme) setThemeId(nextTheme);
          if (typeof msg.ai === "number") setAiCount(nextAi);
          if (!host && changed) {
            gameRef.current?.configure({ sizeId: nextSize, themeId: nextTheme, aiCount: nextAi });
          }
          return;
        }
        if (msg.t === "ready") {
          setReadyIds((prev) => ({ ...prev, [from]: Boolean(msg.on) }));
          return;
        }
        if (msg.t === "start") {
          setMatchLive(true);
          const seed = Number(msg.seed);
          const cur = settingsRef.current;
          const next: HuntSettings = {
            sizeId: (msg.size as SizeId) ?? cur.sizeId,
            themeId: (msg.theme as ThemeId) ?? cur.themeId,
            aiCount: Number(msg.ai) || cur.aiCount,
            seed,
          };
          const g = gameRef.current;
          if (!g) return;
          g.configure(next);
          g.start();
          tryPointerLock(viewRef.current);
          return;
        }
        gameRef.current?.onNetMessage(from, data);
      },
    });
    p2pRef.current = p2p;
    void p2p.join().then(() => {
      gameRef.current?.attachNet({
        role: host ? "host" : "client",
        selfId,
        broadcast: (d) => p2p.broadcast(d),
        send: (d, to) => p2p.send(d, to),
      });
      setNames((prev) => ({ ...prev, [selfId]: host ? "Host" : "Hunter" }));
      if (host) {
        setHostId(selfId);
        setReadyIds((prev) => ({ ...prev, [selfId]: true }));
        setReady(true);
        setJoinNote("Lobby live — share the hunt code. Settings sync to guests.");
        p2p.send(lobbyPacketRef.current());
      } else {
        setJoinNote("Connected — settings follow the host. Ready up when you are.");
        p2p.send({ t: "hello", name: "Hunter", ready: false });
      }
    });
    return () => {
      p2p.setLocalAudio(null);
      p2p.close();
      p2pRef.current = null;
    };
  }, [roomCode, isHost]);

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
      "KeyF",
      "Space",
    ]);
    const down = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g) return;
      if (e.code === "Escape") {
        const s = g.getState();
        if (s.phase === "playing") g.pause();
        else if (s.phase === "paused") g.resume();
        else if (s.phase === "echo") g.dismissEcho();
        return;
      }
      if (e.code === "KeyF") {
        if (g.getState().phase === "playing") {
          e.preventDefault();
          g.toggleWall();
        }
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
    if (roomCode && !isHost) return;
    const seed = Date.now() % 1_000_000_007;
    const next = { ...settings, seed };
    if (roomCode && isHost) {
      p2pRef.current?.send({
        t: "start",
        seed,
        size: settings.sizeId,
        theme: settings.themeId,
        ai: settings.aiCount,
      });
      setMatchLive(true);
    }
    g.configure(next);
    g.start();
    tryPointerLock(viewRef.current);
  }, [settings, roomCode, isHost]);

  const toMenu = useCallback(() => {
    setHow(false);
    setWrong(null);
    setLine(null);
    setMatchLive(false);
    document.exitPointerLock?.();
    gameRef.current?.toMenu();
  }, []);

  const toggleReady = useCallback(() => {
    const next = !ready;
    setReady(next);
    setReadyIds((prev) => ({ ...prev, [selfIdRef.current]: next }));
    p2pRef.current?.send({ t: "ready", on: next });
  }, [ready]);

  useEffect(() => {
    if (!roomCode || !isHost) return;
    p2pRef.current?.send(lobbyPacketRef.current());
  }, [roomCode, isHost, sizeId, themeId, aiCount, readyIds, matchLive, peers.length]);

  const toggleVoice = useCallback(async () => {
    const p2p = p2pRef.current;
    if (!p2p) return;
    if (voiceOn) {
      p2p.setLocalAudio(null);
      setVoiceOn(false);
      setMicOn(true);
      setVoiceErr(null);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      p2p.setLocalAudio(stream);
      setVoiceOn(true);
      setMicOn(true);
      setVoiceErr(null);
    } catch {
      setVoiceErr("Mic blocked — allow microphone for this tab.");
    }
  }, [voiceOn]);

  const toggleMic = useCallback(() => {
    const next = !micOn;
    setMicOn(next);
    p2pRef.current?.setMicEnabled(next);
  }, [micOn]);

  const createInvite = useCallback(() => {
    const code = makeRoomCode();
    try {
      sessionStorage.setItem("huntHost", code);
    } catch {
      /* ignore */
    }
    void navigate({ to: "/", search: { room: code } });
  }, [navigate]);

  const copyInvite = useCallback(async () => {
    if (!roomCode) return;
    const url = `${window.location.origin}/?room=${roomCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied("link");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }, [roomCode]);

  const copyCode = useCallback(async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied("code");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }, [roomCode]);

  const joinHunt = useCallback(
    (raw: string) => {
      const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      if (code.length < 4) return;
      try {
        sessionStorage.removeItem("huntHost");
      } catch {
        /* ignore */
      }
      void navigate({ to: "/", search: { room: code } });
    },
    [navigate],
  );

  const leaveHunt = useCallback(() => {
    try {
      sessionStorage.removeItem("huntHost");
    } catch {
      /* ignore */
    }
    p2pRef.current?.setLocalAudio(null);
    setVoiceOn(false);
    setVoiceErr(null);
    setPeers([]);
    setReady(false);
    setReadyIds({});
    setNames({});
    setHostId(null);
    setMatchLive(false);
    void navigate({ to: "/", search: { room: undefined } });
  }, [navigate]);

  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g) return;
    const s = g.getState();
    if (s.phase === "title") return;
    if (s.phase === "echo" && e.button === 0) {
      g.shoot();
      return;
    }
    if (s.phase === "playing" && e.pointerType === "mouse") {
      tryPointerLock(viewRef.current);
      if (e.button === 0) g.shoot();
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
  const shrine = hud?.shrineId ? shrineById(hud.shrineId) : undefined;
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
        width={256}
        height={256}
        className={cn(
          "pointer-events-none absolute right-4 bottom-4 z-10 h-44 w-44 rounded-xl border border-border/80 shadow-[0_8px_30px_rgba(0,0,0,0.28)] md:h-52 md:w-52",
          phase === "title" ? "opacity-0" : "opacity-100",
        )}
        aria-hidden
      />

      {line && (
        <div className="pointer-events-none absolute top-20 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-border bg-surface/92 px-4 py-2 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
          {line}
        </div>
      )}

      {playing && hud && (
        <>
          <Hud hud={hud} locked={locked} onPause={() => gameRef.current?.pause()} />
          <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="h-4 w-px bg-fg/70" />
            <div className="absolute top-1/2 left-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 bg-fg/70" />
          </div>
        </>
      )}

      {playing && roomCode && (
        <div className="absolute bottom-4 left-4 z-20 flex gap-2">
          <Button size="sm" variant={voiceOn ? "primary" : "secondary"} onClick={() => void toggleVoice()}>
            {voiceOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
            {voiceOn ? "Voice on" : "Voice"}
          </Button>
          {voiceOn && (
            <Button size="sm" variant={micOn ? "secondary" : "ghost"} onClick={toggleMic}>
              {micOn ? "Mute" : "Unmute"}
            </Button>
          )}
        </div>
      )}

      {playing && hud?.prompt && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-border bg-surface/90 px-4 py-2 text-sm text-fg backdrop-blur-sm">
          {hud.prompt === "exit"
            ? "Walk into the portal"
            : hud.prompt === "wall"
              ? hud.wallMode === "add"
                ? "Ghost wall — F to RAISE it (costs a diamond)"
                : "Ghost wall — F to DROP it (costs a diamond)"
              : "Approach the shrine — listen, then repeat WASD + fire"}
        </div>
      )}

      {playing && (
        <TouchStick
          onChange={(x, y) => gameRef.current?.setMoveAxis(x, y)}
          onFire={() => gameRef.current?.shoot()}
          onWall={() => gameRef.current?.toggleWall()}
        />
      )}

      {phase === "title" && (
        <TitleScreen
          how={how}
          engineReady={Boolean(hud)}
          sizeId={sizeId}
          themeId={themeId}
          aiCount={aiCount}
          roomCode={roomCode}
          isHost={isHost}
          copied={copied}
          peers={peers}
          joinNote={joinNote}
          playerReady={ready}
          readyCount={Object.values(readyIds).filter(Boolean).length}
          readyIds={readyIds}
          matchLive={matchLive}
          names={names}
          hostId={hostId}
          selfId={selfIdRef.current}
          voiceOn={voiceOn}
          micOn={micOn}
          voiceErr={voiceErr}
          onHow={() => setHow((v) => !v)}
          onPlay={play}
          onReady={toggleReady}
          onSize={setSizeId}
          onTheme={setThemeId}
          onAi={setAiCount}
          onInvite={createInvite}
          onCopy={copyInvite}
          onCopyCode={copyCode}
          onJoin={joinHunt}
          onLeave={leaveHunt}
          onVoice={toggleVoice}
          onMic={toggleMic}
        />
      )}

      {phase === "paused" && (
        <Modal>
          <h2 className="font-display text-3xl tracking-tight">Paused</h2>
          <p className="mt-2 text-sm text-muted">The hunt waits.</p>
          <div className="mt-6 flex flex-col gap-2">
            <Button size="lg" onClick={() => gameRef.current?.resume()}>
              Resume
            </Button>
            <Button variant="secondary" onClick={() => gameRef.current?.restart()}>
              New maze
            </Button>
            <Button variant="ghost" onClick={toMenu}>
              Main menu
            </Button>
          </div>
        </Modal>
      )}

      {phase === "echo" && shrine && hud && (
        <EchoPanel
          shrine={shrine}
          length={hud.echoPattern.length}
          input={hud.echoInput}
          flash={hud.echoFlash}
          beat={hud.echoBeat}
          status={hud.echoStatus}
          diamonds={hud.diamondHeld}
          onStep={(step) => gameRef.current?.echoStep(step)}
          onBack={() => gameRef.current?.dismissEcho()}
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
            <Stat label="Diamonds" value={`${hud.diamondHeld}/${hud.diamondTotal}`} />
            <Stat label="Shrines" value={`${hud.solved}/${hud.shrineTotal}`} />
          </dl>
          {(best != null || hud.time) && (
            <p className="mt-4 text-sm text-muted">
              Best {formatTime(Math.min(best ?? hud.time, hud.time))}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-2">
            <Button size="lg" onClick={() => gameRef.current?.restart()}>
              Hunt again
            </Button>
            <Button variant="secondary" onClick={toMenu}>
              Main menu
            </Button>
          </div>
        </Modal>
      )}

      {phase === "lose" && (
        <Modal>
          <h2 className="font-display text-4xl tracking-tight">Downed</h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            You will return at the gate. Diamonds you carried were claimed.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button size="lg" onClick={() => gameRef.current?.restart()}>
              Try another maze
            </Button>
            <Button variant="secondary" onClick={toMenu}>
              Main menu
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
          {hud.diamondHeld}/{hud.diamondTotal}
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/85 px-2.5 py-1.5 text-sm backdrop-blur-sm">
          <Sword className="size-3.5 text-muted" />
          {hud.weaponName}
        </div>
      </div>
      <div className="pointer-events-none absolute top-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-lg border border-border bg-surface/85 px-3 py-1.5 text-sm tabular-nums backdrop-blur-sm">
        <Timer className="size-3.5 text-muted" />
        {formatTime(hud.time)}
        <span className="mx-1 text-subtle">·</span>
        {hud.portal ? "Portal open" : "Portal sealed"}
      </div>
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <div className="pointer-events-none hidden items-center gap-1.5 rounded-lg border border-border bg-surface/85 px-2.5 py-1.5 text-xs text-muted backdrop-blur-sm md:flex">
          <Map className="size-3.5" />
          {hud.solved}/{hud.shrineTotal} shrines
        </div>
        <Button variant="secondary" size="sm" onClick={onPause} aria-label="Pause">
          <Pause className="size-4" />
        </Button>
      </div>
      {!locked && (
        <p className="pointer-events-none absolute bottom-4 left-4 hidden text-xs text-muted md:block">
          Click to look · WASD · LMB fire · F wall · Esc pause
        </p>
      )}
      {hud.dead && (
        <p className="pointer-events-none absolute top-1/3 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-border bg-surface/90 px-4 py-2 text-sm">
          Downed — returning to the gate
        </p>
      )}
    </>
  );
}

function TitleScreen({
  how,
  engineReady,
  sizeId,
  themeId,
  aiCount,
  roomCode,
  isHost,
  copied,
  peers,
  joinNote,
  playerReady,
  readyCount,
  readyIds,
  matchLive,
  onHow,
  onPlay,
  onReady,
  onSize,
  onTheme,
  onAi,
  onInvite,
  onCopy,
  onCopyCode,
  onJoin,
  onLeave,
  names,
  hostId,
  selfId,
  voiceOn,
  micOn,
  voiceErr,
  onVoice,
  onMic,
}: {
  how: boolean;
  engineReady: boolean;
  sizeId: SizeId;
  themeId: ThemeId;
  aiCount: number;
  roomCode?: string;
  isHost: boolean;
  copied: "link" | "code" | false;
  peers: PeerInfo[];
  joinNote: string | null;
  playerReady: boolean;
  readyCount: number;
  readyIds: Record<string, boolean>;
  matchLive: boolean;
  onHow: () => void;
  onPlay: () => void;
  onReady: () => void;
  onSize: (id: SizeId) => void;
  onTheme: (id: ThemeId) => void;
  onAi: (n: number) => void;
  onInvite: () => void;
  onCopy: () => void;
  onCopyCode: () => void;
  onJoin: (code: string) => void;
  onLeave: () => void;
  names: Record<string, string>;
  hostId: string | null;
  selfId: string;
  voiceOn: boolean;
  micOn: boolean;
  voiceErr: string | null;
  onVoice: () => void;
  onMic: () => void;
}) {
  const [joinCode, setJoinCode] = useState("");
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-bg via-bg/70 to-transparent p-4 md:justify-center md:p-10">
      <header className="absolute top-4 right-4">
        <AuthChip />
      </header>
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface/92 p-5 backdrop-blur-sm md:p-7">
        <p className="text-xs font-medium tracking-[0.2em] text-muted uppercase">
          First-person diamond hunt
        </p>
        <h1 className="mt-2 font-display text-4xl leading-none tracking-tight md:text-5xl">
          {APP_NAME}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Race AI hunters for diamonds. Spend a diamond to raise or drop a wall. Echo shrines arm
          you — listen to the pattern, repeat it with WASD and fire. Weapon quality scales with gems
          you hold. The exit stays sealed until every shrine is solved and every diamond is found.
        </p>

        {roomCode && (
          <div className="mt-4 rounded-lg border border-border bg-elevated px-3 py-2 text-sm">
            Hunt code <span className="font-medium tracking-wider">{roomCode}</span>
            {` · party ${Math.min(4, peers.length + 1)}/4`}
            {isHost ? ` · ${readyCount} ready` : " · guest"}
            {joinNote ? ` · ${joinNote}` : ""}
            {matchLive ? " · hunt live" : ""}
            {voiceErr ? ` · ${voiceErr}` : ""}
            <p className="mt-1 text-xs text-muted">
              Friends join from the lobby with this code, or open the invite link.
            </p>
          </div>
        )}

        {!roomCode && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-elevated p-3">
              <p className="text-xs tracking-[0.16em] text-muted uppercase">Host a hunt</p>
              <p className="mt-1 text-sm text-muted">Make a lobby. Share the code. Settings stay in sync.</p>
              <Button variant="secondary" size="lg" className="mt-3 w-full" onClick={onInvite}>
                <UserPlus className="size-4" />
                Create lobby
              </Button>
            </div>
            <form
              className="rounded-lg border border-accent/40 bg-elevated p-3"
              onSubmit={(e) => {
                e.preventDefault();
                onJoin(joinCode);
              }}
            >
              <p className="text-xs tracking-[0.16em] text-muted uppercase">Join a hunt</p>
              <p className="mt-1 text-sm text-muted">Paste the host’s 5-character hunt code.</p>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. 7K2QM"
                maxLength={8}
                spellCheck={false}
                autoCapitalize="characters"
                className="mt-3 min-h-10 w-full rounded-md border border-border bg-surface px-3 font-medium tracking-[0.18em] text-fg placeholder:tracking-normal placeholder:text-muted"
                aria-label="Hunt code"
              />
              <Button type="submit" size="lg" className="mt-2 w-full" disabled={joinCode.trim().length < 4}>
                <LogIn className="size-4" />
                Join hunt
              </Button>
            </form>
          </div>
        )}

        {roomCode && (
          <ul className="mt-3 space-y-1.5 text-sm">
            <li className="flex items-center justify-between rounded-md border border-border bg-elevated px-3 py-1.5">
              <span>
                {names[selfId] ?? (isHost ? "Host" : "Hunter")}
                {isHost || hostId === selfId ? " · host" : ""}
                {" · you"}
              </span>
              <span className="text-xs tracking-wide text-muted uppercase">
                {isHost || playerReady ? "Ready" : "Not ready"}
              </span>
            </li>
            {peers.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-md border border-border bg-elevated px-3 py-1.5"
              >
                <span>
                  {names[p.id] ?? p.name}
                  {hostId === p.id ? " · host" : ""}
                  <span className="ml-2 text-xs text-muted">{p.connectionState}</span>
                </span>
                <span className="text-xs tracking-wide text-muted uppercase">
                  {p.connectionState !== "connected"
                    ? p.connectionState
                    : readyIds[p.id]
                      ? "Ready"
                      : "Not ready"}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 grid gap-4">
          <fieldset>
            <legend className="mb-2 text-xs tracking-[0.16em] text-muted uppercase">
              Map size{roomCode && !isHost ? " · host locked" : ""}
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {SIZES.map((s) => (
                <Choice
                  key={s.id}
                  active={sizeId === s.id}
                  label={s.label}
                  hint={s.hint}
                  onClick={() => {
                    if (isHost) onSize(s.id);
                  }}
                />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-xs tracking-[0.16em] text-muted uppercase">Map type</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {THEMES.map((t) => (
                <Choice
                  key={t.id}
                  active={themeId === t.id}
                  label={t.label}
                  hint={t.hint}
                  onClick={() => {
                    if (isHost) onTheme(t.id);
                  }}
                />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-xs tracking-[0.16em] text-muted uppercase">
              AI hunters
            </legend>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((n) => (
                <Choice
                  key={n}
                  active={aiCount === n}
                  label={n === 0 ? "Solo" : `${n}`}
                  hint={n === 0 ? "No rivals" : n === 1 ? "Rival" : "Rivals"}
                  onClick={() => {
                    if (isHost) onAi(n);
                  }}
                />
              ))}
            </div>
          </fieldset>
        </div>

        {how && (
          <ul className="mt-4 space-y-2 text-sm text-fg">
            <li>WASD to move. Mouse to look. Click to fire once you have a weapon.</li>
            <li>A ghost wall shows before you spend a diamond. F commits.</li>
            <li>Each shrine plays a pattern. Repeat it with WASD + fire to take its weapon.</li>
            <li>A correct echo reveals a minimap quadrant. A miss mutates the tune and a wall.</li>
            <li>Solo mode has no AI rivals. Add 1–4 hunters if you want a fight.</li>
            <li>Host creates a lobby, shares the hunt code. Guests Join hunt. Map settings sync live.</li>
            <li>Turn on Voice in the lobby to talk over the same connection.</li>
          </ul>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {(!roomCode || isHost) && (
            <Button size="lg" onClick={onPlay} disabled={!engineReady} className="sm:flex-1">
              <Play className="size-4" />
              {roomCode ? "Start hunt" : "Play"}
            </Button>
          )}
          {roomCode && !isHost && (
            <Button size="lg" onClick={onReady} disabled={!engineReady || matchLive} className="sm:flex-1">
              {playerReady ? "Ready" : "Click to ready"}
            </Button>
          )}
          {roomCode && (
            <Button
              variant={voiceOn ? "primary" : "secondary"}
              size="lg"
              onClick={onVoice}
              className="sm:flex-1"
            >
              {voiceOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
              {voiceOn ? "Voice on" : "Enable voice"}
            </Button>
          )}
          {roomCode && voiceOn && (
            <Button variant="ghost" size="lg" onClick={onMic}>
              {micOn ? "Mute mic" : "Unmute mic"}
            </Button>
          )}
          {roomCode && isHost && (
            <>
              <Button variant="secondary" size="lg" onClick={onCopy} className="sm:flex-1">
                <Copy className="size-4" />
                {copied === "link" ? "Link copied" : "Copy invite link"}
              </Button>
              <Button variant="secondary" size="lg" onClick={onCopyCode} className="sm:flex-1">
                {copied === "code" ? "Code copied" : "Copy hunt code"}
              </Button>
            </>
          )}
          {roomCode && (
            <Button variant="ghost" size="lg" onClick={onLeave}>
              Leave lobby
            </Button>
          )}
          <Button variant="ghost" size="lg" onClick={onHow}>
            {how ? "Hide guide" : "How to play"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Choice({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-2 text-left transition-colors",
        active
          ? "border-accent bg-elevated text-fg"
          : "border-border bg-surface text-muted hover:text-fg",
      )}
    >
      <div className="text-sm font-medium text-fg">{label}</div>
      <div className="mt-0.5 text-[11px] leading-snug text-muted">{hint}</div>
    </button>
  );
}

function EchoPanel({
  shrine,
  length,
  input,
  flash,
  beat,
  status,
  diamonds,
  onStep,
  onBack,
}: {
  shrine: NonNullable<ReturnType<typeof shrineById>>;
  length: number;
  input: EchoStep[];
  flash: EchoStep | null;
  beat: number;
  status: "listen" | "repeat" | "fail" | null;
  diamonds: number;
  onStep: (step: EchoStep) => void;
  onBack: () => void;
}) {
  const copy =
    status === "listen"
      ? "Listen. Watch the pads. Don't touch anything yet."
      : status === "fail"
        ? "Off-beat. A wall shifted and the echo mutated — listen again."
        : "Repeat the echo. WASD and fire.";
  const slots = Array.from({ length: Math.max(1, length) });
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-center bg-gradient-to-t from-bg/85 via-bg/30 to-transparent p-3 md:p-5">
      <div
        className={cn(
          "w-full max-w-lg rounded-xl border bg-surface/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.4)] md:p-6",
          status === "fail" ? "border-heart" : "border-border",
        )}
      >
        <p className="text-xs tracking-[0.16em] text-muted uppercase">{shrine.title}</p>
        <h2 className="mt-1 font-display text-3xl tracking-tight">{shrine.name}</h2>
        <p className="mt-2 text-sm text-muted">{shrine.hint}</p>
        <p className="mt-3 text-sm text-fg">{copy}</p>
        <p className="mt-1 text-xs text-muted">{diamonds} diamonds on you — weapon quality scales</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {slots.map((_, i) => (
            <span
              key={i}
              className={cn(
                "inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border px-2 py-1 text-center text-sm font-medium",
                status === "listen" && i === beat
                  ? "border-accent bg-accent text-accent-fg"
                  : i < input.length
                    ? "border-accent/60 bg-elevated text-fg"
                    : "border-border bg-elevated text-muted",
              )}
            >
              {i < input.length ? ECHO_LABEL[input[i]!] : "·"}
            </span>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div />
          <Pad lit={flash === "w"} disabled={status !== "repeat"} label="W" onClick={() => onStep("w")} />
          <div />
          <Pad lit={flash === "a"} disabled={status !== "repeat"} label="A" onClick={() => onStep("a")} />
          <Pad lit={flash === "s"} disabled={status !== "repeat"} label="S" onClick={() => onStep("s")} />
          <Pad lit={flash === "d"} disabled={status !== "repeat"} label="D" onClick={() => onStep("d")} />
          <Button
            variant="choice"
            size="choice"
            className={cn("col-span-3 justify-center", flash === "f" && "border-accent bg-accent/20")}
            disabled={status !== "repeat"}
            onClick={() => onStep("f")}
          >
            Fire
          </Button>
        </div>
        <Button variant="ghost" className="mt-3 w-full" onClick={onBack}>
          Step back
        </Button>
      </div>
    </div>
  );
}

function Pad({
  lit,
  disabled,
  label,
  onClick,
}: {
  lit: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="choice"
      size="choice"
      className={cn("justify-center text-lg", lit && "border-accent bg-accent/25")}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </Button>
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

function TouchStick({
  onChange,
  onFire,
  onWall,
}: {
  onChange: (x: number, y: number) => void;
  onFire: () => void;
  onWall: () => void;
}) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const end = () => {
    setKnob({ x: 0, y: 0 });
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
    setKnob({ x, y });
    onChange(x, y);
  };

  return (
    <>
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
      <div className="absolute right-4 bottom-44 z-10 flex flex-col gap-2 md:hidden">
        <Button size="lg" onClick={onFire}>
          Fire
        </Button>
        <Button variant="secondary" size="lg" onClick={onWall}>
          Wall
        </Button>
      </div>
    </>
  );
}
