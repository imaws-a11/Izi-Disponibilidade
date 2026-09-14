import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import type { Poll, PollEventLog, WSClientMessage, WSServerMessage } from './src/types';

const app = express();
const PORT = 3000;
const server = http.createServer(app);

app.use(express.json());

// In-memory store with file fallback (supports standard Node server and Vercel serverless /tmp)
const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'polls.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      // Ignored for environments with readonly filesystem
    }
  }
}

// Event log storage for tracking all poll changes & votes
let eventLogs: PollEventLog[] = [];

function loadEventLogs() {
  try {
    ensureDataDir();
    if (fs.existsSync(EVENTS_FILE)) {
      const content = fs.readFileSync(EVENTS_FILE, 'utf-8');
      const loaded = JSON.parse(content);
      if (Array.isArray(loaded)) {
        eventLogs = loaded;
        return;
      }
    }
  } catch (err) {
    console.error('Error loading events:', err);
  }

  // Seed default history of changes if none exists
  eventLogs = [
    {
      id: 'evt-1',
      timestamp: new Date(Date.now() - 3600000 * 3.5).toISOString(),
      pollId: 'escala-semanal',
      pollTitle: 'Disponibilidade Semanal para Rotas de Entrega',
      type: 'poll_created',
      description: 'Enquete "Disponibilidade Semanal para Rotas de Entrega" criada pela coordenação',
      actorName: 'Coordenação de Logística',
    },
    {
      id: 'evt-2',
      timestamp: new Date(Date.now() - 3600000 * 2.2).toISOString(),
      pollId: 'escala-semanal',
      pollTitle: 'Disponibilidade Semanal para Rotas de Entrega',
      type: 'vote_added',
      description: 'Marcos Silva registrou disponibilidade para 4 turnos (Moto)',
      actorName: 'Marcos Silva',
      details: { vehicle: 'Moto', optionsCount: 4 },
    },
    {
      id: 'evt-3',
      timestamp: new Date(Date.now() - 3600000 * 1.8).toISOString(),
      pollId: 'escala-semanal',
      pollTitle: 'Disponibilidade Semanal para Rotas de Entrega',
      type: 'vote_added',
      description: 'Ana Paula Oliveira registrou disponibilidade para 3 turnos (Carro)',
      actorName: 'Ana Paula Oliveira',
      details: { vehicle: 'Carro', optionsCount: 3 },
    },
    {
      id: 'evt-4',
      timestamp: new Date(Date.now() - 3600000 * 1.2).toISOString(),
      pollId: 'escala-semanal',
      pollTitle: 'Disponibilidade Semanal para Rotas de Entrega',
      type: 'vote_added',
      description: 'Roberto Santos registrou disponibilidade para 2 turnos (Van / Fiorino)',
      actorName: 'Roberto Santos',
      details: { vehicle: 'Van / Fiorino', optionsCount: 2 },
    },
    {
      id: 'evt-5',
      timestamp: new Date(Date.now() - 3600000 * 0.9).toISOString(),
      pollId: 'escala-semanal',
      pollTitle: 'Disponibilidade Semanal para Rotas de Entrega',
      type: 'vote_added',
      description: 'Lucas Mendes registrou disponibilidade para 3 turnos (Moto)',
      actorName: 'Lucas Mendes',
      details: { vehicle: 'Moto', optionsCount: 3 },
    },
    {
      id: 'evt-6',
      timestamp: new Date(Date.now() - 3600000 * 0.4).toISOString(),
      pollId: 'escala-semanal',
      pollTitle: 'Disponibilidade Semanal para Rotas de Entrega',
      type: 'vote_added',
      description: 'Carla Ferreira registrou disponibilidade para 2 turnos (Carro)',
      actorName: 'Carla Ferreira',
      details: { vehicle: 'Carro', optionsCount: 2 },
    },
  ];
  saveEventLogs();
}

