import { fireEvent, screen } from "@testing-library/react";

/**
 * What a person types into the create screen that the profile did not already fill, and then the
 * press that runs the checks.
 *
 * Every required control has to hold something, because a browser refuses to submit a form with an
 * empty required field, and a press that never left the page proves nothing about what the page
 * does with an answer.
 *
 * `realtorName` is optional on purpose. A person walking the guided setup finds that field already
 * holding the name they typed two steps earlier, and leaving it alone is what a person does with a
 * value that is already right; a person who opened the create screen on its own has to type it.
 */
export function fillAndSaveOpenHouseDraft(options: Readonly<{ realtorName?: string }> = {}): void {
  const typed: (readonly [string, string])[] = [
    ["Property address", "48 Cedar Street, Austin"],
    ["Property description", "A three-bedroom home near the park."],
    ["Open house starts", "2030-06-12T13:00"],
    ["Open house ends", "2030-06-12T15:00"],
    ["Where the ad runs", "Austin metro"],
  ];
  if (options.realtorName !== undefined) {
    typed.push(["Realtor name", options.realtorName]);
  }
  for (const [label, value] of typed) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  fireEvent.change(screen.getByLabelText("State", { exact: true }), { target: { value: "TX" } });
  fireEvent.click(screen.getByLabelText("I have permission to market this property."));
  fireEvent.click(screen.getByLabelText("I have permission to use the Realtor's materials."));
  fireEvent.click(screen.getByRole("button", { name: "Save and run the checks" }));
}
