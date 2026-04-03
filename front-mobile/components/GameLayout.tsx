import React from "react";
import Header from "@/components/Header";
import { useBackGuard } from "@/hooks/useBackGuard";

interface GameLayoutProps {
  title: string;
  sessionId?: string | null;
  onSave?: () => void;
  children: React.ReactNode;
}

export default function GameLayout({
  title,
  sessionId,
  onSave,
  children,
}: GameLayoutProps) {
  const { onBack, backGuardModal } = useBackGuard({
    enabled: sessionId != null,
    onSave,
  });

  return (
    <>
      <Header title={title} variant="withBack" onBack={onBack} />
      {backGuardModal}
      {children}
    </>
  );
}
