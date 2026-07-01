import { useMemo } from "react";
import { getProxyUrl, isDirectStorageUrl, isProxyUrl, isSafeFileUrl } from "@/services/fileProxyService";
import { useResolvedFileUrl } from "@/hooks/useResolvedFileUrl";

type AuthenticatedVideoProps = {
  src: string;
  title: string;
  className?: string;
  controls?: boolean;
  muted?: boolean;
  preload?: "none" | "metadata" | "auto";
};

function shouldRenderIframe(src: string) {
  if (!src || !isSafeFileUrl(src)) return false;
  const proxyUrl = getProxyUrl(src);
  if (isProxyUrl(proxyUrl) || isDirectStorageUrl(src)) return false;
  return !/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(src);
}

function safeVideoId(value: string | null) {
  if (!value || !/^[a-zA-Z0-9_-]+$/.test(value)) return null;
  return value;
}

function getTrustedEmbedUrl(src: string): string | null {
  if (!src || !isSafeFileUrl(src)) return null;
  try {
    const origin = globalThis.location?.origin ?? "http://localhost";
    const url = new URL(src, origin);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();

    if (host === "youtu.be") {
      const id = safeVideoId(url.pathname.split("/").filter(Boolean)[0] ?? null);
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }

    if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com") {
      const embedId = url.pathname.startsWith("/embed/") ? safeVideoId(url.pathname.split("/")[2] ?? null) : safeVideoId(url.searchParams.get("v"));
      return embedId ? `https://www.youtube-nocookie.com/embed/${embedId}` : null;
    }

    if (host === "youtube-nocookie.com" || host === "www.youtube-nocookie.com") {
      const embedId = url.pathname.startsWith("/embed/") ? safeVideoId(url.pathname.split("/")[2] ?? null) : null;
      return embedId ? `https://www.youtube-nocookie.com/embed/${embedId}` : null;
    }

    if (host === "vimeo.com" || host === "www.vimeo.com") {
      const id = safeVideoId(url.pathname.split("/").filter(Boolean)[0] ?? null);
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }

    if (host === "player.vimeo.com" && url.pathname.startsWith("/video/")) {
      const id = safeVideoId(url.pathname.split("/")[2] ?? null);
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function AuthenticatedVideo({
  src,
  title,
  className,
  controls = true,
  muted = false,
  preload = "metadata",
}: AuthenticatedVideoProps) {
  const iframeMode = useMemo(() => shouldRenderIframe(src), [src]);
  const trustedEmbedUrl = useMemo(() => getTrustedEmbedUrl(src), [src]);
  const blockedEmbed = iframeMode && !trustedEmbedUrl;
  const resolvedSrc = useResolvedFileUrl(iframeMode ? undefined : src, "video/*");

  if (!src) return null;

  if (iframeMode) {
    if (blockedEmbed) {
      return (
        <div className={className}>
          <div className="flex h-full min-h-[160px] w-full items-center justify-center bg-black/60 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
            Video preview unavailable
          </div>
        </div>
      );
    }

    return (
      <iframe
        src={trustedEmbedUrl ?? ""}
        className={className}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        title={title}
      />
    );
  }

  if (!resolvedSrc) {
    return (
      <div className={className}>
        <div className="flex h-full min-h-[160px] w-full items-center justify-center bg-black/60 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
          Loading video
        </div>
      </div>
    );
  }

  return (
    <video
      src={resolvedSrc}
      controls={controls}
      muted={muted}
      preload={preload}
      playsInline
      className={className}
    />
  );
}
