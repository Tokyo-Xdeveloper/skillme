import { forwardRef } from "react";

interface AppIframeProps {
  url: string;
  title: string;
  onLoad?: () => void;
}

const AppIframe = forwardRef<HTMLIFrameElement, AppIframeProps>(
  ({ url, title, onLoad }, ref) => {
    return (
      <iframe
        ref={ref}
        src={url}
        title={title}
        className="w-full border-none"
        style={{ height: "calc(100vh - 56px)" }}
        allow="clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        onLoad={onLoad}
      />
    );
  },
);

AppIframe.displayName = "AppIframe";

export default AppIframe;
