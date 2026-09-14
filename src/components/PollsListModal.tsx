import React, { useState, useEffect } from 'react';
import { X, Check, Users, Calendar, PlusCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { PollSummary } from '../types';

interface PollsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPollId: string;
  onSelectPoll: (pollId: string) => void;
  onOpenCreateNew: () => void;
}

export const PollsListModal: React.FC<PollsListModalProps> = ({
  isOpen,
  onClose,
  currentPollId,
  onSelectPoll,
  onOpenCreateNew,
}) => {
  const [polls, setPolls] = useState<PollSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/polls')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPolls(data);
        }
      })
      .catch((err) => console.error('Error fetching polls:', err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900">
            Enquetes de Disponibilidade
          </h3>
          <p className="text-xs text-slate-500">
            Selecione uma enquete para votar ou visualizar os resultados ao vivo.
          </p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Carregando enquetes...
          </div>
        ) : polls.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Nenhuma enquete encontrada.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2.5 mb-5 pr-1">
            {polls.map((p) => {
              const isCurrent = p.id === currentPollId;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => {
                    onSelectPoll(p.id);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                    isCurrent
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900 text-sm truncate">
                        {p.title}
                      </span>
                      {isCurrent && (
                        <span className="rounded bg-blue-600 px-1.5 py-0.2 text-[10px] font-bold text-white uppercase">
                          Atual
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-xs text-slate-500 line-clamp-1 mb-1.5">
                        {p.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-slate-400" />
                        {p.totalVoters} {p.totalVoters === 1 ? 'votante' : 'votantes'}
                      </span>
                      <span>•</span>
                      <span>{p.totalVotes} turnos marcados</span>
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCreateNew();
            }}
            className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Criar Nova Enquete</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
