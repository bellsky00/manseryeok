#!/usr/bin/env node
// ── 만세력 + 재물운 500명 시뮬레이션 ──────────────────────────────────────

// ══ 기본 데이터 ══════════════════════════════════════════════════════════════
const 천간   = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const 지지   = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const 천간_한글 = ['갑','을','병','정','무','기','경','신','임','계'];
const 지지_한글 = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
const 천간_오행 = ['木','木','火','火','土','土','金','金','水','水'];
const 지지_오행 = ['水','土','木','木','土','火','火','土','金','金','土','水'];
const 음양     = ['양','음','양','음','양','음','양','음','양','음'];
const 띠_이름  = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지'];

const 지지_정기 = [9,5,0,1,4,2,3,5,6,7,4,8];

const 지장간_MAP = [
  [null,null,9],[9,7,5],[4,2,0],[null,null,1],[1,9,4],[4,6,2],
  [null,5,3],[3,1,5],[5,8,6],[null,null,7],[7,3,4],[null,0,8],
];

const 장생_MAP = [11,6,2,9,2,9,5,0,8,3];
const 운성_이름 = ['장생','목욕','관대','건록','제왕','쇠','병','사','묘','절','태','양'];

const 역마_MAP = [2,11,8,5,2,11,8,5,2,11,8,5];
const 도화_MAP = [9,6,3,0,9,6,3,0,9,6,3,0];
const 원진_MAP = [7,6,9,8,11,10,1,0,3,2,5,4];
const 귀문_MAP = [1,0,7,6,5,4,3,2,9,8,11,10];

// 천을귀인 MAP (일간 기준)
const 천을귀인_MAP = [[1,7],[0,8],[11,9],[11,9],[1,7],[0,8],[7,1],[6,2],[5,3],[5,3]];
// 양인살 MAP (양간만)
const 양인_MAP = {0:3, 2:5, 4:5, 6:9, 8:11}; // 甲→卯,丙→巳,戊→巳,庚→酉,壬→亥
// 천주귀인 MAP (일간 기준)
const 천주_MAP = [5,6,5,6,5,6,5,6,5,6]; // 甲巳,乙午,丙巳,丁午...

function get12Unsung(stemIdx, branchIdx) {
  const start = 장생_MAP[stemIdx];
  const isYang = stemIdx % 2 === 0;
  let stage;
  if (isYang) stage = ((branchIdx - start) % 12 + 12) % 12;
  else stage = ((start - branchIdx) % 12 + 12) % 12;
  return 운성_이름[stage];
}

function unsungClass(name) {
  const strong = ['장생','관대','건록','제왕'];
  const weak   = ['병','사','묘','절'];
  if (strong.includes(name)) return 'strong';
  if (weak.includes(name)) return 'weak';
  return 'neutral';
}

const 절기_이름 = [
  '입춘','우수','경칩','춘분','청명','곡우',
  '입하','소만','망종','하지','소서','대서',
  '입추','처서','백로','추분','한로','상강',
  '입동','소설','대설','동지','소한','대한',
];

const SOLAR_TERMS = [
  [315,2,4,2],[330,2,19,3],[345,3,6,4],[0,3,21,3],[15,4,5,4],[30,4,20,5],
  [45,5,6,5],[60,5,21,6],[75,6,6,7],[90,6,21,7],[105,7,7,8],[120,7,23,8],
  [135,8,7,9],[150,8,23,10],[165,9,8,9],[180,9,23,10],[195,10,8,10],[210,10,23,10],
  [225,11,7,10],[240,11,22,11],[255,12,7,11],[270,12,22,0],[285,1,6,1],[300,1,20,1],
];

// ══ 태양황경 계산 ════════════════════════════════════════════════════════════
function solarLongitude(year, month, day, hour) {
  const jd = calcJD(year, month, day, hour);
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M  = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * Math.PI / 180;
  const C  = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
           + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
           + 0.000289 * Math.sin(3 * M);
  return ((L0 + C) % 360 + 360) % 360;
}

function calcJD(year, month, day, hour) {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5 + hour / 24;
}

function findSolarTerm(year, targetLon, approxMonth, approxDay) {
  let startDate = new Date(year, approxMonth - 1, Math.max(1, approxDay - 5));
  for (let offset = 0; offset < 15; offset++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + offset);
    const y = d.getFullYear(), mo = d.getMonth() + 1, dy = d.getDate();
    let lon0 = solarLongitude(y, mo, dy, 0);
    let lon1 = solarLongitude(y, mo, dy, 24);
    if (lon1 < lon0 - 300) lon1 += 360;
    let tgt = targetLon;
    if (lon0 > 300 && tgt < 60) tgt += 360;
    if (lon0 <= tgt && tgt < lon1) {
      let lo = 0, hi = 24;
      for (let i = 0; i < 50; i++) {
        const mid = (lo + hi) / 2;
        let lm = solarLongitude(y, mo, dy, mid);
        if (lon0 > 300 && lm < 60) lm += 360;
        if (lm < tgt) lo = mid; else hi = mid;
      }
      return { date: new Date(y, mo - 1, dy), hour: (lo + hi) / 2 };
    }
  }
  return { date: new Date(year, approxMonth - 1, approxDay), hour: 12 };
}

const termCache = {};
function getYearTerms(year) {
  if (termCache[year]) return termCache[year];
  const terms = SOLAR_TERMS.map(([lon, am, ad, bi]) => {
    const { date, hour } = findSolarTerm(year, lon, am, ad);
    return { date, hour, branch: bi };
  });
  termCache[year] = terms;
  return terms;
}

function termToDate(t) {
  const d = new Date(t.date);
  d.setTime(d.getTime() + t.hour * 3600 * 1000);
  return d;
}

// ══ 사주 계산 ════════════════════════════════════════════════════════════════
function yearPillar(birth) {
  const year = birth.getFullYear();
  const ipchun = termToDate(getYearTerms(year)[0]);
  const eff = birth >= ipchun ? year : year - 1;
  const idx60 = ((eff - 4) % 60 + 60) % 60;
  return [idx60 % 10, idx60 % 12];
}

function monthPillar(birth, yearStem) {
  const year = birth.getFullYear();
  const all = [];
  for (const y of [year - 1, year, year + 1]) {
    for (const t of getYearTerms(y)) all.push({ dt: termToDate(t), branch: t.branch });
  }
  all.sort((a, b) => a.dt - b.dt);
  let mb = all[all.length - 1].branch;
  for (let i = 0; i < all.length - 1; i++) {
    if (all[i].dt <= birth && birth < all[i + 1].dt) { mb = all[i].branch; break; }
  }
  const stemStart = [2,4,6,8,0][yearStem % 5];
  const ms = (stemStart + ((mb - 2 + 12) % 12)) % 10;
  return [ms, mb];
}

