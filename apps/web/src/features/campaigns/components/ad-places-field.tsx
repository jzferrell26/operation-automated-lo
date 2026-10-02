"use client";

import { AD_PLACE_LIMITS, US_STATES, parseAdPlace } from "@oalo/contracts";
import { Button, Icon, IconButton, TextField } from "@oalo/ui";
import { useState, type FormEvent, type KeyboardEvent } from "react";

import {
  ADD_PLACE,
  ADD_PLACE_LABEL,
  ADD_PLACE_PLACEHOLDER,
  AREA_HINT,
  PLACE_LIMIT,
  PLACE_REFUSED,
  PLACES_LIST_LABEL,
  SHOWS_IN_LABEL,
  SHOWS_IN_VALUE,
  removePlaceLabel,
} from "../../../copy/launch-messages.js";
import styles from "./launch.module.css";

/**
 * PRD-009d D4 and 009D-AC-008. "Where it shows": places, not people.
 *
 * A person adds a city or a state; each becomes a chip with a 44px remove button. What they type
 * is parsed by the same rule the request schema applies (`parseAdPlace`, `@oalo/contracts`), so a
 * ZIP code, a radius, or a demographic is refused here with a plain sentence and again on the
 * server with 400. There is no control for a radius, a ZIP code, an age, a gender, an interest, or
 * an audience: the only choices are places.
 */

export type AdPlacesFieldProps = Readonly<{
  places: readonly string[];
  onChange: (places: readonly string[]) => void;
  error?: string | undefined;
}>;

/** What a chip says: a state by its full name, a city as typed with its state code. */
export function placeChipLabel(place: string): string {
  return US_STATES[place] ?? place;
}

export function AdPlacesField({ places, onChange, error }: AdPlacesFieldProps) {
  const [typed, setTyped] = useState("");
  const [refusal, setRefusal] = useState("");

  function add(event?: FormEvent) {
    event?.preventDefault();
    const place = parseAdPlace(typed);
    if (place === undefined) {
      setRefusal(PLACE_REFUSED);
      return;
    }
    if (places.includes(place.value)) {
      setTyped("");
      setRefusal("");
      return;
    }
    const kinds = places.map((value) => parseAdPlace(value)?.kind);
    const sameKind = kinds.filter((kind) => kind === place.kind).length;
    const limit = place.kind === "state" ? AD_PLACE_LIMITS.states : AD_PLACE_LIMITS.cities;
    if (sameKind >= limit) {
      setRefusal(PLACE_LIMIT);
      return;
    }
    onChange([...places, place.value]);
    setTyped("");
    setRefusal("");
  }

  function addOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      add();
    }
  }

  return (
    <div className={styles.places}>
      {places.length > 0 ? (
        <ul aria-label={PLACES_LIST_LABEL} className={styles.placeChips}>
          {places.map((place) => (
            <li className={styles.placeChip} key={place}>
              <span>{placeChipLabel(place)}</span>
              <IconButton
                className={styles.placeRemove}
                icon="x"
                label={removePlaceLabel(placeChipLabel(place))}
                onClick={() => onChange(places.filter((value) => value !== place))}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <div className={styles.placeAdd}>
        <TextField
          autoComplete="off"
          error={refusal || error || undefined}
          label={ADD_PLACE_LABEL}
          maxLength={80}
          onChange={(event) => {
            setTyped(event.target.value);
            setRefusal("");
          }}
          onKeyDown={addOnEnter}
          placeholder={ADD_PLACE_PLACEHOLDER}
          value={typed}
        />
        <Button onClick={() => add()} type="button" variant="outline">
          <span className={styles.withIcon}>
            <Icon decorative name="plus" size="sm" /> {ADD_PLACE}
          </span>
        </Button>
      </div>
      <p className={styles.hint} data-area-hint="">
        {AREA_HINT}
      </p>
      <p className={styles.showsIn}>
        <strong>{SHOWS_IN_LABEL}</strong> {SHOWS_IN_VALUE}
      </p>
    </div>
  );
}
