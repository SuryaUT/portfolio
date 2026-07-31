"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/**
 * Lightweight YouTube facade embed.
 *
 * Renders the video thumbnail instantly and only mounts the (heavy) YouTube
 * iframe once the user clicks play, keeps pages fast and scrolling smooth.
 *
 * Usage in MDX:  <YouTube id="dQw4w9WgXcQ" title="sEMG Rover demo" />
 * The `id` is the part after `watch?v=` in a YouTube URL.
 */
export default function YouTube({
  id,
  title = "Video demonstration",
}: {
  id: string;
  title?: string;
}) {
  const [play, setPlay] = useState(false);

  return (
    <div className="not-prose relative my-8 aspect-video w-full overflow-hidden border border-divider bg-black">
      {play ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlay(true)}
          aria-label={`Play: ${title}`}
          className="group absolute inset-0 h-full w-full cursor-pointer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/10">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-transform group-hover:scale-110">
              <Play size={22} fill="currentColor" className="ml-0.5" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
