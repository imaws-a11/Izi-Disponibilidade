import { useEffect, useRef, useState, useCallback } from 'react';
import type { Poll, WSClientMessage, WSServerMessage } from '../types';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

interface UsePollSocketOptions {
  pollId: string;
  voterId?: string;
  voterName?: string;
  onPollUpdated?: (poll: Poll, updatedBy?: string) => void;
}

export function usePollSocket({
  pollId,
  voterId,
  voterName,
  onPollUpdated,
}: UsePollSocketOptions) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollFallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Immediate HTTP fetcher - ensures instant loading & full compatibility with Vercel serverless
  const fetchPollHttp = useCallback(async () => {
    if (!pollId) return;
    try {
      const res = await fetch(`/api/polls/${encodeURIComponent(pollId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          setPoll(data);
        }
      }
    } catch (e) {
      // Network error handled gracefully
    }
  }, [pollId]);

  const connect = useCallback(() => {
    if (!pollId) return;

    // Trigger instant HTTP fetch
    fetchPollHttp();

    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (e) {
        // ignore
      }
    }

    setStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        // Clear HTTP polling fallback when WebSocket is connected
        if (pollFallbackIntervalRef.current) {
          clearInterval(pollFallbackIntervalRef.current);
          pollFallbackIntervalRef.current = null;
        }

        // Join the poll room
        const joinMsg: WSClientMessage = {
          type: 'join',
          pollId,
          voterId,
          voterName,
        };
        ws.send(JSON.stringify(joinMsg));

        // Ping periodically to keep connection alive
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 20000);
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSServerMessage = JSON.parse(event.data);

          if (msg.type === 'sync') {
            setPoll(msg.poll);
            setOnlineCount(msg.onlineCount || 1);
          } else if (msg.type === 'poll_updated') {
            setPoll(msg.poll);
            if (msg.updatedBy) {
              setLastUpdatedBy(msg.updatedBy);
            }
            if (onPollUpdated) {
              onPollUpdated(msg.poll, msg.updatedBy);
            }
          } else if (msg.type === 'presence') {
            if (msg.pollId === pollId) {
              setOnlineCount(msg.onlineCount);
            }
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };

      ws.onerror = () => {
        setStatus('error');
        // Activate HTTP polling fallback (critical for Vercel serverless)
        if (!pollFallbackIntervalRef.current) {
          pollFallbackIntervalRef.current = setInterval(fetchPollHttp, 3500);
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // Activate HTTP polling fallback
        if (!pollFallbackIntervalRef.current) {
          pollFallbackIntervalRef.current = setInterval(fetchPollHttp, 3500);
        }

        // Auto-reconnect after 4 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 4000);
      };
    } catch (err) {
      setStatus('error');
      if (!pollFallbackIntervalRef.current) {
        pollFallbackIntervalRef.current = setInterval(fetchPollHttp, 3500);
      }
    }
  }, [pollId, voterId, voterName, onPollUpdated, fetchPollHttp]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (pollFallbackIntervalRef.current) clearInterval(pollFallbackIntervalRef.current);
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [connect]);

  // Send vote via WebSocket (or HTTP fallback)
  const submitVote = useCallback(
    async (params: {
      voterId: string;
      voterName: string;
      selectedOptionIds: string[];
      vehicle?: string;
      phone?: string;
      notes?: string;
    }) => {
      const ws = socketRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        const msg: WSClientMessage = {
          type: 'vote',
          pollId,
          ...params,
        };
        ws.send(JSON.stringify(msg));
      } else {
        // Fallback to REST API if socket is briefly disconnected
        try {
          const res = await fetch(`/api/polls/${pollId}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.poll) setPoll(data.poll);
          }
        } catch (e) {
          console.error('Error submitting vote via fallback:', e);
        }
      }
    },
    [pollId]
  );

  const removeVote = useCallback(
    async (voterIdToRemove: string) => {
      try {
        const res = await fetch(`/api/polls/${pollId}/vote/${voterIdToRemove}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.poll) setPoll(data.poll);
        }
      } catch (e) {
        console.error('Error deleting vote:', e);
      }
    },
    [pollId]
  );

  return {
    poll,
    setPoll,
    onlineCount,
    status,
    lastUpdatedBy,
    submitVote,
    removeVote,
    reconnect: connect,
  };
}
