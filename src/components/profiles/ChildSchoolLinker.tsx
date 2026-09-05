import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { linkChildToSchool } from "@/lib/child-schools.functions";
import { Building2, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function ChildSchoolLinker({ childId, onLinked }: { childId: string; onLinked: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [schools, setSchools] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  
  const linkFn = useServerFn(linkChildToSchool);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 3) {
      setSchools([]);
      return;
    }
    setSearching(true);
    const { data } = await (supabase as any)
      .from("schools")
      .select("id, name, city, code")
      .ilike("name", '%' + val + '%')
      .limit(5);
    setSchools(data || []);
    setSearching(false);
  };

  const handleLink = async (schoolId: string) => {
    setLinking(true);
    try {
      await linkFn({ data: { childId, schoolId } });
      toast.success("Établissement lié avec succès !");
      setIsOpen(false);
      onLinked();
    } catch (err: any) {
      toast.error(err.message || "Erreur de liaison.");
    } finally {
      setLinking(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-2"
      >
        <Building2 className="size-3" />
        Déclarer sa scolarité actuelle
      </button>
    );
  }

  return (
    <div className="mt-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-indigo-900">Rechercher l'établissement</label>
        <button onClick={() => setIsOpen(false)} className="text-[10px] uppercase text-indigo-400 font-bold">Annuler</button>
      </div>
      <div className="relative">
        <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-300" />
        <input 
          type="text" 
          value={query}
          onChange={(e) => void handleSearch(e.target.value)}
          placeholder="Nom de l'école..."
          className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-indigo-200 outline-none focus:border-indigo-400"
        />
        {searching && <Loader2 className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-300 animate-spin" />}
      </div>
      {schools.length > 0 && (
        <div className="space-y-1.5">
          {schools.map(s => (
            <button
              key={s.id}
              disabled={linking}
              onClick={() => void handleLink(s.id)}
              className="w-full text-left p-2 rounded-lg bg-white border border-indigo-100 hover:border-indigo-300 text-[11px] flex items-center justify-between transition-colors disabled:opacity-50"
            >
              <span><strong className="text-indigo-900">{s.name}</strong> ({s.city})</span>
              <span className="text-[9px] font-mono bg-stone-100 px-1 rounded text-stone-500">{s.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}