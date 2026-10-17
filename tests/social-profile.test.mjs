import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const output = mkdtempSync(join(tmpdir(), 'journey-social-test-'));
after(() => rmSync(output, { recursive: true, force: true }));
const program = ts.createProgram(['src/lib/social/model.ts', 'src/lib/social/queries.ts', 'src/lib/social/sharing.ts', 'src/lib/profile/model.ts', 'src/lib/profile/queries.ts'], {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, types: ['node'], esModuleInterop: true,
  outDir: output, rootDir: resolve('src'), strict: true, skipLibCheck: true,
});
const diagnostics = ts.getPreEmitDiagnostics(program).concat(program.emit().diagnostics);
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
}));
const require = createRequire(import.meta.url);
const { normalizeSocialState, createSocialController } = require(join(output, 'lib/social/model.js'));
const { publicJourneyUrl, sharePublicJourney } = require(join(output, 'lib/social/sharing.js'));
const profileModel = require(join(output, 'lib/profile/model.js'));
const id = '11111111-1111-4111-8111-111111111111';
const uid = '22222222-2222-4222-8222-222222222222';
const other = '33333333-3333-4333-8333-333333333333';
const row = { id, status: 'published', is_demo: false, liked: false, saved: false, likes_count: 4 };
const base = { liked: false, saved: false, likes: 4 };
const deferred = () => { let resolve; let reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
test('social state is a strict public-only projection, zero count allowed, invalid count unknown', () => {
  assert.deepEqual(normalizeSocialState({ ...row, email: 'private', gps_track: [] }, id), base);
  for (const patch of [{ status: 'draft' }, { is_demo: true }, { id: other }, { liked: undefined }, { saved: 'false' }])
    assert.equal(normalizeSocialState({ ...row, ...patch }, id), null);
  assert.equal(normalizeSocialState({ ...row, likes_count: 0 }, id).likes, 0);
  assert.equal(normalizeSocialState({ ...row, likes_count: -1 }, id).likes, null);
});
test('anonymous Like/Save require sign-in and never execute a mutation', async () => {
  const controller = createSocialController(null, 4);
  await controller.load();
  await controller.act('like');
  assert.equal(controller.getSnapshot().state.liked, false);
  assert.match(controller.getSnapshot().message, /Sign in required/);
  await controller.act('save');
  assert.equal(controller.getSnapshot().state.saved, false);
});
test('Like/unlike use desired state; Save stays distinct; authoritative count is reflected', async () => {
  let state = { ...base };
  const calls = [];
  const controller = createSocialController({ read: async () => state, write: async (action, enabled) => {
    calls.push([action, enabled]);
    state = { ...state, [action === 'like' ? 'liked' : 'saved']: enabled, likes: action === 'like' ? enabled ? 5 : 4 : state.likes };
    return state;
  } }, 4);
  await controller.load();
  await controller.act('like'); assert.deepEqual(controller.getSnapshot().state, { liked: true, saved: false, likes: 5 });
  await controller.act('save'); assert.deepEqual(controller.getSnapshot().state, { liked: true, saved: true, likes: 5 });
  await controller.act('like'); await controller.act('save');
  assert.deepEqual(calls, [['like',true],['save',true],['like',false],['save',false]]);
  assert.deepEqual(controller.getSnapshot().state, base);
});
test('duplicate presses and other actions are locked while the request is pending', async () => {
  const pending = deferred(); let writes = 0;
  const controller = createSocialController({ read: async () => base, write: async () => { writes++; return pending.promise; } }, 4);
  await controller.load();
  const first = controller.act('like');
  await controller.act('like'); await controller.act('save'); await controller.load();
  assert.equal(writes, 1); assert.equal(controller.getSnapshot().state.liked, false);
  pending.resolve({ ...base, liked: true, likes: 5 }); await first;
  assert.equal(controller.getSnapshot().state.liked, true);
});
test('uncertain mutation clears state; retry reads committed truth before enabling another toggle', async () => {
  let persisted = { ...base }; let writes = 0;
  const controller = createSocialController({ read: async () => persisted, write: async () => {
    writes++; persisted = { ...base, liked: true, likes: 5 }; throw new Error('Response lost');
  } }, 4);
  await controller.load(); await controller.act('like');
  assert.equal(controller.getSnapshot().state, null);
  assert.match(controller.getSnapshot().error, /may have reached/);
  await controller.act('like'); assert.equal(writes, 1);
  await controller.load(); assert.deepEqual(controller.getSnapshot().state, persisted);
});
test('failed state reads recover and mismatched post-write state never claims success', async () => {
  let failure = true;
  const controller = createSocialController({ read: async () => { if (failure) throw new Error('Offline'); return base; }, write: async () => base }, 4);
  await controller.load(); assert.equal(controller.getSnapshot().state, null);
  failure=false; await controller.load(); assert.deepEqual(controller.getSnapshot().state, base);
  await controller.act('like'); assert.equal(controller.getSnapshot().state, null);
  assert.equal(controller.getSnapshot().message, null);
});
test('old account/controller completions cannot restore disposed state', async () => {
  const pending = deferred();
  const controller = createSocialController({ read: () => pending.promise, write: async () => base }, 4);
  const loading = controller.load(); controller.dispose(); pending.resolve(base); await loading;
  assert.equal(controller.getSnapshot().state, null);
});
test('sharing constructs the existing public route and rejects invalid origins/IDs', () => {
  assert.equal(publicJourneyUrl(id, 'https://www.journeycreator.site'), 'https://www.journeycreator.site/journey/' + id);
  for (const origin of ['', 'http://www.journeycreator.site', 'https://localhost', 'https://127.0.0.1', 'https://user:password@example.org', 'https://example.org/path', 'https://example.org/?a=1'])
    assert.equal(publicJourneyUrl(id, origin), null);
  assert.equal(publicJourneyUrl('private-not-a-uuid', 'https://example.org'), null);
});
test('native sharing needs no description/cover; Android message includes URL; iOS gets URL', async () => {
  for (const platform of ['android','ios']) {
    let content;
    const result = await sharePublicJourney(id, 'Public title', 'https://www.journeycreator.site', platform, async value => { content=value; return { action: 'sharedAction' }; });
    assert.equal(result.kind, 'opened'); // Not a delivery claim on Android.
    assert.equal(platform === 'android' ? content.message.includes(result.url) : content.url === result.url, true);
  }
});
test('sharing cancellation is quiet; unsupported/config failures never fabricate a link', async () => {
  assert.equal((await sharePublicJourney(id,'Title','https://example.org','ios',async () => ({ action:'dismissedAction' }))).kind,'cancelled');
  assert.equal((await sharePublicJourney(id,'Title','https://example.org','web',async () => { const e=new Error(); e.name='AbortError'; throw e; })).kind,'cancelled');
  const unsupported=await sharePublicJourney(id,'Title','https://example.org','web',async () => { throw new Error('Unsupported'); });
  assert.equal(unsupported.kind,'unavailable'); assert.ok(unsupported.url);
  let called=false;
  const invalid=await sharePublicJourney(id,'Title',undefined,'android',async () => {called=true;return {action:'sharedAction'};});
  assert.equal(invalid.url,null); assert.equal(called,false);
});
const profile = { id: uid, username: 'wanderer', display_name: 'Real creator', bio: 'Public bio', avatar_path: 'profile-avatars/' + uid + '/photo.jpg', email:'private', gps_track:[], published_count:99 };
const card = { id, status:'published', is_demo:false, title:'Public journey', traveler_type:'solo', destination_slug:'kochi', creator_id:uid, creator_username:'wanderer', stops:[] };
test('creator fields are whitelisted; missing optional data stays missing', () => {
  const value=profileModel.normalizePublicProfile(profile,'WANDERER');
  assert.deepEqual(Object.keys(value).sort(),['avatar','bio','displayName','id','username']);
  assert.equal(value.avatar,profile.avatar_path);
  const sparse=profileModel.normalizePublicProfile({id:uid,username:'wanderer'},'wanderer');
  assert.equal(sparse.displayName,null); assert.equal(sparse.bio,null); assert.equal(sparse.avatar,null);
  assert.equal(profileModel.normalizePublicProfile({...profile,username:'another'},'wanderer'),null);
  assert.equal(profileModel.normalizePublicProfile(profile,'../private'),null);
});
test('avatar rejects another owner, unsupported paths and unsafe URL protocols', () => {
  for(const avatar_path of ['profile-avatars/'+other+'/photo.jpg','profile-avatars/'+uid+'/../photo.jpg','journey-media/u/j/photo.jpg','file:///private','javascript:alert(1)'])
    assert.equal(profileModel.normalizePublicProfile({...profile,avatar_path},'wanderer').avatar,null);
});
test('creator journeys require explicit published status, matching owner and non-demo data', () => {
  const input=[card,{...card,id:other,status:'draft'},{...card,is_demo:true},{...card,creator_id:other},{...card,status:undefined}];
  const values=profileModel.normalizeProfileJourneys(input,uid);
  assert.equal(values.length,1); assert.equal(values[0].id,id);
  assert.equal(values[0].email,undefined);
  assert.throws(()=>profileModel.normalizeProfileJourneys(null,uid));
});
// Inject transports before requiring query modules; no real credentials or writes.
const calls=[];
let authUid=uid; let detailRow=row; let mutationError=null; let refreshError=false; let afterWrite=false;
const client={
  auth:{getUser:async()=>({data:{user:authUid?{id:authUid}:null},error:null})},
  rpc:(name,args)=>({abortSignal:async signal=>{calls.push(['rpc',name,args]);assert.equal(signal.aborted,false);return {data:detailRow,error:afterWrite&&refreshError?{}:null};}}),
  from:table=>{
    calls.push(['table',table]);
    const builder={eq:(key,value)=>{calls.push(['eq',key,value]);return builder;},abortSignal:async()=>{afterWrite=true;return {error:mutationError};}};
    return {upsert:(payload,options)=>{calls.push(['upsert',payload,options]);return builder;},delete:()=>{calls.push(['delete']);return builder;}};
  },
};
require.cache[join(output,'lib/supabase/client.js')]={exports:{supabase:client}};
const { socialPort }=require(join(output,'lib/social/queries.js'));
test('repository verifies viewer and public status, uses conflict-safe upsert and scoped delete', async () => {
  calls.length=0; afterWrite=false; authUid=uid; detailRow={...row,liked:true};
  const port=socialPort(id,uid);
  await port.write('like',true);
  assert.ok(calls.some(c=>c[0]==='table'&&c[1]==='journey_likes'));
  assert.deepEqual(calls.find(c=>c[0]==='upsert'),['upsert',{user_id:uid,journey_id:id},{onConflict:'user_id,journey_id',ignoreDuplicates:true}]);
  calls.length=0; afterWrite=false; detailRow={...row,saved:false}; await port.write('save',false);
  assert.ok(calls.some(c=>c[0]==='table'&&c[1]==='saved_journeys'));
  assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='user_id'&&c[2]===uid));
  assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='journey_id'&&c[2]===id));
});
test('repository refuses expired/different sessions and drafts before mutation', async () => {
  for(const viewer of [null,other]){
    authUid=viewer;calls.length=0;
    await assert.rejects(()=>socialPort(id,uid).write('like',true));
    assert.equal(calls.some(c=>c[0]==='table'),false);
  }
  authUid=uid;detailRow={...row,status:'draft'};calls.length=0;
  await assert.rejects(()=>socialPort(id,uid).write('save',true));
  assert.equal(calls.some(c=>c[0]==='table'),false);
  detailRow=row;
});
test('repository rejects failed mutations and successful writes with failed reconciliation', async () => {
  authUid=uid;detailRow=row;mutationError={};afterWrite=false;
  await assert.rejects(()=>socialPort(id,uid).write('like',true));
  mutationError=null;refreshError=true;afterWrite=false;
  await assert.rejects(()=>socialPort(id,uid).write('save',true));
  refreshError=false;afterWrite=false;
});
const publicCalls=[];
let profileRows=[card]; let profileError=false;
const publicClient={
  rpc:(name,args)=>({abortSignal:async()=>{
    publicCalls.push([name,args]);
    return {data:name==='get_public_profile'?profile:profileRows,error:profileError?{}:null};
  }}),
  storage:{from:bucket=>({createSignedUrls:async paths=>{publicCalls.push(['sign',bucket,paths]);return {data:paths.map(()=>({signedUrl:'https://example.org/signed-avatar',error:null}))};}})},
};
require.cache[join(output,'lib/supabase/public.js')]={exports:{publicSupabase:publicClient}};
const { loadPublicProfile }=require(join(output,'lib/profile/queries.js'));
test('profile loader uses anonymous existing RPCs, published collection and permitted avatar signing', async () => {
  publicCalls.length=0;
  const result=await loadPublicProfile('wanderer',new AbortController().signal);
  assert.deepEqual(publicCalls[0],['get_public_profile',{handle:'wanderer'}]);
  assert.deepEqual(publicCalls[1],['get_account_journeys',{owner_id:uid,collection:'published'}]);
  assert.equal(result.journeys.length,1);
  assert.equal(result.profile.avatar,'https://example.org/signed-avatar');
  assert.ok(publicCalls.some(c=>c[0]==='sign'&&c[1]==='profile-avatars'));
});
test('profile loader supports empty journeys, invalid handle and recoverable transport failure', async () => {
  profileRows=[]; assert.equal((await loadPublicProfile('wanderer',new AbortController().signal)).journeys.length,0);
  assert.equal(await loadPublicProfile('../private',new AbortController().signal),null);
  profileError=true;await assert.rejects(()=>loadPublicProfile('wanderer',new AbortController().signal),/couldn’t load/);
  profileError=false;profileRows=[card];
});
test('creator and profile journey navigation reuse existing routes; future actions exclude implemented social actions', () => {
  const header=readFileSync('src/components/journey/story-header.tsx','utf8');
  const card=readFileSync('src/components/discovery/journey-card.tsx','utf8');
  const profileScreen=readFileSync('src/app/profile/[username].tsx','utf8');
  assert.ok(header.includes('pathname: "/profile/[username]"'));
  assert.ok(header.includes('params: { username: handle }'));
  assert.ok(card.includes("pathname: '/journey/[id]'"));
  assert.ok(profileScreen.includes('<JourneyCard journey={item}'));
  assert.ok(readFileSync('src/lib/journey/snapshot.ts','utf8').includes("['Start Journey']"));
});

test('Account published collection reuses anonymous contract, owner/status filtering and invalid-id guard',async()=>{
  const {loadPublishedProfileJourneys}=require(join(output,'lib/profile/queries.js'));
  publicCalls.length=0;profileRows=[card,{...card,creator_id:other},{...card,status:'draft'}];
  const result=await loadPublishedProfileJourneys(uid,new AbortController().signal);
  assert.equal(result.length,1);assert.deepEqual(publicCalls[0],['get_account_journeys',{owner_id:uid,collection:'published'}]);
  publicCalls.length=0;assert.deepEqual(await loadPublishedProfileJourneys('../private',new AbortController().signal),[]);assert.equal(publicCalls.length,0);
  profileRows=[card];
});
