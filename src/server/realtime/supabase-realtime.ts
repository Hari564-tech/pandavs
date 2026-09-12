type RealtimeEvent = {
  channel: string;
  event: string;
  payload: Record<string, unknown>;
};

type Listener = (event: RealtimeEvent) => void;
const listeners = new Set<Listener>();

export const RealtimeService = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  async publish(event: RealtimeEvent) {
    // Notify local in-process listeners
    listeners.forEach((l) => {
      try {
        l(event);
      } catch (err) {
        console.error("[realtime] Listener error:", err);
      }
    });

    // If Supabase credentials are configured, publish to Supabase Realtime channel
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (supabaseUrl && serviceKey) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, serviceKey);
        await supabase.channel(event.channel).send({
          type: "broadcast",
          event: event.event,
          payload: event.payload,
        });
      } catch (err) {
        console.warn("[realtime] Supabase Realtime publish failed:", err);
      }
    }
  },
};
