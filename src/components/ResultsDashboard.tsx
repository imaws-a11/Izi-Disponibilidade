import React, { useState } from 'react';
import {
  BarChart3,
  Users,
  Check,
  Copy,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Bike,
  Car,
  Truck,
  User,
  Share2,
  CalendarCheck,
  Filter,
} from 'lucide-react';
import type { Poll, PollOption, VoterSelection } from '../types';

interface ResultsDashboardProps {
  poll: Poll;
  lastUpdatedBy?: string | null;
  onOpenShare: () => void;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  poll,
  lastUpdatedBy,
  onOpenShare,
}) => {
  const [expandedOptionId, setExpandedOptionId] = useState<string | null>(null);
  const [copiedScale, setCopiedScale] = useState(false);
  const [viewFilter, setViewFilter] = useState<'all' | 'needs_drivers'>('all');

  const votersList: VoterSelection[] = Object.values(poll.votes || {});
  const totalVoters = votersList.length;

  // Calculate vote counts per option
  const optionStats = poll.options.map((option) => {
    const matchingVoters = votersList.filter((v) =>
      v.selectedOptionIds.includes(option.id)
    );
    const count = matchingVoters.length;
    const percentage = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0;
    return {
      option,
      count,
      percentage,
      voters: matchingVoters,
    };
  });

  // Sort: find options with 0 or few drivers
  const lowCoverageCount = optionStats.filter((s) => s.count === 0).length;
  const bestCoverage = [...optionStats].sort((a, b) => b.count - a.count)[0];

  const filteredStats = optionStats.filter((item) => {
    if (viewFilter === 'needs_drivers') {
      return item.count === 0 || item.count === 1;
    }
    return true;
  });

  const toggleExpand = (optionId: string) => {
    setExpandedOptionId(expandedOptionId === optionId ? null : optionId);
  };

  const getVehicleIcon = (vehicle?: string) => {
    switch (vehicle?.toLowerCase()) {
      case 'moto':
        return <Bike className="h-3.5 w-3.5 text-blue-600" />;
      case 'carro':
        return <Car className="h-3.5 w-3.5 text-emerald-600" />;
      case 'van':
      case 'van / fiorino':
      case 'caminhão':
        return <Truck className="h-3.5 w-3.5 text-amber-600" />;
      default:
        return <User className="h-3.5 w-3.5 text-slate-500" />;
    }
  };

  // Generate WhatsApp-formatted scale report
  const handleCopyScaleToWhatsApp = async () => {
    let report = `📋 *ESCALA DE DISPONIBILIDADE - Izi Disponibilidade*\n`;
    report += `🎯 *${poll.title}*\n`;
    report += `👥 *Total de Respondentes:* ${totalVoters} pessoas\n\n`;

    poll.options.forEach((opt) => {
      const voters = votersList.filter((v) => v.selectedOptionIds.includes(opt.id));
      report += `📍 *${opt.label}* (${voters.length})\n`;
      if (voters.length === 0) {
        report += `   ⚠️ _Nenhum motorista disponível_\n`;
      } else {
        voters.forEach((v) => {
          const veh = v.vehicle ? ` [${v.vehicle}]` : '';
          const note = v.notes ? ` - "${v.notes}"` : '';
          report += `   • ${v.voterName}${veh}${note}\n`;
        });
      }
      report += `\n`;
    });

    report += `_Atualizado em tempo real via Izi Disponibilidade_`;

    try {
      await navigator.clipboard.writeText(report);
      setCopiedScale(true);
      setTimeout(() => setCopiedScale(false), 3000);
    } catch (e) {
      console.error('Failed to copy scale:', e);
    }
  };

  return (
    <div className="space-y-5">
      {/* Realtime update banner if someone just voted */}
      {lastUpdatedBy && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-2 text-xs font-semibold text-blue-800 animate-in fade-in duration-300">
          <Sparkles className="h-4 w-4 text-blue-600 animate-spin" />
          <span>
            Voto atualizado agora por: <strong>{lastUpdatedBy}</strong> (Sincronizado via WebSockets)
          </span>
        </div>
      )}

      {/* Main Results Container */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
        {/* Title and WhatsApp export CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Painel Compartilhado de Resultados
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Votos computados e sincronizados instantaneamente em tempo real para todos os participantes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-copy-scale-whatsapp"
              onClick={handleCopyScaleToWhatsApp}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                copiedScale
                  ? 'bg-emerald-600 text-white'
                  : 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 active:scale-95'
              }`}
              title="Copiar escala formatada com nomes para colar no WhatsApp"
            >
              {copiedScale ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Escala Copiada!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copiar Escala p/ WhatsApp</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 py-5">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
              <Users className="h-4 w-4 text-blue-600" />
              Participantes
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {totalVoters}
            </div>
            <span className="text-[11px] text-slate-500">pessoas votaram</span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
              <CalendarCheck className="h-4 w-4 text-emerald-600" />
              Disponibilidades
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {votersList.reduce((sum, v) => sum + v.selectedOptionIds.length, 0)}
            </div>
            <span className="text-[11px] text-slate-500">turnos preenchidos</span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Mais Votado
            </div>
            <div className="text-sm font-bold text-slate-900 line-clamp-1">
              {bestCoverage && bestCoverage.count > 0 ? bestCoverage.option.label.split(' - ')[0] : 'Nenhum'}
            </div>
            <span className="text-[11px] text-slate-500">
              {bestCoverage ? `${bestCoverage.count} disponíveis` : 'Aguardando votos'}
            </span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              Sem Cobertura
            </div>
            <div className={`text-2xl font-bold ${lowCoverageCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {lowCoverageCount}
            </div>
            <span className="text-[11px] text-slate-500">
              {lowCoverageCount === 0 ? 'Todos cobertos!' : 'precisam de motorista'}
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between gap-2 pt-2 pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Exibir:</span>
            <button
              onClick={() => setViewFilter('all')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                viewFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas as Rotas ({optionStats.length})
            </button>
            <button
              onClick={() => setViewFilter('needs_drivers')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                viewFilter === 'needs_drivers'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Pouca Cobertura (≤ 1)
            </button>
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline">
            Clique na rota para ver os nomes
          </span>
        </div>

        {/* Live Options Bars & Driver Breakdowns */}
        <div className="space-y-3">
          {filteredStats.map(({ option, count, percentage, voters }) => {
            const isExpanded = expandedOptionId === option.id;
            const hasNoVoters = count === 0;

            return (
              <div
                key={option.id}
                className={`rounded-xl border transition-all ${
                  isExpanded
                    ? 'border-blue-300 bg-blue-50/20 shadow-xs'
                    : 'border-slate-200/80 bg-white hover:border-slate-300'
                }`}
              >
                {/* Clickable Header for details */}
                <button
                  type="button"
                  onClick={() => toggleExpand(option.id)}
                  className="flex w-full items-center justify-between gap-3 p-3.5 sm:p-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-bold text-slate-900">
                        {option.label}
                      </span>
                      {hasNoVoters && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                          <AlertTriangle className="h-3 w-3" /> Precisa de motorista
                        </span>
                      )}
                    </div>

                    {/* Live Progress Bar */}
                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                          hasNoVoters
                            ? 'bg-slate-200'
                            : count >= 3
                            ? 'bg-emerald-500'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.max(percentage, count > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Count & Toggle Icon */}
                  <div className="flex items-center gap-3 shrink-0 pl-2">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 font-bold text-slate-900 text-sm">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span>{count}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {percentage}% dos votos
                      </div>
                    </div>

                    <div className="rounded-lg bg-slate-100 p-1 text-slate-600 hover:bg-slate-200">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Participants List for this Route Option */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/60 p-4 rounded-b-xl animate-in fade-in duration-150">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Pessoas disponíveis para este turno ({voters.length}):</span>
                    </div>

                    {voters.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-1">
                        Nenhum motorista confirmou disponibilidade para este horário ainda.
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {voters.map((voter) => (
                          <div
                            key={voter.voterId}
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-2xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold">
                                {voter.voterName.slice(0, 1).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-900 block truncate">
                                  {voter.voterName}
                                </span>
                                {voter.notes && (
                                  <span className="text-[10px] text-slate-500 block truncate">
                                    "{voter.notes}"
                                  </span>
                                )}
                              </div>
                            </div>

                            {voter.vehicle && (
                              <div className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 shrink-0 ml-2">
                                {getVehicleIcon(voter.vehicle)}
                                <span>{voter.vehicle}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
