import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Calendar,
  Clock,
  Bike,
  Car,
  Truck,
  User,
  PlusCircle,
  Share2,
  Trash2,
  PauseCircle,
  PlayCircle,
  Copy,
  Check,
  Search,
  Filter,
  Eye,
  LogOut,
  KeyRound,
  ExternalLink,
  Phone,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  Activity,
  History,
  UserPlus,
  UserMinus,
  Edit3,
  ArrowRight,
} from 'lucide-react';
import type { Poll, PollSummary, VoterSelection, PollOption, PollEventLog } from '../types';
import { getAdminSession } from '../lib/storage';

interface AdminDashboardProps {
  currentPoll: Poll;
  onSelectPoll: (pollId: string) => void;
  onOpenCreatePoll: () => void;
  onOpenShareModal: (pollId: string, pollTitle: string) => void;
  onViewAsUser: () => void;
  onLogout: () => void;
  onPollUpdated: (updatedPoll: Poll) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentPoll,
  onSelectPoll,
  onOpenCreatePoll,
  onOpenShareModal,
  onViewAsUser,
  onLogout,
  onPollUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'voters' | 'polls' | 'logs' | 'security'>('voters');
  const [allPolls, setAllPolls] = useState<PollSummary[]>([]);
  const [loadingPolls, setLoadingPolls] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<string>('todos');
  const [shiftFilter, setShiftFilter] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'by_route' | 'by_voter'>('by_route');
  const [copiedScale, setCopiedScale] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Event Log states
  const [eventLogs, setEventLogs] = useState<PollEventLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilterPoll, setLogFilterPoll] = useState<string>('all');
  const [logTypeFilter, setLogTypeFilter] = useState<string>('all');
  const [logSearch, setLogSearch] = useState('');

  // Security tab state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const { token: adminToken } = getAdminSession();

  // Load all polls for the polls management tab
  const fetchAllPolls = async () => {
    setLoadingPolls(true);
    try {
      const res = await fetch('/api/polls');
      const data = await res.json();
      if (Array.isArray(data)) {
        setAllPolls(data);
      }
    } catch (err) {
      console.error('Error fetching polls:', err);
    } finally {
      setLoadingPolls(false);
    }
  };

  // Load event logs
  const fetchEventLogs = async () => {
    setLoadingLogs(true);
    try {
      const url =
        logFilterPoll && logFilterPoll !== 'all'
          ? `/api/admin/events?pollId=${encodeURIComponent(logFilterPoll)}`
          : '/api/admin/events';
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.events)) {
          setEventLogs(data.events);
        }
      }
    } catch (err) {
      console.error('Error fetching event logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Tem certeza que deseja limpar o histórico de logs de eventos?')) {
      return;
    }
    try {
      const res = await fetch('/api/admin/events', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      if (res.ok) {
        setEventLogs([]);
      }
    } catch (err) {
      console.error('Error clearing logs:', err);
    }
  };

  useEffect(() => {
    fetchAllPolls();
    fetchEventLogs();
  }, [currentPoll.id, logFilterPoll]);

  // Formatter for event relative time
  const formatEventTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);

      if (diffSecs < 45) return 'Agora mesmo';
      if (diffMins < 60) return `Há ${diffMins} min`;
      if (diffHours < 24) {
        return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      }
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const votersList: VoterSelection[] = Object.values(currentPoll.votes || {});
  const totalVoters = votersList.length;

  // Filtered voters
  const filteredVoters = votersList.filter((voter) => {
    const matchesSearch =
      voter.voterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (voter.notes && voter.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (voter.phone && voter.phone.includes(searchTerm));

    const matchesVehicle =
      vehicleFilter === 'todos' ||
      (voter.vehicle && voter.vehicle.toLowerCase() === vehicleFilter.toLowerCase());

    const matchesShift =
      shiftFilter === 'todos' ||
      voter.selectedOptionIds.includes(shiftFilter);

    return matchesSearch && matchesVehicle && matchesShift;
  });

  // Calculate stats by vehicle
  const vehicleStats = votersList.reduce((acc, v) => {
    const veh = v.vehicle || 'Outro';
    acc[veh] = (acc[veh] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Option stats
  const optionStats = currentPoll.options.map((option) => {
    const matchingVoters = votersList.filter((v) =>
      v.selectedOptionIds.includes(option.id)
    );
    return {
      option,
      count: matchingVoters.length,
      voters: matchingVoters,
    };
  });

  const getVehicleIcon = (vehicle?: string) => {
    switch (vehicle?.toLowerCase()) {
      case 'moto':
        return <Bike className="h-4 w-4 text-blue-600" />;
      case 'carro':
        return <Car className="h-4 w-4 text-emerald-600" />;
      case 'van':
      case 'van / fiorino':
      case 'caminhão':
        return <Truck className="h-4 w-4 text-amber-600" />;
      default:
        return <User className="h-4 w-4 text-slate-500" />;
    }
  };

  // Toggle poll active/paused
  const handleTogglePollStatus = async (pollId: string) => {
    try {
      const res = await fetch(`/api/polls/${pollId}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (pollId === currentPoll.id) {
          onPollUpdated(data.poll);
        }
        fetchAllPolls();
      }
    } catch (e) {
      console.error('Error toggling poll status:', e);
    }
  };

  // Delete a poll
  const handleDeletePoll = async (pollId: string, pollTitle: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente a enquete "${pollTitle}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/polls/${pollId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      if (res.ok) {
        fetchAllPolls();
        if (pollId === currentPoll.id) {
          // Select first available or reload
          const remaining = allPolls.filter((p) => p.id !== pollId);
          if (remaining.length > 0) {
            onSelectPoll(remaining[0].id);
          }
        }
      }
    } catch (e) {
      console.error('Error deleting poll:', e);
    }
  };

  // Delete a voter entry
  const handleDeleteVoter = async (voterId: string, voterName: string) => {
    if (!window.confirm(`Deseja remover o voto de "${voterName}" desta enquete?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/polls/${currentPoll.id}/voter/${voterId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        onPollUpdated(data.poll);
      }
    } catch (e) {
      console.error('Error removing voter:', e);
    }
  };

  // Copy scale to WhatsApp
  const handleCopyScaleToWhatsApp = async () => {
    let report = `📋 *ESCALA DE DISPONIBILIDADE - Izi Disponibilidade*\n`;
    report += `🎯 *${currentPoll.title}*\n`;
    report += `👥 *Total de Respondentes:* ${totalVoters} motoristas\n`;
    report += `📅 *Gerado em:* ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n\n`;

    currentPoll.options.forEach((opt) => {
      const voters = votersList.filter((v) => v.selectedOptionIds.includes(opt.id));
      report += `📍 *${opt.label}* (${voters.length} disponíveis)\n`;
      if (voters.length === 0) {
        report += `   ⚠️ _Nenhum motorista disponível_\n`;
      } else {
        voters.forEach((v) => {
          const veh = v.vehicle ? ` [${v.vehicle}]` : '';
          const phone = v.phone ? ` (Tel: ${v.phone})` : '';
          const note = v.notes ? ` - "${v.notes}"` : '';
          report += `   • ${v.voterName}${veh}${phone}${note}\n`;
        });
      }
      report += `\n`;
    });

    report += `_Organizado pelo Painel do Administrador • Izi Disponibilidade_`;

    try {
      await navigator.clipboard.writeText(report);
      setCopiedScale(true);
      setTimeout(() => setCopiedScale(false), 3000);
    } catch (e) {
      console.error('Failed to copy scale:', e);
    }
  };

  // Copy user voting link for current poll
  const handleCopyUserVotingLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('poll', currentPoll.id);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (e) {
      console.error('Failed to copy link:', e);
    }
  };

  // Change admin password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (newPassword.length < 4) {
      setPasswordStatus({
        type: 'error',
        msg: 'A nova senha deve ter no mínimo 4 caracteres.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({
        type: 'error',
        msg: 'As senhas não coincidem.',
      });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao atualizar senha.');
      }
      setPasswordStatus({
        type: 'success',
        msg: 'Senha do administrador atualizada com sucesso!',
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordStatus({
        type: 'error',
        msg: err.message || 'Erro ao alterar senha.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Top Header Card */}
      <div className="rounded-2xl border border-slate-900 bg-slate-900 p-5 sm:p-7 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                <Shield className="h-4 w-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Painel do Administrador
              </h1>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                Acesso Autorizado
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Enquete ativa: <strong className="text-white">{currentPoll.title}</strong>{' '}
              {currentPoll.isActive ? (
                <span className="text-emerald-400 font-medium">(Aberta para votos)</span>
              ) : (
                <span className="text-amber-400 font-medium">(Pausada)</span>
              )}
            </p>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-admin-view-user-mode"
              onClick={onViewAsUser}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              title="Alternar para visualização que os motoristas/usuários vêem"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Ver Como Usuário</span>
            </button>

            <button
              id="btn-admin-share-link"
              onClick={() => onOpenShareModal(currentPoll.id, currentPoll.title)}
              className="flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-600/20 px-3.5 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-600/30 transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Enviar Link aos Usuários</span>
            </button>

            <button
              id="btn-admin-create-poll"
              onClick={onOpenCreatePoll}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-500 active:scale-95 transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Criar Nova Enquete</span>
            </button>

            <button
              id="btn-admin-logout"
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors"
              title="Encerrar sessão de administrador"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
          <button
            id="tab-admin-voters"
            onClick={() => setActiveTab('voters')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'voters'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Quem Votou na Disponibilidade</span>
            <span
              className={`rounded-full px-2 py-0.2 text-[10px] font-extrabold ${
                activeTab === 'voters'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {totalVoters}
            </span>
          </button>

          <button
            id="tab-admin-polls"
            onClick={() => setActiveTab('polls')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'polls'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Gerenciar Enquetes</span>
            <span
              className={`rounded-full px-2 py-0.2 text-[10px] font-extrabold ${
                activeTab === 'polls'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {allPolls.length}
            </span>
          </button>

          <button
            id="tab-admin-logs"
            onClick={() => {
              setActiveTab('logs');
              fetchEventLogs();
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'logs'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Log de Eventos</span>
            {eventLogs.length > 0 && (
              <span
                className={`rounded-full px-2 py-0.2 text-[10px] font-extrabold ${
                  activeTab === 'logs'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {eventLogs.length}
              </span>
            )}
          </button>

          <button
            id="tab-admin-security"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'security'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <KeyRound className="h-4 w-4" />
            <span>Segurança & Senha</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Quem Votou na Disponibilidade */}
      {activeTab === 'voters' && (
        <div className="space-y-6">
          {/* Recent Activity Quick Strip */}
          {eventLogs.length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3.5 sm:p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <Activity className="h-3.5 w-3.5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Última Atividade Detectada
                    </span>
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {eventLogs[0].description} •{' '}
                      <span className="font-medium text-slate-600">
                        {formatEventTime(eventLogs[0].timestamp)}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  id="btn-goto-logs-from-voters"
                  onClick={() => {
                    setActiveTab('logs');
                    fetchEventLogs();
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline shrink-0"
                >
                  <span>Ver histórico de logs ({eventLogs.length})</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Top Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total de Motoristas
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {totalVoters}
                </span>
                <span className="text-xs text-slate-500">votaram</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Motos Registradas
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-blue-600">
                  {vehicleStats['Moto'] || 0}
                </span>
                <Bike className="h-4 w-4 text-blue-500" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Carros & Vans
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600">
                  {(vehicleStats['Carro'] || 0) +
                    (vehicleStats['Van'] || 0) +
                    (vehicleStats['Van / Fiorino'] || 0)}
                </span>
                <Car className="h-4 w-4 text-emerald-500" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Rotas / Turnos
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-800">
                  {currentPoll.options.length}
                </span>
                <span className="text-xs text-slate-500">opções</span>
              </div>
            </div>
          </div>

          {/* Action Bar & Filters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="input-admin-search-voter"
                    type="text"
                    placeholder="Buscar motorista ou nota..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {/* Vehicle filter */}
                <select
                  id="select-admin-filter-vehicle"
                  value={vehicleFilter}
                  onChange={(e) => setVehicleFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="todos">Todos os Veículos</option>
                  <option value="Moto">Motos</option>
                  <option value="Carro">Carros</option>
                  <option value="Van">Vans / Fiorinos</option>
                  <option value="Caminhão">Caminhões</option>
                  <option value="Outro">Outros</option>
                </select>

                {/* Shift filter */}
                <select
                  id="select-admin-filter-shift"
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 max-w-[220px] truncate"
                >
                  <option value="todos">Todos os Turnos/Dias</option>
                  {currentPoll.options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* View switch & Export */}
              <div className="flex items-center gap-2">
                <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                  <button
                    id="btn-admin-view-by-route"
                    onClick={() => setViewMode('by_route')}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                      viewMode === 'by_route'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Por Turno / Rota
                  </button>
                  <button
                    id="btn-admin-view-by-voter"
                    onClick={() => setViewMode('by_voter')}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                      viewMode === 'by_voter'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Lista de Motoristas
                  </button>
                </div>

                <button
                  id="btn-admin-copy-whatsapp-scale"
                  onClick={handleCopyScaleToWhatsApp}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    copiedScale
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 active:scale-95'
                  }`}
                  title="Copiar texto formatado pronto para colar nos grupos de WhatsApp"
                >
                  {copiedScale ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Copiado para WhatsApp!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-emerald-600" />
                      <span>Copiar Escala WhatsApp</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: BY ROUTE / SHIFT */}
          {viewMode === 'by_route' && (
            <div className="space-y-4">
              {optionStats.map(({ option, count, voters }) => {
                const matchesVehicleFilter =
                  vehicleFilter === 'todos'
                    ? voters
                    : voters.filter(
                        (v) =>
                          v.vehicle?.toLowerCase() === vehicleFilter.toLowerCase()
                      );

                const matchesSearch = searchTerm
                  ? matchesVehicleFilter.filter(
                      (v) =>
                        v.voterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (v.notes && v.notes.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                  : matchesVehicleFilter;

                return (
                  <div
                    key={option.id}
                    className={`rounded-2xl border p-5 bg-white transition-all ${
                      count === 0
                        ? 'border-amber-200/80 bg-amber-50/20'
                        : 'border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                            count === 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-slate-900">
                            {option.label}
                          </h3>
                          {option.category && (
                            <span className="text-[11px] font-medium text-slate-500">
                              {option.category} • Turno: {option.shift || 'Geral'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            count === 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {count} {count === 1 ? 'motorista disponível' : 'motoristas disponíveis'}
                        </span>
                      </div>
                    </div>

                    {/* Drivers for this slot */}
                    <div className="pt-3">
                      {matchesSearch.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          {count === 0
                            ? '⚠️ Nenhum motorista disponível para este horário.'
                            : 'Nenhum motorista coincide com os filtros atuais.'}
                        </p>
                      ) : (
                        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 pt-1">
                          {matchesSearch.map((driver) => (
                            <div
                              key={driver.voterId}
                              className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 hover:bg-slate-100/70 transition-colors"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  {getVehicleIcon(driver.vehicle)}
                                  <span className="font-bold text-xs text-slate-900">
                                    {driver.voterName}
                                  </span>
                                  {driver.vehicle && (
                                    <span className="rounded bg-slate-200/80 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700">
                                      {driver.vehicle}
                                    </span>
                                  )}
                                </div>

                                {driver.phone && (
                                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                    <Phone className="h-3 w-3" />
                                    <span>{driver.phone}</span>
                                  </div>
                                )}

                                {driver.notes && (
                                  <p className="text-[11px] text-slate-600 italic bg-white/60 rounded px-2 py-0.5 border border-slate-100">
                                    "{driver.notes}"
                                  </p>
                                )}
                              </div>

                              <button
                                onClick={() =>
                                  handleDeleteVoter(driver.voterId, driver.voterName)
                                }
                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                                title="Remover este voto da escala"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 2: BY VOTER TABLE */}
          {viewMode === 'by_voter' && (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Motorista</th>
                      <th className="px-4 py-3">Veículo</th>
                      <th className="px-4 py-3">Disponibilidade Selecionada</th>
                      <th className="px-4 py-3">Observações</th>
                      <th className="px-4 py-3">Data do Voto</th>
                      <th className="px-4 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVoters.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Nenhum motorista cadastrado ou localizado com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredVoters.map((voter) => (
                        <tr key={voter.voterId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            <div>{voter.voterName}</div>
                            {voter.phone && (
                              <div className="text-[11px] font-normal text-slate-500">
                                {voter.phone}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {getVehicleIcon(voter.vehicle)}
                              <span>{voter.vehicle || 'Não informado'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {voter.selectedOptionIds.map((optId) => {
                                const opt = currentPoll.options.find((o) => o.id === optId);
                                return (
                                  <span
                                    key={optId}
                                    className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-800"
                                  >
                                    {opt?.label || optId}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                            {voter.notes || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-[11px]">
                            {new Date(voter.updatedAt).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteVoter(voter.voterId, voter.voterName)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Remover participante da enquete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Gerenciar Enquetes */}
      {activeTab === 'polls' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Todas as Enquetes do Sistema
              </h2>
              <p className="text-xs text-slate-500">
                Gerencie escalas ativas, pause votações ou crie novas listas de rotas.
              </p>
            </div>
            <button
              id="btn-admin-tab-create-poll"
              onClick={onOpenCreatePoll}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Nova Enquete de Rotas</span>
            </button>
          </div>

          <div className="grid gap-4">
            {allPolls.map((pollItem) => {
              const isCurrent = pollItem.id === currentPoll.id;

              return (
                <div
                  key={pollItem.id}
                  className={`rounded-2xl border p-5 bg-white transition-all ${
                    isCurrent
                      ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {pollItem.title}
                        </h3>
                        {isCurrent && (
                          <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                            Ativa no Painel
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            pollItem.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {pollItem.isActive ? 'Votação Aberta' : 'Votação Pausada'}
                        </span>
                      </div>

                      {pollItem.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {pollItem.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          <strong>{pollItem.totalVoters}</strong> motoristas votaram
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          Criada em {new Date(pollItem.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* Actions for this poll */}
                    <div className="flex flex-wrap items-center gap-2">
                      {!isCurrent && (
                        <button
                          onClick={() => onSelectPoll(pollItem.id)}
                          className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Ver Respostas</span>
                        </button>
                      )}

                      <button
                        onClick={() => onOpenShareModal(pollItem.id, pollItem.title)}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                        title="Copiar link de compartilhamento para enviar aos motoristas"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        <span>Link p/ Motoristas</span>
                      </button>

                      <button
                        onClick={() => handleTogglePollStatus(pollItem.id)}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                          pollItem.isActive
                            ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                        title={
                          pollItem.isActive
                            ? 'Pausar recebimento de novos votos'
                            : 'Reabrir votação para os motoristas'
                        }
                      >
                        {pollItem.isActive ? (
                          <>
                            <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
                            <span>Pausar</span>
                          </>
                        ) : (
                          <>
                            <PlayCircle className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Reativar</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDeletePoll(pollItem.id, pollItem.title)}
                        className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 transition-colors"
                        title="Excluir enquete permanentemente"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Log de Eventos */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Activity className="h-4 w-4" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Histórico & Log de Eventos das Enquetes
                  </h2>
                </div>
                <p className="text-xs text-slate-500 max-w-2xl">
                  Acompanhe todas as atualizações em tempo real: novos votos recebidos, alterações
                  de turnos feitas pelos motoristas, votos removidos e mudanças de status.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="btn-refresh-logs"
                  onClick={fetchEventLogs}
                  disabled={loadingLogs}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-50"
                  title="Recarregar histórico de eventos"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                  <span>Atualizar</span>
                </button>

                <button
                  id="btn-clear-logs"
                  onClick={handleClearLogs}
                  disabled={eventLogs.length === 0}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 active:scale-95 transition-all disabled:opacity-40"
                  title="Limpar logs gravados"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Limpar Logs</span>
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/70">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total de Eventos
                </span>
                <p className="mt-0.5 text-xl font-black text-slate-900">{eventLogs.length}</p>
              </div>

              <div className="rounded-xl bg-emerald-50/70 p-3 border border-emerald-200/60">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                  Novos Votos
                </span>
                <p className="mt-0.5 text-xl font-black text-emerald-700">
                  {eventLogs.filter((e) => e.type === 'vote_added').length}
                </p>
              </div>

              <div className="rounded-xl bg-amber-50/70 p-3 border border-amber-200/60">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                  Opções Alteradas
                </span>
                <p className="mt-0.5 text-xl font-black text-amber-700">
                  {eventLogs.filter((e) => e.type === 'vote_updated').length}
                </p>
              </div>

              <div className="rounded-xl bg-rose-50/70 p-3 border border-rose-200/60">
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                  Votos Removidos
                </span>
                <p className="mt-0.5 text-xl font-black text-rose-700">
                  {eventLogs.filter((e) => e.type === 'vote_removed').length}
                </p>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="mt-4 flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-3 border-t border-slate-100">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id="input-search-logs"
                  type="text"
                  placeholder="Buscar por motorista, veículo ou enquete..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Poll filter */}
              <select
                id="select-filter-log-poll"
                value={logFilterPoll}
                onChange={(e) => setLogFilterPoll(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">Todas as Enquetes</option>
                {allPolls.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title.length > 32 ? p.title.slice(0, 32) + '...' : p.title}
                  </option>
                ))}
              </select>

              {/* Event type filter */}
              <select
                id="select-filter-log-type"
                value={logTypeFilter}
                onChange={(e) => setLogTypeFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">Todos os tipos de evento</option>
                <option value="votes_added">Apenas novos votos</option>
                <option value="votes_updated">Apenas mudanças de opções</option>
                <option value="votes_removed">Apenas votos removidos</option>
                <option value="polls">Apenas criação & status de enquete</option>
              </select>
            </div>
          </div>

          {/* Events List */}
          {(() => {
            const filtered = eventLogs.filter((evt) => {
              const matchesSearch =
                !logSearch ||
                evt.actorName.toLowerCase().includes(logSearch.toLowerCase()) ||
                evt.description.toLowerCase().includes(logSearch.toLowerCase()) ||
                evt.pollTitle.toLowerCase().includes(logSearch.toLowerCase()) ||
                (evt.details?.vehicle &&
                  evt.details.vehicle.toLowerCase().includes(logSearch.toLowerCase()));

              let matchesType = true;
              if (logTypeFilter === 'votes_added') matchesType = evt.type === 'vote_added';
              else if (logTypeFilter === 'votes_updated')
                matchesType = evt.type === 'vote_updated';
              else if (logTypeFilter === 'votes_removed')
                matchesType = evt.type === 'vote_removed';
              else if (logTypeFilter === 'polls')
                matchesType =
                  evt.type === 'poll_created' || evt.type === 'poll_status_changed';

              return matchesSearch && matchesType;
            });

            if (filtered.length === 0) {
              return (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <History className="h-6 w-6" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-800">
                    Nenhum evento encontrado
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                    {logSearch || logTypeFilter !== 'all' || logFilterPoll !== 'all'
                      ? 'Nenhuma atividade coincide com os filtros aplicados. Tente limpar os filtros.'
                      : 'As ações dos motoristas e alterações nas enquetes aparecerão registradas aqui automaticamente.'}
                  </p>
                  {(logSearch || logTypeFilter !== 'all' || logFilterPoll !== 'all') && (
                    <button
                      onClick={() => {
                        setLogSearch('');
                        setLogTypeFilter('all');
                        setLogFilterPoll('all');
                      }}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      <Filter className="h-3.5 w-3.5" />
                      <span>Limpar Filtros</span>
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {filtered.map((evt) => {
                  const isNewVote = evt.type === 'vote_added';
                  const isUpdateVote = evt.type === 'vote_updated';
                  const isRemoveVote = evt.type === 'vote_removed';
                  const isPollCreated = evt.type === 'poll_created';
                  const isPollStatus = evt.type === 'poll_status_changed';

                  return (
                    <div
                      key={evt.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon Container */}
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl mt-0.5 ${
                            isNewVote
                              ? 'bg-emerald-100 text-emerald-700'
                              : isUpdateVote
                              ? 'bg-amber-100 text-amber-700'
                              : isRemoveVote
                              ? 'bg-rose-100 text-rose-700'
                              : isPollCreated
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          {isNewVote && <UserPlus className="h-4 w-4" />}
                          {isUpdateVote && <Edit3 className="h-4 w-4" />}
                          {isRemoveVote && <UserMinus className="h-4 w-4" />}
                          {isPollCreated && <PlusCircle className="h-4 w-4" />}
                          {isPollStatus && <Activity className="h-4 w-4" />}
                        </div>

                        {/* Event Content */}
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {evt.actorName}
                            </span>

                            {/* Badge */}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                isNewVote
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isUpdateVote
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : isRemoveVote
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : isPollCreated
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`}
                            >
                              {isNewVote && 'Novo Voto Recebido'}
                              {isUpdateVote && 'Mudança de Opção'}
                              {isRemoveVote && 'Voto Removido'}
                              {isPollCreated && 'Enquete Criada'}
                              {isPollStatus && 'Status Alterado'}
                            </span>

                            <span className="text-[11px] text-slate-400 font-medium">
                              {formatEventTime(evt.timestamp)}
                            </span>
                          </div>

                          <p className="text-xs font-medium text-slate-700">
                            {evt.description}
                          </p>

                          {/* Extra info chips */}
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <button
                              onClick={() => onSelectPoll(evt.pollId)}
                              className="inline-flex items-center gap-1 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-2 py-0.5 text-[11px] font-medium text-slate-600 transition-colors"
                              title="Ver esta enquete"
                            >
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span className="line-clamp-1">{evt.pollTitle}</span>
                            </button>

                            {evt.details?.vehicle && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                {getVehicleIcon(evt.details.vehicle)}
                                <span>{evt.details.vehicle}</span>
                              </span>
                            )}

                            {typeof evt.details?.optionsCount === 'number' && (
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                {evt.details.optionsCount} turno
                                {evt.details.optionsCount !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Exact time timestamp */}
                      <div className="text-left sm:text-right shrink-0 text-[11px] text-slate-400">
                        {new Date(evt.timestamp).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 4: Segurança & Senha */}
      {activeTab === 'security' && (
        <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Alterar Senha do Administrador
              </h2>
              <p className="text-xs text-slate-500">
                Defina uma nova senha para proteger o acesso às enquetes e escalas.
              </p>
            </div>
          </div>

          {passwordStatus && (
            <div
              className={`mb-5 flex items-center gap-2 rounded-xl p-3.5 text-xs font-semibold ${
                passwordStatus.type === 'success'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {passwordStatus.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              )}
              <span>{passwordStatus.msg}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nova Senha (mínimo 4 caracteres)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
              >
                {savingPassword ? 'Salvando...' : 'Atualizar Senha'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
