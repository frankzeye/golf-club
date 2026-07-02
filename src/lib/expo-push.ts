const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Send push notifications via Expo's push service.
 * Invalid tokens (DeviceNotRegistered) are returned for cleanup.
 */
export async function sendExpoPushNotifications(
  messages: ExpoPushMessage[]
): Promise<string[]> {
  if (messages.length === 0) return [];

  const invalidTokens: string[] = [];

  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });

      if (!res.ok) {
        console.error("Expo push API error:", res.status, await res.text());
        continue;
      }

      const tickets = (await res.json()) as { data?: ExpoPushTicket[] };
      const data = tickets.data ?? [];

      data.forEach((ticket, index) => {
        if (ticket.status === "error") {
          const detail = ticket.details?.error ?? ticket.message;
          if (detail === "DeviceNotRegistered") {
            invalidTokens.push(chunk[index].to);
          } else {
            console.error("Expo push ticket error:", detail);
          }
        }
      });
    } catch (error) {
      console.error("Expo push send failed:", error);
    }
  }

  return invalidTokens;
}