function dayPillar(birth) {
  const base = new Date(1900, 0, 1);
  const baseIdx = 10;
  let adj = new Date(birth);
  if (birth.getHours() === 23) adj.setDate(adj.getDate() + 1);
  const delta = Math.round(
    (new Date(adj.getFullYear(), adj.getMonth(), adj.getDate()) -
     new Date(base.getFullYear(), base.getMonth(), base.getDate())) / 86400000
  );
  const idx60 = ((baseIdx + delta) % 60 + 60) % 60;
  return [idx60 % 10, idx60 % 12];
}

function hourPillar(hour, dayStem) {
  const branch = hour === 23 ? 0 : Math.floor((hour + 1) / 2);
  const stemStart = [0,2,4,6,8][dayStem % 5];
  return [(stemStart + branch) % 10, branch];
}

function calcSaju(year, month, day, hour) {
  const birth = new Date(year, month - 1, day, hour, 0);
  const [ys, yb] = yearPillar(birth);
  const [ms, mb] = monthPillar(birth, ys);
  const [ds, db] = dayPillar(birth);
  const [hs, hb] = hourPillar(hour, ds);
  return { year, month, day, hour, stems:[ys,ms,ds,hs], branches:[yb,mb,db,hb],
           ys,yb,ms,mb,ds,db,hs,hb };
}

// ══ 십성 ═════════════════════════════════════════════════════════════════════
const ELEM_IDX = {'木':0,'火':1,'土':2,'金':3,'水':4};

function getTenGod(dayStem, targetStem) {
  if (dayStem === targetStem) return '비견';
  const dE = ELEM_IDX[천간_오행[dayStem]];
  const tE = ELEM_IDX[천간_오행[targetStem]];
  const same = (dayStem % 2) === (targetStem % 2);
  if (dE === tE)              return same ? '비견' : '겁재';
  if ((dE+1)%5 === tE)        return same ? '식신' : '상관';
  if ((dE+2)%5 === tE)        return same ? '편재' : '정재';
  if ((dE+3)%5 === tE)        return same ? '편관' : '정관';
  if ((dE+4)%5 === tE)        return same ? '편인' : '정인';
  return '';
}

function getBranchTenGod(dayStem, branchIdx) {
  return getTenGod(dayStem, 지지_정기[branchIdx]);
}

// ══ 공망 ═════════════════════════════════════════════════════════════════════
function calcGongmang(dayStem, dayBranch, branches) {
  const startBranch = ((dayBranch - dayStem) % 12 + 12) % 12;
  const gm1 = (startBranch + 10) % 12;
  const gm2 = (startBranch + 11) % 12;
  const pillarNames = ['연주','월주','일주','시주'];
  const affected = [];
  branches.forEach((b, i) => { if (b===gm1||b===gm2) affected.push(pillarNames[i]); });
  return { branches:[gm1,gm2], affected, isPillarGM: branches.map(b=>b===gm1||b===gm2) };
}

// ══ 신살 (재물운에 필요한 것만) ══════════════════════════════════════════════
function calcShinsalForWealth(yb, db, allBranches, ds) {
  // allBranches: [hb, db, mb, yb] (시일월연 순)
  const result = {
    역마살:  [false,false,false,false],
    도화살:  [false,false,false,false],
    원진살:  [false,false,false,false],
  };

  // 역마살 (년지/일지 기준)
  const tgtY_ym = 역마_MAP[yb], tgtD_ym = 역마_MAP[db];
  for (let i=0;i<4;i++) {
    if (allBranches[i]===tgtY_ym||allBranches[i]===tgtD_ym) {
      if (!(i===3&&allBranches[i]===tgtY_ym)&&!(i===1&&allBranches[i]===tgtD_ym))
        result.역마살[i]=true;
    }
  }
  // 도화살
  const tgtY_dw = 도화_MAP[yb], tgtD_dw = 도화_MAP[db];
  for (let i=0;i<4;i++) {
    if (allBranches[i]===tgtY_dw||allBranches[i]===tgtD_dw) {
      if (!(i===3&&allBranches[i]===tgtY_dw)&&!(i===1&&allBranches[i]===tgtD_dw))
        result.도화살[i]=true;
    }
  }
  // 원진살
  const tgtFromYear = 원진_MAP[yb], tgtFromDay = 원진_MAP[db];
  for (let i=0;i<4;i++) {
    if (allBranches[i]===tgtFromYear||allBranches[i]===tgtFromDay) {
      if (!(i===3&&allBranches[i]===tgtFromYear)&&!(i===1&&allBranches[i]===tgtFromDay))
        result.원진살[i]=true;
    }
  }
  // 천을귀인
  result.천을귀인 = [false,false,false,false];
  if (ds!==undefined) {
    const tgts = 천을귀인_MAP[ds];
    for (let i=0;i<4;i++) if (tgts.includes(allBranches[i])) result.천을귀인[i]=true;
  }
  // 양인살 (양간만)
  result.양인살 = [false,false,false,false];
  if (ds!==undefined && ds%2===0 && 양인_MAP[ds]!==undefined) {
    const tgt = 양인_MAP[ds];
    for (let i=0;i<4;i++) if (allBranches[i]===tgt) result.양인살[i]=true;
  }
  return result;
}

