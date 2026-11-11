import { getStore } from '@netlify/blobs';
import { createHash, timingSafeEqual } from 'node:crypto';

const headers = { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' };
const json = (body,status=200) => new Response(JSON.stringify(body),{status,headers});
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const storeName='daibutsu-site-statues';

function authorised(req){
  const secret=process.env.ADMIN_TOKEN||'';
  const supplied=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(secret.length<24 || !supplied) return false;
  const a=Buffer.from(secret),b=Buffer.from(supplied);
  return a.length===b.length && timingSafeEqual(a,b);
}
function valid(records){
  if(!Array.isArray(records)||records.length===0||records.length>10000) return '件数が不正です';
  const ids=new Set();
  for(const r of records){
    if(!r||typeof r!=='object'||typeof r.id!=='string'||!/^[A-Za-z0-9_-]{1,120}$/.test(r.id)) return 'IDが不正です';
    if(ids.has(r.id))return 'IDが重複しています: '+r.id;
    if(typeof r.name!=='string'||!r.name.trim())return '名前が必要です';
    ids.add(r.id);
    const img=r.image_url || '';
    if(typeof img!=='string'||(img && !/^https:\/\//.test(img) && !/^\/uploads\/[A-Za-z0-9._-]+$/.test(img)))return '画像URLはHTTPSまたはアップロード画像にしてください';
  }
  return null;
}
async function getCurrent(req,store){
  const entry=await store.getWithMetadata('master',{type:'json',consistency:'strong'});
  if(entry) return {body:entry.data,etag:entry.etag,hasEntry:true};
  const seedRes=await fetch(new URL('/data/statues.json',req.url));
  if(!seedRes.ok)throw new Error('Initial data unavailable: '+seedRes.status);
  return {body:await seedRes.json(),etag:null,hasEntry:false};
}
export default async function handler(req){
  try{
    if(!['GET','PUT'].includes(req.method))return json({error:'Method not allowed'},405);
    if(req.method==='PUT'&&!authorised(req))return json({detail:'管理用キーが設定されていないか、一致しません'},401);
    const store=getStore(storeName);
    const current=await getCurrent(req,store);
    if(req.method==='GET')return json({...current.body,revision:hash(current.body)});
    if(Number(req.headers.get('content-length')||0)>5_000_000)return json({detail:'データが大きすぎます'},413);
    const raw=await req.text();
    if(raw.length>5_000_000)return json({detail:'データが大きすぎます'},413);
    let incoming;
    try{incoming=JSON.parse(raw)}catch{return json({detail:'JSON形式が不正です'},400)}
    const problem=valid(incoming?.records);
    if(problem)return json({detail:problem},400);
    const expected=req.headers.get('x-base-revision');
    if(!expected)return json({detail:'先に公開データを再読み込みしてください'},428);
    if(expected!==hash(current.body))return json({detail:'他の編集内容と競合しました。公開データを再読み込みしてください'},409);
    const updated={schema_version:2,records:incoming.records};
    const opts=current.hasEntry?{onlyIfMatch:current.etag}:{onlyIfNew:true};
    const result=await store.setJSON('master',updated,opts);
    if(!result.modified)return json({detail:'同時編集により保存できませんでした。再読み込みしてください'},409);
    await getStore('daibutsu-site-backups').setJSON(Date.now()+'-'+hash(current.body).slice(0,12),current.body).catch(console.error);
    return json({ok:true,count:updated.records.length,revision:hash(updated)});
  }catch(e){console.error('statues endpoint failed',e);return json({detail:'サーバー処理に失敗しました'},500)}
}
export const config={path:'/api/statues'};
