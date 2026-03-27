import React from "react";
import { router } from "expo-router";
import Header from "@/components/Header";
import { useBackGuard } from "@/hooks/useBackGuard";
import { updateGameSession } from "@/services/gameSessionService";

interface GameLayoutProps {
  title: string;
  sessionId?: string | null;
  children: React.ReactNode;
}

export default function GameLayout({
  title,
  sessionId,
  children,
}: GameLayoutProps) {
  const handleAbandon = async () => {
    if (sessionId) {
      try {
        await updateGameSession(sessionId, { status: "canceled" });
      } catch (e) {
        console.error("Failed to cancel game session:", e);
      }
    }
    if (router.canGoBack()) {
      router.back();
    }
  };

  const { onBack, backGuardModal } = useBackGuard({
    enabled: sessionId != null,
    // onSave intentionally omitted: session stays "active" so user can resume later (MIX-255)
    onAbandon: handleAbandon,
  });

  return (
    <>
      <Header title={title} variant="withBack" onBack={onBack} />
      {backGuardModal}
      {children}
    </>
  );
}