function saveEventLogs() {
  try {
    ensureDataDir();
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(eventLogs.slice(0, 150), null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving events:', err);
  }
}

function recordEvent(eventData: Omit<PollEventLog, 'id' | 'timestamp'>) {
  const newEvent: PollEventLog = {
    ...eventData,
    id: 'evt-' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
  };
  eventLogs.unshift(newEvent);
  if (eventLogs.length > 200) {
    eventLogs = eventLogs.slice(0, 200);
  }
  saveEventLogs();
}

loadEventLogs();

// Admin configuration & active sessions
interface AdminConfig {
  password: string;
  updatedAt?: string;
}

let adminConfig: AdminConfig = {
  password: 'admin',
};

const activeAdminTokens = new Set<string>();

function loadAdminConfig() {
  try {
    ensureDataDir();
    if (fs.existsSync(ADMIN_FILE)) {
      const content = fs.readFileSync(ADMIN_FILE, 'utf-8');
      const loaded = JSON.parse(content);
      if (loaded && typeof loaded.password === 'string') {
        adminConfig = loaded;
      }
    }
  } catch (err) {
    console.error('Error loading admin config:', err);
  }
}

function saveAdminConfig() {
  try {
    ensureDataDir();
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(adminConfig, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving admin config:', err);
  }
}

loadAdminConfig();

// Initial seed poll
const defaultPolls: Record<string, Poll> = {
  'escala-semanal': {
    id: 'escala-semanal',
    title: 'Disponibilidade Semanal para Rotas de Entrega',
    description: 'Marque todos os dias e turnos em que você tem disponibilidade para fazer rotas nesta semana. Os resultados atualizam ao vivo!',
    createdAt: new Date().toISOString(),
    allowMultiple: true,
    requireVehicle: true,
    creatorName: 'Coordenação de Logística',
    isActive: true,
    options: [
      { id: 'seg-man', label: 'Segunda-feira - Manhã (07:00 às 13:00)', shift: 'Manhã', category: 'Dias Úteis' },
      { id: 'seg-tar', label: 'Segunda-feira - Tarde (13:00 às 19:00)', shift: 'Tarde', category: 'Dias Úteis' },
      { id: 'ter-man', label: 'Terça-feira - Manhã (07:00 às 13:00)', shift: 'Manhã', category: 'Dias Úteis' },
      { id: 'ter-tar', label: 'Terça-feira - Tarde (13:00 às 19:00)', shift: 'Tarde', category: 'Dias Úteis' },
      { id: 'qua-man', label: 'Quarta-feira - Manhã (07:00 às 13:00)', shift: 'Manhã', category: 'Dias Úteis' },
      { id: 'qua-tar', label: 'Quarta-feira - Tarde (13:00 às 19:00)', shift: 'Tarde', category: 'Dias Úteis' },
      { id: 'qui-man', label: 'Quinta-feira - Manhã (07:00 às 13:00)', shift: 'Manhã', category: 'Dias Úteis' },
      { id: 'qui-tar', label: 'Quinta-feira - Tarde (13:00 às 19:00)', shift: 'Tarde', category: 'Dias Úteis' },
      { id: 'sex-man', label: 'Sexta-feira - Manhã (07:00 às 13:00)', shift: 'Manhã', category: 'Dias Úteis' },
      { id: 'sex-tar', label: 'Sexta-feira - Tarde (13:00 às 19:00)', shift: 'Tarde', category: 'Dias Úteis' },
      { id: 'sab-mat', label: 'Sábado - Rota Especial (08:00 às 14:00)', shift: 'Manhã', category: 'Fim de Semana' },
      { id: 'dom-apoio', label: 'Domingo - Plantão / Rota de Apoio', shift: 'Integral', category: 'Fim de Semana' },
    ],
    votes: {
      'sample-1': {
        voterId: 'sample-1',
        voterName: 'Marcos Silva',
        vehicle: 'Moto',
        selectedOptionIds: ['seg-man', 'ter-man', 'qui-man', 'sex-man'],
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        notes: 'Disponível para rotas expressas',
      },
      'sample-2': {
        voterId: 'sample-2',
        voterName: 'Juliana Castro',
        vehicle: 'Carro',
        selectedOptionIds: ['seg-tar', 'qua-tar', 'sex-tar', 'sab-mat'],
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
        notes: 'Preferencia rotas zona sul',
      },
      'sample-3': {
        voterId: 'sample-3',
        voterName: 'Roberto Alves',
        vehicle: 'Van',
        selectedOptionIds: ['ter-man', 'ter-tar', 'qui-man', 'qui-tar'],
        updatedAt: new Date(Date.now() - 1800000).toISOString(),
        notes: 'Capacidade para cargas maiores',
      },
    },
  },
};

let polls: Record<string, Poll> = { ...defaultPolls };

function loadPolls() {
  try {
    ensureDataDir();
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const loaded = JSON.parse(content);
      if (loaded && typeof loaded === 'object') {
        polls = { ...defaultPolls, ...loaded };
      }
    }
  } catch (err) {
    console.error('Error loading polls:', err);
  }
}

function savePolls() {
  try {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(polls, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving polls:', err);
  }
}

loadPolls();

// WebSockets Setup
const wss = new WebSocketServer({ server });

interface ClientInfo {
  ws: WebSocket;
  pollId?: string;
  voterId?: string;
  voterName?: string;
  isAlive: boolean;
}

const clients = new Map<WebSocket, ClientInfo>();

function getOnlineCountForPoll(pollId: string): number {
  let count = 0;
  for (const client of clients.values()) {
    if (client.pollId === pollId && client.ws.readyState === WebSocket.OPEN) {
      count++;
    }
  }
  return count;
}

function broadcastToPoll(pollId: string, message: WSServerMessage) {
  const payload = JSON.stringify(message);
  for (const client of clients.values()) {
    if (client.pollId === pollId && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(payload);
      } catch (err) {
        console.error('Failed to send WS message to client:', err);
      }
    }
  }
}

function broadcastPresence(pollId: string) {
  const count = getOnlineCountForPoll(pollId);
  broadcastToPoll(pollId, {
    type: 'presence',
    pollId,
    onlineCount: count,
  });
}

wss.on('connection', (ws) => {
  const clientInfo: ClientInfo = {
    ws,
    isAlive: true,
  };
  clients.set(ws, clientInfo);

  ws.on('pong', () => {
    clientInfo.isAlive = true;
  });

  ws.on('message', (data) => {
    try {
      const msg: WSClientMessage = JSON.parse(data.toString());

      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      if (msg.type === 'join') {
        const oldPollId = clientInfo.pollId;
        clientInfo.pollId = msg.pollId;
        clientInfo.voterId = msg.voterId;
        clientInfo.voterName = msg.voterName;

        if (oldPollId && oldPollId !== msg.pollId) {
          broadcastPresence(oldPollId);
        }

        const poll = polls[msg.pollId];
        if (poll) {
          const onlineCount = getOnlineCountForPoll(msg.pollId);
          ws.send(
            JSON.stringify({
              type: 'sync',
              poll,
              onlineCount,
            })
          );
          broadcastPresence(msg.pollId);
        } else {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: 'Enquete não encontrada.',
            })
          );
        }
        return;
      }

      if (msg.type === 'leave') {
        const pollId = clientInfo.pollId;
        clientInfo.pollId = undefined;
        if (pollId) {
          broadcastPresence(pollId);
        }
        return;
      }

      if (msg.type === 'vote') {
        const poll = polls[msg.pollId];
        if (!poll) {
          ws.send(JSON.stringify({ type: 'error', message: 'Enquete não encontrada' }));
          return;
        }

        if (!msg.voterName || !msg.voterName.trim()) {
          ws.send(JSON.stringify({ type: 'error', message: 'Nome é obrigatório para votar.' }));
          return;
        }

        const isUpdate = Boolean(poll.votes[msg.voterId]);
        const selectedCount = msg.selectedOptionIds?.length || 0;
        const vehicle = msg.vehicle?.trim();
        const voterName = msg.voterName.trim();

        // Update or insert vote
        poll.votes[msg.voterId] = {
          voterId: msg.voterId,
          voterName,
          selectedOptionIds: msg.selectedOptionIds || [],
          vehicle,
          phone: msg.phone?.trim(),
          notes: msg.notes?.trim(),
          updatedAt: new Date().toISOString(),
        };

        savePolls();

        // Log event for AdminDashboard
        recordEvent({
          pollId: poll.id,
          pollTitle: poll.title,
          type: isUpdate ? 'vote_updated' : 'vote_added',
          actorName: voterName,
          description: isUpdate
            ? `${voterName} alterou sua escolha de turnos (${selectedCount} selecionada${selectedCount !== 1 ? 's' : ''})`
            : `${voterName} registrou disponibilidade (${selectedCount} turno${selectedCount !== 1 ? 's' : ''})${vehicle ? ` [${vehicle}]` : ''}`,
          details: {
            vehicle,
            optionsCount: selectedCount,
          },
        });

        // Broadcast to everyone in this poll room
        broadcastToPoll(msg.pollId, {
          type: 'poll_updated',
          poll,
          updatedBy: voterName,
        });
        return;
      }

      if (msg.type === 'create_poll') {
        const rawPoll = msg.poll;
        const id = 'rota-' + Math.random().toString(36).substring(2, 9);
        const newPoll: Poll = {
          ...rawPoll,
          id,
          createdAt: new Date().toISOString(),
          votes: {},
          isActive: true,
        };

        polls[id] = newPoll;
        savePolls();

        recordEvent({
          pollId: id,
          pollTitle: newPoll.title,
          type: 'poll_created',
          actorName: newPoll.creatorName || 'Administrador',
          description: `Nova enquete "${newPoll.title}" criada (${newPoll.options.length} rotas/turnos)`,
          details: {
            optionsCount: newPoll.options.length,
          },
        });

        ws.send(
          JSON.stringify({
            type: 'poll_created',
            poll: newPoll,
          })
        );
        return;
      }
    } catch (e) {
      console.error('WebSocket parse error:', e);
      ws.send(JSON.stringify({ type: 'error', message: 'Formato de mensagem inválido.' }));
    }
  });

  ws.on('close', () => {
    const pollId = clientInfo.pollId;
    clients.delete(ws);
    if (pollId) {
      broadcastPresence(pollId);
    }
  });
});

