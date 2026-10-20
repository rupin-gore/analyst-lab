import { expect, test, type Page } from '@playwright/test';

/** Submit once (unlocks the solution), load the reference solution, submit again, expect Passed. */
async function solveWithReference(page: Page, loadLabel: string) {
  const submit = page.getByRole('button', { name: 'Submit for grading' });
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByRole('status').filter({ hasText: /./ }).last()).toBeVisible();
  await page.getByRole('button', { name: loadLabel }).click();
  await submit.click();
  await expect(page.getByRole('status').filter({ hasText: /^✓ ?Passed/ })).toBeVisible();
}

test('home page lists the tracks', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Learn analyst roles/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Foundations/ })).toBeVisible();
});

test('SQL lab passes with the reference solution', async ({ page }) => {
  await page.goto('/tracks/foundations/labs/sql-net-revenue-by-state');
  await solveWithReference(page, 'Load reference solution');
});

test('Python lab passes with the reference solution', async ({ page }) => {
  await page.goto('/tracks/foundations/labs/python-clean-customers');
  await solveWithReference(page, 'Load reference solution');
});
