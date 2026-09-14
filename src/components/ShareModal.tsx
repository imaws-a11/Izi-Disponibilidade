import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, MessageCircle, QrCode } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  pollId: string;
  pollTitle: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  pollId,
  pollTitle,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/?poll=${encodeURIComponent(pollId)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      // Fallback
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `🚛 *Escala de Disponibilidade de Rotas*\n\nPor favor, acesse o link abaixo e marque os dias e turnos em que você pode fazer rotas (não precisa de login):\n\n🔗 ${shareUrl}\n\nOs resultados atualizam em tempo real!`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappMessage}`;

  // Simple QR code using public reliable QR service SVG representation
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    shareUrl
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-2">
            <MessageCircle className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Compartilhar Enquete de Rotas
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Envie este link para sua equipe. Eles votam na disponibilidade sem precisar de cadastro.
          </p>
        </div>

        {/* Share Link Input */}
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Link direto da enquete
          </label>
          <div className="flex items-center gap-2">
            <input
              id="input-share-url"
              type="text"
              readOnly
              value={shareUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              id="btn-copy-share-url"
              onClick={handleCopy}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* WhatsApp Button */}
        <div className="space-y-2.5">
          <a
            id="btn-share-whatsapp"
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-[0.99] transition-all"
          >
            <MessageCircle className="h-4 w-4 fill-white" />
            <span>Compartilhar no WhatsApp</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-80" />
          </a>

          {/* QR Code toggle */}
          <button
            id="btn-toggle-qr-code"
            onClick={() => setShowQr(!showQr)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <QrCode className="h-4 w-4 text-slate-500" />
            <span>{showQr ? 'Ocultar QR Code' : 'Escanear QR Code no celular'}</span>
          </button>

          {showQr && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50 p-4 mt-2">
              <img
                src={qrCodeUrl}
                alt="QR Code para votação de rotas"
                className="h-44 w-44 rounded-lg bg-white p-2 shadow-xs"
                referrerPolicy="no-referrer"
              />
              <span className="mt-2 text-[11px] text-slate-500">
                Aponte a câmera do celular para abrir direto na enquete
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