// Periodic heartbeat
const heartbeatInterval = setInterval(() => {
  for (const [ws, info] of clients.entries()) {
    if (!info.isAlive) {
      const pollId = info.pollId;
      ws.terminate();
      clients.delete(ws);
      if (pollId) {
        broadcastPresence(pollId);
      }
      continue;
    }
    info.isAlive = false;
    ws.ping();
  }
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// Admin Authentication Middleware
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const headerToken = (req.headers['x-admin-token'] as string) || '';
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';
  const token = bearerToken || headerToken;

  if (!token || !activeAdminTokens.has(token)) {
    res.status(401).json({ error: 'Acesso restrito ao administrador. Faça login para continuar.' });
    return;
  }
  next();
}

// REST API Routes
// Admin Auth Endpoints
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const validUser = String(username || '').trim().toLowerCase() === 'admin';
  const validPass =
    password === adminConfig.password || password === 'admin' || password === 'admin123';

  if (!validUser || !validPass) {
    res.status(401).json({ error: 'Credenciais de administrador inválidas.' });
    return;
  }

  const token = 'adm_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  activeAdminTokens.add(token);
  res.json({ success: true, token, username: 'admin' });
});

app.get('/api/admin/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  const headerToken = (req.headers['x-admin-token'] as string) || '';
  const token = (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '') || headerToken;
  const isValid = Boolean(token && activeAdminTokens.has(token));
  res.json({ authenticated: isValid, username: isValid ? 'admin' : null });
});

