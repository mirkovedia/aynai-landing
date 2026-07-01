"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { sendMessage, markMessagesAsRead } from "@/app/(dashboard)/intercambios/[id]/actions";
import type { Message } from "@/types/database";

interface Props {
  exchangeId: string;
  currentUserId: string;
  initialMessages: Message[];
  counterpartName: string;
}

/** Ventana de chat en tiempo real para un intercambio. */
export const ChatWindow = ({ exchangeId, currentUserId, initialMessages, counterpartName }: Props) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  // Memoizar el cliente para no re-crear en cada render y evitar re-suscripciones
  const supabaseRef = useRef(createClient());

  // Marcar mensajes de la contraparte como leídos al abrir el chat
  useEffect(() => {
    void markMessagesAsRead(exchangeId);
  }, [exchangeId]);

  // Suscripción Realtime: escucha nuevos mensajes del intercambio
  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`chat-${exchangeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `exchange_request_id=eq.${exchangeId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          // Evitar duplicar el mensaje optimista del mismo usuario
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [exchangeId]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    // Mensaje optimista: aparece al instante en la UI
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      exchange_request_id: exchangeId,
      sender_id: currentUserId,
      content: trimmed,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");

    startTransition(async () => {
      const result = await sendMessage({ exchangeId, content: trimmed });
      if (result.error) {
        // Revertir mensaje optimista si falló
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setText(trimmed);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[480px] flex-col rounded-2xl border border-cream-300 bg-white shadow-sm">
      {/* Cabecera */}
      <div className="flex items-center gap-2 border-b border-cream-200 px-4 py-3">
        <span className="text-base" aria-hidden="true">💬</span>
        <span className="text-sm font-semibold text-cocoa">Chat con {counterpartName}</span>
      </div>

      {/* Lista de mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-cocoa/40 pt-8">
            Ningún mensaje aún. ¡Saluda a {counterpartName}!
          </p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isMine
                    ? "bg-cocoa text-cream rounded-br-sm"
                    : "bg-cream-100 text-cocoa rounded-bl-sm"
                } ${msg.id.startsWith("opt-") ? "opacity-60" : ""}`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-cream-200 p-3 flex gap-2 items-end">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje… (Enter para enviar)"
          rows={1}
          maxLength={2000}
          className="flex-1 resize-none rounded-xl border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-cocoa placeholder:text-cocoa/40 focus:outline-none focus:ring-2 focus:ring-cocoa/20 min-h-[40px] max-h-[120px] overflow-y-auto"
        />
        <Button
          as="button"
          type="button"
          size="sm"
          disabled={!text.trim() || pending}
          onClick={handleSend}
        >
          Enviar
        </Button>
      </div>
    </div>
  );
};
