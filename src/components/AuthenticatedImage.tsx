import { useEffect, useState } from "react";
import { getAuthenticatedImageUrl } from "@/services/fileProxyService";

type AuthenticatedImageProps = {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  decoding?: "sync" | "async" | "auto";
};

export function AuthenticatedImage({ src, alt, className, loading, decoding }: AuthenticatedImageProps) {
  const resolvedSrc = useResolvedImageUrl(src);

  if (!resolvedSrc) return null;
  return <img src={resolvedSrc} alt={alt} className={className} loading={loading} decoding={decoding} />;
}

export function useResolvedImageUrl(src: string) {
  const [resolvedSrc, setResolvedSrc] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!src) {
        setResolvedSrc("");
        return;
      }
      if (src.startsWith("data:")) {
        setResolvedSrc(src);
        return;
      }

      const blobUrl = await getAuthenticatedImageUrl(src);
      if (!cancelled) {
        setResolvedSrc(blobUrl);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [src]);

  return resolvedSrc;
}
