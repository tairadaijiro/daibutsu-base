import { getStore } from '@netlify/blobs';
import { randomBytes,timingSafeEqual } from 'node:crypto';
const reply=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
function authorised(req){
  const secret=process.env.ADMIN_TOKEN||'';
  const supplied=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(secret.length<24 || !supplied)return false;
  const a=Buffer.from(secret),b=Buffer.from(supplied);
  return a.length===b.length && timingSafeEqual(a,b);
}
export default async function handler(req){
  if(req.method!=='POST')return reply({detail:'Method not allowed'},405);
  if(!authorised(req))return reply({detail:'管理用キーが設定されていないか一致しません'},401);
  if(Number(req.headers.get('content-length')||0)>5_300_000)return reply({detail:'画像は5MBまで'},413);
  try{
    const form=await req.formData(),file=form.get('file');
    if(!(file instanceof Blob))return reply({detail:'画像ファイルを選択してください'},400);
    if(file.size>5_000_000||file.size===0)return reply({detail:'画像は5MBまで'},413);
    const mime=file.type;
    const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[mime];
    if(!ext)return reply({detail:'JPEG、PNG、WebPのみ'},400);
    const bytes=new Uint8Array(await file.arrayBuffer());
    const jpeg=mime==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
    const png=mime==='image/png'&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
    const webp=mime==='image/webp'&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
    if(!(jpeg||png||webp))return reply({detail:'画像形式が不正です'},400);
    const filename=randomBytes(16).toString('hex')+'.'+ext;
    await getStore('daibutsu-site-uploads').set(filename,new Blob([bytes],{type:mime}),{metadata:{mime}});
    return reply({url:'/uploads/'+filename});
  }catch(e){console.error(e);return reply({detail:'画像アップロードに失敗'},500)}
}
export const config={path:'/api/upload'};
