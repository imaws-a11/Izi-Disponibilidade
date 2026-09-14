import React from 'react';
import {
  Route,
  Share2,
  PlusCircle,
  Users,
  RefreshCw,
  Lock,
  ShieldCheck,
  LogOut,
  LayoutDashboard,
  Eye,
} from 'lucide-react';
import type { ConnectionStatus } from '../lib/websocket';

interface HeaderProps {
  pollTitle: string;
  onlineCount: number;
  connectionStatus: ConnectionStatus;
  isAdmin: boolean;
  adminViewActive: boolean;
  onToggleAdminView: () => void;
  onOpenAdminLogin: () => void;
  onLogoutAdmin: () => void;
  onOpenShare: () => void;
  onOpenNewPoll: () => void;
  onReconnect: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pollTitle,
  onlineCount,
  connectionStatus,
  isAdmin,
  adminViewActive,
  onToggleAdminView,
  onOpenAdminLogin,
  onLogoutAdmin,
  onOpenShare,
  onOpenNewPoll,
  onReconnect,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200">
            <Route className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-slate-900 text-base sm:text-lg">
                Izi Disponibilidade
              </span>
              {isAdmin ? (
                <span className="flex items-center gap-1 rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  <span>Modo Admin</span>
                </span>
              ) : (
                <span className="hidden rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 sm:inline-block">
                  Votação de Rotas
                </span>
              )}
            </div>
            <p className="line-clamp-1 max-w-[180px] text-xs text-slate-500 sm:max-w-xs md:max-w-md">
              {pollTitle || 'Enquete de Rotas'}
            </p>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Realtime Status Indicator */}
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs text-slate-600">
            {connectionStatus === 'connected' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                <span className="hidden font-medium text-emerald-700 sm:inline">Ao Vivo</span>
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <Users className="h-3.5 w-3.5 text-slate-500" />
                  {onlineCount}
                </span>
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-amber-700 font-medium">Conectando...</span>
              </>
            ) : (
              <button
                id="btn-reconnect"
                onClick={onReconnect}
                className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-medium"
                title="Clique para reconectar"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Desconectado</span>
              </button>
            )}
          </div>

          {/* ADMIN LOGGED IN CONTROLS */}
          {isAdmin ? (
            <>
              {/* Toggle Admin Panel vs Voter View */}
              <button
                id="btn-toggle-admin-panel"
                onClick={onToggleAdminView}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  adminViewActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                title={adminViewActive ? 'Alternar para visão do usuário' : 'Abrir Painel do Administrador'}
              >
                {adminViewActive ? (
                  <>
                    <Eye className="h-3.5 w-3.5 text-slate-300" />
                    <span className="hidden sm:inline">Ver como Usuário</span>
                  </>
                ) : (
                  <>
                    <LayoutDashboard className="h-3.5 w-3.5 text-blue-600" />
                    <span className="hidden sm:inline">Painel Admin</span>
                  </>
                )}
              </button>

              {/* Create Poll (Admin only - when in Admin Panel) */}
              {adminViewActive && (
                <button
                  id="btn-header-new-poll"
                  onClick={onOpenNewPoll}
                  className="hidden items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors sm:flex"
                  title="Criar nova enquete"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Nova Enquete</span>
                </button>
              )}

              {/* Share (Admin only - when in Admin Panel) */}
              {adminViewActive && (
                <button
                  id="btn-header-share"
                  onClick={onOpenShare}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all"
                  title="Compartilhar link de votação"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Compartilhar</span>
                </button>
              )}

              {/* Logout button */}
              <button
                id="btn-header-logout"
                onClick={onLogoutAdmin}
                className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                title="Sair do modo administrador"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </>
          ) : (
            /* REGULAR USER / CLIENT CONTROLS: Only Admin Access login */
            <button
              id="btn-open-admin-login"
              onClick={onOpenAdminLogin}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
              title="Acesso restrito para administradores"
            >
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span>Acesso Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
