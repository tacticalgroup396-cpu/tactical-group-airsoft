import Icon from "./Icon";
import { history, type HistoryEntry } from "../data/site";

type Props = {
  open: boolean;
  activeId: string;
  onClose: () => void;
  onRestore: (entry: HistoryEntry) => void;
};

export default function HistoryPanel({ open, activeId, onClose, onRestore }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60">
      <button
        type="button"
        aria-label="Fechar histórico"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />
      <aside className="animate-slide-in-right absolute top-0 right-0 flex h-full w-[min(92vw,25rem)] flex-col border-l border-black/10 bg-[#faf8f4] shadow-2xl">
        <header className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <div>
            <h2 className="font-display text-lg text-[#14100c]">Histórico de versões</h2>
            <p className="text-[12px] text-[#14100c]/50">Volte para qualquer ponto do layout</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[#14100c]/60 transition-colors hover:bg-black/5"
            aria-label="Fechar"
          >
            <Icon name="close" className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <ol className="relative space-y-4 border-l border-dashed border-black/15 pl-6">
            {history.map((entry) => {
              const active = entry.id === activeId;
              return (
                <li key={entry.id} className="relative">
                  <span
                    className={`absolute top-4 -left-[1.9rem] flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                      active ? "border-emerald-500 bg-emerald-400" : "border-black/20 bg-[#faf8f4]"
                    }`}
                  />
                  <div
                    className={`rounded-xl border p-4 transition-colors ${
                      active ? "border-emerald-500/40 bg-emerald-50" : "border-black/10 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-semibold text-[#14100c]">{entry.label}</span>
                      <span className="shrink-0 text-[11px] text-[#14100c]/40">{entry.when}</span>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-[#14100c]/60">{entry.note}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          entry.option === "A"
                            ? "bg-[#b4562f]/10 text-[#b4562f]"
                            : "bg-indigo-500/10 text-indigo-600"
                        }`}
                      >
                        Layout {entry.option}
                      </span>
                      {active ? (
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-600">
                          <Icon name="check" className="h-3.5 w-3.5" /> versão atual
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRestore(entry)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1 text-[12px] font-medium text-[#14100c] transition-colors hover:bg-[#14100c] hover:text-[#faf8f4]"
                        >
                          <Icon name="undo" className="h-3.5 w-3.5" />
                          Restaurar
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <footer className="border-t border-black/10 px-5 py-4 text-[12px] leading-relaxed text-[#14100c]/50">
          Nada é apagado: cada troca de layout cria um novo ponto no histórico que você pode revisitar.
        </footer>
      </aside>
    </div>
  );
}
