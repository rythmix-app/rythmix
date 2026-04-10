import React from "react";
import Header from "@/components/Header";
import { useBackGuard } from "@/hooks/useBackGuard";

interface GameLayoutProps {
  title: string;
  sessionId?: string | null;
  onSave?: () => void;
  onBack?: () => void;
  children: React.ReactNode;
}

export default function GameLayout({
  title,
  sessionId,
  onSave,
  onBack: customOnBack,
  children,
}: GameLayoutProps) {
  const { onBack: guardOnBack, backGuardModal } = useBackGuard({
    enabled: sessionId != null,
    onSave,
  });

  const handleBack = customOnBack || guardOnBack;

  return (
    <>
      <Header title={title} variant="withBack" onBack={handleBack} />
      {backGuardModal}
      {children}
    </>
  );
}
