import {test,expect} from '@playwright/test';
const key='test-only-browser-key-not-a-real-credential';
test('BYOK: verified start, direct analysis, no saved keys, disconnect, and refresh',async({page})=>{
  const requests:{url:string;body:string;authorization:string}[]=[];
  await page.route('https://openrouter.ai/api/v1/**',async route=>{
    const request=route.request();requests.push({url:request.url(),body:request.postData()??'',authorization:request.headers()['authorization']??''});
    const payload=request.url().endsWith('/key')?{data:{label:'Test only'}}:request.url().endsWith('/models')?{data:[{id:'test/text-model',architecture:{output_modalities:['text']}}]}:{choices:[{message:{content:'SUP-1 is unavailable in this internal simulation. Review the computed risk and compare plans in Strategy Lab.'}}]};
    await route.fulfill({json:payload});
  });
  await page.goto('./');await page.getByRole('button',{name:'ENTER COMMAND CENTER',exact:true}).click();
  const dialog=page.getByRole('dialog');await expect(dialog).toContainText('We do not store or save any API keys.');
  await expect(page.getByRole('button',{name:'VERIFY KEY & LOAD MODELS',exact:true})).toBeDisabled();
  const input=page.getByLabel('Provider API key');await expect(input).toHaveAttribute('type','password');await expect(input).toHaveAttribute('autocomplete','off');
  await input.fill(key);await page.getByRole('button',{name:'VERIFY KEY & LOAD MODELS',exact:true}).click();await expect(page.getByLabel('AI model',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'START AI SERVICE',exact:true})).toBeDisabled();
  await page.getByLabel('AI model',{exact:true}).selectOption('test/text-model');await page.getByRole('button',{name:'START AI SERVICE',exact:true}).click();await expect(page.getByRole('heading',{name:'Operations analyst'})).toBeVisible();await expect(page.getByLabel('Provider API key')).toHaveCount(0);
  await page.keyboard.press('Escape');await page.getByRole('button',{name:/OPERATION: BLACKOUT/}).click();await page.getByRole('button',{name:'START THE CRISIS',exact:true}).click();
  await page.getByRole('button',{name:'Start AI service',exact:true}).click();await page.getByLabel('Ask the operations analyst').fill('Why is SUP-1 at risk?');await page.getByRole('button',{name:'ANALYZE MISSION',exact:true}).click();await expect(page.locator('.ai-answer')).toContainText('SUP-1');
  expect(requests).toHaveLength(3);for(const r of requests){expect(r.authorization).toBe(`Bearer ${key}`);expect(r.body).not.toContain(key);}
  expect(requests[2]!.body).toContain('SUP-1');
  const storage=await page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('chaos-control-pages-v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=reject;});
    const records=await new Promise<unknown>((resolve,reject)=>{const r=db.transaction('state','readonly').objectStore('state').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=reject;});
    return JSON.stringify({local:{...localStorage},session:{...sessionStorage},records});
  });expect(storage).not.toContain(key);expect(storage).not.toContain('Why is SUP-1 at risk?');
  await page.getByRole('button',{name:'DISCONNECT & CLEAR KEY',exact:true}).click();await page.getByRole('button',{name:'Start AI service',exact:true}).click();await expect(page.getByLabel('Provider API key')).toHaveValue('');
  await page.getByLabel('Provider API key').fill(key);await page.getByRole('button',{name:'VERIFY KEY & LOAD MODELS',exact:true}).click();await page.getByLabel('AI model',{exact:true}).selectOption('test/text-model');await page.getByRole('button',{name:'START AI SERVICE',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Start AI service',exact:true}).click();await expect(page.getByLabel('Provider API key')).toHaveValue('');
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('rejected keys are safe, provider changes clear keys, and cancel never starts a service',async({page})=>{
  await page.route('https://openrouter.ai/api/v1/key',route=>route.fulfill({status:401,json:{error:{message:`Rejected ${key}`}}}));
  await page.goto('./#/control');await page.getByRole('button',{name:'Start AI service',exact:true}).click();await page.getByLabel('Provider API key').fill(key);await page.getByRole('button',{name:'VERIFY KEY & LOAD MODELS',exact:true}).click();await expect(page.getByRole('alert')).toContainText('The provider rejected this key.');await expect(page.getByRole('alert')).not.toContainText(key);
  await page.getByLabel('AI provider').selectOption('groq');await expect(page.getByLabel('Provider API key')).toHaveValue('');await page.keyboard.press('Escape');await page.getByRole('button',{name:'Start AI service',exact:true}).click();await expect(page.getByLabel('Provider API key')).toHaveValue('');
});

