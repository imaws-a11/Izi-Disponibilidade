import React, { useState } from 'react';
import { X, Plus, Trash2, Calendar, Sparkles, Check, Compass, Layers } from 'lucide-react';
import type { Poll } from '../types';
import { getAdminSession } from '../lib/storage';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPollCreated: (newPoll: Poll) => void;
}

const PRESETS = [
  {
    id: 'week_shifts',
    name: 'Semana Completa (Segunda a Sexta - Manhã e Tarde)',
    description: '10 opções cobrindo turnos da manhã e da tarde',
    options: [
      { label: 'Segunda-feira - Manhã (07h às 13h)', shift: 'Manhã', category: 'Dias Úteis' },
      { label: 'Segunda-feira - Tarde (13h às 19h)', shift: 'Tarde', category: 'Dias Úteis' },
      { label: 'Terça-feira - Manhã (07h às 13h)', shift: 'Manhã', category: 'Dias Úteis' },
      { label: 'Terça-feira - Tarde (13h às 19h)', shift: 'Tarde', category: 'Dias Úteis' },
      { label: 'Quarta-feira - Manhã (07h às 13h)', shift: 'Manhã', category: 'Dias Úteis' },
      { label: 'Quarta-feira - Tarde (13h às 19h)', shift: 'Tarde', category: 'Dias Úteis' },
      { label: 'Quinta-feira - Manhã (07h às 13h)', shift: 'Manhã', category: 'Dias Úteis' },
      { label: 'Quinta-feira - Tarde (13h às 19h)', shift: 'Tarde', category: 'Dias Úteis' },
      { label: 'Sexta-feira - Manhã (07h às 13h)', shift: 'Manhã', category: 'Dias Úteis' },
      { label: 'Sexta-feira - Tarde (13h às 19h)', shift: 'Tarde', category: 'Dias Úteis' },
    ],
  },
  {
    id: 'weekend_routes',
    name: 'Fim de Semana e Plantões',
    description: 'Sábado e Domingo com rotas especiais',
    options: [
      { label: 'Sábado - Rota Manhã (08h às 14h)', shift: 'Manhã', category: 'Fim de Semana' },
      { label: 'Sábado - Rota Tarde/Noite (14h às 20h)', shift: 'Tarde', category: 'Fim de Semana' },
      { label: 'Domingo - Plantão Matutino (08h às 13h)', shift: 'Manhã', category: 'Fim de Semana' },
      { label: 'Domingo - Plantão Noturno (17h às 22h)', shift: 'Noite', category: 'Fim de Semana' },
    ],
  },
  {
    id: 'zones',
    name: 'Rotas por Região / Zona',
    description: 'Zona Norte, Zona Sul, Leste, Oeste e Centro',
    options: [
      { label: 'Rota Zona Norte (Manhã)', shift: 'Manhã', category: 'Zona Norte' },
      { label: 'Rota Zona Sul (Manhã)', shift: 'Manhã', category: 'Zona Sul' },
      { label: 'Rota Centro & Região (Integral)', shift: 'Integral', category: 'Centro' },
      { label: 'Rota Zona Leste (Tarde)', shift: 'Tarde', category: 'Zona Leste' },
      { label: 'Rota Zona Oeste (Tarde)', shift: 'Tarde', category: 'Zona Oeste' },
    ],
  },
];

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isOpen,
  onClose,
  onPollCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [allowMultiple, setAllowMultiple] = useState(true);
  const [requireVehicle, setRequireVehicle] = useState(true);
  const [options, setOptions] = useState<
    Array<{ label: string; shift?: string; category?: string }>
  >([
    { label: 'Segunda-feira - Manhã', shift: 'Manhã' },
    { label: 'Segunda-feira - Tarde', shift: 'Tarde' },
    { label: 'Terça-feira - Manhã', shift: 'Manhã' },
    { label: 'Terça-feira - Tarde', shift: 'Tarde' },
  ]);
  const [newOptionText, setNewOptionText] = useState('');
  const [newOptionShift, setNewOptionShift] = useState('Manhã');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setOptions([...preset.options]);
      if (!title) {
        setTitle(`Escala de Rotas - ${preset.name.split(' (')[0]}`);
      }
      if (!description) {
        setDescription('Selecione todos os turnos em que você está disponível para assumir rotas.');
      }
    }
  };

  const handleAddOption = () => {
    if (!newOptionText.trim()) return;
    setOptions([
      ...options,
      {
        label: newOptionText.trim(),
        shift: newOptionShift,
      },
    ]);
    setNewOptionText('');
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Por favor, informe um título para a enquete.');
      return;
    }
    if (options.length === 0) {
      setError('Adicione ao menos uma opção de dia/horário.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const { token: adminToken } = getAdminSession();
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          allowMultiple,
          requireVehicle,
          options,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao criar enquete');
      }

      const createdPoll: Poll = await res.json();
      onPollCreated(createdPoll);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar ao servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-2">
            <Calendar className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            Criar Nova Enquete de Rotas
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure os dias e rotas para sua equipe votar em tempo real.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="mb-5 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            Modelos Prontos (Clique para preencher)
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.id}
                onClick={() => handleApplyPreset(preset.id)}
                className="rounded-lg border border-slate-200 bg-white p-2.5 text-left text-xs hover:border-blue-300 hover:bg-blue-50/40 transition-all"
              >
                <span className="font-semibold text-slate-900 block truncate">
                  {preset.name.split(' (')[0]}
                </span>
                <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                  {preset.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Título da Enquete *
            </label>
            <input
              id="input-create-poll-title"
              type="text"
              required
              placeholder="Ex: Escala de Rotas - 15 a 21 de Outubro"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descrição / Instruções
            </label>
            <input
              id="input-create-poll-desc"
              type="text"
              placeholder="Ex: Marque todos os dias em que você pode assumir entregas"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 py-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Permitir marcar múltiplos dias/turnos
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={requireVehicle}
                onChange={(e) => setRequireVehicle(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Pedir tipo de veículo (Moto, Carro, Van...)
            </label>
          </div>

          {/* Options Management */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Opções de Rotas e Horários ({options.length})
            </label>

            {/* List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/40 p-2.5 mb-3">
              {options.map((opt, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                      {opt.shift || 'Geral'}
                    </span>
                    <span className="font-medium text-slate-800 truncate">{opt.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="Remover opção"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add custom option input */}
            <div className="flex items-center gap-2">
              <select
                value={newOptionShift}
                onChange={(e) => setNewOptionShift(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Noite">Noite</option>
                <option value="Integral">Integral</option>
              </select>

              <input
                type="text"
                placeholder="Nome da rota / dia (ex: Quarta-feira - Rota Centro)"
                value={newOptionText}
                onChange={(e) => setNewOptionText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddOption();
                  }
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <button
                type="button"
                onClick={handleAddOption}
                className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              id="btn-submit-create-poll"
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 active:scale-95 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>{isSubmitting ? 'Criando...' : 'Criar Enquete e Gerar Link'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
