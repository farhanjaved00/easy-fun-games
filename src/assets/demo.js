// Demo mini-games from the design prototype. Used only for sample games that have no partner embed yet.
(function(){
'use strict';
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let liveStops=[];
function runLoop(cv,onFit,frameFn){
  const ctx=cv.getContext('2d'),dpr=Math.min(devicePixelRatio||1,2);
  let raf,vis=true,alive=true,last=performance.now();
  const fit=()=>{const r=cv.parentElement.getBoundingClientRect(),W=Math.max(r.width,40),H=Math.max(r.height,40);cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);onFit(W,H)};
  fit();
  const ro=new ResizeObserver(fit);ro.observe(cv.parentElement);
  const io=new IntersectionObserver(e=>{vis=e[e.length-1].isIntersecting});io.observe(cv);
  const tick=t=>{if(!alive)return;const dt=Math.min((t-last)/1000,.05);last=t;if(vis&&!document.hidden)frameFn(dt);raf=requestAnimationFrame(tick)};
  raf=requestAnimationFrame(tick);
  return{stop(){alive=false;cancelAnimationFrame(raf);ro.disconnect();io.disconnect()}};
}
function mountGame(cv,g,o){
  o=o||{};
  const auto=!!o.auto,kind=g.kind,ctx=cv.getContext('2d');
  let W=300,H=200;
  const S={score:0,time:30,over:false,t:0,flash:0,n:0};
  const rnd=(a,b)=>a+Math.random()*(b-a);
  const bg=(a,b)=>{const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,a);gr.addColorStop(1,b);ctx.fillStyle=gr;ctx.fillRect(0,0,W,H)};
  const emo=(e,x,y,s)=>{ctx.font=s+'px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(e,x,y)};
  const txt=(t,x,y,s,c)=>{ctx.font='800 '+s+'px Sora, system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=c||'#fff';ctx.fillText(t,x,y)};
  const spark=(arr,x,y,n,c)=>{for(let k=0;k<n;k++)arr.push({x,y,vx:rnd(-150,150),vy:rnd(-150,150),l:.5,c})};
  const stepP=(arr,dt)=>{arr.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt});return arr.filter(p=>p.l>0)};
  const drawP=arr=>{arr.forEach(p=>{ctx.globalAlpha=Math.max(p.l*2,0);ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,4,0,7);ctx.fill()});ctx.globalAlpha=1};
  const rr=(x,y,w,h,r)=>{ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h)};
  const F={
  pop(){let bs=[],ps=[],sp=0;const hues=[g.c1,g.c2,'#FFC93C','#1FD39A','#FF5C7A'];
    function hit(x,y){for(let i=bs.length-1;i>=0;i--){const b=bs[i];if(Math.hypot(b.x-x,b.y-y)<=b.r+8){bs.splice(i,1);S.score++;spark(ps,b.x,b.y,10,b.c);return}}}
    return{down:hit,
      step(dt){sp-=dt;if(sp<=0){sp=rnd(.35,.65);const r=rnd(22,44);bs.push({x:rnd(r,W-r),y:H+r,r,vy:rnd(50,130)+Math.min(S.t,30)*2,c:hues[Math.random()*5|0],ph:rnd(0,6)})}
        bs.forEach(b=>{b.y-=b.vy*dt;b.x+=Math.sin(S.t*2+b.ph)*.4});bs=bs.filter(b=>b.y>-b.r*2);ps=stepP(ps,dt);
        if(auto&&Math.random()<dt*2.4&&bs.length){const b=bs[Math.random()*bs.length|0];hit(b.x,b.y)}},
      draw(){bg('#2A1F6B','#14112B');bs.forEach(b=>{ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,7);ctx.fillStyle=b.c+'66';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle=b.c;ctx.stroke();emo(g.emoji,b.x,b.y+2,b.r*1.2)});drawP(ps)}}},
  runner(){let tl=1,x=0,obs=[],sp=0,off=0;
    const lw=()=>Math.min(W/3.2,110),lx=l=>W/2+(l-1)*lw(),cy=()=>H-64;
    const go=d=>{tl=clamp(tl+d,0,2)};
    return{down(px){go(px<W/2?-1:1)},key(k){k=k.toLowerCase();if(k==='arrowleft'||k==='a')go(-1);if(k==='arrowright'||k==='d')go(1)},
      step(dt){const spd=240+Math.min(S.t,40)*6;off=(off+spd*dt)%48;if(!x)x=lx(tl);x+=(lx(tl)-x)*Math.min(1,dt*12);
        sp-=dt;if(sp<=0){sp=rnd(.55,.95)*(260/spd+.4);const l=Math.random()*3|0;obs.push({l,y:-30});if(Math.random()<.3)obs.push({l:(l+1+(Math.random()<.5?1:0))%3,y:-30})}
        obs.forEach(q=>q.y+=spd*dt);
        obs.forEach(q=>{if(!q.d&&Math.abs(q.y-cy())<34&&Math.abs(lx(q.l)-x)<lw()*.42){q.d=1;S.score=Math.max(0,S.score-4);S.flash=.4}});
        obs=obs.filter(q=>!q.d&&q.y<H+40);S.score+=dt*8;
        if(auto){const danger=l=>obs.some(q=>q.l===l&&q.y>cy()-230&&q.y<cy()+30);if(danger(tl)){const c=[0,1,2].filter(l=>!danger(l)).sort((a,b)=>Math.abs(a-tl)-Math.abs(b-tl));if(c.length)tl=c[0]}}},
      draw(){bg('#2f2b63','#17133a');const w=lw();ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(W/2-w*1.5,0,w*3,H);
        ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=4;ctx.setLineDash([22,26]);ctx.lineDashOffset=-off;
        [-.5,.5].forEach(k=>{ctx.beginPath();ctx.moveTo(W/2+k*w,0);ctx.lineTo(W/2+k*w,H);ctx.stroke()});
        ctx.setLineDash([]);ctx.strokeStyle='#FFC93C';[-1.5,1.5].forEach(k=>{ctx.beginPath();ctx.moveTo(W/2+k*w,0);ctx.lineTo(W/2+k*w,H);ctx.stroke()});
        obs.forEach(q=>emo('🚧',lx(q.l),q.y,40));emo(g.emoji,x||lx(tl),cy(),46)}}},
  shoot(){let en=[],ps=[],sp=0,beam=null,bt=0;const foeE=g.emoji==='🔫'?'🎯':g.emoji;
    function hit(x,y){beam={x,y};bt=.12;for(let i=en.length-1;i>=0;i--){const e=en[i];if(Math.hypot(e.x-x,e.y-y)<=e.r+12){en.splice(i,1);S.score++;spark(ps,e.x,e.y,8,'#FFC93C');return}}}
    return{down:hit,
      step(dt){sp-=dt;if(sp<=0){sp=Math.max(.35,.95-Math.min(S.t,30)*.02)+rnd(0,.3);en.push({x:rnd(30,W-30),y:-30,vy:rnd(45,85)+Math.min(S.t,30),r:26})}
        en.forEach(e=>{e.y+=e.vy*dt;e.x+=Math.sin(S.t*3+e.y/40)*.5;if(e.y>H-30){e.dead=1;S.score=Math.max(0,S.score-2);S.flash=.35}});
        en=en.filter(e=>!e.dead);ps=stepP(ps,dt);bt-=dt;
        if(auto&&Math.random()<dt*2.2&&en.length){const e=en.reduce((a,b)=>b.y>a.y?b:a);hit(e.x,e.y)}},
      draw(){bg('#1b1448','#2A1F6B');ctx.fillStyle='rgba(255,255,255,.5)';for(let i=0;i<24;i++)ctx.fillRect((i*97)%W,(i*53+S.t*8)%H,2,2);
        ctx.fillStyle='#0f0b2b';ctx.fillRect(0,H-26,W,26);emo('🏰',W/2,H-24,36);en.forEach(e=>emo(foeE,e.x,e.y,e.r*1.7));
        if(bt>0&&beam){ctx.strokeStyle='#FFC93C';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(W/2,H-34);ctx.lineTo(beam.x,beam.y);ctx.stroke()}drawP(ps)}}},
  eat(){let me=null,dots=[],foes=[],mouse=null;
    const mk=()=>({x:rnd(10,W-10),y:rnd(10,H-10)}),foe=()=>({...mk(),r:rnd(12,36),a:rnd(0,6)});
    const hue=[g.c1,g.c2,'#FFC93C','#1FD39A'];
    const init=()=>{me={x:W/2,y:H/2,r:16};for(let i=0;i<36;i++)dots.push({...mk(),c:hue[i%4]});for(let i=0;i<5;i++)foes.push(foe())};
    const tgt=(x,y)=>{mouse={x,y}};
    return{down:tgt,move:tgt,key(k){const b=me||{x:W/2,y:H/2};if(k==='ArrowLeft')tgt(b.x-90,b.y);if(k==='ArrowRight')tgt(b.x+90,b.y);if(k==='ArrowUp')tgt(b.x,b.y-90);if(k==='ArrowDown')tgt(b.x,b.y+90)},
      step(dt){if(!me)init();
        foes.forEach(f=>{f.a+=rnd(-1,1)*dt*3;f.x+=Math.cos(f.a)*45*dt;f.y+=Math.sin(f.a)*45*dt;if(f.x<f.r||f.x>W-f.r)f.a=Math.PI-f.a;if(f.y<f.r||f.y>H-f.r)f.a=-f.a;f.x=clamp(f.x,f.r,W-f.r);f.y=clamp(f.y,f.r,H-f.r)});
        let t=mouse;
        if(auto){let best=null,bd=1e9;dots.forEach(d=>{const k=Math.hypot(d.x-me.x,d.y-me.y);if(k<bd){bd=k;best=d}});foes.forEach(f=>{const k=Math.hypot(f.x-me.x,f.y-me.y)-f.r*.6;if(f.r<me.r*.85&&k<bd){bd=k;best=f}});t=best;
          const th=foes.find(f=>f.r>me.r*.9&&Math.hypot(f.x-me.x,f.y-me.y)<f.r+me.r+90);if(th)t={x:me.x+(me.x-th.x)*3,y:me.y+(me.y-th.y)*3}}
        if(t){const dx=t.x-me.x,dy=t.y-me.y,d=Math.hypot(dx,dy);if(d>4){const v=Math.max(80,170-me.r*2.2);me.x+=dx/d*v*dt;me.y+=dy/d*v*dt}}
        me.x=clamp(me.x,me.r,W-me.r);me.y=clamp(me.y,me.r,H-me.r);
        dots=dots.filter(d=>{if(Math.hypot(d.x-me.x,d.y-me.y)<me.r+4){S.score++;me.r=Math.min(44,me.r+.35);return false}return true});
        while(dots.length<36)dots.push({...mk(),c:g.c1});
        foes=foes.map(f=>{const d=Math.hypot(f.x-me.x,f.y-me.y);if(f.r>me.r*1.1&&d<f.r*.8){S.score=Math.max(0,S.score-5);S.flash=.35;me.r=16;me.x=rnd(30,W-30);me.y=rnd(30,H-30);return f}
          if(me.r>f.r*1.1&&d<me.r*.8){S.score+=5;me.r=Math.min(44,me.r+2.5);return foe()}return f})},
      draw(){bg('#1b1448','#241a5c');if(!me)return;ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=1;for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
        dots.forEach(d=>{ctx.fillStyle=d.c;ctx.beginPath();ctx.arc(d.x,d.y,4,0,7);ctx.fill()});
        foes.forEach(f=>{const big=f.r>me.r*1.1,c=big?'#FF5C7A':'#1FD39A';ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.fillStyle=c+'88';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle=c;ctx.stroke();emo(big?'😈':'😮',f.x,f.y+1,f.r*1.1)});
        ctx.beginPath();ctx.arc(me.x,me.y,me.r,0,7);ctx.fillStyle=g.c1;ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.stroke();emo(g.emoji,me.x,me.y+1,me.r*1.1)}}},
  match(){let cards=[],lock=0,pend=[],cool=.6;const set=[g.emoji,'⭐','🍀','🔥','🌈','💎','🎈','🍭'];
    const deal=()=>{const pick=[...set].sort(()=>Math.random()-.5).slice(0,6);cards=[...pick,...pick].sort(()=>Math.random()-.5).map(s=>({s,up:false,done:false,f:0,seen:false}));pend=[];lock=0};
    deal();
    const geo=i=>{const cols=W<420?3:4,rows=12/cols,pad=10,top=auto?10:44,w=(W-pad*(cols+1))/cols,h=(H-top-pad*(rows+1))/rows;return{x:pad+(i%cols)*(w+pad),y:top+pad*0+(((i/cols)|0)*(h+pad)),w,h}};
    const flip=i=>{if(lock>0)return;const c=cards[i];if(!c||c.up||c.done)return;c.up=true;c.seen=true;pend.push(i);if(pend.length===2)lock=.7};
    return{down(x,y){cards.forEach((c,i)=>{const r=geo(i);if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)flip(i)})},
      step(dt){cards.forEach(c=>{c.f+=((c.up||c.done?1:0)-c.f)*Math.min(1,dt*14)});
        if(lock>0){lock-=dt;if(lock<=0){const[a,b]=pend;pend=[];if(cards[a].s===cards[b].s){cards[a].done=cards[b].done=true;S.score++;if(cards.every(c=>c.done)){S.score+=3;setTimeout(deal,500)}}else{cards[a].up=cards[b].up=false;S.flash=.12}}}
        if(auto){cool-=dt;if(cool<=0&&lock<=0){cool=.5;const free=cards.map((c,i)=>i).filter(i=>!cards[i].up&&!cards[i].done);if(!free.length)return;
          if(pend.length===0){let pick=null;for(const i of free)for(const j of free)if(!pick&&i<j&&cards[i].seen&&cards[j].seen&&cards[i].s===cards[j].s)pick=i;flip(pick!==null?pick:free[Math.random()*free.length|0])}
          else{const a=pend[0],j=free.find(k=>cards[k].seen&&cards[k].s===cards[a].s);flip(j!==undefined?j:free[Math.random()*free.length|0])}}}},
      draw(){bg('#2A1F6B','#14112B');cards.forEach((c,i)=>{const r=geo(i),sx=Math.abs(1-2*c.f),face=c.f>.5;ctx.save();ctx.translate(r.x+r.w/2,r.y+r.h/2);ctx.scale(Math.max(sx,.02),1);
          rr(-r.w/2,-r.h/2,r.w,r.h,14);ctx.fillStyle=face?(c.done?'#B8F5E0':'#fff'):g.c1;ctx.fill();ctx.lineWidth=3;ctx.strokeStyle=face?'#DCE0F7':'rgba(255,255,255,.55)';ctx.stroke();
          if(face)emo(c.s,0,2,Math.min(r.w,r.h)*.55);else txt('?',0,2,Math.min(r.w,r.h)*.5,'rgba(255,255,255,.8)');ctx.restore()})}}},
  duel(){let p=0,w1=0,w2=0,pause=0,bt=0,who='';
    const tap=s=>{if(pause>0)return;p+=s*.07};
    return{down(x){tap(x<W/2?-1:1)},key(k){k=k.toLowerCase();if(['a','w','s','d'].includes(k))tap(-1);if(k.startsWith('arrow')||k==='l')tap(1)},
      step(dt){if(pause>0){pause-=dt;if(pause<=0)p=0;return}
        if(auto){bt-=dt;if(bt<=0){bt=rnd(.07,.14);tap(Math.random()<.5?-1:1)}}
        if(Math.abs(p)>=1){if(p<0){w1++;who='P1 wins!'}else{w2++;who='P2 wins!'}S.score++;pause=.9;S.flash=0}},
      draw(){bg('#2A1F6B','#14112B');ctx.fillStyle='rgba(255,92,122,.22)';ctx.fillRect(0,0,W/2,H);ctx.fillStyle='rgba(61,169,252,.22)';ctx.fillRect(W/2,0,W/2,H);
        const es=Math.min(W,H)*.22;emo(g.emoji,W*.2,H*.55,es*(1+Math.max(0,-p)*.25));emo(g.emoji,W*.8,H*.55,es*(1+Math.max(0,p)*.25));
        const kx=W/2+clamp(p,-1,1)*(W/2-34);ctx.strokeStyle='#FFC93C';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(34,H*.82);ctx.lineTo(W-34,H*.82);ctx.stroke();emo('🪢',kx,H*.82,34);
        ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=2;ctx.setLineDash([6,6]);ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H*.7);ctx.stroke();ctx.setLineDash([]);
        txt(w1+'  :  '+w2,W/2,auto?26:70,Math.min(44,W/8));txt('P1 · tap A',W*.2,H*.93,Math.min(15,W/22),'rgba(255,255,255,.8)');txt('P2 · tap L',W*.8,H*.93,Math.min(15,W/22),'rgba(255,255,255,.8)');
        if(pause>0)txt(who,W/2,H*.4,Math.min(40,W/9),'#FFC93C')}}},
  hoop(){let hx=0,hd=1,ball=null,streak=0,msg='',mt=0,cd=0;
    const hw=()=>Math.max(70,Math.min(110,W*.2)),hy=()=>H*.3,by=()=>H-62;
    const shoot=()=>{if(ball||cd>0)return;ball={t:0}};
    const speed=()=>110+Math.min(S.t,40)*4+Math.min(streak,10)*8;
    return{down:shoot,key(k){if(k===' '||k==='ArrowUp')shoot()},
      step(dt){if(!hx)hx=W/2;const sp2=speed();hx+=hd*sp2*dt;const lim=hw()/2+14;if(hx>W-lim){hx=W-lim;hd=-1}if(hx<lim){hx=lim;hd=1}
        if(ball){ball.t+=dt/.55;if(ball.t>=1){if(Math.abs(hx-W/2)<hw()*.36){S.score++;streak++;msg=streak>2?'On fire! '+streak:'Swish!'}else{streak=0;msg='Miss';S.flash=.2}mt=.7;ball=null;cd=.25}}
        mt-=dt;cd-=dt;
        if(auto&&!ball&&cd<=0&&Math.abs(hx+hd*sp2*.55-W/2)<hw()*.14)shoot()},
      draw(){bg('#3b2a7d','#1b1448');ctx.fillStyle='rgba(255,201,60,.12)';ctx.fillRect(0,H-40,W,40);const w=hw(),y=hy();
        rr(hx-w/2-8,y-74,w+16,70,10);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=4;ctx.strokeStyle='#DCE0F7';ctx.stroke();
        ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=2;for(let k=0;k<=4;k++){ctx.beginPath();ctx.moveTo(hx-w/2+k*w/4,y);ctx.lineTo(hx-w*.3+k*w*.6/4,y+30);ctx.stroke()}
        ctx.strokeStyle='#FF8A00';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(hx-w/2,y);ctx.lineTo(hx+w/2,y);ctx.stroke();ctx.lineCap='butt';
        if(ball){const t=ball.t,yy=by()+(y-by())*t-Math.sin(t*Math.PI)*30;emo(g.emoji,W/2,yy,44*(1-.35*t))}else emo(g.emoji,W/2,by(),44);
        if(mt>0)txt(msg,W/2,H*.55,Math.min(36,W/9),msg==='Miss'?'#FF5C7A':'#1FD39A')}}},
  collect(){let me=null,items=[],sp=0,mouse=null;
    const mv=(x,y)=>{mouse={x,y:clamp(y,H*.45,H-30)}};
    return{down:mv,move:mv,key(k){const b=me||{x:W/2,y:H-60};if(k==='ArrowLeft')mv(b.x-100,b.y);if(k==='ArrowRight')mv(b.x+100,b.y);if(k==='ArrowUp')mv(b.x,b.y-80);if(k==='ArrowDown')mv(b.x,b.y+80)},
      step(dt){if(!me)me={x:W/2,y:H-60};sp-=dt;if(sp<=0){sp=rnd(.3,.6);items.push({x:rnd(24,W-24),y:-24,vy:rnd(90,150)+Math.min(S.t,30)*3,bad:Math.random()<.32})}
        items.forEach(i=>i.y+=i.vy*dt);let t=mouse;
        if(auto){const best=items.filter(i=>!i.bad&&i.y<me.y).sort((a,b)=>b.y-a.y)[0];let tx=best?best.x:W/2;items.filter(i=>i.bad&&i.y<me.y&&me.y-i.y<130&&Math.abs(i.x-tx)<46).forEach(i=>{tx+=(tx<i.x?-1:1)*60});t={x:clamp(tx,24,W-24),y:H-60}}
        if(t){me.x+=(t.x-me.x)*Math.min(1,dt*9);me.y+=(t.y-me.y)*Math.min(1,dt*9)}
        me.x=clamp(me.x,24,W-24);
        items=items.filter(i=>{if(Math.hypot(i.x-me.x,i.y-me.y)<34){if(i.bad){S.score=Math.max(0,S.score-3);S.flash=.35}else S.score++;return false}return i.y<H+30})},
      draw(){bg('#3a1d6e','#14112B');ctx.fillStyle='rgba(255,255,255,.4)';for(let i=0;i<22;i++)ctx.fillRect((i*83)%W,(i*61+S.t*12)%H,2,2);
        items.forEach(i=>emo(i.bad?'👻':'🪙',i.x,i.y,34));if(me)emo(g.emoji,me.x,me.y,46)}}}
  };
  const eng=F[kind]();
  const label=kind==='duel'?'Rounds ':kind==='runner'?'Meters ':'Score ';
  const hud=()=>{if(auto)return;ctx.fillStyle='#fff';ctx.font='800 22px Sora, system-ui, sans-serif';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(label+Math.floor(S.score),14,10);ctx.textAlign='right';ctx.fillText(Math.ceil(S.time)+'s',W-14,10)};
  const L=runLoop(cv,(w,h)=>{W=w;H=h},dt=>{
    if(auto&&reduced&&S.n++>90)return;
    if(!S.over){S.t+=dt;if(!auto){S.time-=dt;if(S.time<=0){S.time=0;S.over=true;setTimeout(()=>o.onEnd&&o.onEnd(Math.floor(S.score)),250)}}eng.step(dt)}
    eng.draw();
    if(S.flash>0){ctx.fillStyle='rgba(255,60,90,'+Math.min(S.flash,.35)+')';ctx.fillRect(0,0,W,H);S.flash-=dt}
    hud();
  });
  const pos=e=>{const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
  const pd=e=>{if(S.over)return;const[x,y]=pos(e);if(eng.down)eng.down(x,y)};
  const pm=e=>{if(S.over||!eng.move)return;const[x,y]=pos(e);eng.move(x,y)};
  const kd=e=>{if(S.over)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();if(eng.key)eng.key(e.key)};
  if(!auto){cv.addEventListener('pointerdown',pd);cv.addEventListener('pointermove',pm);addEventListener('keydown',kd)}
  return{stop(){L.stop();cv.removeEventListener('pointerdown',pd);cv.removeEventListener('pointermove',pm);removeEventListener('keydown',kd)}};
}
window.EGFDemo={mount:mountGame};
})();
