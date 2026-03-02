interface AppIframeProps {
  url: string;
  title: string;
}

export default function AppIframe({ url, title }: AppIframeProps) {
  return (
    <iframe
      src={url}
      title={title}
      className="w-full border-none"
      style={{ height: "calc(100vh - 56px)" }}
      allow="clipboard-write"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
    />
  );
}