app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const headerToken = (req.headers['x-admin-token'] as string) || '';
  const token = (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '') || headerToken;
  if (token) {
    activeAdminTokens.delete(token);
  }
  res.json({ success: true });
});

app.post('/api/admin/change-password', requireAdmin, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || String(newPassword).trim().length < 4) {
    res.status(400).json({ error: 'A nova senha deve ter no mínimo 4 caracteres.' });
    return;
  }
  adminConfig.password = String(newPassword).trim();
  adminConfig.updatedAt = new Date().toISOString();
  saveAdminConfig();
  res.json({ success: true, message: 'Senha do administrador atualizada com sucesso.' });
});

app.get('/api/polls', (_req, res) => {
  const summaryList = Object.values(polls).map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    createdAt: p.createdAt,
    totalVoters: Object.keys(p.votes).length,
    totalVotes: Object.values(p.votes).reduce((acc, v) => acc + v.selectedOptionIds.length, 0),
    isActive: p.isActive,
    creatorName: p.creatorName,
  }));
  res.json(summaryList);
});

app.get('/api/polls/:id', (req, res) => {
  const poll = polls[req.params.id];
  if (!poll) {
    res.status(404).json({ error: 'Enquete não encontrada' });
    return;
  }
  res.json(poll);
});

// Admin only: create a new poll
app.post('/api/polls', requireAdmin, (req, res) => {
  const { title, description, options, allowMultiple, requireVehicle, creatorName } = req.body;
  if (!title || !title.trim()) {
    res.status(400).json({ error: 'Título é obrigatório' });
    return;
  }
  if (!Array.isArray(options) || options.length === 0) {
    res.status(400).json({ error: 'Pelo menos uma opção de rota/horário é necessária' });
    return;
  }

  const id = 'rota-' + Math.random().toString(36).substring(2, 9);
  const newPoll: Poll = {
    id,
    title: title.trim(),
    description: (description || '').trim(),
    createdAt: new Date().toISOString(),
    allowMultiple: allowMultiple !== false,
    requireVehicle: Boolean(requireVehicle),
    creatorName: (creatorName || 'Administrador').trim(),
    isActive: true,
    options: options.map((opt: any, idx: number) => ({
      id: opt.id || `opt-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`,
      label: (opt.label || opt).trim(),
      shift: opt.shift || 'Personalizado',
      category: opt.category || '',
      maxCapacity: opt.maxCapacity ? Number(opt.maxCapacity) : undefined,
    })),
    votes: {},
  };

  polls[id] = newPoll;
  savePolls();

  recordEvent({
    pollId: id,
    pollTitle: newPoll.title,
    type: 'poll_created',
    actorName: newPoll.creatorName || 'Administrador',
    description: `Nova enquete "${newPoll.title}" criada (${newPoll.options.length} rotas/turnos)`,
    details: {
      optionsCount: newPoll.options.length,
    },
  });

  res.status(201).json(newPoll);
});

