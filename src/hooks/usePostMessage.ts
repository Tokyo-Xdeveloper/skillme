import { useEffect, useCallback, type RefObject } from "react";
import { recordEvent, saveSnapshot, type EventType } from "../lib/tracking";

interface PostMessageEvent {
  source: string;
  type: string;
  payload?: Record<string, unknown>;
}

export function usePostMessage(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  appId: string,
  onUpdate?: () => void,
) {
  const handleMessage = useCallback(
    (ev: MessageEvent) => {
      const data = ev.data as PostMessageEvent | undefined;
      if (!data || data.source !== "english-expression") return;

      if (
        data.type === "task:activation" ||
        data.type === "task:review" ||
        data.type === "task:mastery"
      ) {
        recordEvent(data.type as EventType);
        onUpdate?.();
      }

      if (data.type === "snapshot" && data.payload) {
        const p = data.payload as {
          total: number;
          active: number;
          due: number;
          mastered: number;
          streak: number;
        };
        saveSnapshot(appId, p);
        onUpdate?.();
      }
    },
    [appId, onUpdate],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  /** Request a snapshot from the iframe */
  const requestSnapshot = useCallback(() => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: "request:snapshot" }, "*");
    }
  }, [iframeRef]);

  return { requestSnapshot };
}