// ══ 신강/신약 ════════════════════════════════════════════════════════════════
function calcSingang(stems, branches) {
  const ds = stems[2];
  const dsElem = ELEM_IDX[천간_오행[ds]];
  function relation(elemIdx) {
    if (elemIdx===dsElem) return 1;
    if ((elemIdx+1)%5===dsElem) return 1;
    return -1;
  }
  function godCategory(god) {
    if (!god) return 'none';
    if (['비견','겁재'].includes(god)) return '비겁';
    if (['편인','정인'].includes(god)) return '인성';
    if (['식신','상관'].includes(god)) return '식상';
    if (['편재','정재'].includes(god)) return '재성';
    if (['편관','정관'].includes(god)) return '관살';
    return 'none';
  }
  const weights = { 연간:8, 월간:8, 시간:8, 연지:10, 월지:30, 일지:20, 시지:15 };
  let helpScore=0, drainScore=0;
  const stemPositions = [{name:'연간',idx:0},{name:'월간',idx:1},{name:'시간',idx:3}];
  for (const pos of stemPositions) {
    const god = getTenGod(ds, stems[pos.idx]);
    const cat = godCategory(god);
    const w = weights[pos.name];
    if (cat==='비겁'||cat==='인성') helpScore+=w; else drainScore+=w;
  }
  const branchPositions = [{name:'연지',idx:0},{name:'월지',idx:1},{name:'일지',idx:2},{name:'시지',idx:3}];
  for (const pos of branchPositions) {
    const jg = 지지_정기[branches[pos.idx]];
    const god = getTenGod(ds, jg);
    const cat = godCategory(god);
    const w = weights[pos.name];
    if (cat==='비겁'||cat==='인성') helpScore+=w; else drainScore+=w;
  }
  // 득령
  const monthBranchElem = ELEM_IDX[지지_오행[branches[1]]];
  const monthJeonggi = 지지_정기[branches[1]];
  const monthGod = getTenGod(ds, monthJeonggi);
  const monthCat = godCategory(monthGod);
  const deukryeong = relation(monthBranchElem)>0 || monthCat==='비겁' || monthCat==='인성';

  // 득지 (통근)
  let tonggeunCount=0;
  for (let i=0;i<4;i++) {
    const jg=지지_정기[branches[i]];
    const cat=godCategory(getTenGod(ds,jg));
    if (cat==='비겁'||cat==='인성') tonggeunCount++;
  }
  const deukji = tonggeunCount>=2;

  // 득세
  let helpStemCount=0;
  for (let i=0;i<4;i++) {
    if (i===2) continue;
    const cat=godCategory(getTenGod(ds,stems[i]));
    if (cat==='비겁'||cat==='인성') helpStemCount++;
  }
  const deukse = helpStemCount>=2;

  const diff = helpScore - drainScore;
  let resultClass;
  if (diff>10) resultClass='singang';
  else if (diff<-10) resultClass='sinyak';
  else resultClass='junghwa';
  return { resultClass, helpScore, drainScore, tonggeunCount, deukryeong, deukji, deukse };
}

// ══ 형충회합 (재물운 필요 부분만) ════════════════════════════════════════════
function calcHCHHForWealth(stems, branches) {
  const pillarLabels = ['연주','월주','일주','시주'];
  const results = [];

  // 삼합
  const 삼합_TRIPLES = [[[8,0,4],'水'],[[2,6,10],'火'],[[5,9,1],'金'],[[11,3,7],'木']];
  for (const [triple, elem] of 삼합_TRIPLES) {
    const matched = triple.filter(b => branches.includes(b));
    if (matched.length >= 2) {
      const pils = [];
      for (const b of matched) {
        branches.forEach((br,idx) => { if (br===b && !pils.includes(pillarLabels[idx])) pils.push(pillarLabels[idx]); });
      }
      results.push({
        type:'합', subtype: matched.length===3?'삼합':'반합(삼합)',
        chars: matched.map(b=>지지[b]).join(''),
        detail: pils.join('·') + (matched.length===3?' 삼합':' 반합') + '(' + elem + ')',
      });
    }
  }
  // 육합
  const 육합_PAIRS = [[0,1,'土'],[2,11,'木'],[3,10,'火'],[4,9,'金'],[5,8,'水'],[6,7,'火']];
  for (let i=0;i<4;i++) {
    for (let j=i+1;j<4;j++) {
      for (const [a,b,elem] of 육합_PAIRS) {
        if ((branches[i]===a&&branches[j]===b)||(branches[i]===b&&branches[j]===a)) {
          results.push({
            type:'합', subtype:'육합',
            chars: 지지[branches[i]]+지지[branches[j]],
            detail: pillarLabels[i]+'↔'+pillarLabels[j]+' 육합('+elem+')',
          });
        }
      }
    }
  }
  // 충
  for (let i=0;i<4;i++) {
    for (let j=i+1;j<4;j++) {
      if ((branches[i]+6)%12===branches[j]||(branches[j]+6)%12===branches[i]) {
        results.push({
          type:'충', subtype:'지지충',
          chars: 지지[branches[i]]+지지[branches[j]],
          detail: pillarLabels[i]+'↔'+pillarLabels[j]+' 충',
        });
      }
    }
  }
  // 형 (삼형살)
  const 삼형_SET = [[2,5,8],[1,10,7],[0,3]];
  for (const grp of 삼형_SET) {
    const matched = grp.filter(b=>branches.includes(b));
    if (matched.length>=2) {
      const pils=[];
      for (const b of matched) {
        branches.forEach((br,idx)=>{ if(br===b&&!pils.includes(pillarLabels[idx])) pils.push(pillarLabels[idx]); });
      }
      results.push({ type:'형', subtype:'삼형', chars:matched.map(b=>지지[b]).join(''), detail:pils.join('·')+' 형' });
    }
  }
  return results;
}

// ══ 대운 계산 ════════════════════════════════════════════════════════════════
function idx60fn(stem, branch) {
  for (let i=0;i<60;i++) { if (i%10===stem&&i%12===branch) return i; }
  return 0;
}

function calcDaeun(birth, yearStem, monthStem, monthBranch, gender) {
  const isYang = yearStem % 2 === 0;
  const isMale = gender === '남';
  const forward = (isYang&&isMale)||(!isYang&&!isMale);
  const year = birth.getFullYear();
  const allTerms = [];
  for (const y of [year-1,year,year+1]) {
    for (const t of getYearTerms(y)) allTerms.push(termToDate(t));
  }
  allTerms.sort((a,b)=>a-b);
  let prevTerm=allTerms[0], nextTerm=allTerms[allTerms.length-1];
  for (let i=0;i<allTerms.length-1;i++) {
    if (allTerms[i]<=birth&&birth<allTerms[i+1]) { prevTerm=allTerms[i]; nextTerm=allTerms[i+1]; break; }
  }
  const days = forward ? (nextTerm-birth)/86400000 : (birth-prevTerm)/86400000;
  const daeunAge = Math.round(days/3);
  const mIdx = idx60fn(monthStem, monthBranch);
  const dauns = [];
  for (let i=1;i<=12;i++) {
    const n = forward ? (mIdx+i)%60 : ((mIdx-i)%60+60)%60;
    dauns.push({ stem:n%10, branch:n%12, startAge:daeunAge+(i-1)*10, endAge:daeunAge+(i-1)*10+9 });
  }
  return { daeunAge, dauns };
}

function getYearPillar(year) {
  const idx = ((year-4)%60+60)%60;
  return { stem:idx%10, branch:idx%12 };
}