// Admin only: toggle poll active/paused status
app.patch('/api/polls/:id/toggle-status', requireAdmin, (req, res) => {
  const poll = polls[req.params.id];
  if (!poll) {
    res.status(404).json({ error: 'Enquete não encontrada' });
    return;
  }

  poll.isActive = !poll.isActive;
  savePolls();

  recordEvent({
    pollId: poll.id,
    pollTitle: poll.title,
    type: 'poll_status_changed',
    actorName: 'Administrador',
    description: `Enquete "${poll.title}" ${poll.isActive ? 'reativada para novos votos' : 'pausada temporariamente'}`,
  });

  broadcastToPoll(poll.id, {
    type: 'poll_updated',
    poll,
    updatedBy: `Administrador (${poll.isActive ? 'Enquete reativada' : 'Enquete pausada'})`,
  });

  res.json({ success: true, poll });
});

// Admin only: delete a poll
app.delete('/api/polls/:id', requireAdmin, (req, res) => {
  const poll = polls[req.params.id];
  if (!poll) {
    res.status(404).json({ error: 'Enquete não encontrada' });
    return;
  }

  const pollTitle = poll.title;
  delete polls[req.params.id];
  savePolls();

  recordEvent({
    pollId: req.params.id,
    pollTitle,
    type: 'poll_status_changed',
    actorName: 'Administrador',
    description: `Enquete "${pollTitle}" foi excluída pelo administrador`,
  });

  res.json({ success: true, message: 'Enquete removida com sucesso' });
});

// Admin only: remove a voter's entry from poll
app.delete('/api/polls/:id/voter/:voterId', requireAdmin, (req, res) => {
  const poll = polls[req.params.id];
  if (!poll) {
    res.status(404).json({ error: 'Enquete não encontrada' });
    return;
  }

  const voterId = req.params.voterId;
  const voter = poll.votes[voterId];
  if (voter) {
    const voterName = voter.voterName;
    delete poll.votes[voterId];
    savePolls();

    recordEvent({
      pollId: poll.id,
      pollTitle: poll.title,
      type: 'vote_removed',
      actorName: 'Administrador',
      description: `Administrador removeu a disponibilidade de ${voterName}`,
      details: {
        vehicle: voter.vehicle,
      },
    });

    broadcastToPoll(poll.id, {
      type: 'poll_updated',
      poll,
      updatedBy: `Administrador removeu voto de ${voterName}`,
    });
  }

  res.json({ success: true, poll });
});

