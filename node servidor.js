// Uso: node servidor.js   (deixe jogo.html na mesma pasta; não precisa instalar nada)
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const PORT=process.env.PORT||3000;
const srv=http.createServer((q,r)=>fs.readFile(path.join(__dirname,'jogo.html'),(e,d)=>{
  if(e){r.writeHead(500);return r.end('jogo.html não encontrado')}
  r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(d)}));
const ips=()=>Object.values(os.networkInterfaces()).flat().filter(i=>i.family==='IPv4'&&!i.internal).map(i=>i.address);
const P=[null,null];
const enc=s=>{const b=Buffer.from(s),n=b.length;let h;
  if(n<126)h=Buffer.from([0x81,n]);else if(n<65536)h=Buffer.from([0x81,126,n>>8,n&255]);
  else{h=Buffer.alloc(10);h[0]=0x81;h[1]=127;h.writeBigUInt64BE(BigInt(n),2)}return Buffer.concat([h,b])};
function dec(s){const out=[];let b=s.buf;
  while(b.length>=2){let n=b[1]&127,o=2;
    if(n===126){if(b.length<4)break;n=b.readUInt16BE(2);o=4}else if(n===127){if(b.length<10)break;n=Number(b.readBigUInt64BE(2));o=10}
    const m=!!(b[1]&128);if(b.length<o+(m?4:0)+n)break;
    const k=b.slice(o,o+4);o+=m?4:0;const d=Buffer.from(b.slice(o,o+n));if(m)for(let i=0;i<n;i++)d[i]^=k[i&3];
    const op=b[0]&15;b=b.slice(o+n);if(op===8)s.end();else if(op===1)out.push(d.toString())}
  s.buf=b;return out}
const send=(s,o)=>{if(s&&s.writable)s.write(enc(JSON.stringify(o)))};
srv.on('upgrade',(q,s)=>{
  s.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+
    crypto.createHash('sha1').update(q.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')+'\r\n\r\n');
  const i=P.findIndex(x=>!x);if(i<0){send(s,{t:'full'});return s.end()}
  P[i]=s;s.buf=Buffer.alloc(0);s.setNoDelay(true);s.on('error',()=>{});
  send(s,{t:'hi',slot:i,ips:ips(),port:PORT,peer:!!P[1-i]});send(P[1-i],{t:'peer'});
  s.on('data',d=>{s.buf=Buffer.concat([s.buf,d]);for(const m of dec(s)){const o=P[1-i];if(o&&o.writable)o.write(enc(m))}});
  s.on('close',()=>{if(P[i]===s){P[i]=null;send(P[1-i],{t:'bye'})}})});
srv.listen(PORT,'0.0.0.0',()=>{console.log('🪐 Servidor no ar! Abra nos dois aparelhos:');ips().forEach(a=>console.log('   http://'+a+':'+PORT))});
