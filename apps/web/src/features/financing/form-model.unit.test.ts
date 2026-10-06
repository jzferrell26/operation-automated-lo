import { describe, expect, it } from "vitest";
import { FinancingRequestSchema } from "./model.js";
import {
  emptyFinancingDraft,
  financingFormInput,
  parseScaledInput,
  reusedFinancingDraft,
} from "./form-model.js";
import { financingInput } from "../../server/financing.test-support.js";

describe("financing form numeric inputs", () => {
  it("preserves intraday expiry and offset timestamps when reusing a quote", () => {
    const input = financingInput();
    input.financing.scenarios[0]!.quote.quotedAt = "2020-01-01T22:00:00-05:00";
    input.financing.scenarios[0]!.quote.expiresAt = "2020-01-03T10:30:00-05:00";
    const draft = reusedFinancingDraft(input);
    expect(draft.scenarios[0]?.quotedOn).toBe("2020-01-02");
    const submitted = FinancingRequestSchema.parse(financingFormInput(draft, crypto.randomUUID()));
    expect(submitted.financing.scenarios[0]?.quote.quotedAt).toBe(
      input.financing.scenarios[0]?.quote.quotedAt,
    );
    expect(submitted.financing.scenarios[0]?.quote.expiresAt).toBe(
      input.financing.scenarios[0]?.quote.expiresAt,
    );
    draft.scenarios[0]!.expiresOn = "2020-01-04";
    const changed = FinancingRequestSchema.parse(financingFormInput(draft, crypto.randomUUID()));
    expect(changed.financing.scenarios[0]?.quote.expiresAt).toBe("2020-01-04T23:59:59.000Z");
  });
  it("distinguishes blank, zero and precise cents", () => {
    expect(parseScaledInput("", 2)).toBeNull();
    expect(parseScaledInput("0", 2)).toBe(0);
    expect(parseScaledInput("0.29", 2)).toBe(29);
    expect(parseScaledInput("6.125", 3)).toBe(6125);
    expect(parseScaledInput("400000.99", 2)).toBe(40000099);
  });
  it.each(["1e4", "Infinity", "-10", "12.345", "12,345", "abc", "1.2.3"])(
    "rejects ambiguous dollar entry %s",
    (value) => {
      expect(parseScaledInput(value, 2)).toBeNaN();
    },
  );
  it("starts with no guessed rate, down payment, tax, insurance or quote date", () => {
    const draft = emptyFinancingDraft();
    expect(draft.scenarios[0]).toMatchObject({
      rate: "",
      downPayment: "",
      quotedOn: "",
      expiresOn: "",
      mi: "",
      costsComplete: false,
    });
    expect(draft).toMatchObject({ price: "", taxes: "", insurance: "", hoa: "", other: "" });
    expect(
      FinancingRequestSchema.safeParse(financingFormInput(draft, crypto.randomUUID())).success,
    ).toBe(false);
  });
  it("reuses saved exact amounts but requires fresh review and leaves original quote validity unchanged", () => {
    const input = financingInput({
      propertyPermissionConfirmed: true,
      realtorPermissionConfirmed: true,
    });
    const draft = reusedFinancingDraft(input);
    expect(draft).toMatchObject({
      price: "400000.00",
      propertyPermissionConfirmed: false,
      realtorPermissionConfirmed: false,
    });
    expect(draft.scenarios[0]).toMatchObject({
      rate: "6.000",
      costsComplete: false,
      quoteConfirmed: false,
      expiresOn: "2090-01-01",
    });
    const submitted = FinancingRequestSchema.parse(financingFormInput(draft, crypto.randomUUID()));
    expect(submitted.financing.scenarios[0]?.costs[0]?.amountMinor).toBe(400000);
    expect(submitted.financing.housing.propertyTaxMinor).toBe(45000);
    expect(input.financing.scenarios[0]?.quote.confirmed).toBe(true);
  });
});
