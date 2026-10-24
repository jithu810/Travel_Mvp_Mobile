import assert from 'node:assert/strict';
import {test} from 'node:test';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,realpathSync} from 'node:fs';
import {join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import net from 'node:net';
const bin=process.env.THUMBNAIL_PG_BIN || 'D:/Travel_Mvp/.local-tests/customize-stops-pg/pgsql/bin';
const exe=name=>join(bin,name+(process.platform==='win32'?'.exe':''));
const available=['initdb','pg_ctl','psql'].every(name=>existsSync(exe(name)));
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const published='33333333-3333-4333-8333-333333333333',draft='44444444-4444-4444-8444-444444444444',photo='55555555-5555-4555-8555-555555555555',stop='66666666-6666-4666-8666-666666666666';
test('review Storage policy on a new disposable PG cluster: public/owner/other/path/rollback boundaries',{skip:!available,timeout:90000},async()=>{
 const workspace=realpathSync(fileURLToPath(new URL('../',import.meta.url)));
 const outputs=join(workspace,'.local-tests');mkdirSync(outputs,{recursive:true});
 const directory=mkdtempSync(join(outputs,'thumbnail-policy-'));
 assert.ok(realpathSync(directory).startsWith(workspace+sep));const data=join(directory,'data');assert.equal(existsSync(data),false);
 const server=net.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));
 function run(name,args,input){const result=spawnSync(exe(name),args,{input,encoding:'utf8',windowsHide:true,timeout:40000});assert.equal(result.status,0,`${name}: ${result.stderr || result.error || result.stdout}`);return result.stdout.trim();}
 const psql=sql=>run('psql',['-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres','-qAt','-v','ON_ERROR_STOP=1'],sql);
 let started=false;
 try {
  run('initdb',['-D',data,'-U','postgres','-A','trust','--no-locale','-E','UTF8']);
  run('pg_ctl',['-D',data,'-l',join(directory,'server.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start']);started=true;
  psql(`create role anon nologin;create role authenticated nologin;create schema auth;create schema private;create schema storage;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema public,auth,storage to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
   create table public.journeys(id uuid primary key,user_id uuid,status text,cover_image_path text);
   create table public.journey_stops(id uuid primary key,journey_id uuid,photo_path text);
   create table storage.objects(bucket_id text,name text);
   alter table public.journeys enable row level security;alter table public.journey_stops enable row level security;alter table storage.objects enable row level security;
   grant select on public.journeys,public.journey_stops,storage.objects to anon,authenticated;
   create policy journeys_read on public.journeys for select to anon,authenticated using(status='published' or user_id=auth.uid());
   create policy stops_read on public.journey_stops for select to anon,authenticated using(exists(select 1 from public.journeys j where j.id=journey_id));
   create policy journey_media_read on storage.objects for select to anon,authenticated using(bucket_id='journey-media' and (split_part(name,'/',1)=auth.uid()::text or exists(select 1 from public.journeys j where j.cover_image_path='journey-media/'||objects.name) or exists(select 1 from public.journey_stops s where s.photo_path='journey-media/'||objects.name)));
   insert into public.journeys values('${published}','${owner}','published','journey-media/${owner}/${published}/cover/${photo}.full-v1.png'),('${draft}','${owner}','draft','journey-media/${owner}/${draft}/cover/${photo}.full-v1.jpg');
   insert into public.journey_stops values('${stop}','${published}','journey-media/${owner}/${published}/stops/${stop}/${photo}.full-v1.webp');
   insert into storage.objects values
   ('journey-media','${owner}/${published}/cover/${photo}.thumb-512-v1.jpg'),
   ('journey-media','${owner}/${draft}/cover/${photo}.thumb-512-v1.jpg'),
   ('journey-media','${owner}/${published}/stops/${stop}/${photo}.thumb-512-v1.jpg'),
   ('journey-media','${owner}/${published}/cover/${other}.thumb-512-v1.jpg'),
   ('journey-media','${owner}/${published}/cover/../${photo}.thumb-512-v1.jpg'),
   ('journey-media','${owner}/${published}/cover/${photo}.full-v1.png'),
   ('profile-avatars','${owner}/${published}/cover/${photo}.thumb-512-v1.jpg');`);
  const as=(role,uid,query)=>psql(`set role ${role};set request.jwt.claim.sub='${uid}';${query}`);
  assert.equal(as('anon','','select count(*) from storage.objects'), '1');
  psql(readFileSync(join(workspace,'docs/backend/image-thumbnails.review.sql'),'utf8'));
  assert.equal(as('anon','','select count(*) from storage.objects'),'3','Published cover+stop companion plus existing original');
  assert.equal(as('authenticated',other,'select count(*) from storage.objects'),'3','Other account cannot see owner draft or arbitrary siblings');
  assert.equal(as('authenticated',owner,'select count(*) from storage.objects'),'6','Existing owner policy remains unchanged, including owner uploads');
  assert.equal(as('anon','',`select count(*) from storage.objects where name like '%..%' or bucket_id='profile-avatars'`),'0');
  assert.equal(psql("select count(*) from information_schema.role_table_grants where table_schema='storage' and table_name='objects' and grantee in ('anon','authenticated') and privilege_type<>'SELECT'"),'0');
  psql(`update public.journeys set status='draft' where id='${published}'`);
  assert.equal(as('anon','','select count(*) from storage.objects'),'0','Unpublishing withdraws derivative and original access');
  psql(`update public.journeys set status='published' where id='${published}';drop policy journey_media_thumbnail_v1_read on storage.objects;`);
  assert.equal(as('anon','','select count(*) from storage.objects'),'1','Policy rollback restores original-only baseline');
 } finally {if(started)run('pg_ctl',['-D',data,'-m','fast','-w','stop']);}
 // Retain task-owned synthetic cluster/log evidence. No filesystem deletions.
});
