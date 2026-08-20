import { createFileRoute } from "@tanstack/react-router";
import { GameApp } from "@/components/GameApp";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});

function Home() {
  return <GameApp />;
}