// ══ 재물운 엔진 ══════════════════════════════════════════════════════════════
const WEALTH_CROSS_MULT = {1:1.15,5:1.10,19:1.20,20:0.55};

// v2.4 선형 변환: base 50, ×0.88 스케일 (100점 문턱 raw≥57, 평균 유지)
function wRawToDisplay(raw) {
  return Math.min(100, Math.max(30, Math.round(50 + raw * 0.88)));
}

function wGetPercentile(d) {
  // v2.6 실측 500명 백분위 기반 보정
  if (d>=90) return {range:'상위 1~5%',  tier:'극상위 재물 구조', level:9};
  if (d>=80) return {range:'상위 6~10%', tier:'재물운 매우 강함', level:8};
  if (d>=75) return {range:'상위 11~20%',tier:'재물운 강함',      level:7};
  if (d>=67) return {range:'상위 21~35%',tier:'평균 이상',         level:6};
  if (d>=63) return {range:'상위 36~50%',tier:'평균',              level:5};
  if (d>=57) return {range:'상위 51~65%',tier:'평균 이하',         level:4};
  if (d>=50) return {range:'상위 66~80%',tier:'재물운 약함',       level:3};
  if (d>=43) return {range:'상위 81~90%',tier:'재물운 매우 약함',  level:2};
  return {range:'하위 10%',tier:'최하위',level:1};
}

// v2.5 가중치 — 맥락 조건 반영
function wCalcStage1(ip) {
  let s=0;
  if (ip.hasJaesung) {
    // 재성 유무: 기신이면 축소
    s += ip.jaesungIsGisin ? 4 : 12;
    // 재성 위치: 시지 가중치 축소
    const pm={ilji:11,wolji:8,yeonji:5,siji:3};
    if (ip.jaesungPos&&pm[ip.jaesungPos]) s+=pm[ip.jaesungPos];
    // 재성 종류
    if (ip.jaesungType==='jeongjae') s+=6;
    else if (ip.jaesungType==='pyeonjae') s+=3;
    // 재성 개수 세분화 (v2.6: 강화)
    if (ip.jaesungCount>=3) s+=12;
    else if (ip.jaesungCount===2) s+=8;
    else s+=2; // 1개
    // 천간 투출: 드러난 재성이 숨은 재성보다 강함
    if (ip.jaesungTianchuan) s+=9;
    // 용신/기신
    if (ip.jaesungIsYongsin) s+=9;
    else if (ip.jaesungIsGisin) s+=-6;
    // 12운성: 재성이 강한 자리에 앉으면 가점
    if (ip.jaesungUnsungClass==='strong') s+=3;
    // 지장간 잠재 재성
    if (ip.jijangganJaeCount>=2) s+=3;
    else if (ip.jijangganJaeCount===1) s+=1;
  } else {
    s+=9; // 재성 미투출 기본점
    // 지장간에 재성이 숨어있으면 가점
    if (ip.jijangganJaeCount>=1) s+=2;
  }
  return s;
}
function wCalcStage2(ip) {
  let s=0;
  // 식상 존재: 신약이면 기운 빠짐, 합묶임이면 생재 흐름 차단
  if (ip.hasSiksangwan) {
    if (ip.balance==='sinyak') s+=3;
    else if (ip.jaesungHapMukim) s+=3; // 재성 합묶임 → 식신생재 경로 차단
    else s+=9;
  }
  // 지장간 잠재 식상
  if (!ip.hasSiksangwan && ip.jijangganSikCount>=1) s+=2;
  // 재성합: 합묶임이면 재물이 묶여 패널티 강화
  if (ip.jaesungHap) {
    s += ip.jaesungHapMukim ? -6 : 6;
  }
  // 신강/신약/중화 세분화
  if (ip.balance==='junghwa') s+=12;
  else if (ip.balance==='singang') s+=9;  // 기존 6→9
  else s+=3; // 신약 기존 6→3
  // 12운성: 일간이 강한 자리(건록/제왕)이면 재성 컨트롤 가점
  if (ip.ilganUnsungClass==='strong') s+=2;
  // 통근 수에 따른 세분화
  if (ip.tonggeunCount>=3) s+=2; // 극신강 통근
  return s;
}
function wCalcStage3(ip) {
  let s=0;
  // 비겁: 신약이면 오히려 보호, 재성 2개+이면 완화
  let biPenalty=0;
  if (ip.bigyeobCount>=3) biPenalty=-15;
  else if (ip.bigyeobCount===2) biPenalty=-8;
  if (biPenalty<0) {
    if (ip.balance==='sinyak') biPenalty=Math.round(biPenalty*0.3*10)/10; // 신약→비겁은 보호
    else if (ip.jaesungCount>=2) biPenalty=Math.round(biPenalty*0.5*10)/10; // 재성 충분→분산 가능
  }
  s+=biPenalty;
  // 재성충: 기신 재성이면 충거=좋은 것, 합이 동시에 있으면 완화, 천을귀인 동주면 완화
  if (ip.jaesungChung) {
    if (ip.jaesungIsGisin) {
      s+=4; // 기신 충거 = 오히려 좋음
    } else {
      let chungPenalty=-12;
      if (ip.jaesungHap) chungPenalty=Math.round(chungPenalty*0.5*10)/10; // 합이 동시→완화
      if (ip.chuneulJaesungDongju) chungPenalty=Math.round(chungPenalty*0.6*10)/10; // 귀인 보호
      s+=chungPenalty;
    }
  }
  // 편관: 식신제살이면 대폭 완화, 재생관 구조면 완화
  if (ip.pyeongwanPos==='wolgan') {
    if (ip.siksinjeSal) s+=-4; // 식신제살 → -11 → -4
    else if (ip.hasJaesung) s+=-7; // 재생관 구조 → 약간 완화
    else s+=-11;
  } else if (ip.hasPyeongwan) {
    s += ip.siksinjeSal ? -2 : -5;
  }
  // 양인살: 재물 쟁탈 패널티
  if (ip.hasYanginSal) {
    s += ip.yanginJaesungDongju ? -4 : -2;
  }
  return s;
}
function wCalcStage4(ip) {
  let s=0;
  // 대운 재성: 원국에 재성 없으면 활용도 낮음
  if (ip.daeunJaesung) {
    if (!ip.hasJaesung) s += 6;
    else if (ip.jaesungHapMukim) s += 8; // 합묶임 → 대운재성 활용 제한
    else s += 12;
  } else if (ip.daeunGwansal) {
    s += ip.siksinjeSal ? -2 : -8; // 식신제살 → 관살 대운도 활용 가능
  }
  // 세운
  if (ip.seunJaesung) s+=8;
  else if (ip.seunGwansal) {
    s += ip.siksinjeSal ? -1 : -5;
  }
  if (ip.daeunSeunHap) s+=3;
  // 득령: 월지 도움이면 계절적 안정 가점
  if (ip.deukryeong && ip.hasJaesung) s+=2;
  return s;
}
function wCalcStage5(ip) {
  let s=0;
  const els=[
    {key:'gongmang',  pos:8, neg:-8, pP:.5,pN:.5},
    {key:'wonjinsal', pos:3, neg:-9, pP:.3,pN:.7},
    {key:'dowhaSal',  pos:6, neg:-3, pP:.6,pN:.4},
    {key:'yeokmaSal', pos:5, neg:-5, pP:.5,pN:.5},
  ];
  if (ip.yeokmaGongmang) { const ym=els.find(e=>e.key==='yeokmaSal'); if(ym){ym.pP=.7;ym.pN=.3;} }
  els.forEach(el=>{ if(ip[el.key]) s+=Math.round((el.pos*el.pP+el.neg*el.pN)*10)/10; });
  // 천을귀인: 재물 보호
  if (ip.hasChuneulGwiin) s+=2;
  return s;
}
function wCalcCross(ip, s1Score) {
  let s1Adj=s1Score, extra=0;
  // 이중합이면 재성이 묶여 식신생재 흐름 차단 → 배율 적용 안 함
  if (!ip.jaesungDoubleHap) {
    if (ip.hasSiksangwan&&ip.hasJaesung&&ip.siksangwanType==='siksin') {
      const f=WEALTH_CROSS_MULT[1]; s1Adj=Math.round(s1Adj*f*10)/10;
    } else if (ip.hasSiksangwan&&ip.hasJaesung&&ip.siksangwanType==='sanggwan') {
      const f=WEALTH_CROSS_MULT[5]; s1Adj=Math.round(s1Adj*f*10)/10;
    }
    if (ip.hasSiksangwan&&ip.hasJaesung&&ip.siksangwanType==='siksin'&&ip.balance==='singang') {
      const f=WEALTH_CROSS_MULT[19]; s1Adj=Math.round(s1Adj*(f/WEALTH_CROSS_MULT[1])*10)/10;
    }
  }
  if (ip.jaesungCount>=2&&ip.balance==='sinyak') {
    s1Adj=Math.round(s1Adj*0.55*10)/10;
  }
  // 인성과다: 식상 없으면 직접 생재 차단 아니므로 축소
  if (ip.insungCount>=3&&ip.hasJaesung) extra+=(ip.hasSiksangwan?-8:-3);
  if (ip.bigyeobCount>=2&&ip.jaesungCount===1) extra+=(ip.bigyeobCount>=3?-5:-2);
  if (ip.yeokmaJaesungDongju) extra+=8;
  if (ip.dowhaByeonjaeDonju) extra+=-6;
  if (ip.wonjinJaesungDongju) extra+=-9;
  if (ip.dowhaJeongjaeDonju) extra+=5;
  if (ip.yeokmaPyeongwanDongju) extra+=-6;
  if (ip.jaesungChung&&ip.jaesungPos) {
    const pm={ilji:11,wolji:8,yeonji:5,siji:5};
    const orig=pm[ip.jaesungPos]||0;
    extra+=Math.round(orig*.4*10)/10-orig;
  }
  // v2.6: 합묶임 → s1Adj 전체 축소 (이중합이면 더 강하게)
  if (ip.jaesungHapMukim) {
    const mult = ip.jaesungDoubleHap ? 0.35 : 0.6;
    s1Adj = Math.round(s1Adj * mult * 10) / 10;
  }
  if (ip.jaesungSiksangYeonHap) extra+=11;
  if (ip.jaesungGwansalYeonHap) extra+=-8;
  if (ip.samhapJaesung) extra+=12;
  if (ip.samhyeongJaesung) extra+=-12;
  // 편관월간+재성일지: 식신제살이면 면제
  if (ip.pyeongwanPos==='wolgan'&&ip.jaesungPos==='ilji'&&!ip.siksinjeSal) extra+=-3.6;
  return {s1Adj, extra};
}

