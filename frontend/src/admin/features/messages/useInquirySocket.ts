import { useEffect, useRef } from 'react';
import { Client, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

const WS_URL = import.meta.env.VITE_WS_BASE_URL ?? 'http://localhost:8080/ws';

/**
 * Live-updates the Messages module over STOMP:
 *  - /topic/admin/inquiries (always) — a new inquiry arrived, refresh the list.
 *  - /topic/admin/inquiries/{openInquiryId} (only while that conversation is
 *    open) — a new message arrived in it, refresh that thread.
 *
 * Failure degrades gracefully: connection/subscribe errors are only logged,
 * never thrown into the render tree — the page's normal useQuery calls keep
 * working over plain REST regardless of socket state.
 */
export function useInquirySocket(openInquiryId: number | null) {
  const queryClient = useQueryClient();
  const openInquiryIdRef = useRef(openInquiryId);
  const conversationSubRef = useRef<StompSubscription | null>(null);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    openInquiryIdRef.current = openInquiryId;
  }, [openInquiryId]);

  useEffect(() => {
    const subscribeConversation = (client: Client, id: number | null) => {
      conversationSubRef.current?.unsubscribe();
      conversationSubRef.current = null;
      if (id == null) return;
      conversationSubRef.current = client.subscribe(`/topic/admin/inquiries/${id}`, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.inquiries.messages(id) });
      });
    };

    const token = localStorage.getItem('token');
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/topic/admin/inquiries', () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.inquiries.all() });
        });
        // Re-subscribe to whatever conversation is open right now — covers
        // both the initial connect and every reconnect after a drop.
        subscribeConversation(client, openInquiryIdRef.current);
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame.headers['message']);
      },
      onWebSocketError: (event) => {
        console.error('Inquiry socket error:', event);
      },
    });

    clientRef.current = client;
    client.activate();

    return () => {
      client.deactivate();
      clientRef.current = null;
      conversationSubRef.current = null;
    };
  }, [queryClient]);

  useEffect(() => {
    const client = clientRef.current;
    if (!client?.connected) return;

    conversationSubRef.current?.unsubscribe();
    conversationSubRef.current = null;
    if (openInquiryId == null) return;

    conversationSubRef.current = client.subscribe(`/topic/admin/inquiries/${openInquiryId}`, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inquiries.messages(openInquiryId) });
    });
  }, [openInquiryId, queryClient]);
}
