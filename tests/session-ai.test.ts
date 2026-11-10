import {afterEach,describe,expect,it,vi} from 'vitest';
import {analyze,availableModels,connect,disconnect,sessionInfo} from '../pages/session-ai';
const key='test-only-provider-key-not-a-real-credential';
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status});
afterEach(()=>{disconnect();vi.unstubAllGlobals();});
describe('session-only browser credentials',()=>{
  it('authenticates OpenRouter before loading models and excludes non-text models',async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(json({data:{label:'test'}})).mockResolvedValueOnce(json({data:[{id:'vendor/text',architecture:{output_modalities:['text']}},{id:'vendor/image',architecture:{output_modalities:['image']}}]}));vi.stubGlobal('fetch',fetcher);
    expect(await availableModels('openrouter',key)).toEqual(['vendor/text']);
    expect(fetcher.mock.calls.map(c=>c[0])).toEqual(['https://openrouter.ai/api/v1/key','https://openrouter.ai/api/v1/models']);
    for(const [,options] of fetcher.mock.calls){expect(options).toMatchObject({credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',headers:{Authorization:`Bearer ${key}`}});expect(options.body).toBeUndefined();}
    expect(sessionInfo()).toBeNull();
  });
  it('keeps credentials outside session metadata and prompts, redacts echoed keys, and clears on disconnect',async()=>{
    const fetcher=vi.fn().mockResolvedValue(json({choices:[{message:{content:`A response that accidentally echoes ${key}`}}]}));vi.stubGlobal('fetch',fetcher);
    connect('groq',key,'example-model');expect(sessionInfo()).toEqual({provider:'groq',model:'example-model'});
    expect(await analyze('Explain the risks',{revision:2})).not.toContain(key);
    const [url,options]=fetcher.mock.calls[0]!;expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');expect(options.body).not.toContain(key);expect(JSON.parse(options.body).messages[1].content).toContain('revision');
    disconnect();expect(sessionInfo()).toBeNull();await expect(analyze('Again',{})).rejects.toThrow('Start the AI service');expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('returns safe provider errors without leaking a rejected key or error body',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(json({error:{message:`rejected ${key}`}},401)));
    await expect(availableModels('groq',key)).rejects.toThrow('The provider rejected this key.');expect(sessionInfo()).toBeNull();
  });
  it('cancels active requests when the key is disconnected',async()=>{
    vi.stubGlobal('fetch',vi.fn((_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error(key))))));
    connect('groq',key,'example-model');const result=analyze('Explain',{});disconnect();await expect(result).rejects.toThrow('Request stopped or timed out.');expect(sessionInfo()).toBeNull();
  });
  it('does not accept a response arriving after disconnect even if a transport ignores abort',async()=>{
    let finish!:(value:Response)=>void;vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve;})));
    connect('groq',key,'example-model');const result=analyze('Explain',{});disconnect();finish(json({choices:[{message:{content:'Late response'}}]}));await expect(result).rejects.toThrow('AI session ended');
  });
});