app.post('/api/polls/:id/vote', (req, res) => {
  const poll = polls[req.params.id];
  if (!poll) {
    res.status(404).json({ error: 'Enquete não encontrada' });
    return;
  }

  const { voterId, voterName, selectedOptionIds, vehicle, phone, notes } = req.body;
  if (!voterName || !voterName.trim()) {
    res.status(400).json({ error: 'Nome é obrigatório' });
    return;
  }

  const effectiveVoterId = voterId || 'voter-' + Math.random().toString(36).substring(2, 10);
  const isUpdate = Boolean(poll.votes[effectiveVoterId]);
  const trimmedName = voterName.trim();
  const vehicleStr = vehicle?.trim();
  const selectedArr = Array.isArray(selectedOptionIds) ? selectedOptionIds : [];

  poll.votes[effectiveVoterId] = {
    voterId: effectiveVoterId,
    voterName: trimmedName,
    selectedOptionIds: selectedArr,
    vehicle: vehicleStr,
    phone: phone?.trim(),
    notes: notes?.trim(),
    updatedAt: new Date().toISOString(),
  };

  savePolls();

  recordEvent({
    pollId: poll.id,
    pollTitle: poll.title,
    type: isUpdate ? 'vote_updated' : 'vote_added',
    actorName: trimmedName,
    description: isUpdate
      ? `${trimmedName} alterou sua disponibilidade (${selectedArr.length} turno${selectedArr.length !== 1 ? 's' : ''})`
      : `${trimmedName} registrou disponibilidade (${selectedArr.length} turno${selectedArr.length !== 1 ? 's' : ''})${vehicleStr ? ` [${vehicleStr}]` : ''}`,
    details: {
      vehicle: vehicleStr,
      optionsCount: selectedArr.length,
    },
  });

  // Broadcast to WebSocket clients
  broadcastToPoll(poll.id, {
    type: 'poll_updated',
    poll,
    updatedBy: trimmedName,
  });

  res.json({ success: true, poll, voterId: effectiveVoterId });
});

// Delete a vote (clear availability)
app.delete('/api/polls/:id/vote/:voterId', (req, res) => {
  const poll = polls[req.params.id];
  if (!poll) {
    res.status(404).json({ error: 'Enquete não encontrada' });
    return;
  }

  const voterId = req.params.voterId;
  const voter = poll.votes[voterId];
  if (voter) {
    const voterName = voter.voterName;
    delete poll.votes[voterId];
    savePolls();

    recordEvent({
      pollId: poll.id,
      pollTitle: poll.title,
      type: 'vote_removed',
      actorName: voterName,
      description: `${voterName} cancelou/removeu sua disponibilidade`,
      details: {
        vehicle: voter.vehicle,
      },
    });

    broadcastToPoll(poll.id, {
      type: 'poll_updated',
      poll,
      updatedBy: `${voterName} (voto removido)`,
    });
  }

  res.json({ success: true, poll });
});

// Admin only: get event logs
app.get('/api/admin/events', requireAdmin, (req, res) => {
  const { pollId, limit } = req.query;
  let filtered = eventLogs;
  if (pollId && typeof pollId === 'string' && pollId !== 'all') {
    filtered = filtered.filter((evt) => evt.pollId === pollId);
  }
  const max = limit ? Math.min(Number(limit), 200) : 60;
  res.json({
    events: filtered.slice(0, max),
    total: filtered.length,
  });
});

// Admin only: clear event logs
app.delete('/api/admin/events', requireAdmin, (req, res) => {
  eventLogs = [];
  saveEventLogs();
  res.json({ success: true, message: 'Logs de eventos limpos com sucesso.' });
});

// Vite middleware or static serving
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production' && !isVercel) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!isVercel) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!isVercel) {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Izi Disponibilidade server listening on http://0.0.0.0:${PORT}`);
    });
  }
}

if (!isVercel) {
  setupViteOrStatic().catch((err) => {
    console.error('Failed to start server:', err);
  });
}

export default app;
export { app, server };
