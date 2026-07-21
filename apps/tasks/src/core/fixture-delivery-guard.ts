import type { DeliveryGuardPort } from "@oalo/application";
import type { DeliveryReference } from "@oalo/contracts";

type DeliveryState = "claimed" | "completed";

function deliveryKey(delivery: DeliveryReference): string {
  return `${delivery.locationRef}:${delivery.deliveryKind}:${delivery.deliveryRef}:${delivery.businessOutcomeKey}`;
}

/**
 * Phase-0-only worker guard. The scope is deliberately process-local because this repository has
 * no runtime database adapter in the task package yet. A deployed worker must replace it with a
 * database-backed DeliveryGuardPort before enabling provider traffic.
 */
export class FixtureOnlyDeliveryGuard implements DeliveryGuardPort {
  readonly #states = new Map<string, DeliveryState>();

  async claim(delivery: DeliveryReference): Promise<boolean> {
    const key = deliveryKey(delivery);
    if (this.#states.has(key)) return false;
    this.#states.set(key, "claimed");
    return true;
  }

  async complete(delivery: DeliveryReference): Promise<void> {
    const key = deliveryKey(delivery);
    if (this.#states.get(key) !== "claimed") {
      throw new Error("Fixture delivery cannot complete unless it is claimed.");
    }
    this.#states.set(key, "completed");
  }

  async release(delivery: DeliveryReference): Promise<void> {
    const key = deliveryKey(delivery);
    if (this.#states.get(key) === "claimed") this.#states.delete(key);
  }
}
