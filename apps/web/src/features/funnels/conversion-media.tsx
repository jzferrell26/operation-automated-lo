"use client";

import { Button, Icon, Link } from "@oalo/ui";
import { useState } from "react";
import type { FunnelFields, FunnelKind } from "./model.js";
import { safeDestination } from "./model.js";
import { webinarEmbed } from "./video.js";
import styles from "./conversion.module.css";

export type PhotoSlot = "heroPhoto" | "hostPhoto";
export function FunnelImage({
  fields,
  kind,
  slot = "heroPhoto",
  edit,
  className = "",
}: Readonly<{
  fields: FunnelFields;
  kind: FunnelKind;
  slot?: PhotoSlot;
  edit?: (slot: PhotoSlot) => void;
  className?: string | undefined;
}>) {
  const photo = fields[slot];
  const source =
    photo?.dataUrl ??
    (slot === "heroPhoto"
      ? `/funnel-media/${kind === "refinance" ? "homeowners" : "homebuyers"}.webp`
      : null);
  return (
    <div className={`${styles.photo} ${className}`}>
      {source ? (
        <img src={source} alt={photo?.alt ?? "Illustrative homeownership scene"} loading="lazy" />
      ) : (
        <div className={styles.portraitPlaceholder}>
          <Icon decorative name="users" size="lg" />
          <span>Your presenter photo</span>
        </div>
      )}
      {edit ? (
        <Button
          type="button"
          variant="secondary"
          className={styles.editPhoto}
          onClick={() => edit(slot)}
        >
          <Icon decorative name="image" size="sm" />
          {slot === "heroPhoto" ? "Replace cover photo" : "Replace host photo"}
        </Button>
      ) : null}
    </div>
  );
}

/** Invitation video is a first-class landing-page slot, not only an on-demand watch feature. */
export function FunnelVideo({
  fields,
  kind,
  url,
  edit,
  invitation = false,
  published = false,
}: Readonly<{
  fields: FunnelFields;
  kind: FunnelKind;
  url: string;
  edit?: (slot: PhotoSlot) => void;
  invitation?: boolean;
  published?: boolean;
}>) {
  const [playing, setPlaying] = useState(false);
  const safe = url !== "" && safeDestination(url);
  const embed = safe ? webinarEmbed(url) : null;
  const direct = safe && /\.(?:mp4|webm)(?:\?|$)/iu.test(url);
  return (
    <div className={styles.videoFrame} data-invitation-video={invitation || undefined}>
      {playing && embed ? (
        <iframe
          title={fields.offerTitle}
          src={embed}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-presentation"
          referrerPolicy="no-referrer"
        />
      ) : playing && direct ? (
        <video src={url} controls autoPlay playsInline aria-label={fields.offerTitle} />
      ) : (
        <>
          <FunnelImage fields={fields} kind={kind} {...(edit ? { edit } : {})} />
          <div className={styles.videoShade} />
          <div className={styles.videoCaption}>
            <span className={styles.videoEyebrow}>
              {invitation ? "YOUR FIRST HOME STARTS HERE" : "THE HOMEBUYER WORKSHOP"}
            </span>
            <strong>{fields.offerTitle}</strong>
            {safe ? (
              embed || direct ? (
                <Button
                  variant="secondary"
                  className={styles.playButton}
                  type="button"
                  onClick={() => setPlaying(true)}
                  aria-label={invitation ? "Play webinar invitation" : "Watch the webinar"}
                >
                  <span aria-hidden="true">▶</span>
                  {invitation ? "Watch the invitation" : "Watch the webinar"}
                </Button>
              ) : (
                <Link className={styles.playButton} href={url} external>
                  Open webinar video
                </Link>
              )
            ) : (
              <span className={styles.mediaNote}>
                {published
                  ? invitation
                    ? "Practical information for your next move."
                    : "The recording is currently unavailable. Please contact the presenter."
                  : invitation
                    ? "Your invitation video or event cover goes here."
                    : "Add the webinar recording to enable playback."}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
