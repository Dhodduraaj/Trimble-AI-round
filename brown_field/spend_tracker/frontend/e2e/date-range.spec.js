import { test, expect } from "@playwright/test";
import { seedSampleEntries } from "./fixtures.js";

test.beforeEach(async ({ request }) => {
  await seedSampleEntries(request);
});

test("filters entries across an inclusive date range", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("mode-range").click();
  await page.getByTestId("filter-from").fill("2026-07-10");
  await page.getByTestId("filter-to").fill("2026-07-20");
  await page.getByTestId("filter-range-submit").click();

  const rows = page.getByTestId("entry-row");
  await expect(rows).toHaveCount(3);
  await expect(page.getByTestId("total-amount")).toHaveText("Total: $75.50");
});

test("includes boundary dates in a single-day range", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("mode-range").click();
  await page.getByTestId("filter-from").fill("2026-07-15");
  await page.getByTestId("filter-to").fill("2026-07-15");
  await page.getByTestId("filter-range-submit").click();

  const rows = page.getByTestId("entry-row");
  await expect(rows).toHaveCount(1);
  await expect(page.getByTestId("entry-row-amount")).toHaveText("$25.50");
});
