import { getStore } from '@netlify/blobs';
export default async function handler(req,context){
  if(req.method!=='GET')return new Response('Method not allowed',{status:405});
  const id=context.params?.id || new URL(req.url).pathname.split('/').pop();
  if(!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(id||''))return new Response('Not found',{status:404});
  try{
    const entry=await getStore('daibutsu-site-uploads').getWithMetadata(id,{type:'arrayBuffer'});
    if(!entry)return new Response('Not found',{status:404});
    const mime={jpg:'image/jpeg',png:'image/png',webp:'image/webp'}[id.split('.').pop()];
    return new Response(entry.data,{headers:{'content-type':mime,'cache-control':'public, max-age=3600','x-content-type-options':'nosniff'}});
  }catch(e){console.error(e);return new Response('Unavailable',{status:500})}
}
export const config={path:'/uploads/:id'};
