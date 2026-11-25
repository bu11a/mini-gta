{
const $=s=>document.querySelector(s);
const cv=$('#game'),ctx=cv.getContext('2d');
let W=0,H=0,DPR=1;
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR)}
addEventListener('resize',resize);resize();
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const wrapA=a=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const R=Math.random;
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const rnd=mulberry(777);

/* ---------- город ---------- */
const T=64,N=58,WS=T*N;
const B=0,ROAD=1,ALLEY=2,GRASS=3,FENCE=4,RUBBLE=5,TREE=6,LOT=7;
const tiles=new Uint8Array(N*N),cover=new Uint8Array(N*N),flow=new Int16Array(N*N),fq=new Int32Array(N*N);
const tAt=(x,y)=>(x<0||y<0||x>=N||y>=N)?B:tiles[y*N+x];
const solid=t=>t===B||t===TREE||t===FENCE;
const covAt=(x,y)=>{const tx=Math.floor(x/T),ty=Math.floor(y/T);return tx>=0&&ty>=0&&tx<N&&ty<N&&cover[ty*N+tx]===1};
const district=(tx,ty)=>tx<29?(ty<29?0:2):(ty<29?1:3);
const DNAME=['Центр','Холмы','Доки','Промзона'];
const PAL=[['#5b6378','#6b5f73','#4f6a73','#7a6a5a','#5d6b5e'],['#7d6d58','#6e7a5c','#8a7262'],['#56606c','#4d5763','#5f5a66'],['#5e5a52','#4f5560','#6b6256']];
const CONT=['#b4492f','#2f6fb4','#c9932b','#3b8a5a','#8b3f8f'];
const buildings=[],treesL=[],ZONES=[],lamps=[];
function setT(x,y,t){if(x>=0&&y>=0&&x<N&&y<N)tiles[y*N+x]=t}
function addB(x,y,w,h,c,cont){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)setT(i,j,B);const det=[];if(!cont){const n=1+Math.floor(rnd()*3);for(let k=0;k<n;k++)det.push([rnd()*(w*T-44)+14,rnd()*(h*T-44)+14,10+rnd()*14,8+rnd()*12])}buildings.push({x:x*T,y:y*T,w:w*T,h:h*T,c,det,cont})}
function gen(){
  for(let y=0;y<N;y++)for(let x=0;x<N;x++)tiles[y*N+x]=(x%8<2||y%8<2)?ROAD:B;
  const service={'2,1':'paint','5,5':'paint','1,5':'paint','4,2':'repair','1,3':'repair','6,1':'repair','3,6':'repair'};
  for(let by=0;by<7;by++)for(let bx=0;bx<7;bx++){
    const ox=bx*8+2,oy=by*8+2,d=district(ox+3,oy+3),pal=PAL[d],pc=()=>pal[Math.floor(rnd()*pal.length)];
    const fill=t=>{for(let j=0;j<6;j++)for(let i=0;i<6;i++)setT(ox+i,oy+j,t)};
    const sv=service[bx+','+by];
    if(sv){fill(LOT);addB(ox,oy,2,2,'#3d4250');ZONES.push({type:sv,x:(ox+3.5)*T,y:(oy+3.5)*T});continue}
    const bld=()=>{const s=rnd();if(s<.33)addB(ox,oy,6,6,pc());else if(s<.66){addB(ox,oy,6,3,pc());addB(ox,oy+3,6,3,pc())}else{addB(ox,oy,3,3,pc());addB(ox+3,oy,3,3,pc());addB(ox,oy+3,3,3,pc());addB(ox+3,oy+3,3,3,pc())}};
    const alley=()=>{if(rnd()<.5){const a=2+Math.floor(rnd()*2);addB(ox,oy,6,a,pc());addB(ox,oy+a+1,6,5-a,pc());for(let i=0;i<6;i++)setT(ox+i,oy+a,ALLEY)}else{const a=2+Math.floor(rnd()*2);addB(ox,oy,a,6,pc());addB(ox+a+1,oy,5-a,6,pc());for(let j=0;j<6;j++)setT(ox+a,oy+j,ALLEY)}};
    const park=()=>{fill(GRASS);const n=4+Math.floor(rnd()*4);for(let k=0;k<n;k++){const i=Math.floor(rnd()*6),j=Math.floor(rnd()*6);setT(ox+i,oy+j,TREE);treesL.push([(ox+i+.5)*T,(oy+j+.5)*T])}};
    const fenced=()=>{fill(LOT);for(let j=0;j<6;j++)for(let i=0;i<6;i++)if(i===0||j===0||i===5||j===5)setT(ox+i,oy+j,FENCE);const s=Math.floor(rnd()*4);if(s===0){setT(ox+2,oy,LOT);setT(ox+3,oy,LOT)}else if(s===1){setT(ox+2,oy+5,LOT);setT(ox+3,oy+5,LOT)}else if(s===2){setT(ox,oy+2,LOT);setT(ox,oy+3,LOT)}else{setT(ox+5,oy+2,LOT);setT(ox+5,oy+3,LOT)}if(rnd()<.5)addB(ox+2,oy+2,2,2,pc())};
    const yard=()=>{fill(LOT);for(const j of[1,4]){addB(ox+1,oy+j,2,1,CONT[Math.floor(rnd()*5)],1);addB(ox+3,oy+j,2,1,CONT[Math.floor(rnd()*5)],1)}};
    const r=rnd();
    if(d===1){if(r<.45)park();else if(r<.62)fenced();else bld()}
    else if(d===2){if(r<.4)yard();else if(r<.6)fenced();else bld()}
    else if(d===3){if(r<.3)fenced();else if(r<.55)alley();else bld()}
    else{if(r<.4)alley();else if(r<.5)park();else bld()}
  }
  for(let i=0;i<10;i++){const a=Math.floor(rnd()*8),b=Math.floor(rnd()*7);
    if(rnd()<.5){const y0=a*8;for(let x=b*8+2;x<b*8+8;x++){cover[y0*N+x]=1;cover[(y0+1)*N+x]=1}}
    else{const x0=a*8;for(let y=b*8+2;y<b*8+8;y++){cover[y*N+x0]=1;cover[y*N+x0+1]=1}}}
  for(let iy=0;iy<8;iy++)for(let ix=0;ix<8;ix++){const X=ix*8*T,Y=iy*8*T;if(X>0&&Y>0)lamps.push([X-8,Y-8]);if(X+2*T+8<WS&&Y+2*T+8<WS)lamps.push([X+2*T+8,Y+2*T+8])}
}
gen();

/* ---------- сохранение ---------- */
let save=Store.get();
function persist(){Store.set(save)}
Store.onChange(s=>{save=s;if(state==='menu')renderMenu()});

const MISSIONS=[
 {id:'prologue',name:'Первый побег',act:'Пролог · Доки',desc:'Тебя только что подставили. Уйди от патрулей за 90 секунд.',start:2,heat:1,maxHeat:2,rb:false,time:90,goal:'escape',reward:300},
 {id:'courier',name:'Курьер',act:'Акт I · Центр',desc:'Отвези флешку Сычу через три точки по городу, а потом оторвись от хвоста.',start:0,heat:1,maxHeat:3,rb:true,time:210,goal:'cp',cps:3,reward:700},
 {id:'trap',name:'Ловушка в порту',act:'Акт I · Доки',desc:'Порт оцеплен, с первой секунды три звезды. Прорвись через блокпосты и скройся.',start:2,heat:3,maxHeat:4,rb:true,time:150,goal:'escape',reward:1200},
 {id:'rys',name:'Дуэль с Рысью',act:'Акт II · Промзона',desc:'Капитан Рысь не отстаёт. Заманивай её в стены и тарань, пока её машина не сломается.',start:3,heat:2,maxHeat:3,rb:false,time:180,goal:'boss',reward:1600},
 {id:'final',name:'Последняя запись',act:'Акт III · Весь город',desc:'Пять звёзд, вертолёт и спецназ. Довези запись журналистам на другой конец города.',start:0,heat:5,maxHeat:5,rb:true,time:200,goal:'deliver',reward:3000},
 {id:'endless',name:'Бесконечная погоня',act:'Эпилог · Свободный режим',desc:'Держись как можно дольше. Розыск растёт, очки капают за каждую секунду и каждую звезду.',start:-1,heat:1,maxHeat:5,rb:true,time:0,goal:'survive',reward:0}];
const UPG=[
 {k:'engine',n:'Двигатель',d:'+6% к скорости и +8% к разгону за уровень',p:[600,1400,2800]},
 {k:'armor',n:'Броня',d:'+30 к прочности машины за уровень',p:[500,1200,2400]},
 {k:'nitro',n:'Нитро',d:'+30% к запасу и скорости зарядки',p:[400,1000,2000]},
 {k:'tires',n:'Шины',d:'Защита от шипов и +5% сцепления',p:[450,1100,2200]}];
const TYPES={
 patrol:{maxSp:500,acc:470,turn:2.6,grip:7,mass:1.1,hp:80,len:42,wid:22,color:'#eef0f4',liv:'police'},
 suv:{maxSp:470,acc:430,turn:2.3,grip:7.5,mass:1.8,hp:120,len:46,wid:25,color:'#eef0f4',liv:'police'},
 inter:{maxSp:620,acc:600,turn:2.0,grip:6.5,mass:1.2,hp:90,len:44,wid:21,color:'#1f2533',liv:'inter'},
 swat:{maxSp:455,acc:420,turn:2.0,grip:8,mass:3,hp:240,len:52,wid:27,color:'#2c3546',liv:'swat'},
 rys:{maxSp:600,acc:620,turn:2.7,grip:8,mass:1.6,hp:170,len:44,wid:22,color:'#e2681c',liv:'rys'}};
const COUNT=[0,2,3,4,6,8];
const STARMSG=['','','Подключаем внедорожники, всем постам.','Ставим блокпосты и шипы на дорогах.','Вертолёт и перехватчики подняты.','Спецназ выехал. Брать любой ценой.'];
const PAINTS=['#f2d541','#3fd0c9','#ececec'];
const CIVC=['#8fa3b8','#b98a6a','#6f8f6a','#9a6f9e','#c7c2b4','#5d7fa8','#a8554f','#d0a85a'];
const civP={maxSp:300,acc:300,brake:800,turn:2.4,grip:7};

