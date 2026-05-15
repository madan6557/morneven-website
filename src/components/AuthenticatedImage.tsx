import { useResolvedImageUrl } from "@/hooks/useResolvedImageUrl";

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
