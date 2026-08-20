import { createFileRoute } from "@tanstack/react-router";
import { GameApp } from "@/components/GameApp";

export const Route = createFileRoute("/")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    room: typeof s.room === "string" ? s.room.slice(0, 64) : undefined,
  }),
  component: Home,
});

function Home() {
  const { room } = Route.useSearch();
  return <GameApp roomCode={room} />;
}
