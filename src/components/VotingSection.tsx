import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Calendar,
  Clock,
  Car,
  Truck,
  Bike,
  User,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  CheckSquare,
  Square,
} from 'lucide-react';
import type { Poll, PollOption, VoterSelection } from '../types';
import { getStoredVoterProfile, saveStoredVoterProfile } from '../lib/storage';

interface VotingSectionProps {
  poll: Poll;
  voterId: string;
  onSubmitVote: (data: {
    voterId: string;
    voterName: string;
    selectedOptionIds: string[];
    vehicle?: string;
    phone?: string;
    notes?: string;
  }) => Promise<void>;
  onRemoveVote: (voterId: string) => Promise<void>;
}

const VEHICLE_OPTIONS = [
  { id: 'Moto', label: 'Moto', icon: Bike },
  { id: 'Carro', label: 'Carro', icon: Car },
  { id: 'Van', label: 'Van / Fiorino', icon: Truck },
  { id: 'Caminhão', label: 'Caminhão', icon: Truck },
  { id: 'Outro', label: 'Outro / A pé', icon: User },
];

export const VotingSection: React.FC<VotingSectionProps> = ({
  poll,
  voterId,
  onSubmitVote,
  onRemoveVote,
}) => {
  const profile = getStoredVoterProfile();
  const existingVote = poll.votes[voterId];

  const [voterName, setVoterName] = useState(existingVote?.voterName || profile.name || '');
  const [selectedVehicle, setSelectedVehicle] = useState(
    existingVote?.vehicle || profile.vehicle || 'Moto'
  );
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>(
    existingVote?.selectedOptionIds || []
  );
  const [notes, setNotes] = useState(existingVote?.notes || '');
  const [filterShift, setFilterShift] = useState<string>('todos');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [nameError, setNameError] = useState(false);

  // Sync state if existing vote changes from server
  useEffect(() => {
    if (existingVote) {
      setVoterName(existingVote.voterName);
      if (existingVote.vehicle) setSelectedVehicle(existingVote.vehicle);
      if (existingVote.notes) setNotes(existingVote.notes);
      setSelectedOptionIds(existingVote.selectedOptionIds || []);
    }
  }, [existingVote]);

  const handleToggleOption = (optionId: string) => {
    if (!poll.allowMultiple) {
      setSelectedOptionIds([optionId]);
      return;
    }

    if (selectedOptionIds.includes(optionId)) {
      setSelectedOptionIds(selectedOptionIds.filter((id) => id !== optionId));
    } else {
      setSelectedOptionIds([...selectedOptionIds, optionId]);
    }
  };

  const handleSelectAll = () => {
    const visibleIds = filteredOptions.map((o) => o.id);
    const allSelected = visibleIds.every((id) => selectedOptionIds.includes(id));
    if (allSelected) {
      setSelectedOptionIds(selectedOptionIds.filter((id) => !visibleIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedOptionIds, ...visibleIds]));
      setSelectedOptionIds(combined);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterName.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);

    setIsSubmitting(true);
    saveStoredVoterProfile({
      name: voterName.trim(),
      vehicle: selectedVehicle,
    });

    await onSubmitVote({
      voterId,
      voterName: voterName.trim(),
      selectedOptionIds,
      vehicle: selectedVehicle,
      notes: notes.trim(),
    });

    setIsSubmitting(false);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3500);
  };

  const handleClearVote = async () => {
    if (window.confirm('Tem certeza que deseja remover sua disponibilidade desta lista?')) {
      await onRemoveVote(voterId);
      setSelectedOptionIds([]);
    }
  };

  // Filter options by shift if selected
  const filteredOptions = poll.options.filter((opt) => {
    if (filterShift === 'todos') return true;
    return opt.shift?.toLowerCase() === filterShift.toLowerCase();
  });

  const getShiftBadge = (shift?: string) => {
    switch (shift?.toLowerCase()) {
      case 'manhã':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            <Sun className="h-3 w-3 text-amber-500" /> Manhã
          </span>
        );
      case 'tarde':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
            <Sunset className="h-3 w-3 text-orange-500" /> Tarde
          </span>
        );
      case 'noite':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
            <Moon className="h-3 w-3 text-indigo-500" /> Noite
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
            <Clock className="h-3 w-3 text-blue-500" /> Integral
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
      {/* Header Info */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            Votação Aberta sem Login
          </span>
          {existingVote && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Você já votou
            </span>
          )}
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {poll.title}
        </h1>
        {poll.description && (
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            {poll.description}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Identification without login */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <User className="h-4 w-4 text-blue-600" />
              1. Identificação (Como você quer ser chamado?)
            </label>
            <span className="text-[11px] text-slate-500">Sem senha nem cadastro</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <input
                id="input-voter-name"
                type="text"
                required
                placeholder="Ex: Carlos Silva, Juliana (Moto 12)"
                value={voterName}
                onChange={(e) => {
                  setVoterName(e.target.value);
                  if (e.target.value.trim()) setNameError(false);
                }}
                className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  nameError
                    ? 'border-rose-300 focus:ring-rose-500'
                    : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              {nameError && (
                <p className="mt-1 text-xs text-rose-600">
                  Por favor, digite seu nome ou apelido para continuar.
                </p>
              )}
            </div>

            {/* Vehicle Selection */}
            {poll.requireVehicle && (
              <div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {VEHICLE_OPTIONS.map((veh) => {
                    const Icon = veh.icon;
                    const isSelected = selectedVehicle === veh.id;
                    return (
                      <button
                        type="button"
                        key={veh.id}
                        onClick={() => setSelectedVehicle(veh.id)}
                        className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{veh.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Route Availability List */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-600" />
                2. Selecione seus Dias e Turnos Disponíveis
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                {poll.allowMultiple
                  ? 'Você pode marcar múltiplos dias/turnos conforme sua disponibilidade'
                  : 'Selecione a melhor opção de disponibilidade'}
              </p>
            </div>

            {/* Shift filters */}
            <div className="flex items-center gap-1.5">
              {['todos', 'manhã', 'tarde'].map((shiftKey) => (
                <button
                  type="button"
                  key={shiftKey}
                  onClick={() => setFilterShift(shiftKey)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                    filterShift === shiftKey
                      ? 'bg-slate-800 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {shiftKey}
                </button>
              ))}

              {poll.allowMultiple && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  title="Marcar/Desmarcar todos os visíveis"
                >
                  <CheckSquare className="h-3 w-3 text-slate-500" />
                  <span>Todos</span>
                </button>
              )}
            </div>
          </div>

          {/* Options Grid */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            {filteredOptions.map((option) => {
              const isSelected = selectedOptionIds.includes(option.id);
              // Count how many voters selected this option
              const votersForOption = (Object.values(poll.votes || {}) as VoterSelection[]).filter((v) =>
                v.selectedOptionIds.includes(option.id)
              );

              return (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => handleToggleOption(option.id)}
                  className={`group relative flex items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600/30'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-white group-hover:border-slate-400'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      ) : (
                        <Square className="h-3.5 w-3.5 text-transparent" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        {getShiftBadge(option.shift)}
                        {option.category && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            • {option.category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-900 leading-snug">
                        {option.label}
                      </p>
                    </div>
                  </div>

                  {/* Voters count badge for this option */}
                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                        votersForOption.length > 0
                          ? 'bg-slate-100 text-slate-700'
                          : 'text-slate-400'
                      }`}
                    >
                      <User className="h-3 w-3" />
                      {votersForOption.length}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Observações adicionais (opcional)
          </label>
          <input
            type="text"
            placeholder="Ex: Posso começar a partir das 08h; prefiro rotas próximas ao Centro..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            {selectedOptionIds.length === 0 ? (
              <span>Nenhuma rota/dia selecionado</span>
            ) : (
              <span className="font-semibold text-blue-700">
                {selectedOptionIds.length} {selectedOptionIds.length === 1 ? 'turno selecionado' : 'turnos selecionados'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {existingVote && (
              <button
                id="btn-cancel-availability"
                type="button"
                onClick={handleClearVote}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors w-full sm:w-auto"
                title="Remover meu voto"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Cancelar Disponibilidade</span>
              </button>
            )}

            <button
              id="btn-submit-vote"
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-98 transition-all disabled:opacity-50 w-full sm:w-auto"
            >
              <Check className="h-4 w-4 stroke-[3]" />
              <span>
                {existingVote ? 'Atualizar Minha Disponibilidade' : 'Confirmar Disponibilidade'}
              </span>
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {showSuccessToast && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 flex items-center justify-between animate-in fade-in duration-200">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Sua disponibilidade foi registrada e enviada em tempo real via WebSockets!
            </span>
          </div>
        )}
      </form>
    </div>
  );
};
