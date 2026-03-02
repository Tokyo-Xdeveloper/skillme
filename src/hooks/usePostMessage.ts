import { useEffect, useCallback, type RefObject } from "react";
import { recordEvent, saveSnapshot, saveTaskCache, incrementGridCount, type EventType } from "../lib/tracking";
import type { TaskItem } from "../types/app";
import { APPS } from "../data/apps";

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
      const knownSources = ["english-expression", "range-master"];
      if (!data || !knownSources.includes(data.source)) return;

      if (
        data.type === "task:activation" ||
        data.type === "task:review" ||
        data.type === "task:mastery"
      ) {
        recordEvent(data.type as EventType);
        incrementGridCount(appId, data.type as EventType);
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

      if (data.type === "tasks" && data.payload) {
        const p = data.payload as { tasks: TaskItem[] };
        const app = APPS.find((a) => a.id === appId);
        saveTaskCache({
          appId,
          appName: app?.name ?? appId,
          tasks: p.tasks,
          cachedAt: new Date().toISOString(),
        });
        onUpdate?.();
      }
    },
    [appId, onUpdate],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const requestSnapshot = useCallback(() => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: "request:snapshot" }, "*");
    }
  }, [iframeRef]);

  const requestTasks = useCallback(() => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: "request:tasks" }, "*");
    }
  }, [iframeRef]);

  return { requestSnapshot, requestTasks };
}