let state='menu',G=null,cid=0;
const unlocked=i=>i===0||(MISSIONS[i].id==='endless'?!!save.done.prologue:!!save.done[MISSIONS[i-1].id]);
const stars=()=>G&&G.ch.active?Math.min(5,Math.floor(G.ch.heat)):0;

/* ---------- машины ---------- */
function mkCar(o){const c=Object.assign({vx:0,vy:0,a:0,steer:0,stun:0,spin:0,spinDir:1,oilT:0,pop:0,popF:1,fwd:0,lat:0,slowT:0,stuckT:0,stuckDir:1,nmCd:0,wreck:false,parked:false,len:42,wid:22,mass:1,hp:100,maxHp:100},o);c.r=(c.len+c.wid)/4+1;return c}
function mkCop(type,x,y){const t=TYPES[type],s=Math.max(1,stars());return mkCar({x,y,cop:true,type,id:cid++,len:t.len,wid:t.wid,mass:t.mass,hp:t.hp,maxHp:t.hp,color:t.color,liv:t.liv,p:{maxSp:t.maxSp*(1+.02*s),acc:t.acc,brake:900,turn:t.turn,grip:t.grip}})}
function pickType(s){const r=R();if(s>=5&&r<.25)return'swat';if(s>=4&&r<.55)return'inter';if(s>=2&&r<.8)return R()<.5?'suv':'patrol';return'patrol'}

function drive(c,inp,p,dt){
  let maxSp=p.maxSp,acc=p.acc,grip=p.grip,th=inp.th,st=inp.st,hand=inp.hand;
  if(c.stun>0){th=0;st=0;hand=true}
  if(inp.nitro){maxSp*=1.35;acc*=1.8}
  if(c.pop>0){maxSp*=c.popF;grip*=.6}
  if(c.spin>0){c.a+=c.spinDir*4.5*dt;grip*=.12;th=0}
  const fx=Math.cos(c.a),fy=Math.sin(c.a);
  let fwd=c.vx*fx+c.vy*fy,lat=-c.vx*fy+c.vy*fx;
  if(th>0){if(fwd<maxSp)fwd+=acc*th*dt}
  else if(th<0){if(fwd>20)fwd-=p.brake*dt;else if(fwd>-maxSp*.35)fwd-=acc*.6*dt}
  else fwd*=1-.6*dt;
  if(fwd>maxSp)fwd-=(fwd-maxSp)*2*dt;
  lat*=Math.max(0,1-(hand?grip*.18:grip)*dt);
  if(hand)fwd*=1-.9*dt;
  const t=tAt(Math.floor(c.x/T),Math.floor(c.y/T));
  if(t===GRASS||t===RUBBLE){fwd*=1-1.1*dt;lat*=1-dt}
  const sf=Math.min(1,Math.abs(fwd)/(p.ramp||160))*(fwd<0?-1:1);
  const turn=p.turn*(hand?1.35:1)*(1-Math.min(p.lossMax||.45,Math.abs(fwd)/maxSp*(p.loss||.35)));
  c.a+=st*turn*sf*dt;
  const nx=Math.cos(c.a),ny=Math.sin(c.a);
  c.vx=nx*fwd-ny*lat;c.vy=ny*fwd+nx*lat;
  c.x+=c.vx*dt;c.y+=c.vy*dt;c.fwd=fwd;c.lat=lat;
}
function collideTiles(c){
  let hit=0;const fx=Math.cos(c.a),fy=Math.sin(c.a),off=c.len*.27,rr=c.wid*.55;
  for(let s=-1;s<=1;s+=2){
    const ox=fx*off*s,oy=fy*off*s;
    const bx=c.x+ox,by=c.y+oy;
    const tx0=Math.floor((bx-rr)/T),tx1=Math.floor((bx+rr)/T),ty0=Math.floor((by-rr)/T),ty1=Math.floor((by+rr)/T);
    for(let ty=ty0;ty<=ty1;ty++)for(let tx=tx0;tx<=tx1;tx++){
      const t=tAt(tx,ty);if(!solid(t))continue;
      const px=c.x+ox,py=c.y+oy;
      const qx=clamp(px,tx*T,tx*T+T),qy=clamp(py,ty*T,ty*T+T);
      let dx=px-qx,dy=py-qy,d=Math.hypot(dx,dy),nx,ny,pen;
      if(d>=rr)continue;
      if(d<1e-3){const l=px-tx*T,r=tx*T+T-px,u=py-ty*T,w=ty*T+T-py,m=Math.min(l,r,u,w);
        if(m===l){nx=-1;ny=0}else if(m===r){nx=1;ny=0}else if(m===u){nx=0;ny=-1}else{nx=0;ny=1}pen=rr+m}
      else{nx=dx/d;ny=dy/d;pen=rr-d}
      const vn=c.vx*nx+c.vy*ny;
      if(t===FENCE&&-vn>(c.player?130:170)){setT(tx,ty,RUBBLE);mmTile(tx,ty);debris((tx+.5)*T,(ty+.5)*T);c.vx*=.85;c.vy*=.85;if(c.player&&G.ch.active)G.ch.heat=Math.min(G.m.maxHeat+.999,G.ch.heat+.05);continue}
      c.x+=nx*pen;c.y+=ny*pen;
      if(vn<0){c.vx-=vn*nx*1.3;c.vy-=vn*ny*1.3;hit=Math.max(hit,-vn)}
    }
  }
  return hit;
}
function collideCars(a,b){
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),rr=a.r+b.r;
  if(d>=rr||d<.01)return 0;
  const nx=dx/d,ny=dy/d,pen=rr-d,im=1/a.mass,jm=1/b.mass,s=im+jm;
  a.x-=nx*pen*im/s;a.y-=ny*pen*im/s;b.x+=nx*pen*jm/s;b.y+=ny*pen*jm/s;
  const rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
  if(rv>0)return 0;
  const j=-1.3*rv/s;
  a.vx-=j*im*nx;a.vy-=j*im*ny;b.vx+=j*jm*nx;b.vy+=j*jm*ny;
  return -rv;
}

/* ---------- поиск пути ---------- */
function buildFlow(tx,ty){
  flow.fill(-1);tx=clamp(tx,0,N-1);ty=clamp(ty,0,N-1);
  let h=0,t=0;const s=ty*N+tx;flow[s]=0;fq[t++]=s;
  while(h<t){const i=fq[h++],x=i%N,y=(i/N)|0,v=flow[i]+1;
    if(x>0){const j=i-1;if(flow[j]<0&&!solid(tiles[j])){flow[j]=v;fq[t++]=j}}
    if(x<N-1){const j=i+1;if(flow[j]<0&&!solid(tiles[j])){flow[j]=v;fq[t++]=j}}
    if(y>0){const j=i-N;if(flow[j]<0&&!solid(tiles[j])){flow[j]=v;fq[t++]=j}}
    if(y<N-1){const j=i+N;if(flow[j]<0&&!solid(tiles[j])){flow[j]=v;fq[t++]=j}}}
}
function nextStep(x,y){
  if(x<0||y<0||x>=N||y>=N)return null;
  let best=flow[y*N+x],bx=x,by=y;if(best<0)return null;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N)continue;
    const v=flow[ny*N+nx];if(v<0)continue;if(dx&&dy&&(flow[y*N+nx]<0||flow[ny*N+x]<0))continue;if(v<best){best=v;bx=nx;by=ny}}
  return[bx,by];
}
function los(x0,y0,x1,y1){const d=Math.hypot(x1-x0,y1-y0),n=Math.ceil(d/24);for(let i=1;i<n;i++){const t=tAt(Math.floor((x0+(x1-x0)*i/n)/T),Math.floor((y0+(y1-y0)*i/n)/T));if(t===B||t===TREE)return false}return true}

/* ---------- ИИ ---------- */
function copAI(c,dt){
  const g=G,P=g.P,ch=g.ch;
  if(c.wreck||c.parked)return{th:0,st:0,hand:true};
  let gx,gy;
  if(c.boss||c.sees){const d=dist(c,P),lead=Math.min(.6,d/700);gx=P.x+P.vx*lead;gy=P.y+P.vy*lead}
  else{const tx=Math.floor(c.x/T),ty=Math.floor(c.y/T),s1=nextStep(tx,ty);
    if(s1&&flow[ty*N+tx]>1){const s2=nextStep(s1[0],s1[1])||s1;gx=(s2[0]+.5)*T;gy=(s2[1]+.5)*T}
    else{gx=ch.lx;gy=ch.ly}
    if(Math.hypot(ch.lx-c.x,ch.ly-c.y)<130&&!ch.seen){gx=ch.lx+Math.cos(g.t*.8+c.id)*190;gy=ch.ly+Math.sin(g.t*.8+c.id)*190}}
  if(c.stuckT>0){c.stuckT-=dt;return{th:-1,st:-c.stuckDir,hand:false}}
  const da=wrapA(Math.atan2(gy-c.y,gx-c.x)-c.a);
  let th=ch.active?1:.45;if(Math.abs(da)>1.3&&c.fwd>200)th=-.6;
  const pd=dist(c,P),ps=Math.hypot(P.vx,P.vy);
  if(!c.boss&&ps<90&&pd<170){th=pd<c.r+P.r+18?(c.fwd>40?-1:0):(c.fwd>120?-1:.35)}
  if(Math.hypot(c.vx,c.vy)<35&&c.stun<=0)c.slowT+=dt;else c.slowT=0;
  if(c.slowT>1.1){c.slowT=0;c.stuckT=.85;c.stuckDir=Math.sign(da)||1}
  return{th,st:clamp(da*2.2,-1,1),hand:Math.abs(da)>1.1&&c.fwd>260};
}
const DX=[1,0,-1,0],DY=[0,1,0,-1];
function civAI(c,dt){
  if(c.crash){drive(c,{th:0,st:0,hand:true},civP,dt);collideTiles(c);return}
  const gx=(c.tx+.5)*T,gy=(c.ty+.5)*T,dx=gx-c.x,dy=gy-c.y,d=Math.hypot(dx,dy);
  if(d<9){
    const x=c.tx,y=c.ty,dir=c.dir,inter=x%8<2&&y%8<2,isR=(a,b)=>tAt(a,b)===ROAD;let turn=-1;
    if(inter){if(dir===0||dir===2){const nd=x%8===0?1:3;if(isR(x+DX[nd],y+DY[nd]))turn=nd}else{const nd=y%8===1?0:2;if(isR(x+DX[nd],y+DY[nd]))turn=nd}}
    const straight=isR(x+DX[dir],y+DY[dir]);let nd=dir;
    if(turn>=0&&(R()<.3||!straight))nd=turn;else if(!straight){c.dead=true;return}
    c.dir=nd;c.tx=x+DX[nd];c.ty=y+DY[nd];return;
  }
  c.a+=wrapA(Math.atan2(dy,dx)-c.a)*Math.min(1,dt*8);
  const fx=Math.cos(c.a),fy=Math.sin(c.a);let want=c.cruise;
  if(c.wait<4){const chk=o=>{const ox=o.x-c.x,oy=o.y-c.y,f=ox*fx+oy*fy;if(f>0&&f<78&&Math.abs(-ox*fy+oy*fx)<24)want=0};
    chk(G.P);for(const o of G.civs)if(o!==c)chk(o);for(const o of G.cops)chk(o)}
  c.wait=c.spd<5?c.wait+dt:0;
  c.spd+=clamp(want-c.spd,-520*dt,180*dt);
  c.vx=fx*c.spd;c.vy=fy*c.spd;c.x+=c.vx*dt;c.y+=c.vy*dt;
}