function calcWealth(ip) {
  const s1=wCalcStage1(ip), s2=wCalcStage2(ip), s3=wCalcStage3(ip), s4=wCalcStage4(ip), s5=wCalcStage5(ip);
  const cross=wCalcCross(ip,s1);
  let s2Adj=s2;
  if (ip.balance==='singang'&&!ip.hasJaesung) s2Adj=Math.round(s2*.7*10)/10;
  const rawTotal=cross.s1Adj+s2Adj+s3+s4+s5+cross.extra;
  const ds=wRawToDisplay(rawTotal);
  return { rawTotal:Math.round(rawTotal*10)/10, displayScore:ds, percentile:wGetPercentile(ds) };
}

// ══ 재물운 입력 자동 매핑 ════════════════════════════════════════════════════
function buildWealthInput(sj, sgData, daeunData, hchh, shinsal, gongmang, currentYear) {
  const ds = sj.ds;
  const { stems, branches } = sj;
  const [yb,mb,db,hb] = branches;
  // allPos: [연간,연지,월간,월지,일지,시간,시지]
  const allPos = [
    {god:getTenGod(ds,stems[0]),         type:'stem',  pi:0},
    {god:getBranchTenGod(ds,branches[0]),type:'branch',pi:0,bl:'yeonji'},
    {god:getTenGod(ds,stems[1]),          type:'stem',  pi:1},
    {god:getBranchTenGod(ds,branches[1]),type:'branch',pi:1,bl:'wolji'},
    {god:getBranchTenGod(ds,branches[2]),type:'branch',pi:2,bl:'ilji'},
    {god:getTenGod(ds,stems[3]),          type:'stem',  pi:3},
    {god:getBranchTenGod(ds,branches[3]),type:'branch',pi:3,bl:'siji'},
  ];

  const isJae  = g=>g==='편재'||g==='정재';
  const isSik  = g=>g==='식신'||g==='상관';
  const isBi   = g=>g==='비견'||g==='겁재';
  const isIn   = g=>g==='편인'||g==='정인';
  const isPwan = g=>g==='편관';
  const isGwan = g=>g==='편관'||g==='정관';

  const jaeList=allPos.filter(p=>isJae(p.god));
  const hasJaesung=jaeList.length>0;
  const jaesungCount=jaeList.length;
  const branchJae=jaeList.filter(p=>p.type==='branch');
  let jaesungPos='';
  for (const pr of ['ilji','wolji','yeonji','siji']) { if(branchJae.find(p=>p.bl===pr)){jaesungPos=pr;break;} }
  const jeongjae=jaeList.filter(p=>p.god==='정재').length;
  const pyeonjae=jaeList.filter(p=>p.god==='편재').length;
  const jaesungType=!hasJaesung?'':(jeongjae>=pyeonjae?'jeongjae':'pyeonjae');
  const balance=sgData.resultClass;
  const jaesungIsYongsin=hasJaesung&&balance==='singang';
  const jaesungIsGisin=hasJaesung&&balance==='sinyak';
  const sikList=allPos.filter(p=>isSik(p.god));
  const hasSiksangwan=sikList.length>0;
  const siksinCnt=sikList.filter(p=>p.god==='식신').length;
  const sanggwanCnt=sikList.filter(p=>p.god==='상관').length;
  const siksangwanType=!hasSiksangwan?'':(siksinCnt>=sanggwanCnt?'siksin':'sanggwan');
  const bigyeobCount=allPos.filter(p=>isBi(p.god)).length;
  const insungCount=allPos.filter(p=>isIn(p.god)).length;
  const hasPyeongwan=allPos.some(p=>isPwan(p.god));
  const pyeongwanPos=getTenGod(ds,stems[1])==='편관'?'wolgan':(hasPyeongwan?'other':'');

  const pillarNameMap=['연주','월주','일주','시주'];
  const jaePillarNames=[...new Set(jaeList.map(p=>pillarNameMap[p.pi]))];

  let jaesungHap=false,jaesungHapMukim=false,jaesungChung=false,samhapJaesung=false,samhyeongJaesung=false;
  let jaesungSiksangYeonHap=false,jaesungGwansalYeonHap=false;
  for (const h of hchh) {
    const inv=jaePillarNames.some(n=>h.detail&&h.detail.includes(n));
    if (h.type==='합'&&inv) {
      jaesungHap=true;
      if (h.subtype==='육합'||h.subtype==='반합(삼합)'||h.subtype==='삼합') jaesungHapMukim=true;
      if (h.subtype==='삼합') samhapJaesung=true;
    }
    if (h.type==='충'&&inv) jaesungChung=true;
    if (h.type==='형'&&inv) samhyeongJaesung=true;
  }

  const jaePillarsIdx=jaeList.map(p=>p.pi);
  // shinsal: { 역마살:[bool×4], 도화살:[bool×4], 원진살:[bool×4] }
  // 배열 순서: [시=0,일=1,월=2,연=3]
  const yeokmaPillars=shinsal.역마살;
  const dowhaPillars=shinsal.도화살;
  const wonjinPillars=shinsal.원진살;
  const yeokmaSal=yeokmaPillars.some(Boolean);
  const dowhaSal=dowhaPillars.some(Boolean);
  const wonjinsal=wonjinPillars.some(Boolean);
  // jaePillarsIdx: 0=연,1=월,2=일,3=시 → shinsal배열은 3=연,2=월,1=일,0=시 (반전)
  const jaeIdxInShinsal=jaePillarsIdx.map(i=>[3,2,1,0][i]);
  const yeokmaJaesungDongju=jaeIdxInShinsal.some(i=>yeokmaPillars[i]);
  const wonjinJaesungDongju=jaeIdxInShinsal.some(i=>wonjinPillars[i]);
  const dowhaByeonjaeDonju=allPos.filter(p=>p.god==='편재').map(p=>[3,2,1,0][p.pi]).some(i=>dowhaPillars[i]);
  const dowhaJeongjaeDonju=allPos.filter(p=>p.god==='정재').map(p=>[3,2,1,0][p.pi]).some(i=>dowhaPillars[i]);
  const yeokmaPyeongwanDongju=allPos.filter(p=>isPwan(p.god)).map(p=>[3,2,1,0][p.pi]).some(i=>yeokmaPillars[i]);
  const gongmangAffected=gongmang.affected.some(n=>jaePillarNames.includes(n));
  const yeokmaGongmang=yeokmaSal&&gongmang.affected.length>0;

  // 대운 분석
  const curAge=currentYear-sj.year;
  const curDaeun=daeunData.dauns.find(d=>curAge>=d.startAge&&curAge<=d.endAge);
  let daeunJaesung=false,daeunGwansal=false;
  if (curDaeun) {
    daeunJaesung=isJae(getTenGod(ds,curDaeun.stem))||isJae(getBranchTenGod(ds,curDaeun.branch));
    daeunGwansal=isGwan(getTenGod(ds,curDaeun.stem))||isGwan(getBranchTenGod(ds,curDaeun.branch));
  }
  const yp=getYearPillar(currentYear);
  const seunJaesung=isJae(getTenGod(ds,yp.stem))||isJae(getBranchTenGod(ds,yp.branch));
  const seunGwansal=isGwan(getTenGod(ds,yp.stem))||isGwan(getBranchTenGod(ds,yp.branch));
  let daeunSeunHap=false;
  if (curDaeun) {
    const pairs=[[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]];
    for (const [a,b] of pairs) {
      if ((curDaeun.branch===a&&yp.branch===b)||(curDaeun.branch===b&&yp.branch===a)){daeunSeunHap=true;break;}
    }
  }

  // ── 새 필드: 12운성 ──
  const ilganUnsung = get12Unsung(ds, db); // 일간의 일지 운성
  const ilganUnsungClass = unsungClass(ilganUnsung);
  // 재성 위치의 운성 (재성이 앉은 지지에서 재성 천간의 힘)
  let jaesungUnsung = '', jaesungUnsungClass = 'neutral';
  if (hasJaesung && jaesungPos) {
    const posMap = {ilji:2,wolji:1,yeonji:0,siji:3};
    const jaeBI = branches[posMap[jaesungPos]];
    const jaeStemIdx = 지지_정기[jaeBI]; // 재성의 정기
    jaesungUnsung = get12Unsung(jaeStemIdx, jaeBI);
    jaesungUnsungClass = unsungClass(jaesungUnsung);
  }

  // ── 새 필드: 지장간 재성/식상 (중기·여기 포함) ──
  let jijangganJaeCount = 0, jijangganSikCount = 0;
  for (let bi = 0; bi < 4; bi++) {
    const jj = 지장간_MAP[branches[bi]];
    for (let ji = 0; ji < jj.length; ji++) {
      if (jj[ji] === null) continue;
      if (ji === jj.length - 1) continue; // 정기는 이미 allPos에서 카운트
      const god = getTenGod(ds, jj[ji]);
      if (isJae(god)) jijangganJaeCount++;
      if (isSik(god)) jijangganSikCount++;
    }
  }

  // ── 새 필드: 통근 수, 득령/득지/득세 ──
  const tonggeunCount = sgData.tonggeunCount || 0;
  const deukryeong = sgData.deukryeong || false;
  const deukji = sgData.deukji || false;
  const deukse = sgData.deukse || false;

  // ── 새 필드: 천을귀인, 양인살 ──
  const chuneulPillars = shinsal.천을귀인 || [false,false,false,false];
  const yanginPillars = shinsal.양인살 || [false,false,false,false];
  const hasChuneulGwiin = chuneulPillars.some(Boolean);
  const hasYanginSal = yanginPillars.some(Boolean);
  // 천을귀인이 재성과 동주
  const chuneulJaesungDongju = jaeIdxInShinsal.some(i=>chuneulPillars[i]);
  // 양인이 재성과 동주
  const yanginJaesungDongju = jaeIdxInShinsal.some(i=>yanginPillars[i]);

  // ── 새 필드: 식신제살 (식신 + 편관 동시 존재) ──
  const siksinjeSal = hasSiksangwan && siksangwanType==='siksin' && hasPyeongwan;

  // ── v2.6 새 필드: 재성 천간 투출 여부 ──
  const jaesungTianchuan = jaeList.some(p => p.type === 'stem');

  // ── v2.6 새 필드: 재성 관련 합 개수 (이중합 판별) ──
  let jaesungHapCount = 0;
  for (const h of hchh) {
    const inv = jaePillarNames.some(n => h.detail && h.detail.includes(n));
    if (h.type === '합' && inv &&
        (h.subtype==='육합'||h.subtype==='반합(삼합)'||h.subtype==='삼합')) jaesungHapCount++;
  }
  const jaesungDoubleHap = jaesungHapCount >= 2; // 이중합 (辰酉合 + 子辰반합 등)

  return {
    hasJaesung,jaesungPos,jaesungType,jaesungCount,jaesungIsYongsin,jaesungIsGisin,
    hasSiksangwan,siksangwanType,jaesungHap,balance,bigyeobCount,jaesungChung,
    pyeongwanPos,hasPyeongwan,daeunJaesung,daeunGwansal,seunJaesung,seunGwansal,
    daeunSeunHap,gongmang:gongmangAffected,wonjinsal,dowhaSal,yeokmaSal,yeokmaGongmang,insungCount,
    yeokmaJaesungDongju,dowhaByeonjaeDonju,wonjinJaesungDongju,dowhaJeongjaeDonju,
    yeokmaPyeongwanDongju,jaesungHapMukim,jaesungSiksangYeonHap,jaesungGwansalYeonHap,
    samhapJaesung,samhyeongJaesung,
    // v2.5 새 필드
    ilganUnsungClass,jaesungUnsungClass,
    jijangganJaeCount,jijangganSikCount,
    tonggeunCount,deukryeong,deukji,deukse,
    hasChuneulGwiin,hasYanginSal,chuneulJaesungDongju,yanginJaesungDongju,
    siksinjeSal,
    // v2.6
    jaesungTianchuan,jaesungDoubleHap,jaesungHapCount,
  };
}

