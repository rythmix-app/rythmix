import React, { useCallback } from "react";
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
  const handleAbandon = useCallback(() => {
    if (sessionId) {
      updateGameSession(sessionId, { status: "canceled" }).catch(() => {});
    }
    if (router.canGoBack()) {
      router.back();
    }
  }, [sessionId]);

  const { onBack, BackGuardModal } = useBackGuard({
    enabled: sessionId != null,
    // onSave intentionally omitted: session stays "active" so user can resume later (MIX-255)
    onAbandon: handleAbandon,
  });

  return (
    <>
      <Header title={title} variant="withBack" onBack={onBack} />
      {BackGuardModal}
      {children}
    </>
  );
}
