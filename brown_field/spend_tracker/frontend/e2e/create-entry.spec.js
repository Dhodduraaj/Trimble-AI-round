import { test, expect } from "@playwright/test";
import { clearEntries } from "./fixtures.js";

test.beforeEach(async ({ request }) => {
  await clearEntries(request);
});

test("creates an entry and shows it in the list", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("entry-amount").fill("18.25");
  await page.getByTestId("entry-category").selectOption("food");
  await page.getByTestId("entry-description").fill("team lunch");
  await page.getByTestId("entry-date").fill("2026-07-15");
  await page.getByTestId("entry-submit").click();

  await expect(page.getByText("Entry created successfully.")).toBeVisible();

  await page.getByTestId("filter-date").fill("2026-07-15");
  await page.getByTestId("filter-submit").click();

  const rows = page.getByTestId("entry-row");
  await expect(rows).toHaveCount(1);
  await expect(page.getByTestId("entry-row-amount")).toHaveText("$18.25");
  await expect(page.getByTestId("total-amount")).toHaveText("Total: $18.25");
});
