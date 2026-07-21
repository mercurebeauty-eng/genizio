import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { GenizioLoader } from "@/components/GenizioLoader";

export const Route = createFileRoute("/laboratory")({
  component: LaboratoryRedirectPage,
});

function LaboratoryRedirectPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/profiles", replace: true });
  }, [navigate]);

  return (
    <div className="grid min-h-dvh place-items-center bg-surface">
      <GenizioLoader label="Redirection vers les profils..." />
    </div>
  );
}
