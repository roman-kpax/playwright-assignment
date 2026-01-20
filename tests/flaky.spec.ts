import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';


// -----------------------------
// Selectors
// -----------------------------
// NOTE:
// For this test assignment I intentionally kept the tests flat and explicit instead of introducing
// a full Page Object Model, since the project has limited scope. In a production suite I would
// extract shared components and flows into Page Objects for better scalability and maintainability.
const selectors = {
  link: (file: string) => `a[href='/${file}.html']`,

  email: '#email',
  password: '#password',
  submit: '#submitButton',
  success: '#successMessage',

  // challenge2
  dashboard: '#dashboard',
  menuButton: '#menuButton',
  logoutOption: '#logoutOption',

  // challenge3
  forgotButton: { name: 'Forgot Password?' },
  resetHeading: { name: 'Reset Password' },
  resetButton: { name: 'Reset Password' },
  successMessage: '.success-message',

  // challenge4
  profileButton: '#profileButton',
  userProfile: '#userProfile',
};

// -----------------------------
// Utilities
// -----------------------------
async function openChallenge(page: Page, name: string) {
  const targetPath = `/${name}.html`;

  await page.goto('/');

  await Promise.all([
    page.waitForURL(targetPath),
    page.locator(selectors.link(name)).click(),
  ]);

  await expect(page).toHaveURL(targetPath);
}

async function fillCredentials(page: Page, email: string, password: string) {
  await page.locator(selectors.email).fill(email);
  await page.locator(selectors.password).fill(password);
}

async function disableNativeFormSubmit(page: Page) {
  await page.addInitScript(() => {
    document.addEventListener('submit', e => e.preventDefault(), true);
  });
}

async function waitForAnimationsToFinish(page: Page, selector: string) {
  await page.locator(selector).evaluate(async (element) => {
    const animations = element.getAnimations?.({ subtree: true }) ?? [];

    for (const animation of animations) {
      await animation.finished.catch(() => {});
    }
  });
}

async function login(page: Page) {
  const submit = page.locator(selectors.submit);

  await expect(submit).toBeVisible();
  await expect(submit).toBeEnabled();
  await submit.click();
}

async function challenge4Login(page: Page) {
  const submit = page.locator(selectors.submit);
  const userProfile = page.locator(selectors.userProfile);

  await expect(submit).toBeVisible();
  await expect(submit).toBeEnabled();

  await expect(async () => {
    await submit.click();
    await expect(userProfile).toBeVisible({ timeout: 300});
  }).toPass({
    timeout: 5000,
    intervals: [100, 100, 200, 300, 500], // matches setInterval(100)
  });
}

async function waitForAppReady(page: Page) {
  await page.waitForFunction(() => window.isAppReady === true);
}

function creds(i: number) {
  return {
    email: `test${i}@example.com`,
    password: `password${i}`,
  };
}


// -----------------------------
// Challenge 1: Fix the below scripts to work consistently and do not use static waits. Add proper assertions to the tests
// -----------------------------
test('Login multiple times successfully @c1', async ({ page }) => {

  await test.step('Open Challenge 1 page', async () => {
    await openChallenge(page, 'challenge1');
  });

  for (let i = 1; i <= 3; i++) {
    await test.step(`Login attempt #${i}`, async () => {
      const { email, password } = creds(i);

      await fillCredentials(page, email, password);
      await login(page);

      const success = page.locator(selectors.success);

      await expect(success).toBeVisible();
      await expect(success).toContainText('Successfully submitted!');
      await expect(success).toContainText(`Email: ${email}`);
      await expect(success).toContainText(`Password: ${password}`);

      // Wait until success message disappears before next iteration
      await expect(success).toBeHidden();
    });

  }
});


// -----------------------------
// Challenge 2: Login and logout successfully with animated form and delayed loading
// -----------------------------
test('Login animated form and logout successfully @c2', async ({ page }) => {

  await test.step('Open Challenge 2 page', async () => {
    await openChallenge(page, 'challenge2');
  });

  await test.step('Fill login credentials', async () => {
    await fillCredentials(page, 'test1@example.com', 'password1');
  });

  await test.step('Wait for submit button to become clickable', async () => {
    const submitBtn = page.locator(selectors.submit);
    await expect(submitBtn).toBeVisible();

    // Wait for CSS animation to finish so the button is actually clickable
    await waitForAnimationsToFinish(page, selectors.submit);

    await expect(submitBtn).toBeEnabled();
    
    await submitBtn.click();
  });

  await test.step('Wait for dashboard to appear', async () => {
    await expect(page.locator(selectors.dashboard)).toBeVisible();
  });

  await test.step('Wait for menu initialization', async () => {
    await expect(page.locator(selectors.menuButton))
      .toHaveAttribute('data-initialized', 'true');
  });

  await test.step('Open menu and logout', async () => {
    await page.locator(selectors.menuButton).click();
    await page.locator(selectors.logoutOption).click();
  });

  await test.step('Verify returned to login form', async () => {
    await expect(page.locator(selectors.submit)).toBeVisible();
    await expect(page.locator(selectors.dashboard)).toBeHidden();
  });
});


// -----------------------------
// Challenge 3: Fix the Forgot password test and add proper assertions
// -----------------------------
test('Forgot password @c3', async ({ page }) => {

  const emailValue = 'test@example.com';

  await test.step('Open Challenge 3 page', async () => {
    await openChallenge(page, 'challenge3');
  });

  await test.step('Open forgot password form', async () => {
    await page.getByRole('button', selectors.forgotButton).click();

    const resetHeading = page.getByRole('heading', selectors.resetHeading);
    await expect(resetHeading).toBeVisible();
  });

  await test.step('Submit reset password form', async () => {
    await page.locator(selectors.email).fill(emailValue);
    await page.getByRole('button', selectors.resetButton).click();
  });

  await test.step('Verify success message', async () => {
    const successMsg = page.locator(selectors.successMessage);

    await expect(successMsg.locator('h3')).toHaveText('Success!');
    await expect(successMsg).toContainText('Password reset link sent!');
    await expect(successMsg).toContainText(emailValue);
  });
});


// -----------------------------
// Challenge 4: Fix the login test.
// Hint: There is a global variable that you can use to check if the app is in ready state
// -----------------------------
test('Login and logout @c4', async ({ page }) => {

  await test.step('Disable native form submit (prevent page reload)', async () => {
    await disableNativeFormSubmit(page);
  });

  await test.step('Navigate to challenge4', async () => {
    await openChallenge(page, 'challenge4');
  });

  await test.step('Wait for app ready state', async () => {
    await waitForAppReady(page);
  });

  await test.step('Fill credentials', async () => {
    await fillCredentials(page, 'test@example.com', 'password');
  });

  await test.step('Submit login form and wait for profile', async () => {
    await challenge4Login(page);
  });

  await test.step('Open profile menu', async () => {
    const profileBtn = page.locator(selectors.profileButton);

    await expect(profileBtn).toBeVisible();
    await expect(profileBtn).toBeEnabled();
    await profileBtn.click();
  });

  await test.step('Logout', async () => {
    await page.getByText('Logout').click();
  });

  await test.step('Verify returned to login form', async () => {
    await expect(page.locator(selectors.email)).toBeVisible();
  });

});