// ══ MD 파일 파싱 ════════════════════════════════════════════════════════════
function parseDataset(mdPath) {
  const fs = require('fs');
  if (!fs.existsSync(mdPath)) return null;
  const lines = fs.readFileSync(mdPath,'utf8').split('\n');
  const rows = [];
  for (const line of lines) {
    // 형식: | # | 생년 | 월 | 일 | 시 | 성별 | ...
    const m = line.match(/^\|\s*(\d+)\s*\|\s*(\d{4})\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)시\s*\|\s*(남|여)\s*\|/);
    if (!m) continue;
    rows.push({ id:+m[1], year:+m[2], month:+m[3], day:+m[4], hour:+m[5], gender:m[6] });
  }
  return rows.length>0 ? rows : null;
}

// ══ 랜덤 생성 + 전체 계산 ════════════════════════════════════════════════════
function randomInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }

function generateProfile(id, fixedYear, fixedMonth, fixedDay, fixedHour, fixedGender) {
  const year   = fixedYear  ?? randomInt(1980,2005);
  const month  = fixedMonth ?? randomInt(1,12);
  const maxDay = new Date(year,month,0).getDate();
  const day    = fixedDay   ?? randomInt(1,maxDay);
  const hour   = fixedHour  ?? randomInt(0,23);
  const gender = fixedGender ?? (Math.random()<0.5?'남':'여');
  const sj = calcSaju(year, month, day, hour);

  const sgData = calcSingang(sj.stems, sj.branches);
  const gongmang = calcGongmang(sj.ds, sj.db, sj.branches);
  const shinsal = calcShinsalForWealth(sj.yb, sj.db, [sj.hb,sj.db,sj.mb,sj.yb], sj.ds);
  const hchh = calcHCHHForWealth(sj.stems, sj.branches);
  const birth = new Date(year, month-1, day, hour, 0);
  const daeunData = calcDaeun(birth, sj.ys, sj.ms, sj.mb, gender);
  const CURRENT_YEAR = 2026;

  const ip = buildWealthInput(sj, sgData, daeunData, hchh, shinsal, gongmang, CURRENT_YEAR);
  const wealth = calcWealth(ip);

  const yearStr  = 천간[sj.ys]+지지[sj.yb];
  const monthStr = 천간[sj.ms]+지지[sj.mb];
  const dayStr   = 천간[sj.ds]+지지[sj.db];
  const hourStr  = 천간[sj.hs]+지지[sj.hb];

  return {
    id, year, month, day, hour, gender,
    pillars: `${yearStr} ${monthStr} ${dayStr} ${hourStr}`,
    yearPillar: yearStr, monthPillar: monthStr, dayPillar: dayStr, hourPillar: hourStr,
    singang: sgData.resultClass,
    rawTotal: wealth.rawTotal,
    displayScore: wealth.displayScore,
    tier: wealth.percentile.tier,
    range: wealth.percentile.range,
    level: wealth.percentile.level,
    hasJaesung: ip.hasJaesung,
    jaesungCount: ip.jaesungCount,
    balance: ip.balance,
    hasSiksangwan: ip.hasSiksangwan,
  };
}

