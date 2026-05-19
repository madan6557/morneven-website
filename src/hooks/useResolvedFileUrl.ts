import { useEffect, useState } from "react";
import { getAuthenticatedFileUrl } from "@/services/fileProxyService";

export function useResolvedFileUrl(src: string | undefined, accept = "*/*") {
  const [resolvedSrc, setResolvedSrc] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!src) {
        setResolvedSrc("");
        return;
      }

      if (src.startsWith("data:") || src.startsWith("blob:")) {
        setResolvedSrc(src);
        return;
      }

      const fileUrl = await getAuthenticatedFileUrl(src, accept);
      if (!cancelled) setResolvedSrc(fileUrl);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [accept, src]);

  return resolvedSrc;
}
