import { test, expect } from "@playwright/test";
import { seedSampleEntries } from "./fixtures.js";

test.beforeEach(async ({ request }) => {
  await seedSampleEntries(request);
});

test("filters entries by a single date", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("filter-date").fill("2026-07-15");
  await page.getByTestId("filter-submit").click();

  const rows = page.getByTestId("entry-row");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("transport");
  await expect(page.getByTestId("entry-row-amount")).toHaveText("$25.50");
  await expect(page.getByTestId("total-amount")).toHaveText("Total: $25.50");
});