/* ---------- спавн ---------- */
function viewHalf(){const z=G?G.cam.z:1;return[W/2/z+60,H/2/z+60]}
function offView(x,y){const[hw,hh]=viewHalf();return Math.abs(x-G.cam.x)>hw||Math.abs(y-G.cam.y)>hh}
function spawnCop(type,minD,maxD){
  const P=G.P;
  for(let i=0;i<50;i++){const a=R()*Math.PI*2,d=minD+R()*(maxD-minD),tx=Math.floor((P.x+Math.cos(a)*d)/T),ty=Math.floor((P.y+Math.sin(a)*d)/T);
    if(tAt(tx,ty)!==ROAD||flow[ty*N+tx]<0)continue;
    const x=(tx+.5)*T,y=(ty+.5)*T;if(i<35&&!offView(x,y))continue;
    const c=mkCop(type,x,y);c.a=Math.atan2(P.y-y,P.x-x);G.cops.push(c);return c}
  return null;
}
function spawnCiv(init){
  const P=G.P;
  for(let i=0;i<30;i++){const a=R()*Math.PI*2,d=(init?260:700)+R()*(init?900:500),tx=Math.floor((P.x+Math.cos(a)*d)/T),ty=Math.floor((P.y+Math.sin(a)*d)/T);
    if(tAt(tx,ty)!==ROAD)continue;let dir;
    if(ty%8<2&&tx%8>=2)dir=ty%8===1?0:2;else if(tx%8<2&&ty%8>=2)dir=tx%8===0?1:3;else continue;
    const x=(tx+.5)*T,y=(ty+.5)*T;if(!init&&!offView(x,y))continue;
    if(G.civs.some(o=>Math.hypot(o.x-x,o.y-y)<140))continue;
    const sp=150+R()*80;
    G.civs.push(mkCar({x,y,a:dir*Math.PI/2,dir,tx:tx+DX[dir],ty:ty+DY[dir],cruise:sp,spd:sp,wait:0,civ:true,len:40,wid:20,color:CIVC[Math.floor(R()*CIVC.length)]}));return}
}
function roadIn(x0,x1,y0,y1){for(let i=0;i<300;i++){const tx=x0+Math.floor(R()*(x1-x0)),ty=y0+Math.floor(R()*(y1-y0));if(tAt(tx,ty)===ROAD&&ty%8===1&&tx%8>=3&&tx%8<=6)return{x:(tx+.5)*T,y:(ty+.5)*T}}return{x:(10.5)*T,y:(9.5)*T}}
function startPoint(q){if(q<0)q=Math.floor(R()*4);const xs=q===0||q===2?[2,27]:[30,56],ys=q<2?[2,27]:[30,56];return roadIn(xs[0],xs[1],ys[0],ys[1])}
function farRoad(from,mn,mx){let best=null,bd=0;for(let i=0;i<500;i++){const tx=Math.floor(R()*N),ty=Math.floor(R()*N);if(tAt(tx,ty)!==ROAD)continue;const p={x:(tx+.5)*T,y:(ty+.5)*T},d=dist(p,from);if(d>=mn&&d<=mx)return p;if(d>bd&&d<=mx){bd=d;best=p}}return best||{x:(50.5)*T,y:(49.5)*T}}

/* ---------- забег ---------- */
function newRun(m){
  const u=save.up;
  const g={m,t:0,timeLeft:m.time,cops:[],civs:[],parts:[],skids:[],oils:[],spikes:[],rbs:[],heli:null,cp:[],cpi:0,target:null,over:false,score:0,wrecked:0,maxStars:0,paints:0,repairCd:0,paintCd:0,coolT:0,endRe:0,reHeat:1,rys:null,flowT:0,spawnT:0,civT:0,detT:0,rbT:5,skT:0,shake:0,arrest:0,nitro:.5,starUp:0,lastStars:0,
    nmax:1+.3*u.nitro,nreg:1+.3*u.nitro,popRes:[0,.5,.75,1][u.tires],
    pp:{maxSp:540*(1+.06*u.engine),acc:560*(1+.08*u.engine),brake:950,turn:4.1,ramp:90,loss:.18,lossMax:.22,grip:7.9*(1+.05*u.tires)},
    ab:{jam:{cd:0,max:25},emp:{cd:0,max:20},oil:{cd:0,max:12}},
    ch:{active:false,heat:0,seen:false,lose:0,lx:0,ly:0,jam:0},cam:{x:0,y:0,z:1}};
  G=g;
  const st=startPoint(m.start),hp=100+30*u.armor;
  g.P=mkCar({x:st.x,y:st.y,a:0,color:PAINTS[0],hp,maxHp:hp,mass:1.2,len:42,wid:22,player:true});
  g.cam.x=st.x;g.cam.y=st.y;g.cam.z=clamp(Math.min(W,H)/760,.55,1.15);
  if(m.goal==='cp'){let prev=g.P;for(let i=0;i<m.cps;i++){const p=farRoad(prev,1000,1900);g.cp.push(p);prev=p}}
  if(m.goal==='deliver')g.target=farRoad(g.P,3000,5200);
  for(let i=0;i<12;i++)spawnCiv(true);
  startChase(m.heat);
  if(m.goal==='boss'){g.rys=spawnCop('rys',480,700);if(g.rys){g.rys.boss=true;radio('Это капитан Рысь. Тебе не уйти, Ветров.','Рысь')}}
  radio(m.goal==='escape'?'Внимание всем постам: угнанная машина, жёлтый кузов.':'Сыч: следи за стрелкой, я веду тебя.','Диспетчер');
}
function startChase(h){
  const g=G,ch=g.ch,P=g.P;
  ch.active=true;ch.heat=Math.min(g.m.maxHeat+.999,Math.max(1,h)+.01);ch.lose=0;ch.lx=P.x;ch.ly=P.y;ch.seen=true;g.lastStars=stars();
  buildFlow(Math.floor(P.x/T),Math.floor(P.y/T));
  const alive=g.cops.filter(c=>!c.wreck&&!c.parked&&!c.boss).length;
  for(let i=alive;i<Math.min(COUNT[stars()],3);i++)spawnCop(pickType(stars()),420,720);
}
function escaped(){
  const g=G,ch=g.ch,s=stars();
  ch.active=false;ch.heat=0;ch.lose=0;g.coolT=4;if(g.heli)g.heli.leave=true;
  radio('Объект потерян. Отбой, возвращайтесь на маршруты.');
  if(g.m.goal==='escape')return finish(true,'Ушёл!','Погоня потеряла след. Громов в ярости.');
  if(g.m.goal==='cp'&&g.cpi>=g.cp.length)return finish(true,'Флешка у Сыча','Все точки пройдены, хвост сброшен.');
  if(g.m.goal==='survive'){g.score+=150*s;g.endRe=6;g.reHeat=Math.max(1,s-1.5);radio('Чисто… но ненадолго.','Сыч')}
}
function wreckCop(c){
  c.wreck=true;c.wt=0;G.wrecked++;puff(c.x,c.y,14,'#555',140,1.4,14,0);
  if(c.boss)return finish(true,'Рысь выбыла','Машина капитана разбита. Дорога к Громову открыта.');
  if(G.ch.active)G.ch.heat=Math.min(G.m.maxHeat+.999,G.ch.heat+.2);
  G.score+=50;radio('Экипаж выведен из строя!');
}
function damage(c,v){
  if(v<=0||c.wreck)return;c.hp-=v;
  if(c.player){G.shake=Math.min(14,G.shake+v*.8);if(c.hp<=0){c.hp=0;finish(false,'Машина разбита','Корпус не выдержал. Лиза будет недовольна.')}}
  else if(c.cop&&c.hp<=0)wreckCop(c);
}
function onPlayerHit(c,imp){
  const P=G.P;
  if(imp>90){damage(P,(imp-90)*.04*Math.min(1.6,c.mass/P.mass));if(c.cop)damage(c,(imp-90)*.085*(P.mass/c.mass));sparks((P.x+c.x)/2,(P.y+c.y)/2,10);crash(imp)}
  if(c.cop){if(G.ch.active)G.ch.heat=Math.min(G.m.maxHeat+.999,G.ch.heat+Math.min(.2,imp/1800));else if(G.coolT<=0&&imp>50){startChase(1);radio('Нападение на патруль! Всем постам!')}}
}
function placeRoadblock(){
  const g=G,P=g.P,sp=Math.hypot(P.vx,P.vy);if(sp<160)return;
  const dx=P.vx/sp,dy=P.vy/sp;
  for(let k=0;k<7;k++){
    const d=620+k*70,tx=Math.floor((P.x+dx*d)/T),ty=Math.floor((P.y+dy*d)/T);
    if(tAt(tx,ty)!==ROAD||cover[ty*N+tx])continue;
    const hor=ty%8<2&&tx%8>=2,ver=tx%8<2&&ty%8>=2;if(!hor&&!ver)continue;
    const lane=R()<.5?0:1;let cop,sp2;
    if(hor){const y0=ty-ty%8,cx=(tx+.5)*T;cop=mkCop(R()<.5?'suv':'patrol',cx,(y0+lane+.5)*T);cop.a=Math.PI/2;sp2={x:cx,y:(y0+(1-lane)+.5)*T,hw:9,hh:29}}
    else{const x0=tx-tx%8,cy=(ty+.5)*T;cop=mkCop(R()<.5?'suv':'patrol',(x0+lane+.5)*T,cy);cop.a=0;sp2={x:(x0+(1-lane)+.5)*T,y:cy,hw:29,hh:9}}
    cop.parked=true;cop.mass=2.2;g.cops.push(cop);g.spikes.push(sp2);g.rbs.push({cop,sp:sp2,age:0});
    radio('Блокпост впереди! Шипы на полосе.');return;
  }
}
function useAb(k){
  if(state!=='play'||!G)return;const g=G,a=g.ab[k],P=g.P;if(a.cd>0)return;a.cd=a.max;
  if(k==='jam'){g.ch.jam=8;radio('Глушу их рацию на 8 секунд. Вертолёт ослеп.','Сыч')}
  if(k==='emp'){let n=0;for(const c of g.cops)if(!c.wreck&&dist(c,P)<240){c.stun=3;n++}g.parts.push({x:P.x,y:P.y,vx:0,vy:0,life:.5,max:.5,size:240,col:'#7fd3ff',type:2});radio(n?'ЭМИ: заглушено машин — '+n+'.':'ЭМИ ушёл впустую.','Сыч')}
  if(k==='oil'){g.oils.push({x:P.x-Math.cos(P.a)*34,y:P.y-Math.sin(P.a)*34,t:18})}
}