// ══ 메인 실행 ════════════════════════════════════════════════════════════════
const fs_main = require('fs');
const path_main = require('path');
const DS_PATH = path_main.join(__dirname, 'saju_dataset_500.md');

const existingRows = parseDataset(DS_PATH);
const useFixed = existingRows && existingRows.length > 0;

if (useFixed) {
  console.log(`📂 기존 데이터셋 로드: ${existingRows.length}개 프로필 → 동일 사주로 재계산\n`);
} else {
  console.log('🀄 500명 만세력 + 재물운 시뮬레이션 시작 (랜덤 생성)...\n');
}

const profiles = [];
const TOTAL = useFixed ? existingRows.length : 500;
for (let i=1;i<=TOTAL;i++) {
  if (useFixed) {
    const r = existingRows[i-1];
    profiles.push(generateProfile(r.id, r.year, r.month, r.day, r.hour, r.gender));
  } else {
    profiles.push(generateProfile(i));
  }
  if (i%100===0) process.stdout.write(`${i}명 완료...\n`);
}

// 통계
const scores = profiles.map(p=>p.displayScore);
const avg = scores.reduce((a,b)=>a+b,0)/scores.length;
const sorted = [...scores].sort((a,b)=>a-b);
const median = sorted[Math.floor(sorted.length/2)];
const variance = scores.reduce((a,b)=>a+(b-avg)**2,0)/scores.length;
const stdDev = Math.sqrt(variance);
const min = Math.min(...scores);
const max = Math.max(...scores);

