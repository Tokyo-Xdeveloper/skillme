import { useRef } from "react";
import { useParams, Link } from "react-router-dom";
import AppIframe from "../components/AppIframe";
import { usePostMessage } from "../hooks/usePostMessage";
import { APPS } from "../data/apps";

export default function AppPlayerPage() {
  const { appId } = useParams<{ appId: string }>();
  const app = APPS.find((a) => a.id === appId);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { requestSnapshot } = usePostMessage(iframeRef, appId ?? "");

  if (!app) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">アプリが見つかりません</p>
          <Link to="/" className="text-blue-600 hover:underline">
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* ナビバー */}
      <nav className="h-14 bg-white border-b border-gray-200 flex items-center px-4 shrink-0">
        <Link
          to="/"
          className="text-blue-600 hover:text-blue-700 no-underline mr-4 text-lg"
        >
          ← 戻る
        </Link>
        <span className="font-semibold text-gray-900 flex-1">{app.name}</span>
        <Link
          to={`/dashboard/${app.id}`}
          className="text-sm text-blue-600 hover:text-blue-700 no-underline"
        >
          📊 Stats
        </Link>
      </nav>

      {/* iframe */}
      <AppIframe
        ref={iframeRef}
        url={app.url}
        title={app.name}
        onLoad={requestSnapshot}
      />
    </div>
  );
}
