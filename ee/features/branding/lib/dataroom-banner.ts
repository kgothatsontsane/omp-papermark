export type DataroomBannerKind = "none" | "image" | "video" | "youtube";

interface ClassifiedBanner {
  kind: DataroomBannerKind;
  src: string | null;
  youtubeId?: string | null;
}

export function classifyDataroomBanner(src: string | null | undefined): ClassifiedBanner {
  if (!src) {
    return { kind: "none", src: null };
  }

  // Check for YouTube watch links or short-share links
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const youtubeMatch = src.match(youtubeRegex);

  if (youtubeMatch && youtubeMatch[1]) {
    return {
      kind: "youtube",
      src: src,
      youtubeId: youtubeMatch[1],
    };
  }

  // Check common streaming or raw source web video file extensions
  const videoExtensions = /\.(mp4|webm|ogg|mov|m4v)(?:\?.*)?$/i;
  if (videoExtensions.test(src)) {
    return { kind: "video", src: src };
  }

  // Fallback default: Treat any remaining filled URL values as standard images
  return { kind: "image", src: src };
}
