import { createFileRoute, Outlet } from "@tanstack/react-router";

// Route de passage : les pages de guide portent chacune leur propre <head> et leur propre
// coquille (GuideLayout). Ce fichier n'existe que pour que /guides ait un parent, comme
// admin.tsx et organisation.tsx dans ce projet.
export const Route = createFileRoute("/guides")({
  component: () => <Outlet />,
});
