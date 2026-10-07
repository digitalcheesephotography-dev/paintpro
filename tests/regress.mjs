// PaintPro regression gate. Run it before every push that touches pricing,
// saving, the bid or layout. It exits non-zero on any failure.
//
//   cd <repo> && npx --yes http-server -p 8123 -s -c-1 . &
//   node tests/regress.mjs
//
// Needs Playwright + Chromium (preinstalled in Claude Code cloud sessions at
// /opt/node22/lib/node_modules/playwright; set PLAYWRIGHT_PATH to override)
// and the app served at PAINTPRO_URL (default below). Nothing here ships to
// the phone - it is a dev-only check, not part of the app.
//
// What it guards (each line is a bug that actually happened):
//   1. Robin Caster exterior benchmark (CLAUDE.md section 10)
//   2. Walls / trim / crown / cabinets math at James's own rates
//   3. Totals strip, bid and QuickBooks copy agree to the cent
//   4. A job survives a reload with every input repopulated
//   6. Share/Text, Email and the Pro Proposal carry the bid's total
//   7. Guard rails: no unnamed signature requests, two-wall warning,
//      mode switch asks first, a measured deck can't be hidden
//   8. Data safety typed into real inputs: wall ids after reload,
//      section boxes keep every digit, no phantom extras, no negative
//      money, "$2.00" rates, Start New Job never overwrites another job
//   5. No sideways scroll on any tab at 380px / 880px, no page errors
const PW = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = (await import(PW)).default;
const URL = process.env.PAINTPRO_URL || 'http://127.0.0.1:8123/PaintPro-ZFold.html';
const fails=[]; const ok=(c,m)=>{ if(!c) fails.push(m); else console.log('  ✓ '+m); };
const errs=[];
const b=await chromium.launch();
async function mk(w,h=900){ const c=await b.newContext({viewport:{width:w,height:h}}); const p=await c.newPage();
  for(const g of ['**://fonts.googleapis.com/**','**://fonts.gstatic.com/**','**://*.gstatic.com/**','**://*.googleapis.com/**']) await p.route(g,r=>r.abort());
  p.on('dialog',d=>d.accept());
  p.on('pageerror',e=>errs.push(`[${w}] pageerror: ${e.message}`));
  p.on('console',m=>{ if(m.type()==='error'&&!/Failed to load resource|ERR_FAILED|firebase|Firebase/i.test(m.text())) errs.push(`[${w}] console: ${m.text()}`); });
  await p.goto(URL,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof window.calc==='function',{timeout:20000});
  await p.evaluate(()=>{ try{localStorage.clear();}catch(e){} });
  await p.reload({waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof window.calc==='function',{timeout:20000});
  return p; }
const reset = p => p.evaluate(()=>{ rooms.length=0; roomCount=0; document.getElementById('rooms-container').innerHTML=''; jobLineItems=[]; if(typeof renderLineItems==='function') renderLineItems(); });

const p=await mk(380);

console.log('1. Robin Caster exterior benchmark');
const e=await p.evaluate(()=>{
  switchMode('exterior'); rooms.length=0; roomCount=0; document.getElementById('rooms-container').innerHTML='';
  const sides=[[['54','10']],[['26','12'],['28','10'],['11','10']],[['31','14']],[['28','16'],['10','12'],['9','11'],['7','11'],['11','11']]];
  sides.forEach((w,i)=>{addRoom(); const r=rooms[i]; r.walls=w.map(([ft,ht],j)=>({id:`w${i}_${j}`,ft,ht})); r.surfaces={walls:true,ceiling:false,trim:false,floor:false};});
  rooms[0].porchCeilSections=[{id:'p1',l:'11',w:'9'}]; rooms[0].deckSections=[{id:'d1',l:'11',w:'9'}];
  rooms[2].deckSections=[{id:'d2',l:'21',w:'14'},{id:'d3',l:'4',w:'11'}];
  rooms[2].railSections=[{id:'g1',lf:'21'},{id:'g2',lf:'14'},{id:'g3',lf:'15'},{id:'g4',lf:'22'}];
  rooms[2].treadCount='23'; recalcAll();
  const cs=rooms.map(calc); const ex=jobExtras();
  return {siding:cs.reduce((a,c)=>a+c.wallSF,0), per:cs.map(c=>Math.round(c.totalSF)), grand:Math.round(cs.reduce((a,c)=>a+c.totalSF,0)), rail:ex.railTotal, tread:ex.treadTotal};
});
ok(e.siding===2541,'siding 2541 (got '+e.siding+')');
ok(JSON.stringify(e.per)==='[738,702,772,865]','per side 738/702/772/865 (got '+e.per+')');
ok(e.grand===3077,'grand 3077 (got '+e.grand+')');
ok(Math.abs(e.rail-576)<0.01,'railings $576 (got '+e.rail+')');
ok(Math.abs(e.tread-345)<0.01,'treads $345 (got '+e.tread+')');

console.log('2. Interior: walls/trim/crown/cabinets math');
await p.evaluate(()=>switchMode('interior'));
await reset(p);
const i=await p.evaluate(()=>{
  addRoom(); const r=rooms[0]; r.name='Living'; r.height='9';
  r.walls=[{id:'w1',ft:'14',ht:''},{id:'w2',ft:'12',ht:''},{id:'w3',ft:'14',ht:''},{id:'w4',ft:'12',ht:''}];
  r.surfaces={walls:true,ceiling:false,floor:false,trim:true}; r.crownLF='52'; recalcAll();
  const a=calc(r);
  addRoom(); const k=rooms[1]; k.name='Kitchen'; k.cabDoors='24'; k.cabDrawers='6'; k.cabBoxes='8'; k.product='BM Advance (Cabinets/Trim)'; recalcAll();
  const c=calc(k);
  return {lab:+a.lab.toFixed(2), crown:a.crown.total, cab:c.cab.total, cabValid:c.valid, cabGal:c.gal};
});
ok(i.lab===1255.8,'living room labor $1,255.80 (walls 865.80 + trim 182 + crown 208) (got '+i.lab+')');
ok(i.crown===208,'crown 52 lf @ $4 = $208 (got '+i.crown+')');
ok(i.cab===3040,'cabinets 24/6/8 = $3,040 (got '+i.cab+')');
ok(i.cabValid && i.cabGal===2,'cabinets-only kitchen valid, 2 gal');

console.log('3. Totals agree: strip / bid / QuickBooks');
const t=await p.evaluate(()=>{
  document.getElementById('client-name').value='Test Client';
  job.doorCount='3'; job.winCount='2'; addJobLineItem('Sheetrock repair', 150); recalcAll();
  const cs=rooms.map(calc); const ex=jobExtras();
  const grand=cs.reduce((a,c)=>a+c.mat+c.lab,0)+ex.total;
  bidOpen=true; renderBid();
  const strip=document.getElementById('tot-grand').textContent;
  let cap=''; const real=navigator.clipboard&&navigator.clipboard.writeText;
  if(navigator.clipboard) navigator.clipboard.writeText=t=>{cap=t;return Promise.resolve();};
  copyBidForQuickBooks(); if(real) navigator.clipboard.writeText=real;
  const qb=(cap.match(/Estimate total: \$([\d,]+\.\d\d)/)||[])[1];
  const bidTxt=document.getElementById('bid-out').textContent;
  return {grand:+grand.toFixed(2), strip, qb, bidHasGrand: bidTxt.includes(fmt(grand))};
});
const money=n=>'$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
ok(t.strip===money(t.grand),'totals strip = '+money(t.grand)+' (got '+t.strip+')');
ok(t.qb && ('$'+t.qb)===money(t.grand),'QuickBooks total = grand (got $'+t.qb+')');
ok(t.bidHasGrand,'bid output shows grand total');

console.log('4. Persistence across reload');
const before=await p.evaluate(()=>{ saveActiveJob(); return +rooms.map(calc).reduce((a,c)=>a+c.total,0).toFixed(2)+jobExtras().total; });
await p.reload({waitUntil:'domcontentloaded'}); await p.waitForFunction(()=>typeof window.calc==='function'&&rooms.length>0,{timeout:20000});
const after=await p.evaluate(()=>({t:+rooms.map(calc).reduce((a,c)=>a+c.total,0).toFixed(2)+jobExtras().total,
  cab:document.getElementById(rooms[1].id+'_cabDoors')?.value, crown:document.getElementById(rooms[0].id+'_crownLF')?.value, li:jobLineItems.length}));
ok(Math.abs(before-after.t)<0.01,'job total survives reload ('+before+' → '+after.t+')');
ok(after.cab==='24' && after.crown==='52' && after.li===1,'cabinet/crown inputs + line items repopulate');

console.log('6. Everything the customer gets carries the same total');
const q=await p.evaluate(()=>{
  // Two products on purpose: the old proposal priced every gallon at room 1's paint.
  rooms[0].product='BM Regal Select (Int)'; rooms[1].product='BM Advance (Cabinets/Trim)'; recalcAll();
  const cs=rooms.map(calc); const ex=jobExtras();
  const grand=+(cs.reduce((a,c)=>a+c.mat+c.lab,0)+ex.total).toFixed(2);
  const bd=_bidPlainBreakdown();
  let shared=''; const realShare=navigator.share;
  navigator.share=o=>{shared=o.text;return Promise.resolve();};
  shareBid(); navigator.share=realShare;
  openProProposal();
  const off=_proCollect();
  document.getElementById('pp-show-paint').checked=true; _proTogglePaint();
  const on=_proCollect(); const note=document.getElementById('pp-paint-note').textContent;
  const html=proProposalHtml(off,true);
  _ppCloseModals();
  bidOpen=true; renderBid();
  const bidTxt=document.getElementById('bid-out').textContent;
  return { grand, bdGrand:+bd.grand.toFixed(2), shareHasGrand: shared.includes(fmt(grand)),
    shareHasDoors: /Doors \(3\)/.test(shared), shareHasRepair: /Sheetrock repair/.test(shared), shareHasPhantom0sf: /\b0 sf\b/.test(shared),
    proOff:+off.total.toFixed(2), proOn:+on.total.toFixed(2), discount:+on.discount.toFixed(2), note,
    proHasPaintLine: html.includes('All paint and materials for the project'),
    bidEmDash: bidTxt.includes('—'), bidPlaceholder: /\[Client Name\]|\[Job Address\]/.test(bidTxt),
    bidHasBM: /Benjamin Moore paints are used throughout/.test(bidTxt), bidLaborLabel: !document.getElementById('bid-out').innerHTML.includes('<span>Project Services</span>') };
});
ok(q.bdGrand===q.grand,'Share/Email breakdown total = bid total '+money(q.grand)+' (got '+money(q.bdGrand)+')');
ok(q.shareHasGrand && q.shareHasDoors && q.shareHasRepair,'Share/Text shows the real total, doors and custom charges');
ok(!q.shareHasPhantom0sf,'Share/Text has no phantom "0 sf" rows');
ok(Math.abs(q.proOff-q.grand)<0.005,'proposal (default, paint folded in) = bid total (got '+money(q.proOff)+')');
ok(q.proHasPaintLine,'proposal shows a Paint & Materials line so the lines add up');
ok(q.discount>0 && Math.abs(q.proOn-(q.grand-q.discount))<0.06 && q.note.includes(money(q.discount)),'showing paint states the Volume Discount in dollars ('+money(q.discount)+')');
ok(!q.bidEmDash,'no em dashes in the bid');
ok(!q.bidPlaceholder,'no [Client Name] placeholders in the bid');
ok(!q.bidHasBM && !q.bidLaborLabel,'bid names the real products and says Project Services, not Labor');

console.log('7. Guard rails');
const g=await p.evaluate(async()=>{
  const out={};
  // Sending for signature with no client name is refused
  document.getElementById('client-name').value='';
  let sent=false; const real=window._sendProposal; window._sendProposal=()=>{sent=true;};
  await createProposal(); window._sendProposal=real; out.noNameBlocked=!sent;
  document.getElementById('client-name').value='Test Client';
  // Two walls -> warning
  rooms.length=0; roomCount=0; document.getElementById('rooms-container').innerHTML=''; addRoom();
  rooms[0].walls=[{id:'a',ft:'12',ht:''},{id:'b',ft:'14',ht:''}]; renderWalls(rooms[0]);
  out.twoWallWarn=!!document.querySelector('#'+rooms[0].id+'_walls .wall-tip.warn');
  rooms[0].walls.push({id:'c',ft:'12',ht:''},{id:'d',ft:'14',ht:''}); renderWalls(rooms[0]);
  out.fourWallsQuiet=!document.querySelector('#'+rooms[0].id+'_walls .wall-tip');
  return out;
});
ok(g.noNameBlocked,'Send for Signature refuses a blank client name');
ok(g.twoWallWarn && g.fourWallsQuiet,'two-wall warning shows, and clears at four walls');
let dialogs=0; p.on('dialog',()=>{dialogs++;});
const m=await p.evaluate(()=>{
  rooms.length=0; roomCount=0; document.getElementById('rooms-container').innerHTML=''; addRoom();
  rooms[0].cabDoors='24'; rooms[0].walls=[]; recalcAll(); return true; });
await p.evaluate(()=>switchMode('exterior'));
ok(dialogs>=1,'switching modes on a cabinets-only job asks first');
const d=await p.evaluate(()=>{
  const r=rooms[0]; r.surfaces.floor=true; r.deckSections=[{id:'dz',l:'10',w:'10'}];
  renderDeckSections(r.id); recalcAll(); toggleSurf(r.id,'floor');
  return { visible: document.getElementById(r.id+'_deck_row').style.display!=='none', lab: calc(r).lab };
});
ok(d.visible && d.lab>0,'a measured deck stays visible when its toggle is turned off');
await p.evaluate(()=>switchMode('interior'));

console.log('8. Data safety (typed into the real inputs)');
// Wall ids survive a reload: add a wall after reopening and type into it
await p.evaluate(()=>{ rooms.length=0; roomCount=0; wallCount=0; document.getElementById('rooms-container').innerHTML=''; addRoom();
  ['14','12','14','12'].forEach(v=>addWall(rooms[0].id, v)); recalcAll(); saveActiveJob(); });
await p.reload({waitUntil:'domcontentloaded'}); await p.waitForFunction(()=>typeof window.calc==='function'&&rooms.length>0);
await p.evaluate(()=>{ setOpen(rooms[0].id,true); addWall(rooms[0].id); });
const newWall = await p.evaluate(()=>rooms[0].walls[rooms[0].walls.length-1].id);
await p.fill('#'+newWall+'_ft','20');
const w=await p.evaluate(()=>({ids:rooms[0].walls.map(x=>x.id), fts:rooms[0].walls.map(x=>x.ft), perim:rooms[0].walls.reduce((a,x)=>a+(parseFloat(x.ft)||0),0)}));
ok(new Set(w.ids).size===w.ids.length,'wall ids unique after reload ('+w.ids.join(',')+')');
ok(w.perim===72 && w.fts[0]==='14','new wall after reload gets its own number, Wall 1 untouched (perimeter '+w.perim+')');

// Exterior section boxes keep every digit when typed
await p.evaluate(()=>{ switchMode('exterior'); rooms.length=0; roomCount=0; document.getElementById('rooms-container').innerHTML=''; addRoom();
  const r=rooms[0]; r.surfaces.floor=true; toggleSurf(r.id,'floor'); toggleSurf(r.id,'floor'); addDeckSection(r.id); addSoffitSection(r.id); addPorchSection(r.id); addPergolaSection(r.id); });
const ids=await p.evaluate(()=>{ const r=rooms[0]; return {deck:r.deckSections[0].id, sof:r.soffitSections[0].id, por:r.porchCeilSections[0].id, per:r.pergolaSections[0].id}; });
await p.evaluate(()=>{ const r=rooms[0]; document.getElementById(r.id+'_deck_row').style.display=''; document.getElementById(r.id+'_porch_ceil_row').style.display=''; });
for (const k of ['deck','sof','por','per']) { await p.click('#'+ids[k]+'_l'); await p.keyboard.type('21'); await p.click('#'+ids[k]+'_w'); await p.keyboard.type('14'); }
const sec=await p.evaluate(()=>{ const r=rooms[0]; const f=a=>a[0].l+'x'+a[0].w; return {deck:f(r.deckSections), sof:f(r.soffitSections), por:f(r.porchCeilSections), per:f(r.pergolaSections), lab:document.getElementById(r.id+'_deck_total').textContent}; });
ok(sec.deck==='21x14' && sec.sof==='21x14' && sec.por==='21x14' && sec.per==='21x14','typing 21 x 14 keeps both digits in deck/soffit/porch/pergola (got '+[sec.deck,sec.sof,sec.por,sec.per]+')');
ok(sec.lab==='294 sf total','deck total label updates while typing ('+sec.lab+')');

// Leaving exterior clears exterior-only extras from the math, not just the boxes
const ph=await p.evaluate(()=>{ job.railLF='30'; job.treadCount='5'; switchMode('interior'); const e=jobExtras(); return e.railTotal+e.treadTotal; });
ok(ph===0,'no phantom railings/treads after Exterior -> Interior (extras $'+ph+')');

// Negatives never subtract money; "$2.00" is 2 dollars
const neg=await p.evaluate(()=>{ rooms.length=0; roomCount=0; document.getElementById('rooms-container').innerHTML=''; addRoom();
  const r=rooms[0]; r.crownLF='-52'; r.cabDoors='-5'; job.doorCount='-3'; recalcAll();
  const c=calc(r); const t=c.total+jobExtras().total;
  const before=rates.walls; updateGlobalRate('walls','$2.00'); const dollar=rates.walls; updateGlobalRate('walls',''); const cleared=rates.walls; updateGlobalRate('walls',String(before));
  job.doorCount=''; r.crownLF=''; r.cabDoors='';
  return {t, dollar, cleared}; });
ok(neg.t>=0,'negative crown/cabinets/doors never subtract money (total '+neg.t+')');
ok(neg.dollar===2 && neg.cleared===2,'"$2.00" in a rate box = $2.00; clearing the box does not save $0');

// Extras-only job still shows the Generate button
const xo=await p.evaluate(()=>{ rooms.length=0; roomCount=0; document.getElementById('rooms-container').innerHTML=''; addRoom(); jobLineItems=[]; addJobLineItem('Sheetrock repair',300); recalcAll();
  return document.getElementById('gen-btn').classList.contains('visible'); });
ok(xo,'a custom-charge-only job gets a Generate button');

// Start New Job never overwrites a different saved job
const nj=await p.evaluate(()=>{
  localStorage.removeItem('ingersoll_jobs_v1'); currentJobName='';
  const build=(client,walls)=>{ rooms.length=0; roomCount=0; document.getElementById('rooms-container').innerHTML=''; jobLineItems=[]; addRoom();
    document.getElementById('client-name').value=client; walls.forEach(v=>addWall(rooms[0].id,v)); recalcAll(); };
  build('Smith',['10','10']); document.getElementById('job-snapshot-name').value='Smith'; saveSnapshot();
  const newJob = () => { const c=window.confirm; window.confirm=()=>true; startNewJob(); window.confirm=c; };
  newJob();
  build('Jones',['30','30','30']); document.getElementById('job-snapshot-name').value='Jones'; saveSnapshot();
  const smith=jobsLoad().find(j=>j.name==='Smith'); loadSnapshot(smith.id);
  addWall(rooms[0].id,'15'); recalcAll();
  newJob();
  const perim=n=>{ const j=jobsLoad().find(x=>x.name===n); return j.rooms[0].walls.reduce((a,x)=>a+(parseFloat(x.ft)||0),0); };
  // An unnamed job with a client name is kept automatically
  build('Brown',['12','12','12','12']); newJob();
  return { smith:perim('Smith'), jones:perim('Jones'), brownKept: jobsLoad().some(j=>/^Brown - /.test(j.name)) };
});
ok(nj.jones===90,'Start New Job leaves the other saved job alone (Jones perimeter '+nj.jones+')');
ok(nj.smith===35,'Start New Job saves the open job under its own name (Smith perimeter '+nj.smith+')');
ok(nj.brownKept,'an unnamed job with a client name is kept in Jobs, not thrown away');

console.log('9. Round-two fixes (each one a bug found in review)');
const r2=await p.evaluate(()=>{
  const out={};
  const reset=()=>{ rooms.length=0; roomCount=0; document.getElementById('rooms-container').innerHTML=''; jobLineItems=[]; addRoom(); };
  let asked=0; const realConfirm=window.confirm;
  // A: a job with only a name and notes still asks before New Job clears it
  localStorage.removeItem('ingersoll_jobs_v1'); currentJobName=''; reset();
  document.getElementById('client-name').value=''; document.getElementById('job-address').value='';
  document.getElementById('notes').value='Customer wants a quote on the garage too';
  window.confirm=()=>{asked++; return false;}; startNewJob(); window.confirm=realConfirm;
  out.notesOnlyAsks = asked===1 && document.getElementById('notes').value.includes('garage');
  // D: Clear then New Job must not empty a named saved job
  reset(); document.getElementById('client-name').value='Smith'; ['10','10','10','10'].forEach(v=>addWall(rooms[0].id,v)); recalcAll();
  document.getElementById('job-snapshot-name').value='Smith'; saveSnapshot();
  window.confirm=()=>true; clearMeasurements(); startNewJob(); window.confirm=realConfirm;
  const sm=jobsLoad().find(j=>j.name==='Smith'); out.clearKeepsSaved = !!sm && sm.rooms[0].walls.length===4;
  // D2: a deleted open job does not come back
  const smith=jobsLoad().find(j=>j.name==='Smith'); window.confirm=()=>true; loadSnapshot(smith.id); deleteSnapshot(smith.id);
  addWall(rooms[0].id,'12'); startNewJob(); window.confirm=realConfirm;
  out.deletedStaysDeleted = !jobsLoad().some(j=>j.name==='Smith');
  // B: signed out, the account button signs IN and cannot wipe the phone
  renderSetupStatus(); out.acctSaysSignIn = (document.getElementById('acct-btn')||{}).textContent==='Sign In';
  // C: laser target follows the room, not its old position
  reset(); addRoom(); addRoom(); rooms[0].name='Kitchen'; rooms[1].name='Den'; rooms[2].name='Bath';
  rooms.forEach(r=>setOpen(r.id,false)); refreshRoomSelect(); document.getElementById('target-room').value='1';
  const denId=rooms[1].id; window.confirm=()=>true; removeRoom(rooms[0].id); window.confirm=realConfirm;
  const tv=parseInt(document.getElementById('target-room').value); out.laserStaysOnDen = rooms[tv] && rooms[tv].id===denId;
  // E: voice memos never print on the customer's bid
  reset(); rooms[0].cabDoors='10'; document.getElementById('client-name').value='Test';
  document.getElementById('notes').value='Two coats on the trim\n\n🎙 Sep 24: she is picky, add 10%'; recalcAll(); bidOpen=true; renderBid();
  const bt=document.getElementById('bid-out').textContent; out.memoHidden = !bt.includes('picky') && bt.includes('Two coats on the trim');
  // F: spoken hundreds with a unit after them
  out.h1=parseSpokenNumber('two hundred fifty feet'); out.h2=parseSpokenNumber('one hundred and five'); out.h3=parseSpokenNumber('three hundred square feet');
  // G: paint hidden always matches the bid, even after editing gallons with it shown
  reset(); rooms[0].cabDoors='24'; rooms[0].product='BM Advance (Cabinets/Trim)'; recalcAll();
  const grand=rooms.map(calc).reduce((a,c)=>a+c.mat+c.lab,0)+jobExtras().total;
  openProProposal(); const cb=document.getElementById('pp-show-paint'); cb.checked=true; _proTogglePaint();
  document.getElementById('pp-gal').value='20'; _proRecalc(); cb.checked=false; _proTogglePaint();
  out.paintOffMatches = Math.abs(_proCollect().total-grand)<0.005; _ppCloseModals();
  document.getElementById('notes').value='';
  return out;
});
ok(r2.notesOnlyAsks,'a job with only notes asks before Start New Job clears it');
ok(r2.clearKeepsSaved,'Clear then Start New Job leaves the named saved job intact');
ok(r2.deletedStaysDeleted,'a deleted open job does not come back on the next save');
ok(r2.acctSaysSignIn,'signed out, the account card offers Sign In (not a data-wiping Sign Out)');
ok(r2.laserStaysOnDen,'laser target stays on the same room after an earlier room is removed');
ok(r2.memoHidden,'voice memos stay off the customer bid; other notes still print');
ok(r2.h1===250 && r2.h2===105 && r2.h3===300,'spoken hundreds with units: 250 / 105 / 300 (got '+[r2.h1,r2.h2,r2.h3]+')');
ok(r2.paintOffMatches,'Pro Proposal with paint hidden matches the bid even after editing gallons');

console.log('10. Field round-two fixes');
const f2=await p.evaluate(()=>{
  const out={};
  rooms.length=0; roomCount=0; document.getElementById('rooms-container').innerHTML=''; jobLineItems=[]; addRoom();
  const r=rooms[0]; ['12','14','12','14'].forEach(v=>addWall(r.id,v)); toggleSurf(r.id,'ceiling'); toggleSurf(r.id,'trim'); recalcAll();
  out.footprint = r.floorLength==='12' && r.floorWidth==='14' && calc(r).floorSF===168;
  addRoom(); out.carries = rooms[1].surfaces.ceiling===true && rooms[1].surfaces.trim===true && rooms[1].coats===r.coats;
  // cabinets + crown kitchen: cabinet wording in QuickBooks and the proposal
  rooms.length=0; roomCount=0; document.getElementById('rooms-container').innerHTML=''; addRoom();
  Object.assign(rooms[0],{name:'Kitchen',cabDoors:'24',crownLF:'55'}); rooms[0].surfaces={walls:true,ceiling:false,floor:false,trim:false}; recalcAll();
  let cap=''; const real=navigator.clipboard.writeText; navigator.clipboard.writeText=t=>{cap=t;return Promise.resolve();};
  bidScopeText=''; copyBidForQuickBooks(); navigator.clipboard.writeText=real;
  out.qbCabinet = /bonding primer/.test(cap) && /crown molding/.test(cap) && !/minor wall repair/.test(cap);
  openProProposal(); const sc=document.getElementById('pp-scope').value; _ppCloseModals();
  out.proCabinet = /cabinet doors/.test(sc) && /crown molding/.test(sc) && !/patching/.test(sc);
  out.shareFlat = !/\([^)]*\(/.test(_bidPlainBreakdown().text.split('\n')[0]);
  // exterior: railings typed on a side are not asked for again
  switchMode('exterior'); rooms.length=0; roomCount=0; document.getElementById('rooms-container').innerHTML=''; addRoom();
  rooms[0].railSections=[{id:'rx',lf:'40'}]; job.railLF=''; recalcAll();
  const inp=document.getElementById('job-rail-lf'), sp=document.getElementById('job-rail-sides');
  out.railOnce = inp.style.display==='none' && /40 lf/.test(sp.textContent) && jobExtras().railTotal===320;
  switchMode('interior');
  return out;
});
ok(f2.footprint,'Ceiling on a 12,14,12,14 room fills 12 x 14 by itself (no silent $0 ceiling)');
ok(f2.carries,'the next room starts with the same surfaces and coats');
ok(f2.qbCabinet,'cabinets + crown job gets cabinet wording (primer, crown caulk) in QuickBooks');
ok(f2.proCabinet,'cabinets + crown job gets cabinet scope bullets in the Pro Proposal');
ok(f2.shareFlat,'Share / Text has no brackets inside brackets');
ok(f2.railOnce,'railings entered on a side are not asked for again in Exterior Extras');
// Laser shots must not pop the phone keyboard (James, Oct 2026)
const kb=await p.evaluate(async()=>{
  switchTab('estimate'); document.getElementById('target-field').value='wall';
  document.getElementById('client-name').focus();
  const before=rooms[0].walls.length;
  applyMeasurement(3,'3.00 ft'); await new Promise(r=>setTimeout(r,150));
  const a=document.activeElement, added=rooms[0].walls.length===before+1;
  rooms[0].walls.pop(); renderWalls(rooms[0]); recalcAll();
  return added && !(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
});
ok(kb,'a laser reading adds the wall and leaves no text box focused (no keyboard pop-up)');
// Trim footage box (James, Oct 2026): blank = perimeter, typed number wins
const tr=await p.evaluate(()=>{
  switchMode('interior'); rooms.length=0; roomCount=0; document.getElementById('rooms-container').innerHTML=''; addRoom();
  const r=rooms[0]; r.surfaces={walls:true,ceiling:false,floor:false,trim:false};
  ['14','12','14','12'].forEach(f=>r.walls.push({id:'tw'+f+Math.random(),ft:f,ht:''})); r.height='8';
  const off=calc(r).lab;
  toggleSurf(r.id,'trim');
  const rowShown=document.getElementById(r.id+'_trim_row').style.display!=='none';
  const auto=calc(r).trimLF;
  updateField(r.id,'trimLF','40');
  const typed=calc(r);
  r.walls=[]; const only=calc(r);
  return {rowShown, auto, typedLF:typed.trimLF, typedLab:+(typed.lab-off).toFixed(2), onlyValid:only.valid, onlyLab:+only.lab.toFixed(2)};
});
ok(tr.rowShown,'turning on Trim (Baseboard) shows a box to type the footage');
const tv=await p.evaluate(()=>{
  rooms.length=0; roomCount=0; document.getElementById('rooms-container').innerHTML=''; addRoom();
  const r=rooms[0]; r.surfaces.trim=false; renderWalls(r);
  const row=document.getElementById(r.id+'_trim_row'); const visible=row.offsetParent!==null && getComputedStyle(row).display!=='none';
  const box=document.getElementById(r.id+'_trimLF'); box.value='30'; box.dispatchEvent(new Event('input',{bubbles:true}));
  return {visible, on:r.surfaces.trim, btn:document.getElementById(r.id+'_st').classList.contains('on'), lf:calc(r).trimLF, valid:calc(r).valid};
});
ok(tv.visible,'baseboard box shows on a new room without tapping anything');
ok(tv.on && tv.btn && tv.lf===30 && tv.valid,'typing 30 in the baseboard box turns Baseboard on and prices 30 ft');
ok(tr.auto===52,'blank trim box uses the walls all the way around (52 ft)');
ok(tr.typedLF===40 && tr.typedLab===140,'typed 40 ft of trim prices at 40 x $3.50 = $140 ('+tr.typedLab+')');
ok(tr.onlyValid && tr.onlyLab===140,'a trim-only room with no walls still bids');
const tb=await p.evaluate(()=>{
  const r=rooms[0]; ['14','12','14','12'].forEach((f,i)=>r.walls.push({id:'tb'+i,ft:f,ht:''})); recalcAll();
  const c=calc(r); const items=_proRoomItems(r);
  const proSum=items.reduce((a,i)=>a+i.amount,0);
  renderBid(); const bid=document.getElementById('bid-out').textContent;
  return {match:Math.abs(proSum-(c.lab - (c.crown.total||0) - (c.cab.total||0)))<0.01, labels:items.map(i=>i.label).join('|'), bidSays:/Baseboard Trim/.test(bid), bidOld:/\bTrim\b/.test(bid.replace(/Baseboard Trim/g,'').replace(/Cabinets\/Trim/g,''))};
});
ok(tb.match,'typed trim footage: proposal room lines add up to the bid ('+tb.labels+')');
ok(tb.bidSays && !tb.bidOld,'interior bid says "Baseboard Trim", not just "Trim"');
const btn=await p.evaluate(()=>({int:document.getElementById(rooms[0].id+'_st').textContent.trim()}));
ok(btn.int==='Baseboard','interior trim button reads "Baseboard" (got '+btn.int+')');
// Doors & windows per room (James, Oct 2026), added up at the end
const dw=await p.evaluate(()=>{
  switchMode('interior'); rooms.length=0; roomCount=0; document.getElementById('rooms-container').innerHTML='';
  job={...JOB_DEFAULTS}; _syncJobInputs();
  addRoom(); addRoom();
  const a=rooms[0], b=rooms[1];
  ['14','12','14','12'].forEach((f,i)=>{a.walls.push({id:'da'+i,ft:f,ht:''}); b.walls.push({id:'db'+i,ft:f,ht:''});});
  updateField(a.id,'doorCount','2'); updateField(a.id,'winCount','3'); updateField(b.id,'doorCount','1');
  const ex=jobExtras();
  const hasBoxes=!!document.getElementById(a.id+'_doorCount') && !!document.getElementById(b.id+'_winCount');
  const card=document.getElementById('job-door-rooms').textContent, legacyHidden=document.getElementById('job-door-count').style.display==='none';
  const roomTot=document.getElementById(a.id+'_dw_total').textContent;
  // old job with a whole-job count still totals the same, plus the rooms
  job.doorCount='4'; const ex2=jobExtras();
  // survives save + reload of the snapshot
  const snap=JSON.parse(JSON.stringify(getJobSnapshot())); job.doorCount='';
  applyJobData(snap); const ex3=jobExtras();
  // voice "six doors" lands on the open room
  setOpen(rooms[1].id, true); processVoiceCommand('six doors');
  const vb=rooms[1].doorCount;
  return {hasBoxes, dc:ex.doorCount, wc:ex.winCount, dt:ex.doorTotal, wt:ex.winTotal, card, legacyHidden, roomTot, legacy:ex2.doorCount, reload:ex3.doorCount, vb};
});
ok(dw.hasBoxes,'every room card has its own Doors and Windows boxes');
ok(dw.dc===3 && dw.wc===3 && dw.dt===225 && dw.wt===150,'rooms add up: 3 doors $225, 3 windows $150 (got '+dw.dc+'/'+dw.wc+' $'+dw.dt+'/$'+dw.wt+')');
ok(/3 \(rooms\)/.test(dw.card) && dw.legacyHidden,'whole-job card shows the rooms\' total instead of a box to retype ('+dw.card+')');
ok(dw.roomTot==='$300.00','room card shows its own doors + windows price ('+dw.roomTot+')');
ok(dw.legacy===7,'an older job\'s whole-job door count still adds on top (got '+dw.legacy+')');
ok(dw.reload===7,'per-room doors survive a save and reload (got '+dw.reload+')');
ok(dw.vb==='6','voice "six doors" goes on the open room (got '+dw.vb+')');
// Closets (James, Oct 2026): walls, ceiling and baseboard inside each room's closets
const cl=await p.evaluate(()=>{
  switchMode('interior'); rooms.length=0; roomCount=0; document.getElementById('rooms-container').innerHTML='';
  job={...JOB_DEFAULTS}; _syncJobInputs(); addRoom();
  const r=rooms[0]; r.height='8'; r.name='Bedroom';
  ['14','12','14','12'].forEach((f,i)=>r.walls.push({id:'cw'+i,ft:f,ht:''})); renderWalls(r);
  const base=calc(r).lab;
  addCloset(r.id); const id=r.closets[0].id;
  const wBox=document.getElementById(id+'_l'); wBox.value='6'; wBox.dispatchEvent(new Event('input',{bubbles:true}));
  const sameBox = document.getElementById(id+'_l')===wBox;   // not rebuilt while typing
  document.getElementById(id+'_w').value='2'; updateCloset(r.id,id,'w','2');
  const c1=calc(r), add=+(c1.lab-base).toFixed(2);
  // walls 2*(6+2)*8=128sf*1.85=236.80, ceiling 12sf*1.65=19.80, baseboard 16lf*3.50=56 => 312.60
  toggleClosetSurf(r.id,'ceiling'); const noCeil=+(calc(r).lab-base).toFixed(2);
  toggleClosetSurf(r.id,'ceiling');
  renderBid(); const bid=document.getElementById('bid-out').textContent;
  const items=_proRoomItems(r), proSum=+items.reduce((a,i)=>a+i.amount,0).toFixed(2);
  const snap=JSON.parse(JSON.stringify(getJobSnapshot())); applyJobData(snap);
  const reload=+(calc(rooms[0]).lab-base).toFixed(2), boxBack=document.getElementById(rooms[0].closets[0].id+'_l')?.value;
  // laser: width then depth
  const r2=rooms[0]; addCloset(r2.id); const id2=r2.closets[1].id;
  armClosetShot(r2.id,id2,'l'); applyMeasurement(5.2,'5.2 ft'); applyMeasurement(3,'3 ft');
  const shot=[r2.closets[1].l, r2.closets[1].w];
  return {add, sameBox, noCeil, bidSays:/Closet \(walls, ceiling, baseboard\)/.test(bid), proSum, lab:+c1.lab.toFixed(2), reload, boxBack, shot};
});
const fresh=await p.evaluate(()=>{ rooms.length=0; roomCount=0; document.getElementById('rooms-container').innerHTML=''; addRoom(); const id=rooms[0].id;
  const vis=x=>{const e=document.getElementById(x); return !!e && e.offsetParent!==null;};
  return vis(id+'_cs_walls') && vis(id+'_cs_ceiling') && vis(id+'_cs_trim') && !!document.querySelector('#'+id+'_closet_sections input') && vis(id+'_closetDoors') && calc(rooms[0]).closet.lab===0; });
ok(fresh,'a new room shows Closet Walls / Ceiling / Baseboard, a size row and closet door boxes without tapping anything (and prices $0 until sized)');
// Tap a box, the laser fills that box instead of adding a wall (James, Oct 2026)
const tap=await p.evaluate(()=>{
  const r=rooms[0]; const cid=r.closets[0].id; r.height='8';
  r.walls.push({id:'tp1',ft:'14',ht:''}); renderWalls(r);
  document.getElementById('target-field').value='wall';
  const walls0=r.walls.length;
  document.getElementById(cid+'_l').focus();
  const glow=document.getElementById(cid+'_l').classList.contains('laser-target');
  applyMeasurement(6.2,'6.2 ft');
  const afterW={l:r.closets[0].l, walls:r.walls.length, kb:document.activeElement===document.getElementById(cid+'_l')};
  applyMeasurement(2,'2 ft');
  const afterD={w:r.closets[0].w, walls:r.walls.length};
  applyMeasurement(12,'12 ft');
  const afterNext=r.walls.length;
  // a wall's own height box
  const w0=r.walls[0].id; document.getElementById(w0+'_ht').focus(); applyMeasurement(9,'9 ft');
  const ht=r.walls[0].ht, wallsAfterHt=r.walls.length;
  // pressing a 📐 button after tapping a box hands control back to that button
  document.getElementById(cid+'_l').focus(); document.getElementById(r.id+'_height_shoot').click();
  const cleared=boxShotTarget===null;
  document.activeElement.blur?.();
  return {walls0, glow, afterW, afterD, afterNext, ht, wallsAfterHt, cleared, lab:+calc(r).closet.lab.toFixed(2)};
});
ok(tap.glow,'tapping a closet box lights it as the laser target');
ok(+tap.afterW.l===6 && tap.afterW.walls===tap.walls0 && !tap.afterW.kb,'laser fills the tapped closet width (6) and adds no wall, keyboard closed');
ok(+tap.afterD.w===2 && tap.afterD.walls===tap.walls0,'next shot goes to the closet depth (2), still no new wall');
ok(tap.afterNext===tap.walls0+1,'after that the laser goes back to adding walls');
ok(+tap.ht===9 && tap.wallsAfterHt===tap.walls0+1,'tapping a wall height box: laser fills that height, no new wall');
ok(tap.cleared,'pressing a 📐 button after tapping a box gives the laser back to that button');
ok(tap.lab===312.6,'the laser-filled closet prices like a typed one ($'+tap.lab+')');
// 🤖 Research in Claude: the whole estimate goes out as text with the same total as the bid
const rc=await p.evaluate(async()=>{
  const r=rooms[0]; r.name='Bedroom'; r.product=r.product||'BM Regal Select (Int)';
  document.getElementById('client-name').value='Test Client'; document.getElementById('notes').value='check ceiling stain';
  recalcAll(); renderBid();
  const t=buildClaudeResearchText();
  const btn=[...document.querySelectorAll('#bid-out button')].some(b=>/Research in Claude/.test(b.textContent));
  const cs=rooms.map(calc), ex=jobExtras(); const grand=cs.reduce((a,c)=>a+c.mat+c.lab,0)+ex.total;
  let shared=null, opened=null;
  navigator.share=async(o)=>{shared=o;}; await sendEstimateToClaude();
  navigator.share=undefined; window.open=(u)=>{opened=u;}; await sendEstimateToClaude();
  return {btn, hasRoom:/Bedroom: walls/.test(t), hasCloset:/Closet/.test(t), hasNotes:/check ceiling stain/.test(t), hasTotal:t.includes('estimate total '+fmt(grand)), ends:/What I want to research:$/.test(t), shared:!!(shared&&shared.text===t), opened:!!(opened&&opened.startsWith('https://claude.ai/new?q='))};
});
ok(rc.btn,'bid shows a 🤖 Research in Claude button');
ok(rc.hasRoom && rc.hasCloset && rc.hasNotes,'research text carries rooms, closets and notes');
ok(rc.hasTotal,'research text total matches the bid total');
ok(rc.ends,'research text ends with "What I want to research:" for James to finish');
ok(rc.shared && rc.opened,'sends through the phone share sheet, or opens claude.ai when there is no share sheet');
ok(cl.add===312.6,'a 6 x 2 closet at 8 ft adds walls $236.80 + ceiling $19.80 + baseboard $56 = $312.60 (got '+cl.add+')');
ok(cl.sameBox,'typing a closet size does not rebuild the box being typed in');
ok(cl.noCeil===292.8,'closet Ceiling button off takes the ceiling off (got '+cl.noCeil+')');
ok(cl.bidSays,'bid lists "Closet (walls, ceiling, baseboard)" on the room');
ok(cl.proSum===cl.lab,'proposal room lines add up to the bid with a closet ('+cl.proSum+' vs '+cl.lab+')');
ok(cl.reload===312.6 && cl.boxBack==='6','closet survives a save and reload with its boxes filled');
ok(+cl.shot[0]===5 && +cl.shot[1]===3,'laser shoots closet width then depth (got '+cl.shot.join(' x ')+')');
const cdw=await p.evaluate(()=>{
  const r=rooms[0]; const before=jobExtras();
  const shown=document.getElementById(r.id+'_closet_dw').style.display!=='none';
  const d=document.getElementById(r.id+'_closetDoors'); d.value='2'; d.dispatchEvent(new Event('input',{bubbles:true}));
  const w=document.getElementById(r.id+'_closetWins'); w.value='1'; w.dispatchEvent(new Event('input',{bubbles:true}));
  const after=jobExtras();
  const snap=JSON.parse(JSON.stringify(getJobSnapshot())); applyJobData(snap);
  return {shown, dAdd:after.doorCount-before.doorCount, wAdd:after.winCount-before.winCount, money:+(after.total-before.total).toFixed(2), reload:jobExtras().doorCount===after.doorCount,
          card:document.getElementById('job-door-rooms').textContent};
});
ok(cdw.shown,'closet section shows Closet doors / Closet windows boxes once a closet is added');
ok(cdw.dAdd===2 && cdw.wAdd===1 && cdw.money===200,'2 closet doors + 1 closet window add $150 + $50 to the job (got $'+cdw.money+')');
ok(cdw.reload && /\(rooms\)/.test(cdw.card),'closet doors survive reload and count in the Doors & Windows total ('+cdw.card+')');

console.log('5. Layout: no horizontal overflow, all tabs render');
for (const w of [380,880]) {
  const q = w===380 ? p : await mk(880);
  for (const tab of ['estimate','contacts','settings']) {
    const ov=await q.evaluate(t=>{ switchTab(t); return document.documentElement.scrollWidth-document.documentElement.clientWidth; }, tab);
    ok(ov<=0, `${w}px ${tab}: no sideways scroll (overflow ${ov}px)`);
  }
}
ok(errs.length===0,'no page/console errors'+(errs.length?': '+errs.slice(0,5).join(' | '):''));
await b.close();
console.log(fails.length ? '\n❌ FAILED ('+fails.length+'):\n - '+fails.join('\n - ') : '\n✅ ALL REGRESSION CHECKS PASSED');
process.exit(fails.length?1:0);
