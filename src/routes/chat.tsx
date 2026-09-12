import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, type FormEvent } from "react";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/person-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChannelsQuery, useMessagesQuery, useSendMessageMutation, useTeamQuery } from "@/lib/api-hooks";
import { useHub } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Person } from "@/lib/types";

export const Route = createFileRoute("/chat")({ component: ChatPage });

export function ChatPage() {
  const { data: channels = [], isLoading: isChannelsLoading } = useChannelsQuery();
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const activeChannelId = selectedChannelId || channels[0]?.id || "team-portal";

  const { data: messages = [], isLoading: isMessagesLoading } = useMessagesQuery(activeChannelId);
  const { data: team = [] } = useTeamQuery();
  const sendMessage = useSendMessageMutation();
  const setProfileDialog = useHub((s) => s.setProfileDialog);

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentChannel = channels.find((c) => c.id === activeChannelId) ?? {
    id: "team-portal",
    name: "team-portal",
    topic: "Engineering discussions & blockers",
  };

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

    try {
      await sendMessage.mutateAsync({
        channelId: activeChannelId,
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
        <div className="border-b border-border px-4 py-3">
          <div className="font-display text-sm font-semibold">#{currentChannel.name}</div>
          <div className="text-xs text-muted">{currentChannel.topic}</div>
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
                        <span className="font-mono text-[10px] text-subtle">{m.at}</span>
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
    </div>
  );
}