// 등급 분포
const tierCount = {};
profiles.forEach(p=>{ tierCount[p.tier]=(tierCount[p.tier]||0)+1; });

// 점수 구간 분포
const brackets = [{r:'20~29',min:20,max:29},{r:'30~39',min:30,max:39},{r:'40~49',min:40,max:49},
  {r:'50~59',min:50,max:59},{r:'60~69',min:60,max:69},{r:'70~79',min:70,max:79},
  {r:'80~89',min:80,max:89},{r:'90~100',min:90,max:100}];
const brackDist = brackets.map(b=>({range:b.r,count:scores.filter(s=>s>=b.min&&s<=b.max).length}));

// 특성 분포
const hasJaeCount = profiles.filter(p=>p.hasJaesung).length;
const singangCount = profiles.filter(p=>p.singang==='singang').length;
const sinyakCount = profiles.filter(p=>p.singang==='sinyak').length;
const junghwaCount = profiles.filter(p=>p.singang==='junghwa').length;
const siksCount = profiles.filter(p=>p.hasSiksangwan).length;

console.log('\n📊 === 점수 통계 ===');
console.log(`평균: ${avg.toFixed(1)}점`);
console.log(`중앙값: ${median}점`);
console.log(`표준편차: ${stdDev.toFixed(1)}`);
console.log(`최저: ${min}점 / 최고: ${max}점`);

console.log('\n📈 === 구간 분포 ===');
brackDist.forEach(b=>{ console.log(`${b.range}점: ${b.count}명 (${(b.count/TOTAL*100).toFixed(1)}%)`); });

console.log('\n🏅 === 등급 분포 ===');
const tierOrder=['극상위 재물 구조','재물운 매우 강함','재물운 강함','평균 이상','평균','평균 이하','재물운 약함','재물운 매우 약함','최하위'];
tierOrder.forEach(t=>{ if(tierCount[t]) console.log(`${t}: ${tierCount[t]}명 (${(tierCount[t]/TOTAL*100).toFixed(1)}%)`); });

console.log('\n📝 === 사주 특성 분포 ===');
console.log(`재성 있음: ${hasJaeCount}명 (${(hasJaeCount/TOTAL*100).toFixed(1)}%)`);
console.log(`신강: ${singangCount}명 (${(singangCount/TOTAL*100).toFixed(1)}%) | 중화: ${junghwaCount}명 | 신약: ${sinyakCount}명`);
console.log(`식상 있음: ${siksCount}명 (${(siksCount/TOTAL*100).toFixed(1)}%)`);

// ══ 마크다운 파일 생성 ═══════════════════════════════════════════════════════
let md = `# 만세력 재물운 시뮬레이션 데이터셋 (500명)\n\n`;
md += `생성일: ${new Date().toLocaleDateString('ko-KR')}\n\n`;
md += `---\n\n`;
md += `## 📊 통계 요약\n\n`;
md += `| 항목 | 값 |\n|---|---|\n`;
md += `| 총 인원 | 500명 |\n`;
md += `| 평균 점수 | ${avg.toFixed(1)}점 |\n`;
md += `| 중앙값 | ${median}점 |\n`;
md += `| 표준편차 | ${stdDev.toFixed(1)} |\n`;
md += `| 최저 점수 | ${min}점 |\n`;
md += `| 최고 점수 | ${max}점 |\n\n`;
md += `## 📈 점수 구간 분포\n\n`;
md += `| 구간 | 인원 | 비율 |\n|---|---|---|\n`;
brackDist.forEach(b=>{ md+=`| ${b.range}점 | ${b.count}명 | ${(b.count/TOTAL*100).toFixed(1)}% |\n`; });
md += `\n## 🏅 등급 분포\n\n`;
md += `| 등급 | 인원 | 비율 |\n|---|---|---|\n`;
tierOrder.forEach(t=>{ if(tierCount[t]) md+=`| ${t} | ${tierCount[t]}명 | ${(tierCount[t]/TOTAL*100).toFixed(1)}% |\n`; });
md += `\n## 🀄 전체 프로필 목록\n\n`;
md += `| # | 생년 | 월 | 일 | 시 | 성별 | 연주 | 월주 | 일주 | 시주 | 신강신약 | 원점수 | 표시점수 | 등급 |\n`;
md += `|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
profiles.forEach(p=>{
  md += `| ${p.id} | ${p.year} | ${p.month} | ${p.day} | ${p.hour}시 | ${p.gender} | ${p.yearPillar} | ${p.monthPillar} | ${p.dayPillar} | ${p.hourPillar} | ${p.singang==='singang'?'신강':p.singang==='sinyak'?'신약':'중화'} | ${p.rawTotal} | ${p.displayScore} | ${p.tier} |\n`;
});

fs_main.writeFileSync(DS_PATH, md, 'utf8');
console.log(`\n✅ 저장 완료: ${DS_PATH}`);
console.log(`📄 총 ${profiles.length}개 프로필 저장됨`);
