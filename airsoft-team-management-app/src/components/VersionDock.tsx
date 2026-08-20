import { useState } from "react";
import Icon from "./Icon";

type Props = {
  option: "A" | "B";
  isOriginal: boolean;
  onChange: (option: "A" | "B") => void;
  onRestore: () => void;
  onOpenHistory: () => void;
};

export default function VersionDock({ option, isOriginal, onChange, onRestore, onOpenHistory }: Props) {
  const [minimized, setMinimized] = useState(false);

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="animate-fade-in fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/12 bg-[#14100c]/90 px-4 py-2.5 text-xs font-medium text-white/80 shadow-2xl backdrop-blur-xl transition-colors hover:text-white"
      >
        <Icon name="spark" className="h-4 w-4" />
        Opção {option}
      </button>
    );
  }

  return (
    <div className="animate-fade-up fixed bottom-5 left-1/2 z-50 w-[min(94vw,42rem)] -translate-x-1/2">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/12 bg-[#14100c]/92 p-2.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:flex-row sm:items-center sm:gap-2">
        <div className="flex items-center gap-1 rounded-xl bg-white/8 p-1">
          {(["A", "B"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`flex-1 rounded-lg px-3.5 py-2 text-[13px] font-medium whitespace-nowrap transition-all sm:flex-none ${
                option === key
                  ? "bg-white text-[#14100c] shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Opção {key}
              <span className="ml-1.5 text-[11px] opacity-60">
                {key === "A" ? "original" : "escura"}
              </span>
            </button>
          ))}
        </div>

        <div className="hidden h-6 w-px bg-white/12 sm:block" />

        <p className="flex-1 px-1 text-[12px] leading-snug text-white/55">
          {isOriginal ? (
            <>
              <span className="font-medium text-emerald-300">Restaurada.</span> A Opção A está exatamente
              como estava antes.
            </>
          ) : (
            <>Você está vendo uma variação. Volte para a Opção A quando quiser.</>
          )}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRestore}
            disabled={isOriginal}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-medium whitespace-nowrap transition-colors ${
              isOriginal
                ? "cursor-not-allowed border border-white/10 text-white/30"
                : "bg-emerald-400 text-[#14100c] hover:bg-emerald-300"
            }`}
          >
            <Icon name="undo" className="h-4 w-4" />
            Restaurar original
          </button>
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Ver histórico de versões"
          >
            <Icon name="history" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Minimizar painel"
          >
            <Icon name="close" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-black/35">
        Atalhos: pressione <kbd className="rounded bg-black/10 px-1">A</kbd> ou{" "}
        <kbd className="rounded bg-black/10 px-1">B</kbd> para alternar
      </p>
    </div>
  );
}
