/**
 * MessageThread.tsx — alert() replaced with inline error state.
 * This is the legacy inquiry-thread component (separate from ChatWindow).
 */
import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, FileText, Image, X, Download, Loader, AlertCircle } from "lucide-react";
import { Message } from "@/types";
import { useMessages } from "@/hooks/useMessages";

interface MessageThreadProps {
  inquiryId: string;
  userId: string;
  otherUserName: string;
  onClose: () => void;
}

const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;

export function MessageThread({ inquiryId, userId, otherUserName, onClose }: MessageThreadProps) {
  const { messages, isLoading, isSending, sendMessage, uploadAttachment } = useMessages(inquiryId, userId);
  const [newMessage, setNewMessage] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; name: string; type: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() && !pendingAttachment) return;
    const success = await sendMessage(newMessage, pendingAttachment || undefined);
    if (success) { setNewMessage(""); setPendingAttachment(null); }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_BYTES) {
      setFileError(`File too large — max ${MAX_MB} MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFileError(null);
    setIsUploading(true);
    const result = await uploadAttachment(file);
    setIsUploading(false);

    if (result) {
      setPendingAttachment(result);
    } else {
      setFileError("Upload failed — please try again.");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatDate = (d: string) => {
    const date = new Date(d);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-IN");
  };

  const getAttachmentIcon = (type?: string) => {
    if (type?.startsWith("image/")) return <Image className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const grouped = messages.reduce((acc, msg) => {
    const d = formatDate(msg.createdAt);
    if (!acc[d]) acc[d] = [];
    acc[d].push(msg);
    return acc;
  }, {} as Record<string, Message[]>);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div>
            <h3 className="font-semibold text-foreground">Chat with {otherUserName}</h3>
            <p className="text-xs text-muted-foreground">Inquiry conversation</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Send className="w-12 h-12 mb-2 opacity-20" />
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            Object.entries(grouped).map(([date, msgs]) => (
              <div key={date}>
                <div className="flex items-center justify-center mb-4">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">{date}</span>
                </div>
                <div className="space-y-3">
                  {msgs.map((message) => {
                    const isOwn = message.senderId === userId;
                    return (
                      <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                          {message.content && <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>}
                          {message.attachmentUrl && (
                            <div className="mt-2">
                              {message.attachmentType?.startsWith("image/") ? (
                                <a href={message.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                  <img src={message.attachmentUrl} alt={message.attachmentName} className="max-w-full rounded-lg max-h-48 object-cover" />
                                </a>
                              ) : (
                                <a href={message.attachmentUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isOwn ? "bg-primary-foreground/20" : "bg-background"}`}>
                                  {getAttachmentIcon(message.attachmentType)}
                                  <span className="truncate max-w-[150px]">{message.attachmentName}</span>
                                  <Download className="w-4 h-4 ml-auto" />
                                </a>
                              )}
                            </div>
                          )}
                          <p className={`text-[10px] mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* File error */}
        {fileError && (
          <div className="px-4 py-2 border-t border-border">
            <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 px-3 py-2 rounded-lg">
              <AlertCircle size={14} />
              {fileError}
              <button onClick={() => setFileError(null)} className="ml-auto"><X size={12} /></button>
            </div>
          </div>
        )}

        {/* Pending attachment */}
        {pendingAttachment && (
          <div className="px-4 py-2 border-t border-border bg-muted/30">
            <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2">
              {getAttachmentIcon(pendingAttachment.type)}
              <span className="text-sm truncate flex-1">{pendingAttachment.name}</span>
              <button onClick={() => setPendingAttachment(null)} className="p-1 hover:bg-muted rounded-full">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" />
            <button onClick={() => { setFileError(null); fileInputRef.current?.click(); }} disabled={isUploading} className="p-2 hover:bg-muted rounded-full transition disabled:opacity-50">
              {isUploading ? <Loader className="w-5 h-5 animate-spin text-muted-foreground" /> : <Paperclip className="w-5 h-5 text-muted-foreground" />}
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Type a message..."
              className="flex-1 bg-background border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleSend}
              disabled={isSending || (!newMessage.trim() && !pendingAttachment)}
              className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition disabled:opacity-50"
            >
              {isSending ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
