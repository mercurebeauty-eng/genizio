import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert } from "lucide-react";
import { GenizioLoader } from "@/components/GenizioLoader";

export const Route = createFileRoute("/p/$postId")({
  component: PhotoRedirect,
});

// Short, branded link handed out by the feed's "share" button instead of the
// raw Supabase storage URL (which exposed the project ref and the child's
// internal id/challenge id in plain text). Looks up the real image and
// redirects — the destination is still visible in the address bar once
// opened, but the copied/shared text itself no longer reveals the backend.
function PhotoRedirect() {
  const { postId } = Route.useParams();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase
      .from("posts")
      .select("image_url")
      .eq("id", postId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.image_url) {
          window.location.replace(data.image_url);
        } else {
          setNotFound(true);
        }
      });
  }, [postId]);

  if (notFound) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface p-6 text-center">
        <div className="max-w-md rounded-3xl border-[3px] border-ink bg-white p-8 shadow-brutal">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border-2 border-ink bg-red-50 text-red-500">
            <ShieldAlert className="size-7" />
          </div>
          <p className="font-bold text-ink">Photo introuvable — le lien a peut-être expiré.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface">
      <GenizioLoader />
    </div>
  );
}
