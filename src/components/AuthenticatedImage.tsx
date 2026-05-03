import { useAuthenticatedImageUrl } from "@/hooks/useAuthenticatedImageUrl";

interface AuthenticatedImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
  onError?: (error: Error) => void;
}

/**
 * Image component that handles Bearer token authentication
 * Automatically fetches from proxy endpoint with auth header
 * Shows placeholder while loading
 */
export default function AuthenticatedImage({ src, alt, className = "", onError }: AuthenticatedImageProps) {
  const { blobUrl, loading, error } = useAuthenticatedImageUrl(src);

  if (error && onError) {
    onError(error);
  }

  // While loading, show placeholder
  if (loading) {
    return (
      <div className={`${className} bg-muted/50 flex items-center justify-center`}>
        <div className="animate-pulse w-full h-full bg-muted/30" />
      </div>
    );
  }

  // If there's an error or no URL, show placeholder
  if (!blobUrl) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <span className="text-xs text-muted-foreground font-body">Failed to load image</span>
      </div>
    );
  }

  // Render image with blob URL
  return (
    <img src={blobUrl} alt={alt} className={className} />
  );
}
