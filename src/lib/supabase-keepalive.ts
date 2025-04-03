import { supabase } from "../../supabase/supabase";

let keepAliveInterval: number | null = null;

/**
 * Starts a keep-alive mechanism for Supabase connection
 * Sends a lightweight query every 5 minutes to prevent connection timeouts
 */
export function startSupabaseKeepAlive(intervalMs = 5 * 60 * 1000) {
  // Clear any existing interval
  if (keepAliveInterval) {
    stopSupabaseKeepAlive();
  }

  // Set up the new interval
  keepAliveInterval = window.setInterval(async () => {
    try {
      // Execute a lightweight query to keep the connection alive
      await supabase.from("_realtime").select("*").limit(1);
      console.debug("Supabase keep-alive ping sent");
    } catch (error) {
      console.error("Supabase keep-alive error:", error);
    }
  }, intervalMs);

  return () => stopSupabaseKeepAlive();
}

/**
 * Stops the Supabase keep-alive mechanism
 */
export function stopSupabaseKeepAlive() {
  if (keepAliveInterval) {
    window.clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}