/* ---------- частицы ---------- */
function puff(x,y,n,col,spd,life,size,type){const p=G.parts;for(let i=0;i<n&&p.length<500;i++)p.push({x,y,vx:(R()-.5)*spd,vy:(R()-.5)*spd,life:life*(.6+R()*.4),max:life,size,col,type})}
function sparks(x,y,n){puff(x,y,n,'#ffd27a',420,.35,3,1)}
function debris(x,y){if(G)puff(x,y,10,'#8a8f99',260,.7,5,0)}

/* ---------- обновление ---------- */
const K={};
function update(dt){
  const g=G,P=g.P,ch=g.ch;g.t+=dt;
  if(g.m.time){g.timeLeft-=dt;if(g.timeLeft<=0){g.timeLeft=0;return finish(false,'Время вышло','Задание не выполнено вовремя.')}}
  for(const k in g.ab)g.ab[k].cd=Math.max(0,g.ab[k].cd-dt);
  ch.jam=Math.max(0,ch.jam-dt);g.coolT-=dt;g.repairCd-=dt;g.paintCd-=dt;g.starUp-=dt;
  const sIn=(K.right?1:0)-(K.left?1:0);P.steer+=clamp(sIn-P.steer,-dt*14,dt*14);
  const th=(K.up?1:0)-(K.down?1:0),useN=K.nitro&&g.nitro>.01&&th>0;
  if(useN){g.nitro=Math.max(0,g.nitro-dt*.3);if(R()<.5)g.parts.push({x:P.x-Math.cos(P.a)*24,y:P.y-Math.sin(P.a)*24,vx:-Math.cos(P.a)*200+(R()-.5)*60,vy:-Math.sin(P.a)*200+(R()-.5)*60,life:.18,max:.18,size:6,col:R()<.5?'#7fd3ff':'#ffb347',type:1})}
  P.nitroOn=useN;
  drive(P,{th,st:P.steer,hand:!!K.hand,nitro:useN},g.pp,dt);
  if(P.pop>0)P.pop-=dt;
  const hit=collideTiles(P);if(hit>140){damage(P,(hit-140)*.035);sparks(P.x+Math.cos(P.a)*20,P.y+Math.sin(P.a)*20,8);crash(hit)}
  if(g.over)return;
  const sp=Math.hypot(P.vx,P.vy);
  if(Math.abs(P.lat)>110&&sp>200)g.nitro=Math.min(g.nmax,g.nitro+dt*.22*g.nreg);
  g.nitro=Math.min(g.nmax,g.nitro+dt*.012*g.nreg);
  g.skT-=dt;
  if(g.skT<=0){g.skT=1/30;const drift=Math.abs(P.lat)>120||(K.hand&&sp>160)||(K.down&&P.fwd>260);
    const rx=P.x-Math.cos(P.a)*P.len*.3,ry=P.y-Math.sin(P.a)*P.len*.3,nx=-Math.sin(P.a)*P.wid*.4,ny=Math.cos(P.a)*P.wid*.4,w=[[rx+nx,ry+ny],[rx-nx,ry-ny]];
    if(drift&&P.pw){g.skids.push([P.pw[0][0],P.pw[0][1],w[0][0],w[0][1]],[P.pw[1][0],P.pw[1][1],w[1][0],w[1][1]]);if(g.skids.length>1400)g.skids.splice(0,200);if(R()<.35)puff(rx,ry,1,'#bfc3cc',40,.8,7,0)}
    P.pw=drift?w:null}
  // полиция
  for(const c of g.cops){
    c.stun=Math.max(0,c.stun-dt);c.spin=Math.max(0,c.spin-dt);c.oilT-=dt;c.nmCd-=dt;
    if(c.wreck){c.wt+=dt;if(R()<dt*6)puff(c.x,c.y,1,'#4a4a4a',30,1.6,10,0)}
    drive(c,copAI(c,dt),c.p,dt);
    const h=collideTiles(c);if(h>110&&!c.parked&&!c.wreck)damage(c,(h-110)*.05*(c.boss?1.25:1));
    if(c.stun>0&&R()<dt*8)g.parts.push({x:c.x,y:c.y,vx:(R()-.5)*80,vy:(R()-.5)*80,life:.25,max:.25,size:3,col:'#7fd3ff',type:1});
    if(c.parked&&dist(c,P)<190)c.parked=false;
  }
  if(g.over)return;
  for(const c of g.civs)civAI(c,dt);
  // столкновения
  for(const c of g.cops){const imp=collideCars(P,c);if(imp>40)onPlayerHit(c,imp)}
  for(const c of g.civs){const imp=collideCars(P,c);if(imp>40){c.crash=true;onPlayerHit(c,imp)}}
  const cs=g.cops;
  for(let i=0;i<cs.length;i++){for(let j=i+1;j<cs.length;j++){const imp=collideCars(cs[i],cs[j]);if(imp>150){damage(cs[i],(imp-150)*.03);damage(cs[j],(imp-150)*.03)}}
    for(const v of g.civs){const imp=collideCars(cs[i],v);if(imp>40)v.crash=true}}
  if(g.over)return;
  // почти задел
  if(sp>300)for(const c of g.cops.concat(g.civs)){if(c.nmCd>0||c.wreck)continue;const d=dist(c,P);if(d<c.r+P.r+16&&d>c.r+P.r+1){g.nitro=Math.min(g.nmax,g.nitro+.12);c.nmCd=3}}
  for(const c of g.civs)c.nmCd-=dt;
  // масло и шипы
  for(const o of g.oils){o.t-=dt;for(const c of g.cops)if(c.oilT<=0&&!c.wreck&&Math.hypot(c.x-o.x,c.y-o.y)<38){c.spin=1.3;c.spinDir=R()<.5?-1:1;c.oilT=2}}
  g.oils=g.oils.filter(o=>o.t>0);
  for(const s of g.spikes){if(!s.hit&&Math.abs(P.x-s.x)<s.hw+10&&Math.abs(P.y-s.y)<s.hh+10){s.hit=true;
    if(g.popRes>=1)radio('Шины выдержали шипы!','Лиза');else{P.pop=6*(1-g.popRes);P.popF=.6;radio('Шины пробиты! Скорость упала.','Лиза');sparks(P.x,P.y,14)}}}
  // зоны
  for(const z of ZONES){if(Math.hypot(z.x-P.x,z.y-P.y)>72)continue;
    if(z.type==='repair'&&g.repairCd<=0&&P.hp<P.maxHp){P.hp=Math.min(P.maxHp,P.hp+P.maxHp*.5);g.repairCd=20;if(ch.active)ch.heat=Math.min(g.m.maxHeat+.999,ch.heat+1);radio('Подлатала! Но тебя там заметили.','Лиза')}
    if(z.type==='paint'&&g.paintCd<=0){g.paintCd=3;
      if(!ch.active)radio('Перекраска не нужна — тебя не ищут.','Лиза');
      else if(g.paints>=2)radio('Краска кончилась: две перекраски за заезд.','Лиза');
      else if(save.money<400)radio('Перекраска стоит $400 — денег не хватает.','Лиза');
      else if(g.cops.some(c=>!c.wreck&&dist(c,P)<320))radio('Копы слишком близко, сначала оторвись!','Лиза');
      else{save.money-=400;persist();g.paints++;P.color=PAINTS[g.paints];ch.heat-=1.5;radio('Новый цвет! Минус полторы звезды.','Лиза');if(ch.heat<1)escaped();if(g.over)return}}}
  // цели
  if(g.m.goal==='cp'&&g.cpi<g.cp.length&&dist(P,g.cp[g.cpi])<80){g.cpi++;
    if(g.cpi<g.cp.length)radio('Точка '+g.cpi+' пройдена. Дальше!','Сыч');else radio('Флешка у меня! Теперь сбрось хвост.','Сыч');
    if(!ch.active)startChase(2);else ch.heat=Math.min(g.m.maxHeat+.999,ch.heat+.5)}
  if(g.m.goal==='deliver'&&dist(P,g.target)<90)return finish(true,'Запись доставлена','Журналисты получили доказательства. Громова арестуют утром.');
  if(g.m.goal==='survive'){g.score+=stars()*dt*10+dt;if(!ch.active&&g.endRe>0){g.endRe-=dt;if(g.endRe<=0){startChase(g.reHeat);radio('Подозреваемый снова замечен!')}}}
  // обнаружение
  g.detT-=dt;if(g.detT<=0){g.detT=1/30;detect(1/30);if(g.over)return}
  // поток
  g.flowT-=dt;if(g.flowT<=0){g.flowT=.3;buildFlow(Math.floor(ch.lx/T),Math.floor(ch.ly/T))}
  // вертолёт
  updHeli(dt);
  // спавн
  g.spawnT-=dt;
  if(g.spawnT<=0){g.spawnT=1.1;
    const s=stars();
    if(ch.active){const alive=g.cops.filter(c=>!c.wreck&&!c.parked&&!c.boss).length;if(alive<COUNT[s])spawnCop(pickType(s),650,1000)}
    g.cops=g.cops.filter(c=>{const d=dist(c,P);if(c.boss)return true;if(c.wreck)return d<1100||c.wt<3;if(!ch.active)return d<950;return d<2200});
    g.rbs=g.rbs.filter(r=>{r.age+=1.1;const keep=r.age<45&&dist(r.sp,P)<1500;if(!keep){g.spikes=g.spikes.filter(s=>s!==r.sp);if(r.cop.parked)g.cops=g.cops.filter(c=>c!==r.cop)}return keep})}
  g.civT-=dt;
  if(g.civT<=0){g.civT=.5;g.civs=g.civs.filter(c=>!c.dead&&dist(c,P)<1500);if(g.civs.length<14)spawnCiv(false)}
  if(ch.active&&g.m.rb&&stars()>=3){g.rbT-=dt;if(g.rbT<=0){g.rbT=16-stars()*1.5;placeRoadblock()}}
  // арест
  const near=g.cops.some(c=>!c.wreck&&c.stun<=0&&dist(c,P)<c.r+P.r+26);
  if(near&&sp<70)g.arrest+=dt/2.6;else g.arrest=Math.max(0,g.arrest-dt*.7);
  if(g.arrest>=1)return finish(false,'Арестован','Тебя зажали и вытащили из машины.');
  // частицы
  const pa=g.parts;for(let i=pa.length-1;i>=0;i--){const p=pa[i];p.life-=dt;if(p.life<=0){pa[i]=pa[pa.length-1];pa.pop();continue}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=1-2*dt;p.vy*=1-2*dt}
}
function detect(dt){
  const g=G,P=g.P,ch=g.ch,pc=covAt(P.x,P.y);let seen=false;
  for(const c of g.cops){if(c.wreck){c.sees=false;continue}const d=dist(c,P);c.sees=d<480&&(!pc||d<170)&&los(c.x,c.y,P.x,P.y);if(c.sees)seen=true}
  const h=g.heli;if(h&&!h.leave&&!ch.jam&&!pc&&dist(h,P)<125)seen=true;
  if(!ch.active){if(seen&&g.coolT<=0&&g.m.goal!=='survive'&&g.cops.some(c=>c.sees&&!c.parked)){startChase(1);radio('Подозреваемый замечен! Начинаем преследование.')}return}
  ch.seen=seen;
  if(seen){ch.lose=0;if(!ch.jam){ch.lx=P.x;ch.ly=P.y}}
  else{ch.lose+=dt*(pc?2:1)*(ch.jam?1.4:1);if(g.rys&&!g.rys.wreck)ch.lose=0;if(ch.lose>=5+5*stars())return escaped()}
  ch.heat=Math.min(g.m.maxHeat+.999,ch.heat+dt/32);
  const s=stars();if(s>g.lastStars){if(STARMSG[s])radio(STARMSG[s]);g.starUp=1}g.lastStars=s;g.maxStars=Math.max(g.maxStars,s);
}
function updHeli(dt){
  const g=G,s=stars(),P=g.P;
  if(g.ch.active&&s>=4&&!g.heli){const a=R()*Math.PI*2;g.heli={x:P.x+Math.cos(a)*950,y:P.y+Math.sin(a)*950,vx:0,vy:0,rot:0,leave:false};radio('Вертолёт «Беркут» в воздухе.')}
  const h=g.heli;if(!h)return;
  h.rot+=dt*28;if(!g.ch.active||s<4)h.leave=true;
  let tx,ty;
  if(h.leave){tx=h.x+(h.x-P.x);ty=h.y+(h.y-P.y)}else if(g.ch.seen&&!g.ch.jam){tx=P.x+P.vx*.3;ty=P.y+P.vy*.3}else{tx=g.ch.lx;ty=g.ch.ly}
  const dx=tx-h.x,dy=ty-h.y,d=Math.hypot(dx,dy)||1,spd=Math.min(400,d*2);
  h.vx+=(dx/d*spd-h.vx)*Math.min(1,dt*1.5);h.vy+=(dy/d*spd-h.vy)*Math.min(1,dt*1.5);h.x+=h.vx*dt;h.y+=h.vy*dt;
  if(h.leave&&dist(h,P)>1700)g.heli=null;
}

