import {test,expect} from '@playwright/test';
test('branded public pages link to signup, login and the product story',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/');
  await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('.hero-copy h1')).toContainText('Show the work.');
  await expect(page.locator('.marketing-header .brand-wordmark')).toBeVisible();
  await expect(page.locator('.demo-banner')).toHaveCount(0);
  await page.screenshot({path:'test-results/redesign-landing-desktop.png'});
  await page.screenshot({path:'test-results/redesign-landing-full.png',fullPage:true});
  await page.getByRole('button',{name:'Find my next role',exact:false}).click();
  await expect(page).toHaveURL(/#signup\/candidate$/);
  await expect(page.getByRole('button',{name:'I’m finding work',exact:false})).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:'test-results/redesign-signup-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'I’m hiring talent',exact:false}).click();
  await expect(page.getByLabel('Company',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Work email',{exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Company',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Log in',exact:true}).click();
  await expect(page).toHaveURL(/#login\/recruiter$/);
  await page.getByLabel('Password',{exact:true}).fill('sample-password');
  await page.getByRole('button',{name:'Show password',exact:true}).click();
  await expect(page.getByLabel('Password',{exact:true})).toHaveAttribute('type','text');
  await page.getByRole('button',{name:'Hide password',exact:true}).click();
  await expect(page.getByLabel('Password',{exact:true})).toHaveAttribute('type','password');
  await page.screenshot({path:'test-results/redesign-login-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Back to Recruider',exact:false}).click();
  await page.getByRole('navigation',{name:'Website navigation'}).getByRole('button',{name:'How it works'}).click();
  await expect(page.getByRole('heading',{name:'A little proof. A better connection.'})).toBeVisible();
  await page.locator('summary').filter({hasText:'How does matching work?'}).click();
  await expect(page.getByText('Candidates show interest in a job.',{exact:false})).toBeVisible();
});
test('mobile navigation, landing and account pages fit the screen',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/redesign-landing-mobile.png'});
  await page.getByRole('button',{name:'Open menu',exact:true}).click();
  await expect(page.getByRole('navigation',{name:'Website navigation'})).toBeVisible();
  await page.getByRole('button',{name:'For teams',exact:true}).click();
  await expect(page.getByRole('button',{name:'Open menu',exact:true})).toHaveAttribute('aria-expanded','false');
  await page.getByRole('button',{name:'Find great talent',exact:false}).click();
  await expect(page).toHaveURL(/#signup\/recruiter$/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/redesign-signup-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Log in',exact:true}).click();
  await page.screenshot({path:'test-results/redesign-login-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Forgot password?',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Forgot your password?'})).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading',{name:'Good to see you again.'})).toBeVisible();
});



test('scroll reveals stay smooth and reduced motion keeps every section usable',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto('/');
  const faq=page.locator('.faq-section > div').first();
  await expect(faq).toHaveClass(/motion-pending/);
  await faq.scrollIntoViewIfNeeded();
  await expect(faq).toHaveClass(/motion-shown/);
  await expect(page.getByRole('heading',{name:'Good questions. Clear answers.'})).toBeVisible();

  await page.emulateMedia({reducedMotion:'reduce'});
  await page.reload();
  await expect(page.locator('.hero-copy')).toHaveCSS('animation-name','none');
  await expect(page.locator('.faq-section > div').first()).not.toHaveClass(/motion-pending/);
  await page.getByRole('button',{name:'Find my next role',exact:false}).click();
  await expect(page.getByRole('heading',{name:'Your next chapter starts here.'})).toBeVisible();
});
