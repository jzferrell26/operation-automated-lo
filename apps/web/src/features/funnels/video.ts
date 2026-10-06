/** Known players only. Never accept arbitrary iframe markup or an embed URL from the browser. */
export function webinarEmbed(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const youtube =
      url.hostname === "youtu.be"
        ? url.pathname.slice(1)
        : ["www.youtube.com", "youtube.com"].includes(url.hostname)
          ? url.searchParams.get("v")
          : null;
    if (youtube && /^[A-Za-z0-9_-]{11}$/u.test(youtube))
      return `https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&rel=0`;
    if (["vimeo.com", "www.vimeo.com"].includes(url.hostname) && /^\/\d{6,12}$/u.test(url.pathname))
      return `https://player.vimeo.com/video${url.pathname}?autoplay=1&dnt=1`;
    return null;
  } catch {
    return null;
  }
}