/* ---------- звук ---------- */
let AC=null,master,engO,engG,sirG,noiseBuf,muted=false,lastCrash=0;
function initAudio(){if(AC)return;try{AC=new(window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=muted?0:.8;master.connect(AC.destination);
  engO=AC.createOscillator();engO.type='sawtooth';const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=520;engG=AC.createGain();engG.gain.value=0;engO.connect(f);f.connect(engG);engG.connect(master);engO.start();
  const so=AC.createOscillator();so.type='triangle';so.frequency.value=930;const lfo=AC.createOscillator();lfo.type='square';lfo.frequency.value=.9;const lg=AC.createGain();lg.gain.value=280;lfo.connect(lg);lg.connect(so.frequency);sirG=AC.createGain();sirG.gain.value=0;so.connect(sirG);sirG.connect(master);so.start();lfo.start();
  noiseBuf=AC.createBuffer(1,Math.floor(AC.sampleRate*.4),AC.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(R()*2-1)*Math.pow(1-i/d.length,2)}catch(e){AC=null}}
function updAudio(){if(!AC||!G)return;const t=AC.currentTime,P=G.P,sp=Math.hypot(P.vx,P.vy),on=state==='play';
  engO.frequency.setTargetAtTime(45+sp*.2+(P.nitroOn?35:0),t,.08);engG.gain.setTargetAtTime(on?.05+Math.min(.05,sp/9000):0,t,.1);
  let near=1e9;for(const c of G.cops)if(!c.wreck)near=Math.min(near,dist(c,P));
  sirG.gain.setTargetAtTime(on&&G.ch.active?.05*clamp(1-near/1100,0,1):0,t,.15)}
function crash(v){if(!AC||AC.currentTime-lastCrash<.08)return;lastCrash=AC.currentTime;const s=AC.createBufferSource();s.buffer=noiseBuf;const g=AC.createGain();g.gain.value=Math.min(.5,v/1200);const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=900;s.connect(f);f.connect(g);g.connect(master);s.start()}
function silence(){if(AC){engG.gain.setTargetAtTime(0,AC.currentTime,.05);sirG.gain.setTargetAtTime(0,AC.currentTime,.05)}}

/* ---------- отрисовка ---------- */
function glow(col,r){const c=document.createElement('canvas');c.width=c.height=r*2;const g=c.getContext('2d'),gr=g.createRadialGradient(r,r,0,r,r,r);gr.addColorStop(0,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,r*2,r*2);return c}
const GL={lamp:glow('rgba(255,180,100,.42)',95),red:glow('rgba(255,40,60,.85)',70),blue:glow('rgba(50,120,255,.85)',70),spot:glow('rgba(230,240,255,.75)',135),acc:glow('rgba(242,213,65,.55)',100),grn:glow('rgba(90,255,150,.5)',100),cyan:glow('rgba(80,200,255,.5)',100),tail:glow('rgba(255,30,40,.5)',22)};
const gd=(img,x,y)=>ctx.drawImage(img,x-img.width/2,y-img.height/2);
function rrect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function drawTile(x,y,t){
  const X=x*T,Y=y*T;
  if(t===ROAD){ctx.fillStyle='#2a2d35';ctx.fillRect(X,Y,T,T);
    const hr=y%8<2,vr=x%8<2;ctx.fillStyle='rgba(235,225,180,.55)';
    if(hr&&!vr&&y%8===0)for(let k=0;k<2;k++)ctx.fillRect(X+8+k*32,Y+T-1.5,18,3);
    if(vr&&!hr&&x%8===0)for(let k=0;k<2;k++)ctx.fillRect(X+T-1.5,Y+8+k*32,3,18);
    ctx.fillStyle='rgba(255,255,255,.28)';
    if(hr&&!vr&&(x%8===2||x%8===7)){const ex=x%8===2?X+4:X+T-18;for(let k=0;k<5;k++)ctx.fillRect(ex,Y+3+k*12.5,14,7)}
    if(vr&&!hr&&(y%8===2||y%8===7)){const ey=y%8===2?Y+4:Y+T-18;for(let k=0;k<5;k++)ctx.fillRect(X+3+k*12.5,ey,7,14)}
    return}
  if(t===ALLEY){ctx.fillStyle='#33353c';ctx.fillRect(X,Y,T,T);return}
  if(t===GRASS||t===TREE){ctx.fillStyle=(x+y)%2?'#2d5535':'#2f5a38';ctx.fillRect(X,Y,T,T);return}
  if(t===LOT||t===FENCE||t===RUBBLE){ctx.fillStyle='#383a41';ctx.fillRect(X,Y,T,T);ctx.fillStyle='rgba(255,255,255,.1)';ctx.fillRect(X+T/2-1,Y+8,2,22);
    if(t===FENCE){ctx.strokeStyle='rgba(170,178,192,.55)';ctx.lineWidth=1.5;ctx.beginPath();for(let k=-T;k<T;k+=12){ctx.moveTo(X+k,Y);ctx.lineTo(X+k+T,Y+T);ctx.moveTo(X+k+T,Y);ctx.lineTo(X+k,Y+T)}ctx.save();ctx.rect(X,Y,T,T);ctx.clip();ctx.stroke();ctx.restore();ctx.strokeStyle='rgba(200,205,215,.7)';ctx.lineWidth=3;ctx.strokeRect(X+2,Y+2,T-4,T-4)}
    if(t===RUBBLE){ctx.fillStyle='#5a5a5e';for(let k=0;k<5;k++)ctx.fillRect(X+((k*37+x*13)%50)+4,Y+((k*23+y*17)%50)+4,8,5)}
    return}
  ctx.fillStyle='#454953';ctx.fillRect(X,Y,T,T);
}
function drawBuilding(b){
  ctx.fillStyle='rgba(0,0,0,.38)';ctx.fillRect(b.x+14,b.y+16,b.w-12,b.h-12);
  ctx.fillStyle=b.c;ctx.fillRect(b.x+6,b.y+6,b.w-12,b.h-12);
  if(b.cont){ctx.fillStyle='rgba(0,0,0,.18)';for(let k=b.x+12;k<b.x+b.w-8;k+=8)ctx.fillRect(k,b.y+8,3,b.h-16);return}
  ctx.fillStyle='rgba(255,255,255,.09)';ctx.fillRect(b.x+6,b.y+6,b.w-12,4);ctx.fillRect(b.x+6,b.y+6,4,b.h-12);
  ctx.strokeStyle='rgba(0,0,0,.22)';ctx.lineWidth=2;ctx.strokeRect(b.x+16,b.y+16,b.w-32,b.h-32);
  for(const d of b.det){ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(b.x+d[0]+3,b.y+d[1]+3,d[2],d[3]);ctx.fillStyle='rgba(210,215,225,.35)';ctx.fillRect(b.x+d[0],b.y+d[1],d[2],d[3])}
}
function drawCar(c,now){
  const L=c.len,Wd=c.wid,hl=L/2,hw=Wd/2;
  ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.a);
  ctx.fillStyle='rgba(0,0,0,.4)';rrect(-hl+3,-hw+4,L,Wd,6);ctx.fill();
  ctx.fillStyle='#0d0d0f';for(const sx of[-1,1])for(const sy of[-1,1])ctx.fillRect(sx*L*.3-L*.1,sy>0?hw-3:-hw-1,L*.2,4);
  ctx.fillStyle=c.wreck?'#34343a':c.color;rrect(-hl,-hw,L,Wd,6);ctx.fill();
  if(!c.wreck){
    if(c.liv==='police'){ctx.fillStyle='#16181d';ctx.fillRect(hl-L*.24,-hw+1,L*.2,Wd-2);ctx.fillRect(-hl+2,-hw+1,L*.16,Wd-2);ctx.fillStyle='#2f6fd6';ctx.fillRect(-L*.05,-hw,L*.12,2);ctx.fillRect(-L*.05,hw-2,L*.12,2)}
    else if(c.liv==='inter'||c.liv==='rys'){ctx.fillStyle=c.liv==='rys'?'#121212':'#e9ecf2';ctx.fillRect(-hl+2,-2,L-4,4)}
    else if(c.liv==='swat'){ctx.fillStyle='#1a2030';ctx.fillRect(-hl+4,-hw+3,L-8,Wd-6)}
    else if(c.player){ctx.fillStyle='#16150f';ctx.fillRect(-hl+2,-5,L-4,3);ctx.fillRect(-hl+2,2,L-4,3)}}
  ctx.fillStyle='rgba(14,20,32,.92)';rrect(-L*.2,-hw+3,L*.48,Wd-6,4);ctx.fill();
  ctx.fillStyle=c.wreck?'#2b2b30':c.color;rrect(-L*.12,-hw+4.5,L*.27,Wd-9,3);ctx.fill();
  if(c.liv==='swat'&&!c.wreck){ctx.fillStyle='#2c3546';ctx.fillRect(-L*.12,-hw+4.5,L*.27,Wd-9)}
  ctx.fillStyle='#fff6c8';ctx.fillRect(hl-3,-hw+3,3,4);ctx.fillRect(hl-3,hw-7,3,4);
  ctx.fillStyle='#ff3040';ctx.fillRect(-hl,-hw+3,2.5,4);ctx.fillRect(-hl,hw-7,2.5,4);
  if(c.cop&&!c.wreck){const act=(G&&G.ch.active)||c.parked,on=Math.floor(now*8+c.id)%2===0;
    ctx.fillStyle=act&&on?'#ff2a3a':'#5a1016';ctx.fillRect(-2,-hw+4,5,hw-4);
    ctx.fillStyle=act&&!on?'#3a8bff':'#10204a';ctx.fillRect(-2,0,5,hw-4)}
  ctx.restore();
}
function headl(c){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.a);const g=ctx.createLinearGradient(c.len/2,0,c.len/2+230,0);g.addColorStop(0,'rgba(255,240,200,.3)');g.addColorStop(1,'rgba(255,240,200,0)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(c.len/2,-c.wid/2+3);ctx.lineTo(c.len/2+230,-80);ctx.lineTo(c.len/2+230,80);ctx.lineTo(c.len/2,c.wid/2-3);ctx.closePath();ctx.fill();ctx.restore()}

let menuT=0;
function render(dt){
  const now=performance.now()/1000,base=clamp(Math.min(W,H)/760,.55,1.15);let cx,cy,Z;
  if(G){const P=G.P,c=G.cam,sp=Math.hypot(P.vx,P.vy),k=1-Math.exp(-dt*4);
    c.x+=(P.x+P.vx*.35-c.x)*k;c.y+=(P.y+P.vy*.35-c.y)*k;c.z+=(base*(1-.2*Math.min(1,sp/650))-c.z)*(1-Math.exp(-dt*2));
    cx=c.x;cy=c.y;Z=c.z;if(G.shake>0){cx+=(R()-.5)*G.shake;cy+=(R()-.5)*G.shake;G.shake=Math.max(0,G.shake-dt*30)}}
  else{menuT+=dt;cx=WS/2+Math.cos(menuT*.04)*1100;cy=WS/2+Math.sin(menuT*.055)*1100;Z=base*.9}
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#0d0f14';ctx.fillRect(0,0,cv.width,cv.height);
  ctx.setTransform(DPR*Z,0,0,DPR*Z,DPR*(W/2-cx*Z),DPR*(H/2-cy*Z));
  const x0=cx-W/2/Z-T,x1=cx+W/2/Z+T,y0=cy-H/2/Z-T,y1=cy+H/2/Z+T,inV=(x,y,m)=>x>x0-m&&x<x1+m&&y>y0-m&&y<y1+m;
  const tx0=Math.max(0,Math.floor(x0/T)),tx1=Math.min(N-1,Math.floor(x1/T)),ty0=Math.max(0,Math.floor(y0/T)),ty1=Math.min(N-1,Math.floor(y1/T));
  for(let y=ty0;y<=ty1;y++)for(let x=tx0;x<=tx1;x++)drawTile(x,y,tiles[y*N+x]);
  for(const z of ZONES)if(inV(z.x,z.y,80)){const p=.5+.5*Math.sin(now*3);ctx.strokeStyle=z.type==='paint'?'rgba(80,200,255,.8)':'rgba(95,224,143,.8)';ctx.lineWidth=4;ctx.setLineDash([10,8]);ctx.beginPath();ctx.arc(z.x,z.y,52+p*6,0,7);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#f3f1ea';ctx.font='600 15px Rubik,sans-serif';ctx.textAlign='center';ctx.fillText(z.type==='paint'?'Покраска $400':'Ремонт',z.x,z.y+5)}
  if(G){const g=G;
    ctx.strokeStyle='rgba(6,6,8,.42)';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();for(const s of g.skids){ctx.moveTo(s[0],s[1]);ctx.lineTo(s[2],s[3])}ctx.stroke();
    for(const o of g.oils){ctx.globalAlpha=Math.min(1,o.t/3);ctx.fillStyle='#0a0a0c';ctx.beginPath();ctx.ellipse(o.x,o.y,40,30,0,0,7);ctx.fill();ctx.strokeStyle='rgba(120,90,200,.35)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(o.x-6,o.y-4,22,14,.4,0,7);ctx.stroke();ctx.globalAlpha=1}
    for(const s of g.spikes){if(!inV(s.x,s.y,60))continue;ctx.fillStyle='#6b7280';ctx.fillRect(s.x-s.hw,s.y-s.hh,s.hw*2,s.hh*2);ctx.fillStyle='#d6dae2';const hz=s.hh>s.hw;for(let k=0;k<7;k++){if(hz)ctx.fillRect(s.x-s.hw-2,s.y-s.hh+4+k*8,s.hw*2+4,2);else ctx.fillRect(s.x-s.hw+4+k*8,s.y-s.hh-2,2,s.hh*2+4)}}
    const tg=objTarget();
    for(const p of[g.m.goal==='cp'?g.cp[g.cpi]:null,g.m.goal==='deliver'?g.target:null])if(p&&inV(p.x,p.y,90)){ctx.strokeStyle='rgba(242,213,65,.9)';ctx.lineWidth=5;ctx.beginPath();ctx.arc(p.x,p.y,58+Math.sin(now*4)*6,0,7);ctx.stroke();ctx.fillStyle='rgba(242,213,65,.18)';ctx.fill();ctx.fillStyle='#f2d541';ctx.font='17px "Russo One",sans-serif';ctx.textAlign='center';ctx.fillText(g.m.goal==='cp'?'Точка '+(g.cpi+1):'Журналисты',p.x,p.y+6)}
    for(const c of g.civs)if(inV(c.x,c.y,40))drawCar(c,now);
    for(const c of g.cops)if(inV(c.x,c.y,40))drawCar(c,now);
    drawCar(g.P,now);
    for(const p of g.parts)if(p.type===0){const a=p.life/p.max;ctx.globalAlpha=a*.45;ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.size*(1.8-a),0,7);ctx.fill()}ctx.globalAlpha=1;
    if(g.rys&&!g.rys.wreck&&inV(g.rys.x,g.rys.y,40)){ctx.fillStyle='#ffb27a';ctx.font='600 14px Rubik,sans-serif';ctx.textAlign='center';ctx.fillText('Рысь',g.rys.x,g.rys.y-30)}
    void tg}
  for(const b of buildings)if(b.x+b.w>x0&&b.x<x1&&b.y+b.h>y0&&b.y<y1)drawBuilding(b);
  for(const t of treesL)if(inV(t[0],t[1],40)){ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.arc(t[0]+7,t[1]+9,25,0,7);ctx.fill();ctx.fillStyle='#2b6a3b';ctx.beginPath();ctx.arc(t[0],t[1],25,0,7);ctx.fill();ctx.fillStyle='#3f8a50';ctx.beginPath();ctx.arc(t[0]-6,t[1]-6,12,0,7);ctx.fill()}
  const under=G&&covAt(G.P.x,G.P.y);
  for(let y=ty0;y<=ty1;y++)for(let x=tx0;x<=tx1;x++)if(cover[y*N+x]){const X=x*T,Y=y*T;ctx.fillStyle=under?'rgba(78,82,92,.5)':'rgba(78,82,92,.9)';ctx.fillRect(X,Y,T,T);ctx.fillStyle='rgba(0,0,0,.18)';for(let k=4;k<T;k+=16)ctx.fillRect(X,Y+k,T,3);
    ctx.fillStyle='rgba(20,22,28,.9)';if(!cover[y*N+x-1])ctx.fillRect(X,Y,5,T);if(!cover[y*N+x+1])ctx.fillRect(X+T-5,Y,5,T);if(y>0&&!cover[(y-1)*N+x])ctx.fillRect(X,Y,T,5);if(y<N-1&&!cover[(y+1)*N+x])ctx.fillRect(X,Y+T-5,T,5)}
  for(const l of lamps)if(inV(l[0],l[1],20)){ctx.fillStyle='#c9c2b0';ctx.beginPath();ctx.arc(l[0],l[1],4,0,7);ctx.fill()}
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='rgba(8,12,32,.4)';ctx.fillRect(0,0,cv.width,cv.height);ctx.restore();
  ctx.globalCompositeOperation='lighter';
  for(const l of lamps)if(inV(l[0],l[1],100))gd(GL.lamp,l[0],l[1]);
  for(const z of ZONES)if(inV(z.x,z.y,100))gd(z.type==='paint'?GL.cyan:GL.grn,z.x,z.y);
  if(G){const g=G;
    for(const c of g.civs)if(inV(c.x,c.y,240))headl(c);
    for(const c of g.cops)if(!c.wreck&&inV(c.x,c.y,240)){if(!c.parked)headl(c);if(g.ch.active||c.parked){const on=Math.floor(now*8+c.id)%2===0;gd(on?GL.red:GL.blue,c.x,c.y)}}
    headl(g.P);const ba=Math.cos(g.P.a),bb=Math.sin(g.P.a);gd(GL.tail,g.P.x-ba*22,g.P.y-bb*22);
    for(const p of[g.m.goal==='cp'?g.cp[g.cpi]:null,g.m.goal==='deliver'?g.target:null])if(p&&inV(p.x,p.y,120))gd(GL.acc,p.x,p.y);
    for(const s of g.spikes)if(Math.floor(now*3)%2&&inV(s.x,s.y,80))gd(GL.tail,s.x,s.y);
    for(const p of g.parts){if(p.type===1){ctx.globalAlpha=p.life/p.max;ctx.fillStyle=p.col;ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size)}else if(p.type===2){const a=p.life/p.max;ctx.globalAlpha=a;ctx.strokeStyle=p.col;ctx.lineWidth=6;ctx.beginPath();ctx.arc(p.x,p.y,(1-a)*p.size+10,0,7);ctx.stroke()}}ctx.globalAlpha=1;
    if(g.heli&&!g.heli.leave&&!g.ch.jam)gd(GL.spot,g.heli.x,g.heli.y)}
  ctx.globalCompositeOperation='source-over';
  if(G&&G.heli){const h=G.heli;ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(h.x+50,h.y+60,26,12,0,0,7);ctx.fill();
    ctx.save();ctx.translate(h.x,h.y);const ang=Math.atan2(h.vy,h.vx);ctx.rotate(ang);ctx.fillStyle='#1c2230';ctx.beginPath();ctx.ellipse(0,0,24,13,0,0,7);ctx.fill();ctx.fillRect(-48,-3,30,6);ctx.fillStyle='#eef0f4';ctx.fillRect(-46,-2,10,4);ctx.fillStyle='#6fa3ff';ctx.beginPath();ctx.ellipse(10,0,9,8,0,0,7);ctx.fill();
    ctx.rotate(h.rot-ang);ctx.strokeStyle='rgba(200,210,230,.55)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-46,0);ctx.lineTo(46,0);ctx.moveTo(0,-46);ctx.lineTo(0,46);ctx.stroke();ctx.restore()}
  if(G&&(state==='play'||state==='pause')){const tg=objTarget();if(tg){ctx.setTransform(DPR,0,0,DPR,0,0);arrow(tg,cx,cy,Z)}}
}
function objTarget(){const g=G;if(!g)return null;if(g.m.goal==='cp'&&g.cpi<g.cp.length)return g.cp[g.cpi];if(g.m.goal==='deliver')return g.target;if(g.m.goal==='boss'&&g.rys&&!g.rys.wreck)return g.rys;return null}
function arrow(p,cx,cy,Z){
  const sx=(p.x-cx)*Z+W/2,sy=(p.y-cy)*Z+H/2,m=56;if(sx>m&&sx<W-m&&sy>m&&sy<H-m)return;
  const a=Math.atan2(sy-H/2,sx-W/2),dx=Math.cos(a),dy=Math.sin(a),k=Math.min((W/2-m)/Math.max(.001,Math.abs(dx)),(H/2-m)/Math.max(.001,Math.abs(dy))),px=W/2+dx*k,py=H/2+dy*k;
  ctx.save();ctx.translate(px,py);ctx.rotate(a);ctx.fillStyle=G.m.goal==='boss'?'#ff8a3d':'#f2d541';ctx.strokeStyle='#14161c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(20,0);ctx.lineTo(-12,-15);ctx.lineTo(-6,0);ctx.lineTo(-12,15);ctx.closePath();ctx.stroke();ctx.fill();ctx.restore();
  ctx.fillStyle='#f3f1ea';ctx.font='600 13px Rubik,sans-serif';ctx.textAlign='center';ctx.fillText(Math.round(dist(p,G.P)/10)+' м',px-dx*30,py-dy*30+4);
}

/* ---------- миникарта ---------- */
const mm=$('#mm'),mx=mm.getContext('2d'),MS=3,MMS=N*MS;mm.width=MMS*2;mm.height=MMS*2;mx.scale(2,2);
const mmBase=document.createElement('canvas');mmBase.width=mmBase.height=MMS;const mb=mmBase.getContext('2d');
const MMC={[B]:'#1b1d24',[ROAD]:'#626777',[ALLEY]:'#4a4d58',[GRASS]:'#2f5a38',[FENCE]:'#3f424c',[RUBBLE]:'#4a4a50',[TREE]:'#244a2c',[LOT]:'#383b44'};
function mmTile(x,y){mb.fillStyle=cover[y*N+x]?'#9aa0ae':MMC[tiles[y*N+x]];mb.fillRect(x*MS,y*MS,MS,MS)}
for(let y=0;y<N;y++)for(let x=0;x<N;x++)mmTile(x,y);
function drawMM(){
  const g=G,s=MS/T;mx.clearRect(0,0,MMS,MMS);mx.drawImage(mmBase,0,0);
  for(const z of ZONES){mx.fillStyle=z.type==='paint'?'#50c8ff':'#5fe08f';mx.fillRect(z.x*s-3,z.y*s-3,6,6)}
  const tg=objTarget();if(tg){mx.fillStyle='#f2d541';mx.beginPath();mx.arc(tg.x*s,tg.y*s,4.5,0,7);mx.fill()}
  for(const r of g.rbs){mx.fillStyle='#ff8a3d';mx.fillRect(r.sp.x*s-2.5,r.sp.y*s-2.5,5,5)}
  const now=performance.now()/200|0;
  for(const c of g.cops){if(c.wreck)continue;mx.fillStyle=c.boss?'#ff8a3d':(now+c.id)%2?'#ff3b47':'#3d86ff';mx.beginPath();mx.arc(c.x*s,c.y*s,2.6,0,7);mx.fill()}
  if(g.heli){mx.strokeStyle='#ffffff';mx.lineWidth=1;mx.beginPath();mx.arc(g.heli.x*s,g.heli.y*s,4,0,7);mx.stroke()}
  if(g.ch.active&&!g.ch.seen){mx.strokeStyle='rgba(255,255,255,.5)';mx.setLineDash([2,2]);mx.beginPath();mx.arc(g.ch.lx*s,g.ch.ly*s,6,0,7);mx.stroke();mx.setLineDash([])}
  const P=g.P;mx.save();mx.translate(P.x*s,P.y*s);mx.rotate(P.a);mx.fillStyle='#f2d541';mx.strokeStyle='#000';mx.lineWidth=1;mx.beginPath();mx.moveTo(6,0);mx.lineTo(-4,-4);mx.lineTo(-4,4);mx.closePath();mx.fill();mx.stroke();mx.restore();
}

/* ---------- HUD ---------- */
const STAR='<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z"/></svg>';
$('#stars').innerHTML=STAR.repeat(5);
const starEls=[...document.querySelectorAll('#stars svg')],abEls={};for(const b of document.querySelectorAll('.ab'))abEls[b.dataset.ab]=b.querySelector('i');
const fmtT=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
function hud(){
  const g=G,P=g.P,ch=g.ch,s=stars(),se=$('#stars');
  starEls.forEach((e,i)=>e.classList.toggle('on',i<s));
  se.classList.toggle('off',!ch.active);se.classList.toggle('lost',ch.active&&!ch.seen);se.classList.toggle('up',g.starUp>0);
  $('#mName').textContent=g.m.name+' · '+DNAME[district(Math.floor(P.x/T),Math.floor(P.y/T))];
  let o='';const m=g.m;
  if(m.goal==='escape')o=ch.active?'Оторвись от погони':'Чисто';
  else if(m.goal==='cp')o=g.cpi<g.cp.length?'Доставка: точка '+(g.cpi+1)+' из '+g.cp.length:'Сбрось хвост';
  else if(m.goal==='boss')o=g.rys&&!g.rys.wreck?'Разбей машину Рыси: '+Math.ceil(g.rys.hp)+' прочности':'';
  else if(m.goal==='deliver')o='Довези запись журналистам';
  else o='Очки: '+Math.floor(g.score);
  $('#mObj').textContent=o;$('#mTime').textContent=m.time?fmtT(g.timeLeft):fmtT(g.t);
  $('#spd').firstChild.nodeValue=Math.round(Math.hypot(P.vx,P.vy)*.33);
  $('#hpB i').style.width=(P.hp/P.maxHp*100)+'%';$('#hpT').textContent=Math.ceil(P.hp)+' / '+P.maxHp;
  $('#hpB i').style.background=P.hp/P.maxHp<.3?'#ff3b47':'';
  $('#nB i').style.width=(g.nitro/g.nmax*100)+'%';$('#dT').textContent=P.pop>0?'Шины пробиты':'';
  for(const k in g.ab)abEls[k].style.height=(g.ab[k].cd/g.ab[k].max*100)+'%';
  const ar=$('#arrest');ar.classList.toggle('off',g.arrest<.03);ar.querySelector('i').style.width=(g.arrest*100)+'%';
  const need=5+5*s,lt=$('#lose'),wr=$('#mmWrap');
  if(ch.active&&!ch.seen){const p=Math.min(1,ch.lose/need);lt.textContent='Теряют след: '+Math.ceil(need-ch.lose)+' с'+(covAt(P.x,P.y)?' · укрытие ×2':'');wr.style.background='conic-gradient(#f2d541 '+(p*360)+'deg,rgba(16,18,24,.86) 0)'}
  else{lt.textContent=ch.active?(ch.jam?'Рация заглушена · тебя видят':'Тебя видят'):'Чисто';wr.style.background=ch.active?'rgba(255,59,71,.55)':''}
  drawMM();
}
const radioQ=[];let radioT=0;
function radio(t,who){radioQ.push([who||'Диспетчер',t]);if(radioQ.length>3)radioQ.shift()}
function tickRadio(dt){const r=$('#radio');if(radioT>0){radioT-=dt;if(radioT<=0)r.classList.add('off')}else if(radioQ.length){const[w,t]=radioQ.shift();r.innerHTML='<b></b><span></span>';r.firstChild.textContent=w+':';r.lastChild.textContent=t;r.classList.remove('off');radioT=2.8}}

/* ---------- меню и экраны ---------- */
const TOUCH=matchMedia('(pointer:coarse)').matches;if(TOUCH)document.body.classList.add('touch');
function renderMenu(){
  $('#money').textContent='$'+save.money.toLocaleString('ru-RU');
  $('#missions').innerHTML=MISSIONS.map((m,i)=>{const un=unlocked(i),d=save.done[m.id];return '<div class="card'+(un?'':' lock')+'"><div class="act">'+m.act+'</div><h3>'+m.name+(d?' <span class="done">пройдено</span>':'')+'</h3><p>'+m.desc+'</p><div class="meta"><span class="st">'+'★'.repeat(m.heat)+'</span><span>'+(m.reward?'Награда $'+m.reward:(save.best?'Рекорд '+save.best:'Очки в деньги'))+(m.time?' · '+fmtT(m.time):'')+'</span></div><button class="btn" data-m="'+i+'"'+(un?'':' disabled')+'>'+(un?(d?'Пройти снова':'Играть'):'Сначала пройди предыдущую')+'</button></div>'}).join('');
  $('#garage').innerHTML=UPG.map(u=>{const lv=save.up[u.k],max=lv>=3,pr=max?0:u.p[lv];return '<div class="card"><h3>'+u.n+'</h3><p>'+u.d+'</p><div class="pips">'+[0,1,2].map(i=>'<i class="'+(i<lv?'on':'')+'"></i>').join('')+'</div><button class="btn'+(max?' ghost':'')+'" data-u="'+u.k+'"'+(max||save.money<pr?' disabled':'')+'>'+(max?'Максимум':'Улучшить за $'+pr)+'</button></div>'}).join('');
}
$('#missions').addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(b&&!b.disabled)startMission(+b.dataset.m)});
$('#garage').addEventListener('click',e=>{const b=e.target.closest('[data-u]');if(!b||b.disabled)return;const u=UPG.find(x=>x.k===b.dataset.u),lv=save.up[u.k];if(lv<3&&save.money>=u.p[lv]){save.money-=u.p[lv];save.up[u.k]++;persist();renderMenu()}});
let curIdx=0;
function show(id,on){$(id).hidden=!on}
function startMission(i){
  initAudio();if(AC&&AC.state==='suspended')AC.resume();
  for(const k in K)K[k]=false;radioQ.length=0;radioT=0;$('#radio').classList.add('off');
  curIdx=i;newRun(MISSIONS[i]);state='play';show('#menu',0);show('#result',0);show('#pause',0);show('#hud',1);show('#touch',TOUCH);hud();
}
function toMenu(){G=null;state='menu';silence();show('#hud',0);show('#touch',0);show('#pause',0);show('#result',0);show('#menu',1);renderMenu();Store.menuShown()}
function togglePause(){if(state==='play'){state='pause';silence();$('#pTxt').textContent=G.m.name+' — '+G.m.desc;show('#pause',1);show('#touch',0)}else if(state==='pause'){state='play';show('#pause',0);show('#touch',TOUCH)}}
function finish(win,title,text){
  const g=G;if(!g||g.over)return;g.over=true;state='result';silence();
  let reward=0;
  if(g.m.goal==='survive'){reward=Math.floor(g.score/4);if(Math.floor(g.score)>save.best)save.best=Math.floor(g.score);title=title+' · '+Math.floor(g.score)+' очков'}
  else if(win){reward=g.m.reward;save.done[g.m.id]=true}
  save.money+=reward;persist();
  $('#rAct').textContent=g.m.act+' · '+Store.nick();$('#rTitle').textContent=title;$('#rTitle').style.color=win?'var(--acc)':'var(--red)';$('#rText').textContent=text;
  $('#rStats').innerHTML=[['Время',fmtT(g.t)],['Макс. розыск',g.maxStars+' из 5'],['Разбито машин полиции',g.wrecked],['Заработано','$'+reward]].map(r=>'<div>'+r[0]+'<b>'+r[1]+'</b></div>').join('');
  const nx=curIdx+1<MISSIONS.length&&win&&unlocked(curIdx+1);$('#rNext').hidden=!nx;
  setTimeout(()=>{show('#hud',0);show('#touch',0);show('#result',1)},650);
}
$('#pauseBtn').addEventListener('click',togglePause);
$('#pCont').addEventListener('click',togglePause);
$('#pRetry').addEventListener('click',()=>startMission(curIdx));
$('#pMenu').addEventListener('click',toMenu);
$('#rRetry').addEventListener('click',()=>startMission(curIdx));
$('#rMenu').addEventListener('click',toMenu);
$('#rNext').addEventListener('click',()=>startMission(curIdx+1));
for(const b of document.querySelectorAll('.ab'))b.addEventListener('click',()=>useAb(b.dataset.ab));
const KMAP={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'hand',ShiftLeft:'nitro',ShiftRight:'nitro'};
addEventListener('keydown',e=>{
  if(state==='menu')return;
  const k=KMAP[e.code];if(k){K[k]=true;e.preventDefault();return}
  if(e.code==='KeyQ')useAb('jam');else if(e.code==='KeyE')useAb('emp');else if(e.code==='KeyR')useAb('oil');
  else if(e.code==='KeyP'||e.code==='Escape')togglePause();
  else if(e.code==='KeyM'){muted=!muted;if(master)master.gain.value=muted?0:.8;radio(muted?'Звук выключен':'Звук включён','Система')}
});
addEventListener('keyup',e=>{const k=KMAP[e.code];if(k)K[k]=false});
addEventListener('blur',()=>{for(const k in K)K[k]=false;if(state==='play')togglePause()});
for(const b of document.querySelectorAll('#touch [data-k]')){const k=b.dataset.k,on=e=>{e.preventDefault();K[k]=true;b.classList.add('on')},off=e=>{e.preventDefault();K[k]=false;b.classList.remove('on')};b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off)}

/* ---------- цикл ---------- */
const STEP=1/120;let last=performance.now(),acc=0,hudAcc=0;
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(state==='play'&&G){acc+=dt;let n=0;while(acc>=STEP&&state==='play'&&n<8){update(STEP);acc-=STEP;n++}if(n>=8)acc=0;updAudio();tickRadio(dt);hudAcc+=dt;if(hudAcc>.08&&state==='play'){hudAcc=0;hud()}}
  else acc=0;
  render(dt);
}
renderMenu();
requestAnimationFrame(frame);
window.__game={startMission,update:dt=>update(dt),get G(){return G},get state(){return state},K,useAb};
}
