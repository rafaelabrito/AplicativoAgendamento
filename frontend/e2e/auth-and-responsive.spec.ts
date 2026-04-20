import { expect, test } from '@playwright/test';

async function login(page: Parameters<typeof test>[0]['page']) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill('admin@admin.com');
  await page.getByLabel('Senha').fill('Admin123!');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test('fluxo de login e navegacao principal', async ({ page }) => {
  await login(page);

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.getByRole('link', { name: 'Agendamentos' }).click();
  await expect(page).toHaveURL(/\/agendamentos/);
  await expect(page.getByRole('heading', { name: 'Agendamentos' })).toBeVisible();
});

test('layout responsivo em viewport mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Disponibilidade' })).toBeVisible();
});
