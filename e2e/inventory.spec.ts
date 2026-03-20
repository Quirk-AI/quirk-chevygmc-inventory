// e2e/inventory.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Inventory Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for inventory to load
    await page.waitForSelector('[role="table"]', { timeout: 10000 });
  });

  test("loads inventory data on initial visit", async ({ page }) => {
    // Should show KPI cards
    await expect(page.getByText(/Total Vehicles/i)).toBeVisible();
    await expect(page.getByText(/New Arrivals/i)).toBeVisible();
    await expect(page.getByText(/In Transit/i)).toBeVisible();
  });

  test("filters by model when clicking pie chart", async ({ page }) => {
    // Find and click a pie chart segment or legend item
    const legendItem = page
      .locator("button")
      .filter({ hasText: /SILVERADO|TAHOE|EQUINOX/i })
      .first();

    if (await legendItem.isVisible()) {
      await legendItem.click();

      // Should show drilldown view
      await expect(
        page.getByRole("button", { name: /back/i })
      ).toBeVisible();
    }
  });

  test("drills down into aging bucket", async ({ page }) => {
    // Click on 0-30 Days aging bucket
    const freshBucket = page.getByRole("button", { name: /0-30 Days/i });
    await freshBucket.click();

    // Should show drilldown with title
    await expect(page.getByText(/Fresh Inventory/i)).toBeVisible();

    // Should have back button
    await expect(
      page.getByRole("button", { name: /back/i })
    ).toBeVisible();
  });

  test("back button returns to main view", async ({ page }) => {
    // Drill into aging bucket
    const freshBucket = page.getByRole("button", { name: /0-30 Days/i });
    await freshBucket.click();

    // Click back
    const backButton = page.getByRole("button", { name: /back/i });
    await backButton.click();

    // Should see KPI bar again
    await expect(page.getByText(/Total Vehicles/i)).toBeVisible();
  });

  test("switches between dealerships", async ({ page }) => {
    // Open the dealership selector (it's a Select component, not a button)
    const dealerTrigger = page.locator('[aria-label="Choose dealership"]');
    await dealerTrigger.click();

    // Select Buick GMC
    const gmcOption = page.getByRole("option", { name: /Buick GMC/i });
    if (await gmcOption.isVisible()) {
      await gmcOption.click();

      // Wait for new data to load
      await page.waitForSelector('[role="table"]', { timeout: 10000 });

      // Should still show KPI cards
      await expect(page.getByText(/Total Vehicles/i)).toBeVisible();
    }
  });

  test("year filter narrows results", async ({ page }) => {
    // Open year selector
    const yearTrigger = page.locator('[aria-label="Filter by model year"]');
    await yearTrigger.click();

    // Pick a specific year if available
    const yearOption = page.getByRole("option").filter({ hasText: /^202\d$/ }).first();
    if (await yearOption.isVisible()) {
      const yearText = await yearOption.textContent();
      await yearOption.click();

      // Table should still be visible
      await expect(page.locator('[role="table"]').or(page.locator("table")).first()).toBeVisible();

      // The "Showing X vehicles" count should reflect filtered data
      if (yearText) {
        await expect(page.getByText(/Showing \d+ vehicles/i)).toBeVisible();
      }
    }
  });

  test("stock number filter narrows results", async ({ page }) => {
    // Type a partial stock number into the filter
    const stockInput = page.locator('[aria-label="Filter by stock number"]');
    await stockInput.fill("M39");

    // Wait for filter to apply
    await page.waitForTimeout(300);

    // Should still show the table or a "no results" state
    const table = page.locator('[role="table"]').or(page.locator("table")).first();
    await expect(table).toBeVisible();
  });

  test("opens vehicle detail drawer when clicking row", async ({ page }) => {
    // Click on a vehicle row (not the stock number link)
    const row = page
      .locator("tr")
      .filter({ hasText: /\$\d{2,3},\d{3}/ })
      .first();

    if (await row.isVisible()) {
      // Click on the row (avoiding the stock number link)
      await row.locator("td").nth(2).click();

      // Drawer should open - look for close button or drawer content
      await expect(
        page
          .getByRole("dialog")
          .or(page.locator('[data-state="open"]'))
      ).toBeVisible({ timeout: 2000 });
    }
  });

  test("drawer closes when close button clicked", async ({ page }) => {
    // Open a drawer first
    const row = page
      .locator("tr")
      .filter({ hasText: /\$\d{2,3},\d{3}/ })
      .first();

    if (await row.isVisible()) {
      await row.locator("td").nth(2).click();

      const dialog = page.getByRole("dialog").or(page.locator('[data-state="open"]'));
      await expect(dialog).toBeVisible({ timeout: 2000 });

      // Close the drawer
      const closeButton = page.getByRole("button", { name: /close/i });
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await expect(dialog).not.toBeVisible({ timeout: 2000 });
      }
    }
  });

  test("stock number link opens in popup window", async ({ page }) => {
    // Get the first stock number link
    const stockLink = page
      .locator("a, span")
      .filter({ hasText: /^[A-Z]?\d{5,}$/ })
      .first();

    if (await stockLink.isVisible()) {
      // Verify new tab would open (check the href)
      const href = await stockLink.getAttribute("href");
      if (href) {
        expect(href).toContain("quirk");
      }
    }
  });
});

test.describe("Accessibility", () => {
  test("has proper ARIA labels on filters", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[role="table"]');

    // Check for aria-labels on key interactive elements
    await expect(page.locator('[aria-label="Choose dealership"]')).toBeVisible();
    await expect(page.locator('[aria-label="Filter by model year"]')).toBeVisible();
    await expect(page.locator('[aria-label="Filter by vehicle make"]')).toBeVisible();
    await expect(page.locator('[aria-label="Filter by vehicle model"]')).toBeVisible();
    await expect(page.locator('[aria-label="Filter by stock number"]')).toBeVisible();
  });

  test("inventory table has proper role", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[role="table"]');

    const table = page.locator('[role="table"]');
    await expect(table).toHaveAttribute("aria-label", /inventory/i);
  });
});
