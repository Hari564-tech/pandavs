import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, type FormEvent } from "react";
import { Send, Loader2, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/person-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useChannelsQuery,
  useMessagesQuery,
  useSendMessageMutation,
  useTeamQuery,
  useMeQuery,
  useClearMessagesMutation,
} from "@/lib/api-hooks";
import { useHub } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Person } from "@/lib/types";

export const Route = createFileRoute("/chat")({ component: ChatPage });

function formatMessageTime(at: string, createdAt?: string): string {
  const timestamp = createdAt || at;
  const d = new Date(timestamp);
  if (!isNaN(d.getTime())) {
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const timeStr = d.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) {
      return timeStr;
    }

    const dateStr = d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
    return `${dateStr}, ${timeStr}`;
  }
  return at;
}

export function ChatPage() {
  const { data: channels = [], isLoading: isChannelsLoading } = useChannelsQuery();
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const activeChannelId = selectedChannelId || channels[0]?.id || "general";

  const { data: messages = [], isLoading: isMessagesLoading } = useMessagesQuery(activeChannelId);
  const { data: team = [] } = useTeamQuery();
  const { data: meData } = useMeQuery();
  const sendMessage = useSendMessageMutation();
  const clearMessages = useClearMessagesMutation();
  const setProfileDialog = useHub((s) => s.setProfileDialog);

  const isSuperAdmin = meData?.profile?.role === "super_admin";
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearScope, setClearScope] = useState<"channel" | "all">("channel");

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentChannel = channels.find((c) => c.id === activeChannelId) ?? channels[0] ?? {
    id: activeChannelId,
    name: activeChannelId,
    topic: "Engineering discussions & blockers",
  };

  async function handleClearChatConfirm() {
    try {
      await clearMessages.mutateAsync({
        channelId: clearScope === "channel" ? activeChannelId : undefined,
        all: clearScope === "all",
      });
      toast.success(
        clearScope === "all"
          ? "All chat history has been cleared for everyone"
          : `Chat cleared for #${currentChannel.name}`,
      );
      setClearDialogOpen(false);
    } catch (err: unknown) {
      toast.error("Failed to clear chat", {
        description: (err as Error)?.message || "Server error occurred",
      });
    }
  }

  const getPerson = (id: string): Person => {
    const fromTeam = team.find((u) => u.user_id === id);
    if (fromTeam) {
      return {
        id: fromTeam.user_id,
        name: fromTeam.name,
        short: fromTeam.short || fromTeam.name.slice(0, 2).toUpperCase(),
        role: fromTeam.role,
        title: fromTeam.title,
        dept: fromTeam.dept,
        email: fromTeam.email,
        presence: fromTeam.presence,
        avatar_url: fromTeam.avatar_url,
        phone: fromTeam.phone,
        bio: fromTeam.bio,
        college: fromTeam.college,
        skills: fromTeam.skills,
        linkedin_url: fromTeam.linkedin_url,
        github_url: fromTeam.github_url,
        portfolio_url: fromTeam.portfolio_url,
        location: fromTeam.location,
        projectIds: fromTeam.projectIds,
        hoursThisWeek: 0,
        taskLoad: 0,
        streak: 5,
        attendance: 100,
        year: fromTeam.year ?? undefined,
        reg: fromTeam.registration_no ?? undefined,
      };
    }
    return {
      id,
      name: "Member",
      short: "MB",
      role: "member",
      title: "Team Member",
      dept: "RVIT",
      email: "",
      presence: "active",
      projectIds: [],
      hoursThisWeek: 0,
      taskLoad: 0,
      streak: 0,
      attendance: 100,
    };
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    const body = draft.trim();
    setDraft("");

    const channelId = activeChannelId || channels[0]?.id || "general";
    try {
      await sendMessage.mutateAsync({
        channelId,
        body,
      });
    } catch (err: unknown) {
      toast.error("Failed to send message", {
        description: (err as Error)?.message || "Server error",
      });
      setDraft(body);
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[480px] overflow-hidden rounded-xl border border-border bg-surface">
      <aside className="hidden w-56 shrink-0 border-r border-border sm:block">
        <div className="flex items-center gap-2 p-3 font-display text-sm font-semibold">
          <MessageSquare className="h-4 w-4 text-accent" /> Channels
        </div>
        <nav className="space-y-0.5 px-2">
          {isChannelsLoading ? (
            <div className="p-3 text-xs text-muted">Loading channels...</div>
          ) : (
            channels.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChannelId(c.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  c.id === activeChannelId ? "bg-navy text-navy-fg" : "hover:bg-surface-2",
                )}
              >
                <span className="truncate">#{c.name}</span>
              </button>
            ))
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="font-display text-sm font-semibold">#{currentChannel.name}</div>
            <div className="text-xs text-muted">{currentChannel.topic}</div>
          </div>
          {isSuperAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={() => setClearDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" /> Clear Chat
            </Button>
          )}
        </div>

        <div className="border-b border-border p-2 sm:hidden">
          <select
            className="h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
            value={activeChannelId}
            onChange={(e) => setSelectedChannelId(e.target.value)}
          >
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.name}
              </option>
            ))}
          </select>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {isMessagesLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted">
              <p>No messages yet in #{currentChannel.name}.</p>
              <p className="text-xs text-subtle">Start the conversation with your team!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => {
                const who = getPerson(m.authorId);
                return (
                  <div key={m.id} className="flex gap-2.5 items-start group">
                    <button
                      type="button"
                      onClick={() => setProfileDialog(true, who.id)}
                      className="cursor-pointer focus:outline-none transition-transform hover:scale-105 shrink-0 pt-0.5"
                      title={`View ${who.name}'s profile`}
                    >
                      <PersonAvatar person={who} size="sm" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <button
                          type="button"
                          onClick={() => setProfileDialog(true, who.id)}
                          className="text-sm font-semibold hover:text-accent hover:underline cursor-pointer text-left"
                        >
                          {who.name}
                        </button>
                        <span
                          className="font-mono text-[10px] text-subtle"
                          title={m.createdAt ? new Date(m.createdAt).toLocaleString() : m.at}
                        >
                          {formatMessageTime(m.at, m.createdAt)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-ink">{m.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <form onSubmit={onSend} className="flex gap-2 border-t border-border p-3">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message #${currentChannel.name}`}
            disabled={sendMessage.isPending}
          />
          <Button type="submit" disabled={sendMessage.isPending || !draft.trim()}>
            {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>

      {/* Super Admin Clear Chat Dialog */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <Trash2 className="h-5 w-5" /> Clear Chat for Everyone
            </DialogTitle>
            <DialogDescription>
              As Super Admin, you can permanently wipe chat messages for all users. Choose the cleanup scope below.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2.5 py-2">
            <button
              type="button"
              onClick={() => setClearScope("channel")}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-all cursor-pointer",
                clearScope === "channel"
                  ? "border-accent bg-accent/10"
                  : "border-border bg-surface-2 hover:bg-surface",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  clearScope === "channel" ? "border-accent bg-accent" : "border-muted",
                )}
              >
                {clearScope === "channel" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <div className="text-sm font-semibold text-ink">Clear #{currentChannel.name} only</div>
                <div className="text-xs text-muted">
                  Permanently removes all messages in this specific channel for everyone.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setClearScope("all")}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-all cursor-pointer",
                clearScope === "all"
                  ? "border-danger bg-danger/10"
                  : "border-border bg-surface-2 hover:bg-surface",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  clearScope === "all" ? "border-danger bg-danger" : "border-muted",
                )}
              >
                {clearScope === "all" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <div className="text-sm font-semibold text-danger">Clear ALL channels (Global Wipe)</div>
                <div className="text-xs text-muted">
                  Permanently deletes all messages across all chat channels for all users.
                </div>
              </div>
            </button>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setClearDialogOpen(false)}
              disabled={clearMessages.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleClearChatConfirm}
              disabled={clearMessages.isPending}
            >
              {clearMessages.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Clearing...
                </>
              ) : (
                "Clear for Everyone"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
