import { test,expect } from '@playwright/test';
test('Pages demo: crisis, approval, execution, branch, import, reload and setup',async({page})=>{
  const errors:string[]=[],failed:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  await page.goto('./');await expect(page.getByText('BROWSER DEMO · DATA SAVED ON THIS DEVICE')).toBeVisible();
  await page.getByRole('button',{name:'ENTER COMMAND CENTER',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('We do not store or save any API keys.');
  await page.getByRole('button',{name:'CONTINUE WITHOUT AI',exact:true}).click();
  await page.getByRole('button',{name:/OPERATION: BLACKOUT/}).click();
  await expect(page.getByRole('heading',{name:/Take control/})).toBeVisible();
  await page.getByRole('button',{name:'START THE CRISIS',exact:true}).click();
  await page.getByRole('button',{name:'CALCULATE RECOVERY',exact:true}).click();
  const card=page.locator('.plan-card').filter({has:page.getByRole('heading',{name:'BALANCED',exact:true})});
  await card.getByRole('button',{name:'REVIEW & APPROVE'}).click();await page.getByRole('button',{name:'APPROVE THIS PLAN',exact:true}).click();await card.getByRole('button',{name:'EXECUTE APPROVED PLAN',exact:true}).click();
  await expect(page.getByText('INTERNAL EXECUTION VERIFIED')).toBeVisible();await page.reload();await expect(page.getByText('INTERNAL EXECUTION VERIFIED')).toBeVisible();
  await page.getByRole('button',{name:'Future explorer',exact:true}).click();await page.getByRole('button',{name:'FORK THIS FUTURE',exact:true}).click();await expect(page.locator('.future-branch')).toHaveCount(1);
  await page.getByRole('button',{name:'Data hangar',exact:true}).click();await page.getByRole('button',{name:'LOAD SAMPLE TABLES',exact:true}).click();await page.getByRole('button',{name:'VALIDATE ALL TABLES',exact:true}).click();await expect(page.getByText('References & quantities verified.')).toBeVisible();await page.getByRole('button',{name:'IMPORT PRIVATE WORKSPACE',exact:true}).click();await expect(page.getByRole('heading',{name:/Take control/})).toBeVisible();
  await page.getByRole('button',{name:'Mission reports',exact:true}).click();const [file]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'ORDER OUTCOMES CSV'}).click()]);expect(file.suggestedFilename()).toMatch(/\.csv$/);
  await page.getByRole('link',{name:'Native agent & server setup'}).click();await expect(page.getByText('The browser AI analyst connects directly to your selected provider with your own key.',{exact:false})).toBeVisible();
  await expect(page.getByRole('link',{name:'OPEN LOCAL OLLAMA SETUP'})).toHaveAttribute('href','http://localhost:8080/settings/app/ollama');
  await expect(page.locator('pre').first()).toContainText('pnpm dev:ollama');
  await page.getByRole('link',{name:'ENTER BROWSER COMMAND CENTER'}).click();await expect(page.getByRole('combobox',{name:'Resume saved workspace'})).toBeVisible();
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('Pages workspace persists in IndexedDB and survives reload',async({page})=>{
  await page.goto('./#/control');await page.getByRole('button',{name:/OPERATION: BLACKOUT/}).click();
  const result=await page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('chaos-control-pages-v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=reject;});
    return new Promise<number>((resolve,reject)=>{const tx=db.transaction('state','readonly'),r=tx.objectStore('state').get('data');r.onsuccess=()=>resolve(Object.keys(r.result.projects).length);r.onerror=reject;});
  });expect(result).toBe(1);await page.reload();await expect(page.getByRole('heading',{name:/Take control/})).toBeVisible();
});
