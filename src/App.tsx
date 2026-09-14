import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { VotingSection } from './components/VotingSection';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ShareModal } from './components/ShareModal';
import { CreatePollModal } from './components/CreatePollModal';
import { usePollSocket } from './lib/websocket';
import {
  getOrCreateVoterId,
  getStoredVoterProfile,
  getAdminSession,
  clearAdminSession,
} from './lib/storage';
import type { Poll } from './types';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function App() {
  // Get poll ID from URL query parameters
  const [pollId, setPollId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('poll') || 'escala-semanal';
  });

  const voterId = getOrCreateVoterId();
  const voterProfile = getStoredVoterProfile();

  // Admin authentication state
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const session = getAdminSession();
    return Boolean(session.token);
  });
  const [adminViewActive, setAdminViewActive] = useState<boolean>(() => {
    const session = getAdminSession();
    return Boolean(session.token);
  });
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  // Modals
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [sharePollInfo, setSharePollInfo] = useState<{ id: string; title: string }>({
    id: pollId,
    title: '',
  });
  const [isCreatePollOpen, setIsCreatePollOpen] = useState(false);

  // Verify admin session with server on initial load
  useEffect(() => {
    const session = getAdminSession();
    if (session.token) {
      fetch('/api/admin/verify', {
        headers: { Authorization: `Bearer ${session.token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.authenticated) {
            clearAdminSession();
            setIsAdmin(false);
            setAdminViewActive(false);
          } else {
            setIsAdmin(true);
          }
        })
        .catch(() => {
          // If server error, keep state
        });
    }
  }, []);

  // Real-time WebSocket hook
  const {
    poll,
    setPoll,
    onlineCount,
    status: connectionStatus,
    lastUpdatedBy,
    submitVote,
    removeVote,
    reconnect,
  } = usePollSocket({
    pollId,
    voterId,
    voterName: voterProfile.name,
  });

  // Keep URL in sync when pollId changes
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('poll') !== pollId) {
      url.searchParams.set('poll', pollId);
      window.history.pushState({}, '', url.toString());
    }
    if (poll) {
      setSharePollInfo({ id: poll.id, title: poll.title });
    }
  }, [pollId, poll]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlPoll = params.get('poll');
      if (urlPoll && urlPoll !== pollId) {
        setPollId(urlPoll);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [pollId]);

  const handlePollCreated = (newPoll: Poll) => {
    setPollId(newPoll.id);
    setPoll(newPoll);
    setSharePollInfo({ id: newPoll.id, title: newPoll.title });
    setIsCreatePollOpen(false);
  };

  const handleSelectPoll = (selectedId: string) => {
    setPollId(selectedId);
  };

  const handleOpenShare = (customPollId?: string, customTitle?: string) => {
    setSharePollInfo({
      id: customPollId || pollId,
      title: customTitle || poll?.title || 'Enquete de Rotas',
    });
    setIsShareOpen(true);
  };

  const handleLoginSuccess = (_token: string, _username: string) => {
    setIsAdmin(true);
    setAdminViewActive(true);
  };

  const handleLogoutAdmin = async () => {
    const session = getAdminSession();
    if (session.token) {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
      }).catch(() => {});
    }
    clearAdminSession();
    setIsAdmin(false);
    setAdminViewActive(false);
  };

  const userHasVoted = poll && Boolean(poll.votes[voterId]);
  const userVoteData = poll && poll.votes[voterId];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-600 selection:text-white font-sans">
      {/* Top Navigation */}
      <Header
        pollTitle={poll?.title || 'Carregando enquete...'}
        onlineCount={onlineCount}
        connectionStatus={connectionStatus}
        isAdmin={isAdmin}
        adminViewActive={adminViewActive}
        onToggleAdminView={() => setAdminViewActive(!adminViewActive)}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onLogoutAdmin={handleLogoutAdmin}
        onOpenShare={() => handleOpenShare()}
        onOpenNewPoll={() => setIsCreatePollOpen(true)}
        onReconnect={reconnect}
      />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {/* If Admin is logged in and Admin View is active, show the Master Admin Dashboard */}
        {isAdmin && adminViewActive ? (
          poll ? (
            <AdminDashboard
              currentPoll={poll}
              onSelectPoll={handleSelectPoll}
              onOpenCreatePoll={() => setIsCreatePollOpen(true)}
              onOpenShareModal={(id, title) => handleOpenShare(id, title)}
              onViewAsUser={() => setAdminViewActive(false)}
              onLogout={handleLogoutAdmin}
              onPollUpdated={(updatedPoll) => setPoll(updatedPoll)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4"></div>
              <p className="text-sm font-semibold text-slate-700">
                Carregando dados administrativos da enquete...
              </p>
            </div>
          )
        ) : (
          /* REGULAR VOTER INTERFACE (Or Admin previewing voter interface) */
          /* "os usuarios apenas vêem as listas para votar, somente isso" */
          <div className="mx-auto max-w-3xl space-y-5">
            {/* If Admin is previewing the user interface */}
            {isAdmin && !adminViewActive && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-white shadow-md">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
                  <span className="text-xs font-semibold text-slate-200">
                    Você está visualizando a tela exatamente como os participantes/motoristas a vêem.
                  </span>
                </div>
                <button
                  onClick={() => setAdminViewActive(true)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Voltar ao Painel Admin</span>
                </button>
              </div>
            )}

            {/* Poll Paused Notice if applicable */}
            {poll && !poll.isActive && (
              <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-bold">Votação temporariamente suspensa</p>
                  <p className="font-normal text-amber-700 mt-0.5">
                    O administrador pausou o recebimento de novos votos para esta escala de rotas.
                  </p>
                </div>
              </div>
            )}

            {/* User confirmation badge if already voted */}
            {userHasVoted && userVoteData && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 sm:p-5 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-sm sm:text-base font-bold text-emerald-900">
                      Sua disponibilidade está confirmada, {userVoteData.voterName}!
                    </h2>
                    <p className="text-xs text-emerald-700">
                      Você selecionou{' '}
                      <strong>{userVoteData.selectedOptionIds.length} turnos/rotas</strong>{' '}
                      {userVoteData.vehicle ? `com veículo ${userVoteData.vehicle}` : ''}. Seus dados
                      já foram sincronizados ao vivo com a coordenação.
                    </p>
                    <p className="text-[11px] text-emerald-600 pt-1">
                      Você pode alterar suas opções marcando ou desmarcando os itens abaixo e
                      clicando em "Salvar Alterações".
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading state */}
            {!poll ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4"></div>
                <p className="text-sm font-semibold text-slate-700">
                  Carregando lista de rotas para votação...
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Sincronizando em tempo real com a coordenação
                </p>
              </div>
            ) : (
              /* THE VOTING SECTION: Pure and focused for the user */
              <VotingSection
                poll={poll}
                voterId={voterId}
                onSubmitVote={submitVote}
                onRemoveVote={removeVote}
              />
            )}
          </div>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 mt-auto">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 text-xs text-slate-500 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Izi Disponibilidade • Votação de disponibilidade em tempo real sem necessidade de login</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        pollId={sharePollInfo.id}
        pollTitle={sharePollInfo.title}
      />

      <CreatePollModal
        isOpen={isCreatePollOpen}
        onClose={() => setIsCreatePollOpen(false)}
        onPollCreated={handlePollCreated}
      />
    </div>
  );
}
