import React from 'react';
import { Wand2, BookOpen } from 'lucide-react';

export type ChallengeMode = 'free' | 'homework';

export interface HomeworkModeToggleProps {
  mode: ChallengeMode;
  onModeChange: (mode: ChallengeMode) => void;
  className?: string;
}

export function HomeworkModeToggle({
  mode,
  onModeChange,
  className = '',
}: HomeworkModeToggleProps) {
  return (
    <div
      role="group"
      aria-label="Mode de génération"
      className={`flex rounded-2xl bg-white p-1.5 border border-ink/10 shadow-inner ${className}`}
      data-testid="homework-mode-toggle"
    >
      <button
        type="button"
        onClick={() => onModeChange('free')}
        data-active={mode === 'free'}
        aria-pressed={mode === 'free'}
        className={`flex-1 rounded-xl py-2.5 px-3 text-xs font-display font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
          mode === 'free'
            ? 'bg-brand text-white shadow-sm scale-[1.01]'
            : 'text-ink/65 hover:text-ink hover:bg-surface'
        }`}
      >
        <Wand2 className="size-4 shrink-0" />
        <span>Défis Libres (Éveil)</span>
      </button>
      <button
        type="button"
        onClick={() => onModeChange('homework')}
        data-active={mode === 'homework'}
        aria-pressed={mode === 'homework'}
        className={`flex-1 rounded-xl py-2.5 px-3 text-xs font-display font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
          mode === 'homework'
            ? 'bg-brand text-white shadow-sm scale-[1.01]'
            : 'text-ink/65 hover:text-ink hover:bg-surface'
        }`}
      >
        <BookOpen className="size-4 shrink-0" />
        <span>Devoirs Scolaires (Fusion)</span>
      </button>
    </div>
  );
}
