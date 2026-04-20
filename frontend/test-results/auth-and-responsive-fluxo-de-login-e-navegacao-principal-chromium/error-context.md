# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-and-responsive.spec.ts >> fluxo de login e navegacao principal
- Location: e2e\auth-and-responsive.spec.ts:11:1

# Error details

```
Test timeout of 20000ms exceeded.
```

```
Error: locator.fill: Test timeout of 20000ms exceeded.
Call log:
  - waiting for getByLabel('E-mail')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - img [ref=e5]
    - heading "Login" [level=1] [ref=e7]
    - paragraph [ref=e8]: Entre com sua conta para continuar
  - generic [ref=e9]:
    - generic [ref=e10]:
      - generic [ref=e11]: E-mail
      - textbox "seu@email.com" [ref=e12]
    - generic [ref=e13]:
      - generic [ref=e14]: Senha
      - textbox "••••••••" [ref=e15]
    - button "Entrar" [ref=e16] [cursor=pointer]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | async function login(page: Parameters<typeof test>[0]['page']) {
  4  |   await page.goto('/login');
> 5  |   await page.getByLabel('E-mail').fill('admin@admin.com');
     |                                   ^ Error: locator.fill: Test timeout of 20000ms exceeded.
  6  |   await page.getByLabel('Senha').fill('Admin123!');
  7  |   await page.getByRole('button', { name: 'Entrar' }).click();
  8  |   await expect(page).toHaveURL(/\/dashboard/);
  9  | }
  10 | 
  11 | test('fluxo de login e navegacao principal', async ({ page }) => {
  12 |   await login(page);
  13 | 
  14 |   await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  15 |   await page.getByRole('link', { name: 'Agendamentos' }).click();
  16 |   await expect(page).toHaveURL(/\/agendamentos/);
  17 |   await expect(page.getByRole('heading', { name: 'Agendamentos' })).toBeVisible();
  18 | });
  19 | 
  20 | test('layout responsivo em viewport mobile', async ({ page }) => {
  21 |   await page.setViewportSize({ width: 390, height: 844 });
  22 |   await login(page);
  23 | 
  24 |   await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  25 |   await expect(page.getByRole('link', { name: 'Disponibilidade' })).toBeVisible();
  26 | });
  27 | 
```