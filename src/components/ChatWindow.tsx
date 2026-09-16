/**
 * ChatWindow.tsx — fixes applied:
 *
 * FIX 4: Replaced `alert("File size must be less than 25MB")` with an
 * inline error message. Native alert() blocks the main thread, looks
 * broken on mobile, and is banned in many embedded webviews.
 */
import * as React from "react";
import { useState, useRef, useEffect } from "react";
import {
  Send, Paperclip, FileText, Image, Video,
  X, Download, Loader, ArrowLeft, AlertCircle,
} from "lucide-react";
import { ChatMessage, useChatMessages } from "@/hooks/useChatMessages";
import { Conversation } from "@/hooks/useConversations";

interface ChatWindowProps {
  conversation: Conversation;
  userId: string;
  onBack?: () => void;
}

const MAX_FILE_MB = 25;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

export function ChatWindow({ conversation, userId, onBack }: ChatWindowProps) {
  const { messages, isLoading, isSending, sendMessage, uploadAttachment } =
    useChatMessages(conversation.id, userId);

  const [newMessage, setNewMessage] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<{
    url: string; name: string; type: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null); // FIX 4

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() && !pendingAttachment) return;
    const success = await sendMessage(newMessage, pendingAttachment || undefined);
    if (success) {
      setNewMessage("");
      setPendingAttachment(null);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // FIX 4: was alert() — now sets inline error state
    if (file.size > MAX_FILE_BYTES) {
      setFileError(`File too large — max ${MAX_FILE_MB} MB.`);
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
      setFileError("Upload failed. Try again.");
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
    return date.toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" });
  };

  const getAttachmentIcon = (type?: string) => {
    if (type?.startsWith("image/")) return <Image className="w-4 h-4" />;
    if (type?.startsWith("video/")) return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const grouped = messages.reduce((acc, msg) => {
    const d = formatDate(msg.createdAt);
    if (!acc[d]) acc[d] = [];
    acc[d].push(msg);
    return acc;
  }, {} as Record<string, ChatMessage[]>);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
        {onBack && (
          <button onClick={onBack} className="p-1.5 hover:bg-muted rounded-lg transition md:hidden">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{conversation.otherUserName}</h3>
          <p className="text-xs text-muted-foreground truncate">{conversation.listingTitle}</p>
        </div>
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
            <p className="font-medium">No messages yet</p>
            <p className="text-sm mt-1">Start the conversation</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, msgs]) => (
            <div key={date}>
              <div className="flex items-center justify-center mb-3">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {date}
                </span>
              </div>
              <div className="space-y-2">
                {msgs.map((msg) => {
                  const isOwn = msg.senderId === userId;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}>
                        {msg.content && (
                          <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                        )}
                        {msg.attachmentUrl && (
                          <div className="mt-2">
                            {msg.attachmentType?.startsWith("image/") ? (
                              <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                <img src={msg.attachmentUrl} alt={msg.attachmentName} className="max-w-full rounded-lg max-h-48 object-cover" />
                              </a>
                            ) : msg.attachmentType?.startsWith("video/") ? (
                              <video src={msg.attachmentUrl} controls className="max-w-full rounded-lg max-h-48 mt-1" />
                            ) : (
                              <a
                                href={msg.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isOwn ? "bg-primary-foreground/20" : "bg-background"}`}
                              >
                                {getAttachmentIcon(msg.attachmentType)}
                                <span className="truncate max-w-[160px]">{msg.attachmentName}</span>
                                <Download className="w-4 h-4 ml-auto flex-shrink-0" />
                              </a>
                            )}
                          </div>
                        )}
                        <p className={`text-[10px] mt-1 ${isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {formatTime(msg.createdAt)}
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

      {/* File error — FIX 4 */}
      {fileError && (
        <div className="px-4 py-2 border-t border-border">
          <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 px-3 py-2 rounded-lg">
            <AlertCircle size={14} />
            {fileError}
            <button onClick={() => setFileError(null)} className="ml-auto">
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Pending attachment preview */}
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
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          />
          <button
            onClick={() => { setFileError(null); fileInputRef.current?.click(); }}
            disabled={isUploading}
            className="p-2 hover:bg-muted rounded-full transition disabled:opacity-50"
          >
            {isUploading
              ? <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
              : <Paperclip className="w-5 h-5 text-muted-foreground" />
            }
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
            {isSending
              ? <Loader className="w-5 h-5 animate-spin" />
              : <Send className="w-5 h-5" />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
