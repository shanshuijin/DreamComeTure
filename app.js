// ============================================================
// 今栖 NowNest v3
// ============================================================

// 自动清理最旧的含图片消息/动态来释放 localStorage 空间
function _freeStorageQuota() {
  try {
    var messages = JSON.parse(localStorage.getItem('mcard_messages')) || [];
    var moments = JSON.parse(localStorage.getItem('mcard_moments')) || [];
    // 收集所有含图片的条目，按时间戳排序（最旧在前）
    var items = [];
    messages.forEach(function(m, i) {
      if (m.imageData) items.push({ ts: m.timestamp || 0, key: 'mcard_messages', action: 'splice', idx: i });
    });
    moments.forEach(function(m, i) {
      if (m.imageDataList && m.imageDataList.length > 0) items.push({ ts: m.timestamp || 0, key: 'mcard_moments', action: 'splice', idx: i });
    });
    items.sort(function(a, b) { return a.ts - b.ts; });
    // 删除最旧的 3 条含图片数据
    var removed = 0;
    for (var k = 0; k < items.length && removed < 3; k++) {
      var it = items[k];
      if (it.key === 'mcard_messages' && messages[it.idx]) {
        messages[it.idx].imageData = null; delete messages[it.idx].imageData; removed++;
      } else if (it.key === 'mcard_moments' && moments[it.idx]) {
        moments[it.idx].imageDataList = []; removed++;
      }
    }
    if (removed > 0) {
      localStorage.setItem('mcard_messages', JSON.stringify(messages));
      localStorage.setItem('mcard_moments', JSON.stringify(moments));
    }
  } catch(e) { console.error('Quota cleanup failed:', e); }
}

// ============ Data Layer ============
const STORE = {
  _read(k) { try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;} },
  _write(k,v) {
    try {
      localStorage.setItem(k,JSON.stringify(v));
      return true;
    }
    catch(e) {
      if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
        console.warn('localStorage quota exceeded, attempting cleanup...');
        // 尝试清理最旧的含图片数据来腾空间
        _freeStorageQuota();
        try {
          localStorage.setItem(k,JSON.stringify(v));
          return true;
        }
        catch(e2) {
          console.error('Storage still full after cleanup');
          return false;
        }
      }
      console.error('Storage write error:', e);
      return false;
    }
  },
  get categories() { return this._read('mcard_categories'); },
  set categories(v) { this._write('mcard_categories', v); },
  get subcategories() { return this._read('mcard_subcategories'); },
  set subcategories(v) { this._write('mcard_subcategories', v); },
  get cards() { return this._read('mcard_cards'); },
  set cards(v) { this._write('mcard_cards', v); },
  get messages() { return this._read('mcard_messages'); },
  set messages(v) { this._write('mcard_messages', v); },
  get config() { return this._read('mcard_config'); },
  set config(v) { this._write('mcard_config', v); },
  get moments() { return this._read('mcard_moments'); },
  set moments(v) { this._write('mcard_moments', v); },
  get likedMoments() { return this._read('mcard_likedMoments'); },
  set likedMoments(v) { this._write('mcard_likedMoments', v); },
  get diaries() { return this._read('mcard_diaries'); },
  set diaries(v) { this._write('mcard_diaries', v); },
  get letters() { return this._read('mcard_letters'); },
  set letters(v) { this._write('mcard_letters', v); },
  get reviews() { return this._read('mcard_reviews'); },
  set reviews(v) { this._write('mcard_reviews', v); },
  get checkins() { return this._read('mcard_checkins'); },
  set checkins(v) { this._write('mcard_checkins', v); },
  get checkinWords() { return this._read('mcard_checkinWords'); },
  set checkinWords(v) { this._write('mcard_checkinWords', v); },
  get lastCheckinWord() { return this._read('mcard_lastCheckinWord'); },
  set lastCheckinWord(v) { this._write('mcard_lastCheckinWord', v); },
  get dreamEvents() { return this._read('mcard_dream_events'); },
  set dreamEvents(v) { this._write('mcard_dream_events', v); },
  get lastActive() { try{const v=localStorage.getItem('mcard_last_active');return v?Number(v)||null:null;}catch(e){return null;} },
  set lastActive(v) { try{if(v===null)localStorage.removeItem('mcard_last_active');else localStorage.setItem('mcard_last_active',String(v));}catch(e){} },
  get lastSeen() { return this._read('mcard_lastSeen') || {}; },
  set lastSeen(v) { this._write('mcard_lastSeen', v); },
  get periods() { return this._read('mcard_periods'); },
  set periods(v) { this._write('mcard_periods', v); },
  get periodConfig() { return this._read('mcard_periodConfig'); },
  set periodConfig(v) { this._write('mcard_periodConfig', v); },
  get favorites() { return this._read('mcard_favorites') || []; },
  set favorites(v) { this._write('mcard_favorites', v); },
  get stickers() { return this._read('mcard_stickers') || []; },
  set stickers(v) { this._write('mcard_stickers', v); },
  get songCache() { return this._read('mcard_songcache') || { songs: [], fetchedAt: 0 }; },
  set songCache(v) { this._write('mcard_songcache', v); },
};

// ============ Memory Library ============
// 记忆条目字段:
//   id, content, speaker("me"|"mengjiao"|"general"),
//   source("ai_approved"|"manual"), timestamp(ISO),
//   createdAt(ISO), updatedAt(ISO)

function _loadMemories() {
  try { return JSON.parse(localStorage.getItem('memory_library')) || []; }
  catch(e) { return []; }
}

function _saveMemories(list) {
  try { localStorage.setItem('memory_library', JSON.stringify(list)); }
  catch(e) { console.error('memory_library 写入失败:', e); }
}

function saveMemory(memory) {
  var list = _loadMemories();
  var now = new Date().toISOString();
  var entry = {
    id: memory.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)),
    content: memory.content || '',
    speaker: memory.speaker || 'general',
    source: memory.source || 'manual',
    timestamp: memory.timestamp || now,
    createdAt: memory.createdAt || now,
    updatedAt: now,
  };
  list.push(entry);
  _saveMemories(list);
  return entry;
}

function getMemoryList() {
  var list = _loadMemories();
  list.sort(function(a, b) {
    var ta = a.timestamp || a.createdAt || '';
    var tb = b.timestamp || b.createdAt || '';
    return tb.localeCompare(ta); // 按时间倒序
  });
  return list;
}

function deleteMemory(id) {
  var list = _loadMemories();
  list = list.filter(function(m) { return m.id !== id; });
  _saveMemories(list);
}

function updateMemory(id, newContent) {
  var list = _loadMemories();
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      list[i].content = newContent;
      list[i].updatedAt = new Date().toISOString();
      _saveMemories(list);
      return true;
    }
  }
  return false;
}

// ============ AI Interpret default config ============
function defaultAIInterpret() {
  return {
    enabled: false,
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: '',
    model: 'deepseek-chat',
    contextCount: 5,
    systemPrompt:
      '你扮演梦角本人。用户和梦角在聊天，梦角说的话是用"字卡"拼接而成的，比较抽象、跳跃。' +
      '现在请用第一人称"我"，结合给定的聊天上下文，解读"我"刚才说的那句话真正想表达的意思。' +
      '不要做字面翻译，要解读潜台词、情绪和心意。语气要贴合梦角的人设——活泼、真诚、偶尔撒娇。' +
      '回答控制在 80 字以内，自然口语，不要分点，不要说"作为AI"。'
  };
}

function defaultLetterConfig() {
  return {
    annotationDelay: { min: 5, max: 30 },
    coverage: { min: 25, max: 50 },
    cardCount: { min: 1, max: 1 },
  };
}

function initDefaults() {
  if (!STORE.categories) {
    STORE.categories = [
      { id:'cat1', name:'短句', hidden:false },
      { id:'cat2', name:'词语', hidden:false },
      { id:'cat3', name:'感叹词', hidden:false },
    ];
  }
  if (!STORE.subcategories) {
    STORE.subcategories = [
      { id:'sub1', name:'热血', categoryId:'cat1', hidden:false },
      { id:'sub2', name:'日常', categoryId:'cat1', hidden:false },
      { id:'sub3', name:'名言', categoryId:'cat1', hidden:false },
      { id:'sub4', name:'感叹', categoryId:'cat2', hidden:false },
      { id:'sub5', name:'动作', categoryId:'cat2', hidden:false },
      { id:'sub6', name:'通用', categoryId:'cat3', hidden:false },
    ];
  }
  if (!STORE.cards) {
    STORE.cards = [
      { id:'c1',  text:'加油！冲啊！', categoryId:'cat1', subcategoryId:'sub1', weight:1 },
      { id:'c2',  text:'我相信你！', categoryId:'cat1', subcategoryId:'sub1', weight:2 },
      { id:'c3',  text:'永不放弃！', categoryId:'cat1', subcategoryId:'sub1', weight:1 },
      { id:'c4',  text:'拼尽全力！', categoryId:'cat1', subcategoryId:'sub1', weight:1 },
      { id:'c5',  text:'你可以的！', categoryId:'cat1', subcategoryId:'sub1', weight:1 },
      { id:'c6',  text:'今天天气真好呢', categoryId:'cat1', subcategoryId:'sub2', weight:1 },
      { id:'c7',  text:'吃了没？', categoryId:'cat1', subcategoryId:'sub2', weight:1 },
      { id:'c8',  text:'哈哈哈', categoryId:'cat1', subcategoryId:'sub2', weight:1 },
      { id:'c9',  text:'原来是这样啊', categoryId:'cat1', subcategoryId:'sub2', weight:1 },
      { id:'c10', text:'飞得更高！', categoryId:'cat1', subcategoryId:'sub3', weight:2 },
      { id:'c11', text:'努力一定有回报', categoryId:'cat1', subcategoryId:'sub3', weight:2 },
      { id:'c12', text:'今天的努力是明天的基石', categoryId:'cat1', subcategoryId:'sub3', weight:1 },
      { id:'c13', text:'哇！', categoryId:'cat2', subcategoryId:'sub4', weight:1 },
      { id:'c14', text:'诶？', categoryId:'cat2', subcategoryId:'sub4', weight:1 },
      { id:'c15', text:'嗯嗯', categoryId:'cat2', subcategoryId:'sub4', weight:1 },
      { id:'c16', text:'啊啊啊', categoryId:'cat2', subcategoryId:'sub4', weight:1 },
      { id:'c17', text:'跳起来！', categoryId:'cat2', subcategoryId:'sub5', weight:1 },
      { id:'c18', text:'奔跑吧', categoryId:'cat2', subcategoryId:'sub5', weight:1 },
      { id:'c19', text:'接住！', categoryId:'cat2', subcategoryId:'sub5', weight:1 },
      { id:'c20', text:'哈哈', categoryId:'cat3', subcategoryId:'sub6', weight:1 },
      { id:'c21', text:'嘿嘿', categoryId:'cat3', subcategoryId:'sub6', weight:1 },
      { id:'c22', text:'嘻嘻', categoryId:'cat3', subcategoryId:'sub6', weight:1 },
      { id:'c23', text:'呼呼', categoryId:'cat3', subcategoryId:'sub6', weight:1 },
    ];
  }
  if (!STORE.messages) STORE.messages = [];
  if (!STORE.config) {
    STORE.config = {
      characterName:'梦角', userNickname:'我', avatarUrl:'', userAvatarUrl:'',
      
      // ========== 时间参数集中管理（单位在参数名或注释中明确） ==========
      timing: {
        activeChat: { min: 30, max: 60 },              // 主动发言间隔(分钟)
        passiveReply: { min: 0.5, max: 2.5 },          // 被动回复延迟(秒)
        dreamPost: { min: 2, max: 8 },                 // 梦角圈子发圈间隔(分钟)
        dreamPostCard: { min: 1, max: 5 },             // 梦角发圈卡片数
        dreamReaction: { min: 1, max: 6 },             // 梦角反应时间(分钟)
        dreamComment: { min: 2, max: 8 },              // 梦角评论延迟(秒)
        diaryGen: { hourMin: 21, hourMax: 24 },        // 日记生成时段(小时)
        diaryComment: { min: 30, max: 120 },           // 日记评论延迟(秒)
        checkin: { timeStart: 9, timeEnd: 21, intervalMin: 30, intervalMax: 120 }, // 签到设置(24h制+分钟)
      },
      
      // 消息配置
      msgCountProbs:[30,40,20,10], cardCountProbs:[30,40,20,10],
      
      // 概率配置
      prob: {
        dreamLike: 80,
        dreamComment: 65,
        diaryComment: 70,
        postPhoto: 60,
        stickerFrac: 70,
        chatSticker: 10,
        reviewCounter: 20,
        doodle: 8,
      },
      
      // 其他配置
      dreamReplyDecaySeq:[100,70,40,10,0],
      dreamReplyDecayOn:true,
      reviewCardCount:3, reviewMode:'random',
      checkinAutoEnabled:false,
      
      /* dream behavior engine */
      dreamEngine: {
        wakeTime: 7, sleepTime: 23,
        diaryTimeStart: 21, diaryTimeEnd: 24,
        enabled: { dreamPost: true, dreamCheckin: false, dreamDiary: true, dreamChat: true, dreamDiaryComment: true },
        perDay: { dreamPost: { min: 2, max: 8 }, dreamCheckin: { min: 3, max: 12 }, dreamChat: { min: 5, max: 15 }, dreamDiary: { min: 1, max: 1 } },
        prob: { dreamDiaryComment: 70, dreamPostPhoto: 60, dreamStickerFrac: 70, dreamChatSticker: 10, recallProb: 1 },
        interval: { dreamCheckin: 45 },
      },
      /* AI interpretation (字卡解读) */
      aiInterpret: defaultAIInterpret(),
      letter: defaultLetterConfig(),
      /* NetEase song share (网易云歌曲分享) */
      netease: {
        enabled: true,
        prob: 12,
        playlistIds: ['135597299'],
        builtinFallback: true,
      },
    };
  }
  // Upgrade existing config with dreamEngine if missing
  if (STORE.config && !STORE.config.dreamEngine) {
    const cfg = STORE.config;
    cfg.dreamEngine = {
      wakeTime: 7, sleepTime: 23,
      diaryTimeStart: 21, diaryTimeEnd: 24,
      enabled: { dreamPost: true, dreamCheckin: false, dreamDiary: true, dreamChat: true, dreamDiaryComment: true },
      perDay: { dreamPost: { min: 2, max: 8 }, dreamCheckin: { min: 3, max: 12 }, dreamChat: { min: 5, max: 15 }, dreamDiary: { min: 1, max: 1 } },
      prob: { dreamDiaryComment: 70, dreamPostPhoto: 60, dreamStickerFrac: 70, dreamChatSticker: 10, recallProb: 1 },
      interval: { dreamCheckin: 45 },
    };
    STORE.config = cfg;
  }
  // Upgrade existing config with aiInterpret if missing
  if (STORE.config && !STORE.config.aiInterpret) {
    const cfg = STORE.config;
    cfg.aiInterpret = defaultAIInterpret();
    STORE.config = cfg;
  }
  if (STORE.config && !STORE.config.letter) {
    const cfg = STORE.config;
    cfg.letter = defaultLetterConfig();
    STORE.config = cfg;
  }
  if (STORE.config && !STORE.config.netease) {
    const cfg = STORE.config;
    cfg.netease = { enabled: true, prob: 12, playlistIds: ['135597299'], builtinFallback: true };
    STORE.config = cfg;
  }
  if (!STORE.moments) STORE.moments = [];
  if (!STORE.likedMoments) STORE.likedMoments = [];
  if (!STORE.diaries) STORE.diaries = [];
  if (!STORE.letters) STORE.letters = [];
  if (!STORE.reviews) STORE.reviews = [];
  if (!STORE.checkins) STORE.checkins = [];
  if (!STORE.checkinWords) STORE.checkinWords = ['工作','休息','学习','散步','发呆','喝水'];
  if (!STORE.dreamEvents) STORE.dreamEvents = {};
  if (!STORE.periods) STORE.periods = [];
  if (!STORE.periodConfig) STORE.periodConfig = { cycleLength: 28, periodDuration: 5 };
  if (!STORE.favorites) STORE.favorites = [];
  if (!STORE.lastSeen) STORE.lastSeen = {};
  if (!STORE.stickers) STORE.stickers = [];

  // Migrate old moments: likes from number → array (safe)
  try {
    if (STORE.moments && Array.isArray(STORE.moments)) {
      let migrated = false;
      STORE.moments.forEach(m => {
        if (!m || typeof m !== 'object') return;
        if (typeof m.likes === 'number') {
          const arr = [];
          for (let i = 0; i < m.likes; i++) arr.push({ liker: 'dream', timestamp: (m.timestamp || Date.now()) + i * 1000 });
          m.likes = arr;
          migrated = true;
        }
        if (!Array.isArray(m.likes)) m.likes = [];
        if (!Array.isArray(m.comments)) m.comments = [];
      });
      if (migrated) {
        const liked = [];
        STORE.moments.forEach(m => {
          if (m && Array.isArray(m.likes) && m.likes.some(l => l && l.liker === 'user')) liked.push(m.id);
        });
        STORE.likedMoments = liked;
      }
    }
  } catch(e) { console.warn('Moments migration error:', e); }

  // Seed demo moment from dream character (only once)
  const KEY_SEEDED = '********';
  if (!localStorage.getItem(KEY_SEEDED)) {
    localStorage.setItem(KEY_SEEDED, '1');
    const moments = STORE.moments || [];
    const now = Date.now();
    moments.push({
      id: 'seed_' + now,
      publisher: 'dream',
      content: '大家好！我是梦角～欢迎来到朋友圈！这里可以记录我们之间的点点滴滴 ✨',
      timestamp: now - 3600000,
      likes: [{ liker: 'dream', timestamp: now - 3000000 }],
      comments: [
        { commenter: 'dream', content: '欢迎大家的到来！一起玩耍吧～', timestamp: now - 3500000 }
      ],
      imageUrl: '',
      dreamProcessed: true,
    });
    STORE.moments = moments;
  }
}

// ============ App State ============
const state = {
  panelOpen: false,
  fsOpen: false,          // fullscreen view open
  fsView: null,           // 'cards' | 'settings' | null
  selectedCatId: null,
  selectedSubId: null,
  searchQuery: '',
  activeTimerId: null,
  isSending: false,
  readTimerId: null,
  typingTimerId: null,
  dreamPostTimerId: null,
  pendingReactionTimers: {},  // mid → timeoutId (delayed reaction to new moment)
  pendingCommentTimers: {},   // mid → timeoutId (delayed reply to comment)
  decayRounds: {},            // mid → number (in-memory, resets on refresh)
  diaryMonth: null,           // 'YYYY-MM' for calendar view
  diarySelectedDate: null,     // date shown in diary detail
  diaryFullscreenId: null,     // diary id opened in fullscreen reader/editor
  letterFullscreenId: null,
  letterDraft: null,
  letterRevealTimerId: null,
  diaryGenTimerId: null,      // setTimeout for dream diary generation
  checkinDate: null,          // 'YYYY-MM-DD' for checkin view
  checkinAutoTimerId: null,   // setTimeout for auto checkin
  dreamEventTimers: {},       // "eventId_dateStr_index" → timeoutId
  settingsSaveTimerId: null,
  settingsEngineTimerId: null,
  backfillPromise: null,
};

var _pmImages = []; // temporary photo array for moments publish modal

// ============ Helpers ============
function genId() { return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function sleep(ms) { return new Promise(r=>setTimeout(r,ms)); }
function randomBetween(min,max) { return min+Math.random()*(max-min); }

function normalizeProbs(probs) {
  const sum=probs.reduce((a,b)=>a+b,0);
  if(sum===0) return [25,25,25,25];
  if(sum===100) return [...probs];
  const scaled=probs.map(p=>Math.round(p*100/sum));
  const diff=100-scaled.reduce((a,b)=>a+b,0);
  let maxIdx=0; for(let i=1;i<4;i++){if(scaled[i]>scaled[maxIdx])maxIdx=i;}
  scaled[maxIdx]=Math.max(0,scaled[maxIdx]+diff);
  return scaled;
}

function pickByProb(probs) {
  const sum=probs.reduce((a,b)=>a+b,0);
  if(sum<=0)return 0;
  let r=Math.random()*sum;
  for(let i=0;i<probs.length;i++){r-=probs[i];if(r<=0)return i;}
  return probs.length-1;
}

function weightedPick(items) {
  if(!items||items.length===0)return null;
  const total=items.reduce((s,it)=>s+(it.weight||1),0);
  if(total<=0)return items[0];
  let r=Math.random()*total;
  for(const it of items){r-=(it.weight||1);if(r<=0)return it;}
  return items[items.length-1];
}

function escapeHtml(str) {
  const d=document.createElement('div');d.textContent=str;return d.innerHTML;
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

// ============ Dream Behavior Engine: Seeded RNG ============
function seedRandom(seed) {
  // FNV-1a hash — a single character change flips ~half the output bits,
  // so "…_0" and "…_1" produce wildly different seeds for mulberry32.
  let h = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // FNV prime (32-bit)
  }
  let state = h | 0;
  return function() {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============ Dream Behavior Engine: Global Overrides ============
let _timeOverride = null;
let _rngOverride = null;
const _origDateNow = Date.now.bind(Date);
const _origMathRandom = Math.random.bind(Math);

function setBackfillContext(timestamp, rngFn) {
  _timeOverride = timestamp;
  _rngOverride = rngFn;
  Date.now = function() { return _timeOverride; };
  Math.random = function() { return _rngOverride(); };
}

function clearBackfillContext() {
  Date.now = _origDateNow;
  Math.random = _origMathRandom;
  _timeOverride = null;
  _rngOverride = null;
}

// ============ Core: Visible cards ============
function getVisibleCards() {
  const categories=STORE.categories||[], subcategories=STORE.subcategories||[], cards=STORE.cards||[];
  const hiddenCats=new Set(categories.filter(c=>c.hidden).map(c=>c.id));
  const hiddenSubs=new Set(subcategories.filter(s=>s.hidden).map(s=>s.id));
  return cards.filter(c=>!hiddenCats.has(c.categoryId)&&!hiddenSubs.has(c.subcategoryId));
}

// ============ Core: Generate message ============
function generateMessage(opts) {
  opts = opts || {};
  // Doodle probability (configurable)
  var cfg = STORE.config || {};
  var doodleProb = ((cfg.prob?.doodle != null ? cfg.prob.doodle : 8) / 100);
  if (opts.allowDoodle && doodleProb > 0 && Math.random() < doodleProb) {
    const doodle = generateDoodle();
    if (doodle) return { doodle: doodle };
    // If mode 0 (placeholder), fall through to normal text
  }
  const visible=getVisibleCards();
  if(visible.length===0)return '【暂无可用字卡，请添加】';
  const cardProbs=cfg.cardCountProbs||[30,40,20,10];
  const count=pickByProb(cardProbs)+1;
  const picked=[];
  for(let i=0;i<count;i++){const c=weightedPick(visible);if(c)picked.push(c.text);}
  return picked.join(' ');
}

// ============ Doodle Generator ============
function generateDoodle() {
  // Mode 0: tarot placeholder — not implemented
  // Mode 1: placeholder for future doodle types
  // Mode 2: random Chinese characters (current default)
  var mode = Math.floor(Math.random() * 3);
  if (mode === 0 || mode === 1) return null; // placeholder slots
  return generateDoodleChinese();
}

var DOODLE_COLORS = ['#e04040','#F8A050','#5b9bd5','#6cbf6c','#9b59b6','#e8923c','#2f8f8f'];
var DOODLE_EMOJIS = ['❤️','✨','💕','🌟','💫','🎀','🌸','🍀','💖','☀️'];

function generateDoodleChinese() {
  // Build Chinese character pool from all visible cards
  var visible = getVisibleCards();
  var pool = [];
  visible.forEach(function(c) {
    for (var i = 0; i < c.text.length; i++) {
      var ch = c.text.charAt(i);
      if (ch >= '一' && ch <= '鿿') pool.push(ch);
    }
  });
  if (pool.length === 0) pool = ['梦','角','日','向','翔','阳','小','鱼','字','卡']; // fallback
  var len = 3 + Math.floor(Math.random() * 4); // 3–6
  var text = '';
  for (var i = 0; i < len; i++) {
    text += pool[Math.floor(Math.random() * pool.length)];
  }
  // 10% chance to add emoji
  if (Math.random() < 0.1) {
    text += DOODLE_EMOJIS[Math.floor(Math.random() * DOODLE_EMOJIS.length)];
  }
  var color = DOODLE_COLORS[Math.floor(Math.random() * DOODLE_COLORS.length)];
  return { mode: 2, text: text, color: color };
}

// ============ NetEase Song Share (网易云歌曲分享) ============
// 内置兜底歌单：接口不可用时从这里随机抽（ID 均取自用户歌单真实返回）
var BUILTIN_SONGS = [
  { id: '2650463511', name: 'Mado', artist: 'Fellsius' },
  { id: '2655065698', name: '你我经历的一刻', artist: 'ZaZaZsu咂咂苏' },
  { id: '2746516728', name: 'reflection pond', artist: 'frutiger pm' },
  { id: '3352994932', name: 'FUNK DO IENAI (Super Slowed)', artist: 'KPHK' },
  { id: '1488254752', name: 'Hello, World', artist: 'Louie Zong' },
  { id: '2626921879', name: 'BABYDOLL (Phonk)', artist: 'HAMZA INC./MIRBRO' },
  { id: '1975535749', name: 'Little Stupid Boy', artist: 'ARAI' },
  { id: '25884677', name: '仰望', artist: '杨丞琳' },
  { id: '3353165861', name: 'あのこ行方不明', artist: 'また切ない世界を生きる/結月ゆかり' },
  { id: '36103874', name: 'Trash Magic', artist: 'Lana Del Rey' },
  { id: '3360745106', name: 'Click Clack Symphony', artist: 'RAYE/Hans Zimmer' },
  { id: '3356257929', name: '画脂鏤氷', artist: 'かんてゐく/初音ミク' },
  { id: '3349348727', name: 'FUNK DO NEW JEANS', artist: '漂移的人' },
  { id: '2121640479', name: '明知故行', artist: '世界之外/横山克' },
  { id: '3357922714', name: '雪落银河', artist: '世界之外' },
  { id: '3316075721', name: '腐烂以后', artist: '泥酔巡遊' },
];

var NETESE_API_ENDPOINTS = [
  'https://api.injahow.cn/meting/?server=netease&type=playlist&id=',
  'https://api.i-meto.com/meting/api?server=netease&type=playlist&id=',
];

function getNeteaseConfig() {
  var n = (STORE.config || {}).netease || {};
  return {
    enabled: n.enabled !== false,
    prob: (typeof n.prob === 'number') ? n.prob : 12,
    playlistIds: Array.isArray(n.playlistIds) && n.playlistIds.length ? n.playlistIds : ['135597299'],
    builtinFallback: n.builtinFallback !== false,
  };
}

function songLink(song) {
  return 'https://y.music.163.com/m/song?id=' + (song.id || song.url_id || '');
}

// 从 Meting API 拉取歌单歌曲（多接口容错，兼容两种字段名格式）
function fetchPlaylistSongs(playlistId) {
  var attempts = NETESE_API_ENDPOINTS.map(function(base) { return base + encodeURIComponent(playlistId); });
  function tryNext(i) {
    if (i >= attempts.length) return Promise.reject(new Error('all endpoints failed'));
    return fetch(attempts[i], { timeout: 15000 })
      .then(function(resp) { if (!resp.ok) throw new Error('HTTP ' + resp.status); return resp.json(); })
      .then(function(list) {
        if (!Array.isArray(list) || !list.length) throw new Error('bad response');
        var songs = [];
        list.forEach(function(s) {
          var id = s.url_id || '';
          if (!id) {
            var m = String(s.url || '').match(/[?&]id=(\d+)/);
            if (m) id = m[1];
          }
          if (!id) return;
          songs.push({ id: id, name: String(s.name || s.title || ''), artist: String(s.artist || s.author || ''), cover: s.pic || '' });
        });
        return songs;
      })
      .catch(function(err) { return tryNext(i + 1); });
  }
  return tryNext(0);
}

// 刷新歌曲缓存（合并所有歌单，成功才写缓存，避免覆盖旧缓存）
function refreshSongCache() {
  var cfg = getNeteaseConfig();
  if (!cfg.enabled) return Promise.resolve(null);
  var fetches = cfg.playlistIds.map(function(id) { return fetchPlaylistSongs(id).catch(function() { return []; }); });
  return Promise.all(fetches).then(function(results) {
    var merged = [];
    var seen = {};
    results.forEach(function(list) {
      (list || []).forEach(function(s) {
        if (!seen[s.id]) { seen[s.id] = true; merged.push(s); }
      });
    });
    if (merged.length > 0) {
      STORE.songCache = { songs: merged, fetchedAt: Date.now() };
    }
    return merged;
  }).catch(function() { return []; });
}

// 随机抽一首歌：优先在线缓存（24h 内），否则内置兜底
function pickRandomSong() {
  var cache = STORE.songCache || {};
  var songs = (Array.isArray(cache.songs) && Date.now() - (cache.fetchedAt || 0) < 86400000) ? cache.songs : [];
  var pool = songs.length > 0 ? songs : BUILTIN_SONGS;
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ============ Core: Messages ============
function addMessage(type,text,timestamp,imageData) {
  const messages=STORE.messages||[];
  const ts = timestamp || Date.now();
  var doodleData = null;
  if (text && typeof text === 'object' && text.doodle) {
    doodleData = text.doodle;
    text = ''; // text will be replaced by canvas
  }
  const msg = {id:genId(), type, text, timestamp: ts};
  if (doodleData) msg.doodle = doodleData;
  if (imageData) msg.imageData = imageData;
  // Recall decision for dream character messages only
  if (type === 'character') {
    const engCfg = (STORE.config||{}).dreamEngine || {};
    const prob = (engCfg.prob && engCfg.prob.recallProb != null) ? engCfg.prob.recallProb : 1;
    const roll = Math.random() * 100;
    msg.recall = { prob, decided: roll < prob, time: ts + Math.floor(Math.random() * 60000), executed: false };
    // Sticker probability for dream chat messages (not for review/doodle)
    if (!imageData && !doodleData) {
      const stickerProb = (engCfg.prob && engCfg.prob.dreamChatSticker != null) ? engCfg.prob.dreamChatSticker : 0;
      if (stickerProb > 0 && Math.random() * 100 < stickerProb) {
        var stickers = STORE.stickers || [];
        if (stickers.length > 0) {
          msg.imageData = stickers[Math.floor(Math.random() * stickers.length)].dataUrl;
        }
      }
    }
    // Song share probability (网易云随机歌曲，纯文字消息才挂)
    if (!imageData && !doodleData) {
      const ncfg = getNeteaseConfig();
      if (ncfg.enabled && ncfg.prob > 0 && Math.random() * 100 < ncfg.prob) {
        var song = pickRandomSong();
        if (song) msg.song = song;
      }
    }
    if (!state.isSending && (state.fsOpen || state.panelOpen)) {
      var toastText = text || '';
      if (doodleData) toastText = '[涂鸦]';
      else if (msg.imageData) toastText = '[表情包]';
      showMessageToast(toastText);
    }
  }
  messages.push(msg);
  STORE.messages=messages;
  appendMessageToDOM(msg);
}

async function sendBatch(batchCount) {
  if(state.isSending)return;
  state.isSending=true;
  showTypingIndicator();
  if(!_messageLoadingRow){
    showMessageLoadingBubble();
    await sleep(randomBetween(650,1100));
  }
  removeMessageLoadingBubble();
  for(let i=0;i<batchCount;i++){
    addMessage('character',generateMessage({allowDoodle:true}));
    if(i<batchCount-1)await sleep(randomBetween(300,800));
  }
  hideIndicators();
  state.isSending=false;
}

// ============ Core: Active speaking (minutes) ============
function scheduleActive() {
  clearTimeout(state.activeTimerId); state.activeTimerId=null;
  const cfg=STORE.config||{};
  const timing=cfg.timing||{activeChat:{min:30,max:60}};
  const minMs=(timing.activeChat?.min||30)*60000;
  const maxMs=(timing.activeChat?.max||60)*60000;
  state.activeTimerId=setTimeout(async()=>{
    if(state.isSending){state.activeTimerId=setTimeout(()=>scheduleActive(),2000);return;}
    const probs=cfg.msgCountProbs||[30,40,20,10];
    await sendBatch(pickByProb(probs)+1);
    scheduleActive();
  },randomBetween(minMs,maxMs));
}

function stopActive() { clearTimeout(state.activeTimerId); state.activeTimerId=null; }

// ============ Core: Passive reply ============
async function triggerPassiveReply() {
  const cfg=STORE.config||{};
  const timing=cfg.timing||{passiveReply:{min:0.5,max:2.5}};
  const minMs=(timing.passiveReply?.min||0.5)*1000;
  const maxMs=(timing.passiveReply?.max||2.5)*1000;
  if(!state.isSending)showMessageLoadingBubble();
  await sleep(randomBetween(minMs,maxMs));
  if(state.isSending)await sleep(500);
  const probs=cfg.msgCountProbs||[30,40,20,10];
  await sendBatch(pickByProb(probs)+1);
  stopActive(); scheduleActive();
}

// ============ Indicators ============
function showReadIndicator() {
  const tags=document.querySelectorAll('#messagesArea .read-tag');
  if(tags.length>0){
    tags[tags.length-1].style.display='block';
  }
}

function showTypingIndicator() {
  const sub=document.querySelector('#chatTitles .ct-sub');
  if(sub){
    if(!sub.dataset.prevHtml)sub.dataset.prevHtml=sub.innerHTML;
    sub.textContent='正在输入中...';sub.style.animation='blink-text 1.2s infinite';
  }
}

function hideIndicators() {
  document.querySelectorAll('.read-tag').forEach(t=>t.style.display='none');
  const sub=document.querySelector('#chatTitles .ct-sub');
  if(sub){sub.innerHTML=sub.dataset.prevHtml||renderSubtitleHTML();sub.style.animation='';}
  clearTimeout(state.readTimerId); state.readTimerId=null;
  clearTimeout(state.typingTimerId); state.typingTimerId=null;
}

function scheduleIndicators() {
  hideIndicators();
  state.readTimerId=setTimeout(()=>{
    showReadIndicator();
    state.typingTimerId=setTimeout(showTypingIndicator,600);
  },400);
}

// ============ Recall Checker ============
function checkPendingRecalls() {
  const messages = STORE.messages || [];
  let changed = false;
  const now = Date.now();
  for (const m of messages) {
    if (m.type !== 'character') continue;
    if (!m.recall || !m.recall.decided || m.recall.executed) continue;
    if (m.recall.time <= now) {
      m.recall.executed = true;
      changed = true;
    }
  }
  if (changed) {
    STORE.messages = messages;
    try {
      var area = document.getElementById('messagesArea');
      var allKids = area.children;
      var msgIdx = 0;
      for (var i = 0; i < allKids.length && msgIdx < messages.length; i++) {
        var el = allKids[i];
        if (el.classList.contains('msg-time-divider')) continue;
        var m = messages[msgIdx];
        if (m && m.type === 'character' && m.recall && m.recall.executed && !m.doodle) {
          var newHtml = renderOneMessageHTML(m, msgIdx);
          var tmp = document.createElement('div');
          tmp.innerHTML = newHtml;
          el.parentNode.replaceChild(tmp.firstElementChild, el);
        }
        msgIdx++;
      }
    } catch(e) {
      console.warn('Surgical recall DOM update failed, falling back to full render');
      renderMessages();
    }
  }
}

// ============ Rendering: Messages ============
function getAvatarHTML() {
  const cfg=STORE.config||{};
  const charAv=cfg.avatarUrl||'', userAv=cfg.userAvatarUrl||'';
  return {
    char: charAv?`<img src="${escapeHtml(charAv)}" onerror="this.parentElement.textContent='🏐'">`:'🏐',
    user: userAv?`<img src="${escapeHtml(userAv)}" onerror="this.parentElement.textContent='🐟'">`:'🐟'
  };
}

function renderOneMessageHTML(m, idx) {
  const av = getAvatarHTML();
  const time = new Date(m.timestamp).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
  if (m.review) {
    const r=m.review; const shared=r.sharedToMoments!==undefined?r.sharedToMoments:false;
    const reviews=STORE.reviews||{}; const rv=reviews.find(x=>x.id===r.id); const isShared=rv?rv.sharedToMoments:shared;
    return `<div class="msg-row char">
      <div class="msg-avatar">${av.char}</div>
      <div class="msg-bubble review-bubble">
        <div class="review-quote">💥 锐评"${escapeHtml(r.userInput)}"：</div>
        <div class="review-stars">${r.starsDisplay}</div>
        <div class="review-level">${r.level.text} ${r.level.emoji}</div>
        <div class="review-comment">评语：${escapeHtml(r.comment)}</div>
        <div class="review-actions">
          <button class="btn-share-review" data-rid="${r.id}" ${isShared?'disabled':''}>📤 ${isShared?'已分享':'分享到朋友圈'}</button>
          <button class="btn-ai-review" data-ai-target="review" data-rid="${r.id}">🤖 解读</button>
        </div>
        <div class="ai-box" data-ai-target="review" data-rid="${r.id}"></div>
      </div>
      <div class="msg-time">${time}</div></div>`;
  }
  if (m.recall && m.recall.executed) {
    return `<div class="msg-row char">
      <div class="msg-avatar">${av.char}</div>
      <div class="msg-bubble recall-bubble">对方撤回了一条消息</div>
      <div class="msg-time">${time}</div></div>`;
  }
  const isUser = m.type==='user';
  if (m.doodle && !isUser) {
    var cid = 'doodle_cv_' + idx;
    return `<div class="msg-row char" data-doodle-id="${cid}">
      <div class="msg-avatar">${av.char}</div>
      <div class="msg-bubble doodle-bubble" style="padding:6px 10px;background:rgba(255,255,255,0.55);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.7);border-radius:var(--radius-lg);border-bottom-left-radius:var(--radius-sm);">
        <canvas id="${cid}" width="260" height="180" style="display:block;border-radius:10px;max-width:100%;height:auto;"></canvas>
      </div>
      <div class="msg-time">${time}</div></div>`;
  }
  const aiBox = (!isUser && m.text) ? '<div class="ai-box" data-ai-target="chat" data-idx="'+idx+'"></div>' : '';
  const imgHtml = m.imageData
    ? '<div class="msg-photo"><img src="' + m.imageData + '" alt="图片" loading="lazy"></div>'
    : '';
  const songHtml = m.song
    ? '<a class="msg-song" href="' + songLink(m.song) + '" target="_blank">'
      + (m.song.cover ? '<img class="msg-song-cover" src="' + m.song.cover + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '<span class="msg-song-cover msg-song-cover-fallback">🎵</span>')
      + '<span class="msg-song-info"><span class="msg-song-name">' + escapeHtml(m.song.name || '未知歌曲') + '</span>'
      + '<span class="msg-song-artist">' + escapeHtml(m.song.artist || '未知歌手') + '</span></span>'
      + '<span class="msg-song-play">▶</span></a>'
    : '';
  return `<div class="msg-row ${isUser?'user':'char'}" data-msg-idx="${idx}">
    <div class="msg-avatar">${isUser?av.user:av.char}</div>
    <div class="msg-bubble">${escapeHtml(m.text)}${songHtml}${imgHtml}${aiBox}</div>
    <div class="msg-time">${time}</div></div>`
    + (isUser?'<div class="read-tag">已读</div>':'');
}

function renderMessages() {
  const area=document.getElementById('messagesArea');
  const messages=STORE.messages||[];
  if (messages.length===0) {
    area.innerHTML='<div class="msg-empty">开始对话吧</div>';
  } else {
    area.innerHTML = messages.map(function(m, idx) {
      const prev = idx > 0 ? messages[idx - 1] : null;
      var divider = '';
      if (prev && (m.timestamp - prev.timestamp) > 600000) {
        const t = new Date(m.timestamp).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
        divider = '<div class="msg-time-divider"><span class="divider-label">———— '+t+' ————</span></div>';
      }
      return divider + renderOneMessageHTML(m, idx);
    }).join('');
    drawAllDoodles(messages);
  }
  area.scrollTop=area.scrollHeight;
}

function getLastMessageTimestamp() {
  var msgs = STORE.messages || [];
  if (msgs.length === 0) return null;
  return msgs[msgs.length - 1].timestamp;
}

function drawAllDoodles(messages) {
  var doodles = [];
  messages.forEach((m, idx) => {
    if (m.doodle && m.type==='character') doodles.push({ id: 'doodle_cv_'+idx, doodle: m.doodle });
  });
  if (doodles.length === 0) return;
  // Ensure custom font is loaded before drawing
  if (document.fonts && document.fonts.ready) {
    document.fonts.load('1em MengJiaoShouXie').then(function() {
      doodles.forEach(function(dc) { drawDoodleCanvas(dc.id, dc.doodle); });
    });
  } else {
    // Fallback for older browsers
    setTimeout(function() {
      doodles.forEach(function(dc) { drawDoodleCanvas(dc.id, dc.doodle); });
    }, 500);
  }
}

function appendMessageToDOM(m) {
  const area=document.getElementById('messagesArea');
  const idx = (STORE.messages||[]).length - 1;
  const prevTs = getLastMessagePreceding();
  // Clear empty state if present
  if (area.querySelector('.msg-empty')) area.innerHTML = '';
  // Insert time divider if gap > 10 minutes
  if (prevTs !== null && (m.timestamp - prevTs) > 600000) {
    const t = new Date(m.timestamp).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
    var divEl = document.createElement('div');
    divEl.className = 'msg-time-divider';
    divEl.innerHTML = '<span class="divider-label">———— '+t+' ————</span>';
    area.appendChild(divEl);
  }
  const html = renderOneMessageHTML(m, idx);
  var tmp = document.createElement('div');
  tmp.innerHTML = html;
  var row = tmp.firstElementChild;
  area.appendChild(row);
  // Draw doodle if needed
  if (m.doodle && m.type==='character') {
    drawDoodleCanvas('doodle_cv_'+idx, m.doodle);
  }
  area.scrollTop = area.scrollHeight;
}

var _messageLoadingRow = null;

function showMessageLoadingBubble() {
  const area=document.getElementById('messagesArea');
  if(!area)return;
  removeMessageLoadingBubble();
  if(area.querySelector('.msg-empty'))area.innerHTML='';
  const av=getAvatarHTML();
  const row=document.createElement('div');
  row.className='msg-row char msg-loading-row';
  row.innerHTML='<div class="msg-avatar">'+av.char+'</div><div class="msg-bubble"><span class="msg-loading" aria-label="正在输入"><i></i><i></i><i></i></span></div>';
  area.appendChild(row);
  _messageLoadingRow=row;
  area.scrollTop=area.scrollHeight;
}

function removeMessageLoadingBubble() {
  const row=_messageLoadingRow||document.querySelector('#messagesArea .msg-loading-row');
  if(row)row.remove();
  _messageLoadingRow=null;
}

// Returns the PREVIOUS message's timestamp (before the one about to be appended)
function getLastMessagePreceding() {
  var msgs = STORE.messages || [];
  if (msgs.length <= 1) return null;
  return msgs[msgs.length - 2].timestamp;
}

// ============ Doodle Canvas Drawing ============
function drawDoodleCanvas(canvasId, doodle) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;

  // Transparent background — leave blank (white-ish)
  ctx.clearRect(0, 0, W, H);

  var text = doodle.text;
  var color = doodle.color || '#e04040';
  var maxWidth = W - 20; // 10px margin each side

  var fontFamily = '"MengJiaoShouXie", "HarmonyOS Sans SC", "PingFang SC", "Microsoft YaHei", -apple-system, sans-serif';

  // Find font size that fits
  var fontSize = 52;
  ctx.font = fontSize + 'px ' + fontFamily;
  while (fontSize > 24 && ctx.measureText(text).width > maxWidth) {
    fontSize--;
    ctx.font = fontSize + 'px ' + fontFamily;
  }
  // Random jitter ±4px
  fontSize += Math.floor(Math.random() * 9) - 4;
  ctx.font = fontSize + 'px ' + fontFamily;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2, H / 2);
}

// ============ Rendering: Header ============
function renderSubtitleHTML() {
  const cfg=STORE.config||{};
  return '<span class="ct-star">★</span> 与'+(cfg.userNickname||'我')+'的小窝 <span class="ct-star">★</span>';
}

function renderHeader() {
  const cfg=STORE.config||{};
  const main=document.querySelector('#chatTitles .ct-main');
  if(main)main.textContent=cfg.characterName||'日向翔阳';
  const sub=document.querySelector('#chatTitles .ct-sub');
  if(sub)sub.innerHTML=renderSubtitleHTML();
}

// ============ Red Dot System ============
function getDotKey(viewId) {
  if (viewId === 'moments') return 'moments';
  if (viewId === 'diary') return 'diary';
  if (viewId === 'checkin') return 'checkin';
  if (viewId === 'letters') return 'letters';
  return null;
}

function getNewestTimestamp(viewId) {
  var latest = 0;
  if (viewId === 'moments') {
    var moments = STORE.moments || [];
    moments.forEach(function(m) {
      if (m.publisher === 'dream' && m.timestamp > latest) latest = m.timestamp;
      (m.comments || []).forEach(function(c) {
        if (c.commenter === 'dream' && m.publisher !== 'dream' && c.timestamp > latest) latest = c.timestamp;
      });
    });
  } else if (viewId === 'diary') {
    var diaries = STORE.diaries || [];
    diaries.forEach(function(d) {
      if (d.author === 'dream' && d.createdAt > latest) latest = d.createdAt;
      (d.comments || []).forEach(function(c) {
        if (c.author === 'dream' && d.author !== 'dream' && c.timestamp > latest) latest = c.timestamp;
      });
    });
  } else if (viewId === 'checkin') {
    var checkins = STORE.checkins || [];
    checkins.forEach(function(c) {
      if (c.role === 'dream' && c.timestamp > latest) latest = c.timestamp;
    });
  } else if (viewId === 'letters') {
    var letters = STORE.letters || [];
    letters.forEach(function(l) {
      (l.annotations || []).forEach(function(a) {
        if (a.visible && a.dueAt && a.dueAt > latest) latest = a.dueAt;
      });
    });
  }
  return latest;
}

function updateRedDots() {
  var lastSeen = STORE.lastSeen || {};
  var anyDot = false;
  ['moments', 'diary', 'checkin', 'letters'].forEach(function(viewId) {
    var dotKey = getDotKey(viewId);
    var newest = getNewestTimestamp(viewId);
    var seen = lastSeen[dotKey] || 0;
    var show = newest > seen;
    // Panel item dot
    var panelDot = document.querySelector('[data-dot-view="' + viewId + '"]');
    if (panelDot) panelDot.style.display = show ? '' : 'none';
    if (show) anyDot = true;
  });
  // Menu button dot
  var menuDot = document.getElementById('menuBtnDot');
  if (menuDot) menuDot.style.display = anyDot ? '' : 'none';
}

function markSeen(viewId) {
  var dotKey = getDotKey(viewId);
  if (!dotKey) return;
  var lastSeen = STORE.lastSeen || {};
  lastSeen[dotKey] = Date.now();
  STORE.lastSeen = lastSeen;
  updateRedDots();
}

// ============ Side Panel ============
function openPanel() {
  updateRedDots();
  state.panelOpen=true;
  document.getElementById('sidePanel').classList.add('open');
  document.getElementById('menuOverlay').classList.add('show');
  document.getElementById('btnMenu').textContent='✕';
  if(state.selectedCatId===null){
    const cats=STORE.categories||[];
    if(cats.length>0)state.selectedCatId=cats[0].id;
  }
}

function closePanel() {
  state.panelOpen=false;
  document.getElementById('sidePanel').classList.remove('open');
  document.getElementById('menuOverlay').classList.remove('show');
  document.getElementById('btnMenu').textContent='☰';
}

// ============ Fullscreen View ============
function openFullscreen(viewId) {
  markSeen(viewId); // clear red dot for this view
  closePanel(); // close bottom panel first
  state.fsOpen=true;
  state.fsView=viewId;
  const fs=document.getElementById('fullscreenView');
  fs.classList.add('open');
  const body=document.getElementById('fsBody');

  if(viewId==='cards'){
    document.getElementById('fsTitle').textContent='字卡库管理';
    renderCardManager(body);
  } else if(viewId==='settings'){
    document.getElementById('fsTitle').textContent='梦角设置';
    renderSettings(body);
  } else if(viewId==='moments'){
    document.getElementById('fsTitle').textContent='朋友圈';
    renderMoments(body);
  } else if(viewId==='diary'){
    document.getElementById('fsTitle').textContent='日记本';
    renderDiary(body);
  } else if(viewId==='letters'){
    document.getElementById('fsTitle').textContent='写信';
    renderLetters(body);
  } else if(viewId==='checkin'){
    document.getElementById('fsTitle').textContent='打卡';
    renderCheckin(body);
  } else if(viewId==='period'){
    document.getElementById('fsTitle').textContent='经期记录';
    renderPeriodTracker(body);
  } else if(viewId==='favorites'){
    document.getElementById('fsTitle').textContent='收藏夹';
    renderFavorites(body);
  } else if(viewId==='memory'){
    document.getElementById('fsTitle').textContent='记忆库管理';
    renderMemoryLibrary(body);
  }
}

function closeFullscreen() {
  cmHidePop();
  var backBtn = document.getElementById('btnBackToChat');
  if (backBtn) backBtn.textContent = '← 返回聊天';
  if (state.fsView === 'letters') {
    state.letterFullscreenId = null;
    state.letterDraft = null;
  }
  state.fsOpen=false;
  state.fsView=null;
  document.getElementById('fullscreenView').classList.remove('open');
  updateRedDots();
}

// ============ Rendering: Card Manager ============
var cmPopover = null;

function cmHidePop() {
  if (cmPopover) { cmPopover.remove(); cmPopover = null; }
}

function cmShowPop(el, type) {
  cmHidePop();
  var rect = el.getBoundingClientRect();
  // Check hidden state
  var isHidden = false;
  if (type === 'cat') { var cats=STORE.categories||[], c=cats.find(x=>x.id===el.dataset.catId); if(c) isHidden=c.hidden; }
  else { var subs=STORE.subcategories||[], s=subs.find(x=>x.id===el.dataset.subId); if(s) isHidden=s.hidden; }
  var eyeIcon = isHidden ? '👁️‍🗨️' : '👁️';

  var pop = document.createElement('div');
  pop.className = 'cm-popover';
  pop.style.left = Math.round(rect.left + rect.width / 2) + 'px';
  pop.style.top = Math.round(rect.bottom + 6) + 'px';
  pop.style.transform = 'translateX(-50%)';
  pop.innerHTML =
    '<button class="cm-pop-btn cm-pop-eye" title="显示/隐藏">'+eyeIcon+'</button>' +
    '<button class="cm-pop-btn cm-pop-rename" title="重命名">✏️</button>' +
    '<button class="cm-pop-btn cm-pop-danger cm-pop-del" title="删除">🗑️</button>';
  pop.dataset.type = type;
  pop.dataset.id = el.dataset.catId || el.dataset.subId || '';
  document.body.appendChild(pop);
  cmPopover = pop;
  requestAnimationFrame(function() {
    var pr = pop.getBoundingClientRect();
    if (pr.right > window.innerWidth - 8) { pop.style.left = (window.innerWidth - pr.width - 8) + 'px'; pop.style.transform = 'none'; }
    if (pr.left < 8) { pop.style.left = '8px'; pop.style.transform = 'none'; }
  });
}

function renderCardManager(container) {
  var backBtn = document.getElementById('btnBackToChat');
  if (backBtn) backBtn.textContent = '✕';

  container.innerHTML=`
    <div class="cards-toolbar">
      <button class="tb-btn" id="tbAddCard">＋ 添加</button>
      <button class="tb-btn" id="tbBatch">📋 批量导入</button>
      <button class="tb-btn" id="tbExport">📥 导出</button>
      <button class="tb-btn" id="tbImport">📤 导入</button>
    </div>
    <input type="text" class="tb-search" id="tbSearch" placeholder="🔍 搜索字卡…" value="${escapeHtml(state.searchQuery)}" style="margin:2px 14px 4px;width:calc(100% - 28px);flex-shrink:0;">
    <div class="cat-tabs" id="catTabs"></div>
    <div class="subcat-row" id="subcatRow"></div>
    <div class="card-count-info" id="cardCountInfo"></div>
    <div class="card-list" id="cardList"></div>`;

  bindCardManagerEvents(container);
  renderCatTabs(); renderSubchips(); renderCardItems();
}

function renderCatTabs() {
  const ct=document.getElementById('catTabs'); if(!ct)return;
  const cats=STORE.categories||[];
  ct.innerHTML=cats.map(c=>{
    const active=state.selectedCatId===c.id?' active':'';
    const hidden=c.hidden?' hidden':'';
    const cnt=(STORE.cards||[]).filter(card=>card.categoryId===c.id).length;
    return `<span class="cat-tab${active}${hidden}" data-cat-id="${c.id}">
      ${escapeHtml(c.name)}<span class="cat-badge">${cnt}</span></span>`;
  }).join('')+'<button class="btn-new-cat" id="btnNewCat">＋ 新建大类</button>';
}

function renderSubchips() {
  const row=document.getElementById('subcatRow'); if(!row)return;
  const subs=STORE.subcategories||[];
  const filtered=state.selectedCatId?subs.filter(s=>s.categoryId===state.selectedCatId):[];
  row.innerHTML=filtered.map(s=>{
    const active=state.selectedSubId===s.id?' active':'';
    const hidden=s.hidden?' hidden':'';
    return `<span class="subcat-chip${active}${hidden}" data-sub-id="${s.id}">${escapeHtml(s.name)}</span>`;
  }).join('')+(state.selectedCatId?'<button class="btn-new-subcat" id="btnNewSub">＋ 新建小类</button>':'<span style="font-size:11px;color:var(--text-muted);padding:3px 8px;">← 请先选择大类</span>');
}

function renderCardItems() {
  const list=document.getElementById('cardList'); if(!list)return;
  var allCards=STORE.cards||[];
  var catCards=allCards, subCards=allCards;
  if(state.selectedCatId)catCards=allCards.filter(c=>c.categoryId===state.selectedCatId);
  if(state.selectedSubId)subCards=catCards.filter(c=>c.subcategoryId===state.selectedSubId);
  var cards=subCards;
  const q=state.searchQuery.trim().toLowerCase();
  if(q)cards=cards.filter(c=>c.text.toLowerCase().includes(q));

  // Update count info
  var ci=document.getElementById('cardCountInfo');
  if(ci){
    var parts=[];
    if(state.selectedCatId){var cats=STORE.categories||[], catName=(cats.find(c=>c.id===state.selectedCatId)||{}).name||'?';parts.push('“'+catName+'”共 '+catCards.length+' 条');}
    if(state.selectedSubId){var subs=STORE.subcategories||[], subName=(subs.find(s=>s.id===state.selectedSubId)||{}).name||'?';parts.push('“'+subName+'”'+subCards.length+' 条');}
    ci.textContent=parts.join(' · ')||'全部字卡共 '+allCards.length+' 条';
  }

  if(cards.length===0){list.innerHTML='<div class="card-empty">暂无字卡，点击 ＋添加</div>';return;}

  list.innerHTML=cards.map(c=>{
    const w=c.weight||1;
    const wc=w>=5?'weight-5':w>=4?'weight-4':w>=3?'weight-3':w>=2?'weight-2':'weight-1';
    return `<div class="card-item" data-card-id="${c.id}">
      <span class="card-text" title="${escapeHtml(c.text)}">${escapeHtml(c.text)}</span>
      <span class="card-weight" data-card-id="${c.id}" title="点击+1权重">
        <span class="weight-star">⭐</span><span class="weight-num ${wc}">${w}</span></span>
      <button class="btn-card-act btn-card-edit" data-card-id="${c.id}" title="编辑">✏️</button>
      <button class="btn-card-act btn-card-del" data-card-id="${c.id}" title="删除">🗑️</button></div>`;
  }).join('');
}

function bindCardManagerEvents(container) {
  container.querySelector('#tbAddCard').addEventListener('click',showAddCardModal);
  container.querySelector('#tbBatch').addEventListener('click',showBatchImportModal);
  container.querySelector('#tbExport').addEventListener('click',exportData);
  container.querySelector('#tbImport').addEventListener('click',()=>{
    if (window.AndroidBridge && typeof window.AndroidBridge.pickImportFile === 'function') {
      window.__importTarget = 'cards';
      var ok = window.AndroidBridge.pickImportFile();
      if (!ok) alert('无法打开文件选择器');
    } else {
      document.getElementById('fileImport').click();
    }
  });
  container.querySelector('#tbSearch').addEventListener('input',function(){state.searchQuery=this.value;renderCardItems();cmHidePop();});

  // Popover button actions (global capture)
  document.addEventListener('click', function cmPopHandler(e) {
    var pop = e.target.closest('.cm-popover');
    if (!pop) {
      // Close popover on outside click
      if (cmPopover && !e.target.closest('.cat-tab') && !e.target.closest('.subcat-chip')) cmHidePop();
      return;
    }
    var type = pop.dataset.type, id = pop.dataset.id;
    if (e.target.closest('.cm-pop-eye')) {
      if (type === 'cat') { var cats=STORE.categories||[], c=cats.find(x=>x.id===id); if(c){c.hidden=!c.hidden;STORE.categories=cats;renderCatTabs();renderCardItems();var newEye=c.hidden?'👁️‍🗨️':'👁️';e.target.closest('.cm-popover')&&(e.target.closest('.cm-popover').querySelector('.cm-pop-eye').textContent=newEye);} }
      else { var subs=STORE.subcategories||[], s=subs.find(x=>x.id===id); if(s){s.hidden=!s.hidden;STORE.subcategories=subs;renderSubchips();renderCardItems();var newEye=s.hidden?'👁️‍🗨️':'👁️';e.target.closest('.cm-popover')&&(e.target.closest('.cm-popover').querySelector('.cm-pop-eye').textContent=newEye);} }
      return;
    }
    if (e.target.closest('.cm-pop-rename')) {
      if (type === 'cat') { var cats=STORE.categories||[], c=cats.find(x=>x.id===id); if(!c)return; var n=prompt('修改大类名称：',c.name); if(n&&n.trim()&&n.trim()!==c.name){c.name=n.trim();STORE.categories=cats;renderCatTabs();renderSubchips();renderCardItems();} }
      else { var subs=STORE.subcategories||[], s=subs.find(x=>x.id===id); if(!s)return; var n=prompt('修改小类名称：',s.name); if(n&&n.trim()&&n.trim()!==s.name){s.name=n.trim();STORE.subcategories=subs;renderSubchips();renderCardItems();} }
      cmHidePop(); return;
    }
    if (e.target.closest('.cm-pop-del')) {
      if (type === 'cat') {
        var cats=STORE.categories||[], c=cats.find(x=>x.id===id); if(!c)return;
        var sc=(STORE.subcategories||[]).filter(x=>x.categoryId===id).length, cc=(STORE.cards||[]).filter(x=>x.categoryId===id).length;
        if(!confirm(`确定删除大类「${c.name}」吗？\n将同时删除其下的 ${sc} 个小类和 ${cc} 条字卡。`))return;
        STORE.categories=cats.filter(x=>x.id!==id); STORE.subcategories=(STORE.subcategories||[]).filter(x=>x.categoryId!==id);
        STORE.cards=(STORE.cards||[]).filter(x=>x.categoryId!==id);
        if(state.selectedCatId===id){state.selectedCatId=null;state.selectedSubId=null;}
        renderCatTabs(); renderSubchips(); renderCardItems();
      } else {
        var subs=STORE.subcategories||[], s=subs.find(x=>x.id===id); if(!s)return;
        var cc=(STORE.cards||[]).filter(x=>x.subcategoryId===id).length;
        if(!confirm(`确定删除小类「${s.name}」吗？\n将同时删除其下的 ${cc} 条字卡。`))return;
        STORE.subcategories=subs.filter(x=>x.id!==id); STORE.cards=(STORE.cards||[]).filter(x=>x.subcategoryId!==id);
        if(state.selectedSubId===id)state.selectedSubId=null;
        renderSubchips(); renderCardItems();
      }
      cmHidePop(); return;
    }
  }, true);

  // Delegation: category tabs
  container.querySelector('#catTabs').addEventListener('click',e=>{
    const newCatBtn = e.target.id==='btnNewCat' ? e.target : e.target.closest('#btnNewCat');
    if(newCatBtn){
      const name=prompt('请输入大类名称：'); if(!name||!name.trim())return;
      const cats=STORE.categories||[];
      if(cats.find(c=>c.name.trim()===name.trim())){alert('该大类已存在');return;}
      cats.push({id:genId(),name:name.trim(),hidden:false});STORE.categories=cats;
      state.selectedCatId=cats[cats.length-1].id; state.selectedSubId=null;
      renderCatTabs(); renderSubchips(); renderCardItems(); return;
    }
    const tab = e.target.closest('.cat-tab'); if(!tab) return;
    const catId = tab.dataset.catId;
    state.selectedCatId=catId; state.selectedSubId=null;
    renderCatTabs(); renderSubchips(); renderCardItems();
    cmShowPop(tab, 'cat');
  });
  // Delegation: subcategory chips
  container.querySelector('#subcatRow').addEventListener('click',e=>{
    const newSubBtn = e.target.id==='btnNewSub' ? e.target : e.target.closest('#btnNewSub');
    if(newSubBtn){
      if(!state.selectedCatId){alert('请先选择一个大类');return;}
      const name=prompt('请输入小类名称：'); if(!name||!name.trim())return;
      const subs=STORE.subcategories||[];
      if(subs.find(s=>s.categoryId===state.selectedCatId&&s.name.trim()===name.trim())){alert('该小类已存在');return;}
      subs.push({id:genId(),name:name.trim(),categoryId:state.selectedCatId,hidden:false});STORE.subcategories=subs;
      renderSubchips(); return;
    }
    const chip = e.target.closest('.subcat-chip'); if(!chip) return;
    const subId = chip.dataset.subId;
    state.selectedSubId=subId;
    renderSubchips(); renderCardItems();
    cmShowPop(chip, 'sub');
  });
  // Delegation: card list (weight, edit, delete)
  container.querySelector('#cardList').addEventListener('click',e=>{
    const cardItem = e.target.closest('.card-item');
    if (!cardItem) return;
    const cardId = cardItem.dataset.cardId;
    if (e.target.closest('.card-weight') && !e.target.closest('.weight-num')) {
      const cards=STORE.cards||[], card=cards.find(c=>c.id===cardId);
      if (card) { card.weight = Math.min(100, (card.weight||1)+1); STORE.cards=cards; renderCardItems(); }
      return;
    }
    if (e.target.closest('.weight-num')) {
      const cards=STORE.cards||[], card=cards.find(c=>c.id===cardId);
      if (!card) return;
      const v=prompt('修改权重（1~100）：',card.weight||1);
      if (v!==null) { const n=parseInt(v,10); if (!isNaN(n)&&n>=1&&n<=100) { card.weight=n; STORE.cards=cards; renderCardItems(); } else if (v.trim()!=='') { alert('请输入1~100之间的整数'); } }
      return;
    }
    if (e.target.closest('.btn-card-edit')) { showEditCardModal(cardId); return; }
    if (e.target.closest('.btn-card-del')) {
      if (!confirm('确定删除这条字卡吗？')) return;
      STORE.cards=(STORE.cards||[]).filter(c=>c.id!==cardId);
      renderCardItems(); return;
    }
  });
}

// ============ Rendering: Settings ============
function renderSettings(container) {
  const cfg=STORE.config||{};
  const engCfg=cfg.dreamEngine||{};
  const msgP=cfg.msgCountProbs||[30,40,20,10];
  const cardP=cfg.cardCountProbs||[30,40,20,10];
  const av=cfg.avatarUrl||'';
  const uav=cfg.userAvatarUrl||'';
  const aiCfg=cfg.aiInterpret||defaultAIInterpret();
  const letterCfg=getLetterConfig();
  const neteaseCfg=getNeteaseConfig();

  container.innerHTML=`
  <div class="settings-body">
    <div class="settings-save-status" id="settingsSaveStatus" aria-live="polite">已保存</div>

    <div class="setting-group">
      <div class="sg-title">👤 形象设置</div>
      <div class="avatar-preview" id="avatarPreview">${av?`<img src="${escapeHtml(av)}" onerror="this.parentElement.textContent='🏐'">`:'🏐'}</div>
      <div class="avatar-actions"><button class="btn-avatar-del" id="btnCharAvDel" ${av?'':'style="display:none"'}>移除头像</button></div>
      <input type="file" id="charAvInput" accept="image/*" style="display:none">
      <div class="setting-row"><label>梦角昵称</label><input type="text" id="cfgName" value="${escapeHtml(cfg.characterName||'')}"></div>
      <div class="avatar-preview" id="userAvatarPreview" style="margin-top:10px;">${uav?`<img src="${escapeHtml(uav)}" onerror="this.parentElement.textContent='🐟'">`:'🐟'}</div>
      <div class="avatar-actions"><button class="btn-avatar-del" id="btnUserAvDel" ${uav?'':'style="display:none"'}>移除头像</button></div>
      <input type="file" id="userAvInput" accept="image/*" style="display:none">
      <div class="setting-row"><label>我的昵称</label><input type="text" id="cfgUserNickname" value="${escapeHtml(cfg.userNickname||'我')}" placeholder="我"></div>
    </div>

    <div class="setting-group">
      <div class="sg-title">🌅 梦角作息</div>
      <div class="setting-row"><label>起床时间</label><input type="number" id="cfgWakeTime" value="${engCfg.wakeTime!=null?engCfg.wakeTime:7}" min="0" max="12" step="1"><label>时</label><span style="width:20px;"></span><label>睡觉时间</label><input type="number" id="cfgSleepTime" value="${engCfg.sleepTime!=null?engCfg.sleepTime:23}" min="18" max="24" step="1"><label>时</label></div>
      <div class="setting-row" style="font-size:11px;color:var(--text-muted);">除日记外，所有自动行为都在此时间段内随机触发</div>
    </div>

    <div class="setting-group">
      <div class="sg-title">💬 聊天设置</div>
      <div class="setting-row">
        <label>启用主动聊天</label>
        <input type="checkbox" id="cfgDEEnaChat" ${(engCfg.enabled&&engCfg.enabled.dreamChat!==false)?'checked':''} style="width:auto;">
      </div>
      <div class="setting-row"><label>每天主动聊</label><input type="number" id="cfgDEPDChatMin" value="${(engCfg.perDay&&engCfg.perDay.dreamChat)?engCfg.perDay.dreamChat.min:5}" min="0" max="30" step="1"><label>~</label><input type="number" id="cfgDEPDChatMax" value="${(engCfg.perDay&&engCfg.perDay.dreamChat)?engCfg.perDay.dreamChat.max:15}" min="0" max="30" step="1"><label>次</label></div>
      <div class="setting-row"><label>主动发言间隔(分)</label><input type="number" id="cfgActiveMin" value="${cfg.timing?.activeChat?.min||30}" min="5" step="5"><label>~</label><input type="number" id="cfgActiveMax" value="${cfg.timing?.activeChat?.max||60}" min="5" step="5"></div>
      <div class="setting-row"><label>被动回复延迟(秒)</label><input type="number" id="cfgPassiveMin" value="${cfg.timing?.passiveReply?.min||0.5}" min="0.1" step="0.1"><label>~</label><input type="number" id="cfgPassiveMax" value="${cfg.timing?.passiveReply?.max||2.5}" min="0.1" step="0.1"></div>
      <div class="setting-row"><label>一次说</label><input type="number" id="cfgMsgCnt1" value="${msgP[0]}" style="width:50px;" class="prob-msg" data-idx="0" min="0" max="100"><label>1条 /</label><input type="number" id="cfgMsgCnt2" value="${msgP[1]}" style="width:50px;" class="prob-msg" data-idx="1" min="0" max="100"><label>2条 /</label><input type="number" id="cfgMsgCnt3" value="${msgP[2]}" style="width:50px;" class="prob-msg" data-idx="2" min="0" max="100"><label>3条 /</label><input type="number" id="cfgMsgCnt4" value="${msgP[3]}" style="width:50px;" class="prob-msg" data-idx="3" min="0" max="100"><label>4条（概率）</label></div>
      <div class="setting-row"><label>一条用</label><input type="number" id="cfgCardCnt1" value="${cardP[0]}" style="width:50px;" class="prob-card" data-idx="0" min="0" max="100"><label>1张 /</label><input type="number" id="cfgCardCnt2" value="${cardP[1]}" style="width:50px;" class="prob-card" data-idx="1" min="0" max="100"><label>2张 /</label><input type="number" id="cfgCardCnt3" value="${cardP[2]}" style="width:50px;" class="prob-card" data-idx="2" min="0" max="100"><label>3张 /</label><input type="number" id="cfgCardCnt4" value="${cardP[3]}" style="width:50px;" class="prob-card" data-idx="3" min="0" max="100"><label>4张字卡（概率）</label></div>
      <div class="prob-hint">消息条数总和：<span id="probMsgSum">${msgP.reduce((a,b)=>a+b,0)}</span>　字卡张数总和：<span id="probCardSum">${cardP.reduce((a,b)=>a+b,0)}</span></div>
      <div class="setting-row"><label>涂鸦概率(%)</label><input type="number" id="cfgDoodleProb" value="${cfg.prob?.doodle||8}" min="0" max="100" step="1"><label>0关·100必出</label></div>
      <div class="setting-row"><label>聊天带表情概率(%)</label><input type="number" id="cfgChatSticker" value="${(engCfg.prob&&engCfg.prob.dreamChatSticker!=null)?engCfg.prob.dreamChatSticker:10}" min="0" max="100" step="5"></div>
      <div class="setting-row"><label>消息撤回概率(%)</label><input type="number" id="cfgRecallProb" value="${(engCfg.prob&&engCfg.prob.recallProb!=null)?engCfg.prob.recallProb:1}" min="0" max="100" step="0.1"></div>
    </div>

    <div class="setting-group">
      <div class="sg-title">🫂 朋友圈设置</div>
      <div class="setting-row">
        <label>启用</label>
        <input type="checkbox" id="cfgDEEnaPost" ${(engCfg.enabled&&engCfg.enabled.dreamPost!==false)?'checked':''} style="width:auto;">
      </div>
      <div class="setting-row"><label>每天发</label><input type="number" id="cfgDEPDPostMin" value="${(engCfg.perDay&&engCfg.perDay.dreamPost)?engCfg.perDay.dreamPost.min:2}" min="0" max="20" step="1"><label>~</label><input type="number" id="cfgDEPDPostMax" value="${(engCfg.perDay&&engCfg.perDay.dreamPost)?engCfg.perDay.dreamPost.max:8}" min="0" max="20" step="1"><label>条</label></div>
      <div class="setting-row"><label>发圈间隔(分)</label><input type="number" id="cfgDPostMin" value="${cfg.timing?.dreamPost?.min||2}" min="0.5" step="0.5"><label>~</label><input type="number" id="cfgDPostMax" value="${cfg.timing?.dreamPost?.max||8}" min="0.5" step="0.5"></div>
      <div class="setting-row"><label>一条用字卡</label><input type="number" id="cfgDPCardMin" value="${cfg.timing?.dreamPostCard?.min||1}" min="1" max="10" step="1"><label>~</label><input type="number" id="cfgDPCardMax" value="${cfg.timing?.dreamPostCard?.max||5}" min="1" max="10" step="1"><label>张</label></div>
      <div class="setting-row"><label>配图概率(%)</label><input type="number" id="cfgPhotoProb" value="${cfg.prob?.postPhoto||60}" min="0" max="100" step="5"><label>含表情贴纸</label><input type="number" id="cfgStickerFrac" value="${cfg.prob?.stickerFrac||70}" min="0" max="100" step="5"><label>%</label></div>
      <div class="setting-row"><label>刷圈间隔(分)</label><input type="number" id="cfgDRMin" value="${cfg.timing?.dreamReaction?.min||1}" min="0.5" step="0.5"><label>~</label><input type="number" id="cfgDRMax" value="${cfg.timing?.dreamReaction?.max||6}" min="0.5" step="0.5"></div>
      <div class="setting-row"><label>点赞概率(%)</label><input type="number" id="cfgLikeProb" value="${cfg.prob?.dreamLike||80}" min="0" max="100" step="5"><label>评论概率(%)</label><input type="number" id="cfgCommentProb" value="${cfg.prob?.dreamComment||65}" min="0" max="100" step="5"></div>
      <div class="setting-row"><label>回复延迟(秒)</label><input type="number" id="cfgCDMin" value="${cfg.timing?.dreamComment?.min||2}" min="0.5" step="0.5"><label>~</label><input type="number" id="cfgCDMax" value="${cfg.timing?.dreamComment?.max||8}" min="0.5" step="0.5"></div>
      <div class="setting-row"><label>评论衰减(%)</label><input type="number" class="prob-decay" data-idx="0" value="${(cfg.dreamReplyDecaySeq||[100,70,40,10,0])[0]}" style="width:46px;" min="0" max="100"><input type="number" class="prob-decay" data-idx="1" value="${(cfg.dreamReplyDecaySeq||[100,70,40,10,0])[1]}" style="width:46px;" min="0" max="100"><input type="number" class="prob-decay" data-idx="2" value="${(cfg.dreamReplyDecaySeq||[100,70,40,10,0])[2]}" style="width:46px;" min="0" max="100"><input type="number" class="prob-decay" data-idx="3" value="${(cfg.dreamReplyDecaySeq||[100,70,40,10,0])[3]}" style="width:46px;" min="0" max="100"><span style="font-size:11px;color:var(--text-muted);">第1~4轮</span></div>
      <div class="setting-row"><label>第5轮+</label><input type="number" id="cfgDecay5" value="${(cfg.dreamReplyDecaySeq||[100,70,40,10,0])[4]||0}" min="0" max="100" step="5" style="width:60px;"><label>启用衰减</label><input type="checkbox" id="cfgDecayOn" ${cfg.dreamReplyDecayOn!==false?'checked':''} style="width:auto;"></div>
    </div>

    <div class="setting-group">
      <div class="sg-title">📔 日记设置</div>
      <div class="setting-row">
        <label>启用梦角日记</label>
        <input type="checkbox" id="cfgDEEnaDD" ${(engCfg.enabled&&engCfg.enabled.dreamDiary!==false)?'checked':''} style="width:auto;">
      </div>
      <div class="setting-row"><label>生成时段</label><input type="number" id="cfgDETWDDS" value="${engCfg.diaryTimeStart!=null?engCfg.diaryTimeStart:21}" min="0" max="23" step="1"><label>时~</label><input type="number" id="cfgDETWDDE" value="${engCfg.diaryTimeEnd!=null?engCfg.diaryTimeEnd:24}" min="1" max="24" step="1"><label>时（每天1篇）</label></div>
      <div class="setting-row"><label>备选时段</label><input type="number" id="cfgDGMin" value="${cfg.timing?.diaryGen?.hourMin||21}" min="0" max="23" step="1"><label>~</label><input type="number" id="cfgDGMax" value="${cfg.timing?.diaryGen?.hourMax||24}" min="1" max="24" step="1"><label>时（旧调度）</label></div>
      <div class="setting-row" style="border-top:1px solid var(--border);padding-top:8px;margin-top:4px;">
        <label>启用批阅用户日记</label>
        <input type="checkbox" id="cfgDEEnaDC" ${(engCfg.enabled&&engCfg.enabled.dreamDiaryComment!==false)?'checked':''} style="width:auto;">
      </div>
      <div class="setting-row"><label>批阅概率(%)</label><input type="number" id="cfgDCProbNew" value="${(engCfg.prob&&engCfg.prob.dreamDiaryComment!=null)?engCfg.prob.dreamDiaryComment:70}" min="0" max="100" step="5"></div>
      <div class="setting-row"><label>批阅延迟(分)</label><input type="number" id="cfgDCDMin" value="${cfg.timing?.diaryComment?.min||30}" min="1" step="1"><label>~</label><input type="number" id="cfgDCDMax" value="${cfg.timing?.diaryComment?.max||120}" min="1" step="1"></div>
    </div>

    <div class="setting-group">
      <div class="sg-title">📌 打卡设置</div>
      <div class="setting-row">
        <label>启用梦角打卡</label>
        <input type="checkbox" id="cfgDEEnaCI" ${(engCfg.enabled&&engCfg.enabled.dreamCheckin===true)?'checked':''} style="width:auto;">
      </div>
      <div class="setting-row"><label>每天</label><input type="number" id="cfgDEPDCIMin" value="${(engCfg.perDay&&engCfg.perDay.dreamCheckin)?engCfg.perDay.dreamCheckin.min:3}" min="0" max="30" step="1"><label>~</label><input type="number" id="cfgDEPDCIMax" value="${(engCfg.perDay&&engCfg.perDay.dreamCheckin)?engCfg.perDay.dreamCheckin.max:12}" min="0" max="30" step="1"><label>次</label></div>
      <div class="setting-row"><label>最少间隔(分)</label><input type="number" id="cfgCIIntv" value="${(engCfg.interval&&engCfg.interval.dreamCheckin!=null)?engCfg.interval.dreamCheckin:45}" min="10" max="180" step="5"></div>
    </div>

    <div class="setting-group">
      <div class="sg-title">💥 锐评设置</div>
      <div class="setting-row"><label>反问概率(%)</label><input type="number" id="cfgRCProb" value="${cfg.prob?.reviewCounter||20}" min="0" max="100" step="5"><label>评语字卡数</label><input type="number" id="cfgRCardCnt" value="${cfg.reviewCardCount||3}" min="1" max="10" step="1"></div>
      <div class="setting-row">
        <label>评级倾向</label>
        <select id="cfgRMode" style="padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-warm);font-size:13px;">
          <option value="random" ${cfg.reviewMode==='random'?'selected':''}>完全随机</option>
          <option value="harsh" ${cfg.reviewMode==='harsh'?'selected':''}>倾向毒舌</option>
          <option value="gentle" ${cfg.reviewMode==='gentle'?'selected':''}>倾向温柔</option>
        </select>
      </div>
    </div>

      <div class="setting-group">
      <div class="sg-title">✉️ 写信设置</div>
      <div class="setting-row"><label>批注等待(分)</label><input type="number" id="cfgLetterDelayMin" value="${letterCfg.annotationDelay.min}" min="1" max="1440" step="1"><label>~</label><input type="number" id="cfgLetterDelayMax" value="${letterCfg.annotationDelay.max}" min="1" max="1440" step="1"></div>
      <div class="setting-row"><label>批注覆盖率(%)</label><input type="number" id="cfgLetterCoverageMin" value="${letterCfg.coverage.min}" min="1" max="100" step="1"><label>~</label><input type="number" id="cfgLetterCoverageMax" value="${letterCfg.coverage.max}" min="1" max="100" step="1"></div>
      <div class="setting-row"><label>每段字卡数</label><input type="number" id="cfgLetterCardMin" value="${letterCfg.cardCount.min}" min="1" max="3" step="1"><label>~</label><input type="number" id="cfgLetterCardMax" value="${letterCfg.cardCount.max}" min="1" max="3" step="1"></div>
    </div>

    <div class="setting-group">
      <div class="sg-title">🎵 网易云歌曲</div>
      <div class="setting-row">
        <label>梦角分享歌曲</label>
        <input type="checkbox" id="cfgNeteaseEna" ${neteaseCfg.enabled?'checked':''} style="width:auto;">
      </div>
      <div class="setting-row"><label>分享概率(%)</label><input type="number" id="cfgNeteaseProb" value="${neteaseCfg.prob}" min="0" max="100" step="1"><label>发消息时随机带歌</label></div>
      <div class="setting-row"><label>歌单ID</label><input type="text" id="cfgNeteaseIds" value="${escapeHtml(neteaseCfg.playlistIds.join(','))}" style="width:140px;text-align:left;" placeholder="135597299"><label>多个用逗号分隔</label></div>
      <div class="setting-row" style="font-size:11px;color:var(--text-muted);">📖 如何换成自己的歌单：电脑打开 music.163.com → 找到你的歌单 → 点进歌单后看浏览器地址栏，<b>playlist?id=</b> 后面那串数字就是歌单 ID（如 135597299）</div>
      <div class="setting-row" style="font-size:11px;color:var(--text-muted);">⚠️ 「我喜欢的音乐」默认是私密的，接口拉不到；请把歌单设为公开，或新建一个公开歌单收藏想听歌</div>
      <div class="setting-row">
        <button id="btnRefreshSongs" style="padding:6px 14px;font-size:12px;border-radius:20px;background:var(--bg-warm);color:var(--accent);border:1px solid var(--border);cursor:pointer;">🔄 刷新歌单缓存</button>
        <span id="songCacheStatus" style="font-size:11px;color:var(--text-muted);">${(STORE.songCache && STORE.songCache.songs) ? '已缓存' + STORE.songCache.songs.length + '首' : '未缓存'}</span>
      </div>
      <div class="setting-row" style="font-size:11px;color:var(--text-muted);">在线拉取失败时自动用内置歌单兜底</div>
    </div>

    <div class="setting-group">
      <div class="sg-title">🤖 AI 解读</div>
      <div class="setting-row">
        <label>开启 AI 解读</label>
        <input type="checkbox" id="cfgAIEna" ${aiCfg.enabled?'checked':''} style="width:auto;">
      </div>
      <div class="setting-row"><label>API 地址</label><input type="text" id="cfgAIUrl" value="${escapeHtml(aiCfg.apiUrl)}" style="width:240px;text-align:left;"></div>
      <div class="setting-row" style="font-size:10px;color:var(--text-muted);">需支持浏览器跨域(CORS)，DeepSeek 官方接口兼容</div>
      <div class="setting-row">
        <label>API Key</label>
        <div style="display:flex;align-items:center;gap:6px;">
          <input type="password" id="cfgAIKey" value="${escapeHtml(aiCfg.apiKey)}" style="width:200px;text-align:left;" autocomplete="off">
          <button type="button" id="btnToggleAIKey" style="padding:4px 8px;font-size:12px;border-radius:14px;border:1px solid var(--border);background:var(--bg-warm);cursor:pointer;">👁</button>
        </div>
      </div>
      <div class="setting-row"><label>模型名称</label><input type="text" id="cfgAIModel" value="${escapeHtml(aiCfg.model)}" style="width:160px;text-align:left;"></div>
      <div class="setting-row">
        <label>上下文条数</label>
        <input type="number" id="cfgAIContext" min="0" max="20" value="${aiCfg.contextCount}">
        <span style="font-size:10px;color:var(--text-muted);margin-left:6px;">预估 ≈${(aiCfg.contextCount||0)*30} token/次</span>
      </div>
      <div class="setting-row" style="flex-direction:column;align-items:stretch;gap:4px;">
        <div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;" id="aiPromptToggle">
          <label style="cursor:pointer;">系统提示词（高级）</label>
          <span id="aiPromptArrow" style="font-size:10px;color:var(--text-secondary);">▶ 展开</span>
        </div>
        <textarea id="cfgAIPrompt" rows="6" style="display:none;width:100%;padding:8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-warm);resize:vertical;font-family:inherit;box-sizing:border-box;margin-top:4px;">${escapeHtml(aiCfg.systemPrompt)}</textarea>
      </div>
    </div>

    <div class="setting-group">
      <div class="sg-title">💾 数据导入导出</div>
      <div class="setting-row">
        <button id="btnExportAll" style="padding:8px 18px;font-size:13px;border-radius:20px;background:var(--accent);color:#fff;cursor:pointer;border:none;transition:all 0.15s;">📤 导出全部数据</button>
        <button id="btnImportAll" style="padding:8px 18px;font-size:13px;border-radius:20px;background:var(--bg-warm);color:var(--accent);border:1px solid var(--accent);cursor:pointer;transition:all 0.15s;">📥 导入全部数据</button>
        <input type="file" id="importAllFile" accept=".json" style="display:none">
      </div>
      <div class="setting-row" style="font-size:11px;color:var(--text-muted);">字卡库、聊天、朋友圈、日记、信件、打卡、经期、表情包、收藏等全部数据</div>
    </div>

    <div class="setting-group">
      <div class="sg-title">🧪 调试工具</div>
      <div class="setting-row">
        <button id="btnResetToday" style="padding:6px 14px;font-size:12px;border-radius:20px;background:#fff5f5;color:var(--danger);border:1px solid #ffc9c9;cursor:pointer;">重置今日事件（重算）</button>
        <button class="btn-danger" id="btnClearChat" style="margin:0;padding:6px 14px;font-size:12px;width:auto;display:inline-block;">🗑️ 清空聊天</button>
      </div>
      <div class="setting-row" style="font-size:11px;color:var(--text-muted);">
        上次离开: <span id="lastActiveDisplay">${STORE.lastActive ? new Date(STORE.lastActive).toLocaleString('zh-CN') : '无记录'}</span>
      </div>
      <div style="margin-top:8px;"><button class="btn-danger" id="btnResetAll" style="background:#fff0f0;color:#c02020;">⚠️ 删除所有数据（保留初始预设）</button></div>
    </div>

  </div>`;

  bindSettingsEvents(container);
}

function bindSettingsEvents(container) {
  // AI 解读：API Key 显示/隐藏
  const btnToggleKey=container.querySelector('#btnToggleAIKey');
  const aiKeyInp=container.querySelector('#cfgAIKey');
  if(btnToggleKey&&aiKeyInp){
    btnToggleKey.addEventListener('click',function(){
      aiKeyInp.type = aiKeyInp.type==='password' ? 'text' : 'password';
      this.textContent = aiKeyInp.type==='password' ? '👁' : '🙈';
    });
  }
  // AI 解读：系统提示词折叠
  const promptToggle=container.querySelector('#aiPromptToggle');
  const promptArea=container.querySelector('#cfgAIPrompt');
  const promptArrow=container.querySelector('#aiPromptArrow');
  if(promptToggle&&promptArea){
    promptToggle.addEventListener('click',function(){
      const open=promptArea.style.display!=='none';
      promptArea.style.display=open?'none':'block';
      if(promptArrow)promptArrow.textContent=open?'▶ 展开':'▼ 收起';
    });
  }
  // Avatar upload: click preview → pick file → compress → save
  function _setupAvatarUpload(previewId, inputId, delBtnId, cfgKey, emoji) {
    var preview = container.querySelector('#'+previewId);
    var input = container.querySelector('#'+inputId);
    var delBtn = container.querySelector('#'+delBtnId);
    if (!preview || !input) return;
    preview.addEventListener('click', function() { input.click(); });
    input.addEventListener('change', function() {
      var file = this.files[0];
      if (!file) return;
      compressImage(file, 400, 0.65).then(function(dataUrl) {
        preview.innerHTML = '<img src="'+dataUrl+'" onerror="this.parentElement.textContent=\''+emoji+'\'">';
        if (delBtn) delBtn.style.display = '';
        scheduleSettingsSave(container, true);
      }).catch(function(e) { console.error('头像压缩失败:', e); });
      this.value = '';
    });
    if (delBtn) {
      delBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        preview.innerHTML = emoji;
        delBtn.style.display = 'none';
        scheduleSettingsSave(container, true);
      });
    }
  }
  _setupAvatarUpload('avatarPreview', 'charAvInput', 'btnCharAvDel', 'avatarUrl', '🏐');
  _setupAvatarUpload('userAvatarPreview', 'userAvInput', 'btnUserAvDel', 'userAvatarUrl', '🐟');
  container.querySelectorAll('input:not([type="file"]):not([type="checkbox"]), textarea').forEach(inp=>inp.addEventListener('input', () => scheduleSettingsSave(container, false)));
  container.querySelectorAll('input[type="checkbox"], select').forEach(inp=>inp.addEventListener('change', () => scheduleSettingsSave(container, true)));
  container.querySelectorAll('.prob-msg,.prob-card').forEach(inp=>inp.addEventListener('input',()=>updateProbSums(container)));
  container.querySelector('#btnClearChat').addEventListener('click',()=>{
    if(!confirm('确定清空所有聊天记录吗？此操作不可撤销。'))return;
    STORE.messages=[];renderMessages();
  });
  // Reset all data button
  const btnResetAll = container.querySelector('#btnResetAll');
  if (btnResetAll) {
    btnResetAll.addEventListener('click', () => {
      if (!confirm('⚠️ 确定删除所有用户数据吗？\n\n保留：字卡库、大类小类、设置\n删除：聊天记录、朋友圈、日记、打卡、锐评、离线记录\n\n此操作不可撤销！')) return;
      // Nuke user-generated STORE keys
      STORE.messages = [];
      STORE.moments = [];
      STORE.likedMoments = [];
      STORE.diaries = [];
      STORE.letters = [];
      STORE.reviews = [];
      STORE.checkins = [];
      STORE.checkinWords = ['工作','休息','学习','散步','发呆','喝水'];
      STORE.dreamEvents = {};
      STORE._write('mcard_dream_nonces', {});
      STORE.lastActive = null;
      // Reset in-memory state
      state.decayRounds = {};
      state.pendingReactionTimers = {};
      state.pendingCommentTimers = {};
      state.checkinDate = null;
      stopAllDreamEventTimers();
      // Re-render everything
      renderMessages();
      const body = document.getElementById('fsBody');
      if (body && state.fsView === 'settings') renderSettings(body);
      if (body && state.fsView === 'checkin') renderCheckin(body);
      scheduleTodayEvents();
      alert('已删除所有用户数据，初始预设已保留。请刷新页面。');
      location.reload();
    });
  }
  // Dream engine: reset today button
  const btnReset = container.querySelector('#btnResetToday');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (!confirm('确定重置今日所有梦角事件记录吗？将重新计算并回溯今天的事件。')) return;
      const today = new Date();
      const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      clearDayEvents(dateStr);
      stopAllDreamEventTimers();
      scheduleTodayEvents();
      // Refresh settings view to show updated info
      const body = document.getElementById('fsBody');
      if (body && state.fsView === 'settings') renderSettings(body);
      alert('今日事件已重置，将重新计算并调度。');
    });
  }
  const btnExportAll = container.querySelector('#btnExportAll');
  if (btnExportAll) btnExportAll.addEventListener('click', exportAllData);
  const btnImportAll = container.querySelector('#btnImportAll');
  if (btnImportAll) btnImportAll.addEventListener('click', function() {
    if (window.AndroidBridge && typeof window.AndroidBridge.pickImportFile === 'function') {
      var ok = window.AndroidBridge.pickImportFile();
      if (!ok) alert('无法打开文件选择器');
    } else {
      var inp = document.getElementById('importAllFile'); if (inp) inp.click();
    }
  });
  const importAllFile = document.getElementById('importAllFile');
  if (importAllFile) importAllFile.addEventListener('change', function(e) { if (e.target.files[0]) { importAllData(e.target.files[0]); e.target.value = ''; } });
  // 网易云歌单刷新按钮
  const btnRefreshSongs = container.querySelector('#btnRefreshSongs');
  if (btnRefreshSongs) {
    btnRefreshSongs.addEventListener('click', function() {
      btnRefreshSongs.textContent = '拉取中...';
      btnRefreshSongs.disabled = true;
      saveSettingsFromForm(container);
      refreshSongCache().then(function(list) {
        var status = document.getElementById('songCacheStatus');
        if (status) status.textContent = (list && list.length) ? '已缓存' + list.length + '首' : '拉取失败，使用内置歌单';
        btnRefreshSongs.textContent = '🔄 刷新歌单缓存';
        btnRefreshSongs.disabled = false;
        if (list && list.length) alert('歌单已刷新，共缓存 ' + list.length + ' 首歌。');
        else alert('歌单拉取失败，将使用内置歌单兜底。');
      });
    });
  }
}

function scheduleSettingsSave(container, immediate) {
  clearTimeout(state.settingsSaveTimerId);
  var status = container.querySelector('#settingsSaveStatus');
  if (status) {
    status.textContent = immediate ? '正在保存...' : '编辑中...';
    status.classList.add('is-saving');
  }
  var delay = immediate ? 0 : 300;
  state.settingsSaveTimerId = setTimeout(function() {
    if (!container.isConnected || state.fsView !== 'settings') return;
    saveSettingsFromForm(container);
    if (status) {
      status.textContent = '已保存';
      status.classList.remove('is-saving');
    }
  }, delay);
}

// 轻提示小弹窗（自动消失）
function showToast(msg) {
  var el = document.getElementById('appToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'appToast';
    el.className = 'app-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._toastTimer);
  el._toastTimer = setTimeout(function() { el.classList.remove('show'); }, 1600);
}

function scheduleSettingsEngineRefresh() {
  clearTimeout(state.settingsEngineTimerId);
  state.settingsEngineTimerId = setTimeout(function() {
    stopActive();
    scheduleActive();
    stopAllDreamEventTimers();
    scheduleTodayEvents();
  }, 700);
}

function saveSettingsFromForm(container) {
  const cfg=STORE.config||{};
  // AI 解读配置
  const aiEnaEl=container.querySelector('#cfgAIEna'), aiUrlEl=container.querySelector('#cfgAIUrl'),
    aiKeyEl=container.querySelector('#cfgAIKey'), aiModelEl=container.querySelector('#cfgAIModel'),
    aiCtxEl=container.querySelector('#cfgAIContext'), aiPromptEl=container.querySelector('#cfgAIPrompt');
  var ai=cfg.aiInterpret||defaultAIInterpret();
  if(aiEnaEl)ai.enabled=aiEnaEl.checked;
  if(aiUrlEl)ai.apiUrl=aiUrlEl.value.trim()||defaultAIInterpret().apiUrl;
  if(aiKeyEl)ai.apiKey=aiKeyEl.value.trim();
  if(aiModelEl)ai.model=aiModelEl.value.trim()||defaultAIInterpret().model;
  if(aiCtxEl)ai.contextCount=Math.max(0,Math.min(20,parseInt(aiCtxEl.value)||0));
  if(aiPromptEl)ai.systemPrompt=aiPromptEl.value.trim()||defaultAIInterpret().systemPrompt;
  cfg.aiInterpret=ai;

  const nameEl=container.querySelector('#cfgName'), unameEl=container.querySelector('#cfgUserNickname');
  const amEl=container.querySelector('#cfgActiveMin'), axEl=container.querySelector('#cfgActiveMax');
  const pmEl=container.querySelector('#cfgPassiveMin'), pxEl=container.querySelector('#cfgPassiveMax');
  if(nameEl)cfg.characterName=nameEl.value.trim()||'梦角';
  // Read avatar from preview <img> src (base64 dataURL)
  var charAvImg=container.querySelector('#avatarPreview img');
  cfg.avatarUrl = charAvImg ? charAvImg.src : '';
  var userAvImg=container.querySelector('#userAvatarPreview img');
  cfg.userAvatarUrl = userAvImg ? userAvImg.src : '';
  if(unameEl)cfg.userNickname=unameEl.value.trim()||'我';
  
  // ✅ 使用新的 timing 对象来保存所有时间参数
  if(!cfg.timing)cfg.timing={};
  if(amEl||axEl){
    if(!cfg.timing.activeChat)cfg.timing.activeChat={};
    if(amEl)cfg.timing.activeChat.min=parseFloat(amEl.value)||30;
    if(axEl)cfg.timing.activeChat.max=parseFloat(axEl.value)||60;
  }
  if(pmEl||pxEl){
    if(!cfg.timing.passiveReply)cfg.timing.passiveReply={};
    if(pmEl)cfg.timing.passiveReply.min=parseFloat(pmEl.value)||0.5;
    if(pxEl)cfg.timing.passiveReply.max=parseFloat(pxEl.value)||2.5;
  }
  
  const msgP=[]; container.querySelectorAll('.prob-msg').forEach(i=>msgP.push(parseInt(i.value)||0));
  cfg.msgCountProbs=normalizeProbs(msgP);
  const cardP=[]; container.querySelectorAll('.prob-card').forEach(i=>cardP.push(parseInt(i.value)||0));
  cfg.cardCountProbs=normalizeProbs(cardP);
  
  // Dream post/reaction/comment settings
  const dpmEl=container.querySelector('#cfgDPostMin'), dpxEl=container.querySelector('#cfgDPostMax');
  const dpcmEl=container.querySelector('#cfgDPCardMin'), dpcxEl=container.querySelector('#cfgDPCardMax');
  const drmEl=container.querySelector('#cfgDRMin'), drxEl=container.querySelector('#cfgDRMax');
  const lpEl=container.querySelector('#cfgLikeProb'), cpEl=container.querySelector('#cfgCommentProb');
  const cdmEl=container.querySelector('#cfgCDMin'), cdxEl=container.querySelector('#cfgCDMax');
  
  if(!cfg.prob)cfg.prob={};
  if(dpmEl||dpxEl){
    if(!cfg.timing.dreamPost)cfg.timing.dreamPost={};
    if(dpmEl)cfg.timing.dreamPost.min=parseFloat(dpmEl.value)||2;
    if(dpxEl)cfg.timing.dreamPost.max=parseFloat(dpxEl.value)||8;
  }
  if(dpcmEl||dpcxEl){
    if(!cfg.timing.dreamPostCard)cfg.timing.dreamPostCard={};
    if(dpcmEl)cfg.timing.dreamPostCard.min=parseInt(dpcmEl.value)||1;
    if(dpcxEl)cfg.timing.dreamPostCard.max=parseInt(dpcxEl.value)||5;
  }
  if(drmEl||drxEl){
    if(!cfg.timing.dreamReaction)cfg.timing.dreamReaction={};
    if(drmEl)cfg.timing.dreamReaction.min=parseFloat(drmEl.value)||1;
    if(drxEl)cfg.timing.dreamReaction.max=parseFloat(drxEl.value)||6;
  }
  if(lpEl)cfg.prob.dreamLike=parseInt(lpEl.value)||80;
  if(cpEl)cfg.prob.dreamComment=parseInt(cpEl.value)||65;
  
  // Photo and sticker probabilities
  const photoEl = container.querySelector('#cfgPhotoProb');
  if (photoEl) cfg.prob.postPhoto = parseInt(photoEl.value) || 60;
  const stickerEl = container.querySelector('#cfgStickerFrac');
  if (stickerEl) cfg.prob.stickerFrac = parseInt(stickerEl.value) || 70;
  
  if(cdmEl||cdxEl){
    if(!cfg.timing.dreamComment)cfg.timing.dreamComment={};
    if(cdmEl)cfg.timing.dreamComment.min=parseFloat(cdmEl.value)||2;
    if(cdxEl)cfg.timing.dreamComment.max=parseFloat(cdxEl.value)||8;
  }
  
  // Decay sequence
  const decayP=[]; container.querySelectorAll('.prob-decay').forEach(i=>decayP.push(parseInt(i.value)||0));
  const d5El=container.querySelector('#cfgDecay5'); if(d5El)decayP.push(parseInt(d5El.value)||0);
  cfg.dreamReplyDecaySeq=decayP;
  const dOnEl=container.querySelector('#cfgDecayOn'); cfg.dreamReplyDecayOn=dOnEl?dOnEl.checked:true;
  
  // Diary settings
  const dgmEl=container.querySelector('#cfgDGMin'), dgxEl=container.querySelector('#cfgDGMax');
  const dcpEl=container.querySelector('#cfgDCProb'), dcdmEl=container.querySelector('#cfgDCDMin'), dcdxEl=container.querySelector('#cfgDCDMax');
  if(dgmEl||dgxEl){
    if(!cfg.timing.diaryGen)cfg.timing.diaryGen={};
    if(dgmEl)cfg.timing.diaryGen.hourMin=parseInt(dgmEl.value)||21;
    if(dgxEl)cfg.timing.diaryGen.hourMax=parseInt(dgxEl.value)||24;
  }
  if(dcpEl)cfg.prob.diaryComment=parseInt(dcpEl.value)||70;
  if(dcdmEl||dcdxEl){
    if(!cfg.timing.diaryComment)cfg.timing.diaryComment={};
    if(dcdmEl)cfg.timing.diaryComment.min=parseInt(dcdmEl.value)||30;
    if(dcdxEl)cfg.timing.diaryComment.max=parseInt(dcdxEl.value)||120;
  }
  const letterDelayMinEl=container.querySelector('#cfgLetterDelayMin'), letterDelayMaxEl=container.querySelector('#cfgLetterDelayMax');
  const letterCoverageMinEl=container.querySelector('#cfgLetterCoverageMin'), letterCoverageMaxEl=container.querySelector('#cfgLetterCoverageMax');
  const letterCardMinEl=container.querySelector('#cfgLetterCardMin'), letterCardMaxEl=container.querySelector('#cfgLetterCardMax');
  if(letterDelayMinEl||letterDelayMaxEl||letterCoverageMinEl||letterCoverageMaxEl||letterCardMinEl||letterCardMaxEl){
    const currentLetter=getLetterConfig();
    cfg.letter={
      annotationDelay: normalizeLetterRange(
        letterDelayMinEl ? letterDelayMinEl.value : currentLetter.annotationDelay.min,
        letterDelayMaxEl ? letterDelayMaxEl.value : currentLetter.annotationDelay.max,
        5, 30, 1, 1440
      ),
      coverage: normalizeLetterRange(
        letterCoverageMinEl ? letterCoverageMinEl.value : currentLetter.coverage.min,
        letterCoverageMaxEl ? letterCoverageMaxEl.value : currentLetter.coverage.max,
        25, 50, 1, 100
      ),
      cardCount: normalizeLetterRange(
        letterCardMinEl ? letterCardMinEl.value : currentLetter.cardCount.min,
        letterCardMaxEl ? letterCardMaxEl.value : currentLetter.cardCount.max,
        1, 1, 1, 3
      )
    };
  }
  // NetEase song settings
  const neEnaEl=container.querySelector('#cfgNeteaseEna'), neProbEl=container.querySelector('#cfgNeteaseProb'), neIdsEl=container.querySelector('#cfgNeteaseIds');
  if(neEnaEl||neProbEl||neIdsEl){
    const currentNetease=getNeteaseConfig();
    var idsStr=(neIdsEl?neIdsEl.value.trim():'') || currentNetease.playlistIds.join(',');
    var idsArr=idsStr.split(/[,，]/).map(function(s){return s.trim();}).filter(Boolean);
    cfg.netease={
      enabled: neEnaEl ? neEnaEl.checked : currentNetease.enabled,
      prob: neProbEl ? Math.max(0, Math.min(100, parseInt(neProbEl.value)||0)) : currentNetease.prob,
      playlistIds: idsArr.length ? idsArr : ['135597299'],
      builtinFallback: true,
    };
  }
  // Review settings
  const rcpEl=container.querySelector('#cfgRCProb'), rccEl=container.querySelector('#cfgRCardCnt'), rmdEl=container.querySelector('#cfgRMode');
  if(rcpEl)cfg.prob.reviewCounter=parseInt(rcpEl.value)||20;
  if(rccEl)cfg.reviewCardCount=parseInt(rccEl.value)||3;
  if(rmdEl)cfg.reviewMode=rmdEl.value||'random';
  // Doodle probability
  const doodleProbEl=container.querySelector('#cfgDoodleProb');
  if(doodleProbEl)cfg.prob.doodle=parseInt(doodleProbEl.value)||0;
  // Checkin settings
  const ciAutoEl=container.querySelector('#cfgCIAuto');
  if(ciAutoEl)cfg.checkinAutoEnabled=ciAutoEl.checked;
  const ciTSel=container.querySelector('#cfgCITStart'), ciTEel=container.querySelector('#cfgCITEnd');
  if(ciTSel||ciTEel){
    if(!cfg.timing.checkin)cfg.timing.checkin={};
    if(ciTSel)cfg.timing.checkin.timeStart=parseInt(ciTSel.value)||9;
    if(ciTEel)cfg.timing.checkin.timeEnd=parseInt(ciTEel.value)||21;
  }
  const ciIMinEl=container.querySelector('#cfgCIIntervalMin'), ciIMaxEl=container.querySelector('#cfgCIIntervalMax');
  if(ciIMinEl||ciIMaxEl){
    if(!cfg.timing.checkin)cfg.timing.checkin={};
    if(ciIMinEl)cfg.timing.checkin.intervalMin=parseInt(ciIMinEl.value)||30;
    if(ciIMaxEl)cfg.timing.checkin.intervalMax=parseInt(ciIMaxEl.value)||120;
  }
  // Save dream engine settings
  const engCfg = cfg.dreamEngine || {};
  if (!engCfg.enabled) engCfg.enabled = {};
  if (!engCfg.perDay) engCfg.perDay = {};
  if (!engCfg.prob) engCfg.prob = {};

  // Wake / sleep
  const wakeEl = container.querySelector('#cfgWakeTime');
  if (wakeEl) engCfg.wakeTime = parseInt(wakeEl.value) || 7;
  const sleepEl = container.querySelector('#cfgSleepTime');
  if (sleepEl) engCfg.sleepTime = parseInt(sleepEl.value) || 23;

  // Diary time (independent)
  const ddWinS = container.querySelector('#cfgDETWDDS'), ddWinE = container.querySelector('#cfgDETWDDE');
  if (ddWinS) engCfg.diaryTimeStart = parseInt(ddWinS.value) || 21;
  if (ddWinE) engCfg.diaryTimeEnd = parseInt(ddWinE.value) || 24;

  // Helper: read per-day min/max
  function _savePerDay(prefix, id, defMin, defMax) {
    const minEl = container.querySelector('#cfgDEPD' + prefix + 'Min');
    const maxEl = container.querySelector('#cfgDEPD' + prefix + 'Max');
    if (!engCfg.perDay[id]) engCfg.perDay[id] = {};
    var mv = parseInt(minEl.value), Mv = parseInt(maxEl.value);
    engCfg.perDay[id].min = (isNaN(mv) || mv < 1) ? defMin : mv;
    engCfg.perDay[id].max = (isNaN(Mv) || Mv < 1) ? defMax : Mv;
  }

  // Dream post
  const deEnaPost = container.querySelector('#cfgDEEnaPost');
  if (deEnaPost) engCfg.enabled.dreamPost = deEnaPost.checked;
  _savePerDay('Post', 'dreamPost', 2, 8);
  const photoProbEl = container.querySelector('#cfgPhotoProb');
  if (photoProbEl) engCfg.prob.dreamPostPhoto = parseInt(photoProbEl.value) || 60;
  const stickerFracEl = container.querySelector('#cfgStickerFrac');
  if (stickerFracEl) engCfg.prob.dreamStickerFrac = parseInt(stickerFracEl.value) || 70;
  const chatStickerEl = container.querySelector('#cfgChatSticker');
  if (chatStickerEl) engCfg.prob.dreamChatSticker = parseInt(chatStickerEl.value) || 0;

  // Dream checkin
  const deEnaCI = container.querySelector('#cfgDEEnaCI');
  if (deEnaCI) engCfg.enabled.dreamCheckin = deEnaCI.checked;
  _savePerDay('CI', 'dreamCheckin', 3, 12);
  const ciIntvEl = container.querySelector('#cfgCIIntv');
  if (ciIntvEl) { if (!engCfg.interval) engCfg.interval = {}; engCfg.interval.dreamCheckin = parseInt(ciIntvEl.value) || 45; }

  // Dream chat
  const deEnaChat = container.querySelector('#cfgDEEnaChat');
  if (deEnaChat) engCfg.enabled.dreamChat = deEnaChat.checked;
  _savePerDay('Chat', 'dreamChat', 5, 15);
  const recallProbEl = container.querySelector('#cfgRecallProb');
  if (recallProbEl) engCfg.prob.recallProb = parseFloat(recallProbEl.value) ?? 1;

  // Dream diary comment
  const deEnaDC = container.querySelector('#cfgDEEnaDC');
  if (deEnaDC) engCfg.enabled.dreamDiaryComment = deEnaDC.checked;
  const dcProbEl = container.querySelector('#cfgDCProbNew');
  if (dcProbEl) engCfg.prob.dreamDiaryComment = parseInt(dcProbEl.value) || 70;

  // Dream diary
  const deEnaDD = container.querySelector('#cfgDEEnaDD');
  if (deEnaDD) engCfg.enabled.dreamDiary = deEnaDD.checked;

  cfg.dreamEngine = engCfg;
  STORE.config=cfg;
  renderHeader();
  scheduleSettingsEngineRefresh();
  showToast('✅ 设置已保存');
}

function updateProbSums(container) {
  const ms=container.querySelector('#probMsgSum'), cs=container.querySelector('#probCardSum');
  if(ms){const v=[];container.querySelectorAll('.prob-msg').forEach(i=>v.push(parseInt(i.value)||0));ms.textContent=v.reduce((a,b)=>a+b,0);}
  if(cs){const v=[];container.querySelectorAll('.prob-card').forEach(i=>v.push(parseInt(i.value)||0));cs.textContent=v.reduce((a,b)=>a+b,0);}
}

// ============ Rendering: Moments (朋友圈) ============
function renderMoments(container) {
  const cfg=STORE.config||{};
  const name=cfg.userNickname||'我';
  const av=cfg.userAvatarUrl ? `<img src="${escapeHtml(cfg.userAvatarUrl)}" alt="${escapeHtml(name)}头像" onerror="this.parentElement.textContent='🐟'">` : '🐟';
  const coverUrl=STORE._read('mcard_momentsCover')||'';
  const coverStyle=coverUrl ? ` style="background-image:linear-gradient(180deg,rgba(53,43,30,.08),rgba(40,32,24,.58)),url('${escapeHtml(coverUrl)}');background-size:cover;background-position:center;background-repeat:no-repeat"` : '';
  container.innerHTML=`
  <div class="moments-page">
    <section class="moments-cover" data-od-id="moments-cover" aria-label="朋友圈个人资料"${coverStyle}>
      <div class="moments-cover-top">
        <button class="moments-cover-camera" id="btnPublish" title="发表动态" aria-label="发表动态">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h3l1.5-2h7L17 7h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 7Z"/><circle cx="12" cy="13" r="3.5"/></svg>
        </button>
      </div>
      <div class="moments-profile">
        <div class="moments-profile-copy"><div class="moments-profile-name">${escapeHtml(name)}</div><div class="moments-profile-note">在这里，留下想和你分享的每一刻</div></div>
        <div class="moments-profile-avatar">${av}</div>
      </div>
    </section>
    <input type="file" id="momentsCoverInput" accept="image/*" style="display:none">
    <div class="moments-feed" id="momentsFeed"></div>
  </div>`;

  renderFeed();
  bindMomentsEvents(container);
}

function renderFeed() {
  const feed=document.getElementById('momentsFeed'); if(!feed)return;
  const moments=STORE.moments||[], liked=STORE.likedMoments||[];
  const cfg=STORE.config||{};
  const name=cfg.characterName||'梦角', avUrl=cfg.avatarUrl||'';

  // Sort by timestamp descending
  const sorted=[...moments].sort((a,b)=>b.timestamp-a.timestamp);

  if(sorted.length===0){
    feed.innerHTML='<div style="text-align:center;color:var(--text-muted);padding:60px 20px;font-size:13px;">暂无动态，点击右上角 <svg class="mi-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h3l1.5-2h7L17 7h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 7Z"/><circle cx="12" cy="13" r="3.5"/></svg> 发表第一条</div>';
    return;
  }

  feed.innerHTML=sorted.map(m=>{
    const isUser=m.publisher==='user';
    const pubName=isUser?(cfg.userNickname||'我'):name;
    const pubAv=isUser?'👤':(avUrl?`<img src="${escapeHtml(avUrl)}" onerror="this.parentElement.textContent='🏐'">`:'🏐');
    const likesArr=Array.isArray(m.likes)?m.likes:[];
    const isLiked=likesArr.some(l=>l.liker==='user');
    const isUser2=m.publisher==='user';
    const likeCount=likesArr.length;
    const timeStr=formatTime(m.timestamp);
    const comments=m.comments||[];

    // Build liker names
    let likerStr='';
    if(likeCount>0){
      const names=likesArr.map(l=>l.liker==='user'?(cfg.userNickname||'我'):name);
      const unique=[...new Set(names)];
      if(unique.length<=3)likerStr=unique.join('、');
      else likerStr=unique.slice(0,2).join('、')+` 等${likeCount}人`;
      likerStr='<svg class="mi-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M20.8 8.7c0 5.4-8.8 10.1-8.8 10.1S3.2 14.1 3.2 8.7A4.2 4.2 0 0 1 11 6.3a4.2 4.2 0 0 1 9.8 2.4Z"/></svg> '+likerStr;
    }

    // Build comments HTML
    let commentsHtml='';
    if(comments.length>0){
      commentsHtml=comments.map(function(c,ci){
        const cName=c.commenter==='user'?(cfg.userNickname||'我'):name;
        var html='<div class="mc-item"><b>'+escapeHtml(cName)+'：</b>'+escapeHtml(c.content)+'</div>';
        if(c.commenter==='dream'){
          html+='<button class="mi-act mi-ai-btn" data-mid="'+m.id+'" data-cid="comment_'+ci+'" data-action="aiInterpretComment" style="font-size:11px;margin:2px 0 4px;"><svg class="mi-icon" aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="m14.8 9.2-1.2 3.1-3.1 1.2 1.2-3.1z"/></svg> 解读这条评论</button>';
          html+='<div class="ai-box" data-ai-target="moment-comment" data-mid="'+m.id+'" data-cid="comment_'+ci+'"></div>';
        }
        return html;
      }).join('');
    }else{
      commentsHtml='<div class="mc-empty">暂无评论</div>';
    }

    return `<div class="moment-item" data-mid="${m.id}">
      <div class="mi-avatar">${pubAv}</div>
      <div class="mi-body">
        <div class="mi-name">${escapeHtml(pubName)}</div>
        <div class="mi-text">${escapeHtml(m.content)}</div>
        ${m.imageDataList&&m.imageDataList.length>0?'<div class="mi-photos">'+m.imageDataList.map(function(u){return '<div class="mi-photo"><img src="'+u+'" alt="配图" loading="lazy"></div>';}).join('')+'</div>':''}
        ${!m.imageDataList&&m.imageUrl?`<div class="mi-photo-single"><img src="${escapeHtml(m.imageUrl)}" alt="配图" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`:''}
        <div class="mi-time">${timeStr}</div>
        <div class="mi-actions">
          <button class="mi-act mi-like-btn ${isLiked?'liked':''}" data-mid="${m.id}" data-action="like">
            <svg class="mi-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M20.8 8.7c0 5.4-8.8 10.1-8.8 10.1S3.2 14.1 3.2 8.7A4.2 4.2 0 0 1 11 6.3a4.2 4.2 0 0 1 9.8 2.4Z"/></svg> <span class="like-count">${likeCount||'赞'}</span>
          </button>
          <button class="mi-act mi-comment-btn" data-mid="${m.id}" data-action="comment"><svg class="mi-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v7A2.5 2.5 0 0 1 16.5 15H11l-4.5 3v-3h-1A2.5 2.5 0 0 1 3 12.5v-7Z"/><path d="M8 8h8M8 11h4"/></svg> 评论</button>
          ${!isUser?`<button class="mi-act mi-ai-btn" data-mid="${m.id}" data-action="aiInterpret"><svg class="mi-icon" aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="m14.8 9.2-1.2 3.1-3.1 1.2 1.2-3.1z"/></svg> 解读这条朋友圈</button>`:''}
        </div>
        ${!isUser?`<div class="ai-box" data-ai-target="moment-post" data-mid="${m.id}"></div>`:''}
        ${likerStr?`<div class="mi-likers">${likerStr}</div>`:''}
        <div class="moment-comments" id="mc-${m.id}">
          ${commentsHtml}
          <div class="mc-input-row">
            <input type="text" class="mc-input" placeholder="写评论…" maxlength="200">
            <button class="mc-send" data-mid="${m.id}" data-action="sendComment"><svg class="mi-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M21 3 10 14"/><path d="m21 3-4 18-5-7-7-4 16-7Z"/></svg><span>发送</span></button>
          </div>
        </div>
      </div>
      ${isUser2?`<button class="mi-del-btn" data-mid="${m.id}" data-action="delete" title="删除"><svg class="mi-icon mi-delete-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M5 7h14M10 11v6M14 11v6M8 7l1-3h6l1 3M6 7l1 14h10l1-14"/></svg></button>`:''}
    </div>`;
  }).join('');
}

function bindMomentsEvents(container) {
  // Publish button (re-created each time, always bind fresh)
  const pubBtn=container.querySelector('#btnPublish');
  if(pubBtn)pubBtn.addEventListener('click',showPublishModal);

    const cover=container.querySelector('.moments-cover');
    const coverInput=container.querySelector('#momentsCoverInput');
    if(cover&&coverInput){
      cover.addEventListener('click',function(e){
        if(e.target.closest('#btnPublish'))return;
        coverInput.click();
      });
      coverInput.addEventListener('change',function(){
        const file=this.files&&this.files[0];
        if(!file)return;
        cropMomentsCover(file, cover.clientWidth || 430, cover.clientHeight || 258).then(function(dataUrl){
          STORE._write('mcard_momentsCover',dataUrl);
          cover.style.backgroundImage='linear-gradient(180deg,rgba(53,43,30,.08),rgba(40,32,24,.58)),url("'+dataUrl+'")';
          cover.style.backgroundSize='cover';
          cover.style.backgroundPosition='center';
          cover.style.backgroundRepeat='no-repeat';
          this.value='';
        }.bind(this)).catch(function(){ alert('背景图片读取失败，请重试'); });
      });
    }

    // Delegated listeners: bind only ONCE per container lifetime
  if(container._momentsBound)return;
  container._momentsBound=true;

  // Event delegation for all feed actions (persists across renderFeed calls)
  container.addEventListener('click',function(e){
    const btn=e.target.closest('[data-action]');
    if(!btn)return;
    const action=btn.dataset.action;
    const mid=btn.dataset.mid;

    if(action==='like'){
      toggleLike(mid);
    } else if(action==='comment'){
      // Comments always visible now, focus the input for this moment
      const mc=document.getElementById('mc-'+mid);
      if(mc){ var inp=mc.querySelector('.mc-input'); if(inp)inp.focus(); }
    } else if(action==='sendComment'){
      const row=btn.parentElement;
      const inp=row?row.querySelector('.mc-input'):null;
      if(inp){
        const text=inp.value.trim();
        if(!text){alert('请输入评论内容');return;}
        inp.value='';
        addComment(mid,'user',text);
      }
    } else if(action==='aiInterpretComment'){
      e.stopPropagation();
      if(!isAIInterpretReady()){alert('请先到「设置 → AI 解读」开启功能并填写 API Key');return;}
      var cid=btn.dataset.cid;
      var moments=STORE.moments||[];
      var moment=moments.find(x=>x.id===mid);
      if(!moment)return;
      var commentIdx=parseInt(cid.replace('comment_',''),10);
      var comment=moment.comments[commentIdx];
      if(!comment)return;
      var box=btn.parentElement.querySelector('.ai-box');
      if(!box)return;
      // Find index in combined comments+likes for context
      var userName=(STORE.config||{}).userNickname||'我';
      var charName=(STORE.config||{}).characterName||'梦角';
      var postAuthor=moment.publisher==='user'?userName:charName;
      // Build context: who posted, all comments up to this one
      var allMsgs=[];
      allMsgs.push({role:'system',content:postAuthor+'的朋友圈原文："'+moment.content+'"'});
      (moment.comments||[]).forEach(function(c){
        var r=c.commenter==='user'?userName:charName;
        allMsgs.push({role:c.commenter==='dream'?'assistant':'user',content:r+'：'+c.content});
      });
      var commentGlobalIdx=allMsgs.findIndex(function(m){
        return m.content&&m.content.indexOf(comment.content)>=0;
      });
      if(commentGlobalIdx<1)commentGlobalIdx=allMsgs.length-1;
      runAIInterpretOnBox(box, {
        targetText: charName+'的评论："'+comment.content+'"',
        contextMessages: allMsgs.slice(0,commentGlobalIdx),
        scene: 'moments-comment',
        loadingText: '解读评论中',
        favoriteMeta: {
          sourceType: 'moment-comment',
          sourceId: mid,
          sourceSubId: String(commentIdx),
          sourceLabel: '朋友圈评论',
          text: comment.content
        }
      });
    } else if(action==='delete'){
      deleteMoment(mid);
    } else if(action==='aiInterpret'){
      e.stopPropagation();
      if(!isAIInterpretReady()){alert('请先到「设置 → AI 解读」开启功能并填写 API Key');return;}
      var moments=STORE.moments||[];
      var moment=moments.find(x=>x.id===mid);
      if(!moment)return;
      var box=btn.closest('.mi-body').querySelector('.ai-box[data-ai-target="moment-post"]');
      if(!box)return;
      var userName=(STORE.config||{}).userNickname||'我';
      var charName=(STORE.config||{}).characterName||'梦角';
      var postAuthor=moment.publisher==='user'?userName:charName;
      var ctxMsgs=[{role:'system',content:postAuthor+'的朋友圈原文："'+moment.content+'"'}];
      (moment.comments||[]).forEach(function(c){
        var r=c.commenter==='user'?userName:charName;
        ctxMsgs.push({role:c.commenter==='dream'?'assistant':'user',content:r+'：'+c.content});
      });
      var isMine=moment.publisher==='dream';
      runAIInterpretOnBox(box, {
        targetText: moment.content,
        contextMessages: ctxMsgs,
        scene: isMine?'moments':'moments-friend',
        loadingText: '解读朋友圈中',
        favoriteMeta: {
          sourceType: 'moment',
          sourceId: moment.id,
          sourceLabel: '朋友圈',
          text: moment.content
        }
      });
    }
  });

  // Comment input Enter key (delegated)
  container.addEventListener('keydown',function(e){
    if(e.key==='Enter'&&e.target.classList.contains('mc-input')){
      e.preventDefault();
      const inp=e.target;
      const text=inp.value.trim();
      if(!text){alert('请输入评论内容');return;}
      const mid=inp.closest('.moment-comments')?.id?.replace('mc-','');
      if(mid){inp.value='';addComment(mid,'user',text);}
    }
  });
}

// ============ Moments Actions ============
function showPublishModal() {
  showModal(`<h3>发表动态</h3>
    <div class="publish-modal">
      <textarea class="pm-textarea" id="pmText" placeholder="分享新鲜事…" maxlength="2000"></textarea>
      <div class="pm-photo-row">
        <button class="pm-add-photo" id="pmAddPhoto" type="button">📷 添加图片</button>
        <span class="pm-photo-hint">最多3张</span>
      </div>
      <input type="file" id="pmFileInput" accept="image/*" multiple style="display:none">
      <div class="pm-preview" id="pmPreview"></div>
    </div>
    <div class="modal-btns">
      <button class="btn-cancel" onclick="hideModal()">取消</button>
      <button class="btn-primary" id="pmPublish">发表</button>
    </div>`);

  // Photo selection for moments publish
  _pmImages = [];
  document.getElementById('pmAddPhoto').addEventListener('click',function(){
    document.getElementById('pmFileInput').click();
  });
  document.getElementById('pmFileInput').addEventListener('change',function(){
    var files = Array.from(this.files || []);
    if (_pmImages.length + files.length > 3) { alert('最多只能添加3张图片'); this.value = ''; return; }
    var pending = files.map(function(f) { return compressImage(f); });
    Promise.all(pending).then(function(results) {
      _pmImages = _pmImages.concat(results);
      if (_pmImages.length > 3) _pmImages = _pmImages.slice(0, 3);
      renderPmPreview();
    }).catch(function(e) { console.error('图片压缩失败:', e); });
    this.value = '';
  });

  function renderPmPreview() {
    var prev = document.getElementById('pmPreview');
    var hint = document.querySelector('.pm-photo-hint');
    if (hint) hint.textContent = _pmImages.length > 0 ? '已选 '+_pmImages.length+'/3 张' : '最多3张';
    if (!prev) return;
    prev.innerHTML = _pmImages.map(function(u, i) {
      return '<div class="pm-thumb"><img src="'+u+'" alt="预览"><button class="pm-thumb-del" data-idx="'+i+'" type="button">✕</button></div>';
    }).join('');
    prev.querySelectorAll('.pm-thumb-del').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        _pmImages.splice(parseInt(this.dataset.idx), 1);
        renderPmPreview();
      });
    });
  }

  document.getElementById('pmPublish').addEventListener('click',()=>{
    const text=document.getElementById('pmText').value.trim();
    if(!text&&_pmImages.length===0){alert('请输入内容或添加图片');return;}
    const moments=STORE.moments||[];
    const mid='mom_'+Date.now();
    var imageDataList = _pmImages.slice();
    moments.push({
      id:mid,
      publisher:'user',
      content:text,
      timestamp:Date.now(),
      likes:[],
      comments:[],
      imageDataList: imageDataList,
      imageUrl:'',
      dreamProcessed:false,
    });
    STORE.moments=moments;
    _pmImages = [];
    hideModal();
    renderFeed();
    // Schedule delayed dream reaction to the new moment
    scheduleDreamReaction(mid);
  });
}

function toggleLike(mid) {
  const moments=STORE.moments||[], liked=STORE.likedMoments||[];
  const moment=moments.find(m=>m.id===mid);
  if(!moment)return;
  // Ensure likes is an array
  if(!Array.isArray(moment.likes))moment.likes=[];
  const userLikeIdx=moment.likes.findIndex(l=>l.liker==='user');
  if(userLikeIdx>=0){
    // Unlike
    moment.likes.splice(userLikeIdx,1);
    const lidx=liked.indexOf(mid);
    if(lidx>=0)liked.splice(lidx,1);
  } else {
    // Like
    moment.likes.push({liker:'user',timestamp:Date.now()});
    liked.push(mid);
  }
  STORE.moments=moments; STORE.likedMoments=liked;
  renderFeed();
}

// ============ Comment & Dream Reply (with delay + decay) ============
function addComment(mid, commenter, content) {
  const moments=STORE.moments||[];
  const moment=moments.find(m=>m.id===mid);
  if(!moment)return;
  if(!Array.isArray(moment.comments))moment.comments=[];
  moment.comments.push({commenter,content,timestamp:Date.now()});
  STORE.moments=moments;
  renderFeed();
  // User comment → schedule delayed dream reply with decay
  if(commenter==='user'){
    scheduleCommentReply(mid);
  }
}

function scheduleCommentReply(mid) {
  const cfg=STORE.config||{};
  const decayOn=cfg.dreamReplyDecayOn!==false;
  // Increment decay round (in-memory)
  if(decayOn){
    state.decayRounds[mid]=(state.decayRounds[mid]||0)+1;
  }
  const round=decayOn?state.decayRounds[mid]:1;

  // Clear any existing pending timer for this moment
  if(state.pendingCommentTimers[mid]){
    clearTimeout(state.pendingCommentTimers[mid]);
  }

  const minS=(cfg.dreamCommentDelayMin!=null?cfg.dreamCommentDelayMin:2)*1000;
  const maxS=(cfg.dreamCommentDelayMax!=null?cfg.dreamCommentDelayMax:8)*1000;
  const delay=randomBetween(minS,maxS);

  // Store pending info on moment for refresh recovery
  const moments=STORE.moments||[];
  const moment=moments.find(m=>m.id===mid);
  if(moment){
    moment._pendingCommentReply={round,scheduledAt:Date.now()+delay};
    STORE.moments=moments;
  }

  const tid=setTimeout(()=>{
    delete state.pendingCommentTimers[mid];
    dreamReplyToComment(mid,round);
  },delay);
  state.pendingCommentTimers[mid]=tid;
}

function dreamReplyToComment(mid, round) {
  const cfg=STORE.config||{};
  const decayOn=cfg.dreamReplyDecayOn!==false;
  const decaySeq=cfg.dreamReplyDecaySeq||[100,70,40,10,0];

  // Decay check
  if(decayOn){
    const idx=Math.min(round-1,decaySeq.length-1);
    const prob=decaySeq[idx]||0;
    if(Math.random()*100>=prob)return; // missed — no reply
  }

  if(!checkWordCards())return;
  const moments=STORE.moments||[];
  const moment=moments.find(m=>m.id===mid);
  if(!moment)return;
  const name=cfg.characterName||'梦角';
  const replyText='@我：'+generateMessage();
  if(!Array.isArray(moment.comments))moment.comments=[];
  moment.comments.push({commenter:'dream',content:replyText,timestamp:Date.now()});
  // Clean up pending marker
  delete moment._pendingCommentReply;
  STORE.moments=moments;
  renderFeed();
}

// On page load: recover pending comment replies (immediate decay check)
function recoverPendingCommentReplies() {
  const moments=STORE.moments||[];
  moments.forEach(m=>{
    if(!m._pendingCommentReply)return;
    const {round}=m._pendingCommentReply;
    // Immediately check decay and reply (no waiting)
    dreamReplyToComment(m.id,round||1);
    // Note: dreamReplyToComment cleans up _pendingCommentReply on success;
    // if decay misses, clean up here
    const updated=STORE.moments.find(x=>x.id===m.id);
    if(updated&&updated._pendingCommentReply){
      delete updated._pendingCommentReply;
      STORE.moments=moments;
    }
  });
}

// ============ Dream: Scheduled Reaction to User Moment ============
function scheduleDreamReaction(mid) {
  const cfg=STORE.config||{};
  const minMs=(cfg.dreamReactionMin!=null?cfg.dreamReactionMin:1)*60000;
  const maxMs=(cfg.dreamReactionMax!=null?cfg.dreamReactionMax:6)*60000;
  const delay=randomBetween(minMs,maxMs);
  const scheduledTime=Date.now()+delay;

  // Store scheduled time on moment
  const moments=STORE.moments||[];
  const moment=moments.find(m=>m.id===mid);
  if(!moment)return;
  moment.reactionScheduledTime=scheduledTime;
  STORE.moments=moments;

  // Set timeout
  const tid=setTimeout(()=>executeDreamReaction(mid),delay);
  state.pendingReactionTimers[mid]=tid;
}

function executeDreamReaction(mid) {
  const moments=STORE.moments||[];
  const moment=moments.find(m=>m.id===mid);
  if(!moment||moment.dreamProcessed)return;
  if(!checkWordCards())return;
  moment.dreamProcessed=true;
  delete moment.reactionScheduledTime;
  delete state.pendingReactionTimers[mid];

  const cfg=STORE.config||{};
  const likeProb=(cfg.prob?.dreamLike||80);
  const commentProb=(cfg.prob?.dreamComment||65);
  const rollLike=Math.random()*100;
  const rollComment=Math.random()*100;

  if(!Array.isArray(moment.likes))moment.likes=[];
  if(!Array.isArray(moment.comments))moment.comments=[];

  if(rollLike<likeProb){
    moment.likes.push({liker:'dream',timestamp:Date.now()});
  }
  if(rollComment<commentProb){
    const replyText=generateMessage();
    moment.comments.push({commenter:'dream',content:replyText,timestamp:Date.now()});
  }
  STORE.moments=moments;
  renderFeed();
  if (rollComment < commentProb) setTimeout(updateRedDots, 300);
}

// ============ Dream Behavior Engine ============

// ---- Event Type Registry ----
// To add a new event: just call registerEventType({...}) below.
// Events marked useWakeSleep:true automatically run within the global wake/sleep window.
// Events marked useWakeSleep:false use their own time window (e.g. diary at night).
const EVENT_TYPES = {};

function registerEventType(def) {
  EVENT_TYPES[def.id] = def;
}

registerEventType({
  id: 'dreamPost', label: '发朋友圈',
  useWakeSleep: true,
  dependsOnUserAction: false,
  generateContent: async function(overrides) {
    const ts = overrides.timestamp || Date.now();
    const momentId = 'dream_' + ts;
    // If this moment was already created, never touch it again
    const moments = STORE.moments || [];
    if (moments.find(m => m.id === momentId)) return;
    if (!checkWordCards()) return;
    const cfg = STORE.config || {};
    const engCfg = cfg.dreamEngine || {};
    const cardMin = cfg.dreamPostCardMin || 1, cardMax = cfg.dreamPostCardMax || 5;
    const cardCount = Math.floor(randomBetween(cardMin, cardMax + 0.999));
    const visible = getVisibleCards();
    const picked = [];
    for (let i = 0; i < cardCount; i++) { const c = weightedPick(visible); if (c) picked.push(c.text); }
    const content = picked.join(' ');
    if (!content) return;
    let imageUrl = '';
    const photoProb = (engCfg.prob && engCfg.prob.dreamPostPhoto != null) ? engCfg.prob.dreamPostPhoto : 60;
    if (Math.random() * 100 < photoProb) {
      const stickerFrac = (engCfg.prob && engCfg.prob.dreamStickerFrac != null) ? engCfg.prob.dreamStickerFrac : 70;
      if (Math.random() * 100 < stickerFrac) {
        var stickers = STORE.stickers || [];
        if (stickers.length > 0) imageUrl = stickers[Math.floor(Math.random() * stickers.length)].dataUrl;
        else imageUrl = await getRandomPhotoForDream();
      } else {
        imageUrl = await getRandomPhotoForDream();
      }
    }
    moments.push({ id: momentId, publisher: 'dream', content, timestamp: ts, likes: [], comments: [], imageUrl, dreamProcessed: true });
    STORE.moments = moments;
    if (state.fsView === 'moments') renderFeed();
    setTimeout(updateRedDots, 300);
  }
});

registerEventType({
  id: 'dreamCheckin', label: '打卡',
  useWakeSleep: true,
  dependsOnUserAction: false,
  generateContent: async function(overrides) {
    const words = STORE.checkinWords || [];
    if (words.length === 0) return;
    const lastWord = STORE.lastCheckinWord || null;
    // Build candidate pool, excluding last used word if more than 1 word available
    var pool = words;
    if (lastWord && words.length > 1) {
      pool = words.filter(function(w) { return w !== lastWord; });
      if (pool.length === 0) pool = words; // fallback
    }
    const word = pool[Math.floor(Math.random() * pool.length)];
    STORE.lastCheckinWord = word;
    addCheckin('dream', word, overrides.timestamp);
    setTimeout(updateRedDots, 300);
  }
});

registerEventType({
  id: 'dreamChat', label: '主动发消息',
  useWakeSleep: true,
  dependsOnUserAction: false,
  generateContent: async function(overrides) {
    if (!checkWordCards()) return;
    const cfg = STORE.config || {};
    const probs = cfg.msgCountProbs || [30, 40, 20, 10];
    const batchCount = pickByProb(probs) + 1;
    for (let i = 0; i < batchCount; i++) {
      addMessage('character', generateMessage(), overrides.timestamp ? overrides.timestamp + i * 1000 : null);
    }
  }
});

registerEventType({
  id: 'dreamDiaryComment', label: '批阅日记',
  useWakeSleep: true,
  dependsOnUserAction: false,
  generateContent: async function(overrides) {
    const engCfg = (STORE.config || {}).dreamEngine || {};
    const prob = (engCfg.prob && engCfg.prob.dreamDiaryComment != null) ? engCfg.prob.dreamDiaryComment : 70;
    if (Math.random() * 100 >= prob) return;
    const ts = overrides.timestamp || Date.now();
    const commentId = 'dc_' + ts + '_dream';
    const dateStr = new Date(ts).toISOString().slice(0, 10);
    const diaries = STORE.diaries || [];
    const userDiary = diaries.find(d => d.date === dateStr && d.author === 'user');
    if (!userDiary) return;
    if (!Array.isArray(userDiary.comments)) userDiary.comments = [];
    // Never add the same comment twice
    if (userDiary.comments.some(c => c.id === commentId)) return;
    if (!checkWordCards()) return;
    const visible = getVisibleCards();
    const picked = [];
    const nCards = Math.floor(randomBetween(2, 5));
    for (let i = 0; i < nCards; i++) { const c = weightedPick(visible); if (c) picked.push(c.text); }
    const comment = '梦角批阅：' + picked.join('，');
    userDiary.comments.push({ id: commentId, author: 'dream', content: comment, timestamp: ts });
    STORE.diaries = diaries;
    setTimeout(updateRedDots, 300);
  }
});

registerEventType({
  id: 'dreamDiary', label: '写日记',
  useWakeSleep: false, // diary uses its own night window
  dependsOnUserAction: false,
  generateContent: async function(overrides) {
    const dateStr = new Date(overrides.timestamp || Date.now()).toISOString().slice(0, 10);
    await generateDreamDiary(dateStr);
  }
});

const EVENT_TYPE_LIST = Object.values(EVENT_TYPES);

// ---- Dedup Helpers ----
function isEventCompleted(eventId, dateStr, index) {
  const store = STORE.dreamEvents || {};
  return !!store[eventId + '_' + dateStr + '_' + index];
}
function markEventCompleted(eventId, dateStr, index) {
  const store = STORE.dreamEvents || {};
  store[eventId + '_' + dateStr + '_' + index] = true;
  STORE.dreamEvents = store;
}
function clearDayEvents(dateStr) {
  const store = STORE.dreamEvents || {};
  const prefix = '_' + dateStr + '_';
  const keys = Object.keys(store).filter(k => k.indexOf(prefix) >= 0);
  keys.forEach(k => delete store[k]);
  STORE.dreamEvents = store;
  // Also clear nonces for this day so events get regenerated with fresh randomness
  const nonces = STORE._read('mcard_dream_nonces') || {};
  const nonceKeys = Object.keys(nonces).filter(k => k.endsWith('_' + dateStr));
  nonceKeys.forEach(k => delete nonces[k]);
  STORE._write('mcard_dream_nonces', nonces);
}

// ---- Per-day nonce: makes each day independently random ----
function getOrCreateDayNonce(dateStr, eventId) {
  const store = STORE._read('mcard_dream_nonces') || {};
  const key = eventId + '_' + dateStr;
  if (!store[key]) {
    // Generate a fresh random nonce using crypto-quality randomness
    const arr = new Uint32Array(2);
    crypto.getRandomValues(arr);
    store[key] = arr[0].toString(36) + arr[1].toString(36);
    STORE._write('mcard_dream_nonces', store);
  }
  return store[key];
}

// ---- Event Time Computation ----
function computeEventTimesForDay(dateStr, eventDef) {
  const cfg = STORE.config || {};
  const engCfg = cfg.dreamEngine || {};

  // Resolve time window
  let twStart, twEnd;
  if (eventDef.useWakeSleep) {
    twStart = engCfg.wakeTime != null ? engCfg.wakeTime : 7;
    twEnd = engCfg.sleepTime != null ? engCfg.sleepTime : 23;
  } else {
    // Diary or other special events use their own window
    twStart = engCfg.diaryTimeStart != null ? engCfg.diaryTimeStart : 21;
    twEnd = engCfg.diaryTimeEnd != null ? engCfg.diaryTimeEnd : 24;
  }

  // Resolve per-day count
  let minP, maxP;
  if (eventDef.id === 'dreamDiary') {
    minP = 1; maxP = 1;
  } else {
    const perDay = (engCfg.perDay && engCfg.perDay[eventDef.id]) || {};
    minP = (perDay.min != null && perDay.min >= 0) ? perDay.min : (eventDef.minPerDay || 1);
    maxP = (perDay.max != null && perDay.max >= 1) ? perDay.max : (eventDef.maxPerDay || 1);
  }

  const nonce = getOrCreateDayNonce(dateStr, eventDef.id);
  const daySeed = dateStr + '_' + eventDef.id + '_' + nonce;
  const dayRng = seedRandom(daySeed);
  var count = Math.floor(minP + dayRng() * (maxP - minP + 1));
  if (count < 1) count = 1; // safety net: at least 1 event

  // Minimum spacing for non-diary events (e.g. checkin)
  const minSpacingMin = (engCfg.interval && engCfg.interval[eventDef.id] != null)
    ? engCfg.interval[eventDef.id] : 0;

  let totalMins = (twEnd - twStart) * 60;
  if (totalMins <= 0) totalMins = 24 * 60;

  // Generate N random raw offsets, then spread them with jitter + min spacing
  const rawOffsets = [];
  for (let i = 0; i < count; i++) {
    const slotRng = seedRandom(dateStr + '_' + eventDef.id + '_' + nonce + '_' + i);
    rawOffsets.push({ offset: Math.floor(slotRng() * totalMins), idx: i });
  }
  rawOffsets.sort((a, b) => a.offset - b.offset);

  // Distribute: each slot gets minSpacingMin + a random share of the remaining slack.
  // Use sorted cumulative fractions so gaps are always positive.
  const totalSpanNeeded = count * minSpacingMin;
  const slack = Math.max(0, totalMins - totalSpanNeeded);
  const gapRng = seedRandom(daySeed + '_gap');
  // Generate count random fractions, sort them so they're monotonic
  const fracs = [0];
  for (let i = 1; i < count; i++) fracs.push(gapRng());
  fracs.sort(function(a, b) { return a - b; });
  const fracSum = fracs[fracs.length - 1] || 1;
  var cumMin = 0;
  const spacedOffsets = [];
  for (let i = 0; i < count; i++) {
    cumMin += (i > 0 ? minSpacingMin : 0);
    var extraFrac = fracs[i] / fracSum;
    var pos = cumMin + Math.floor(extraFrac * slack);
    spacedOffsets.push({ offset: pos, idx: rawOffsets[i].idx });
  }

  const [y, m, d] = dateStr.split('-').map(Number);
  const windowBaseMs = new Date(y, m - 1, d, twStart, 0, 0, 0).getTime();
  const times = spacedOffsets.map(s => {
    const ts = windowBaseMs + s.offset * 60000;
    const nd = new Date(ts);
    return { hour: nd.getHours(), minute: nd.getMinutes(), timestamp: ts, index: s.idx };
  });
  times.sort((a, b) => a.timestamp - b.timestamp);
  return times;
}

// ---- Backfill Engine ----
async function runBackfill() {
  const lastActive = STORE.lastActive;
  const now = Date.now();
  
  // ✅ FIX #2.1: 新用户首启动初始化
  if (!lastActive) {
    STORE.lastActive = now;
    console.log('[DreamEngine] 首次启动，初始化时间戳 - 不进行离线回溯');
    return;
  }
  
  // ✅ FIX #2.2: 限制回溯跨度（最多7天）和事件数（最多100个）
  const MAX_BACKFILL_DAYS = 7;
  const MAX_BACKFILL_EVENTS = 100;
  const minAllowedTime = now - (MAX_BACKFILL_DAYS * 86400000);
  const startTime = Math.max(lastActive, minAllowedTime);
  
  const cfg = STORE.config || {};
  const engCfg = cfg.dreamEngine || {};

  const startDate = new Date(startTime);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(now);
  const dayMs = 86400000;
  let cursor = new Date(startDate);
  let totalGenerated = 0;

  console.log('[DreamEngine] 开始离线回溯（从 ' + new Date(startTime).toLocaleString('zh-CN') + ' 到 ' + new Date(now).toLocaleString('zh-CN') + '）');

  while (cursor <= endDate && totalGenerated < MAX_BACKFILL_EVENTS) {
    const dateStr = cursor.getFullYear() + '-' + String(cursor.getMonth() + 1).padStart(2, '0') + '-' + String(cursor.getDate()).padStart(2, '0');

    for (const eventDef of EVENT_TYPE_LIST) {
      if (eventDef.dependsOnUserAction) continue;
      const enabled = (engCfg.enabled && engCfg.enabled[eventDef.id] != null) ? engCfg.enabled[eventDef.id] : true;
      if (!enabled) continue;

      const times = computeEventTimesForDay(dateStr, eventDef);
      for (const slot of times) {
        if (totalGenerated >= MAX_BACKFILL_EVENTS) break;
        
        if (isEventCompleted(eventDef.id, dateStr, slot.index)) continue;
        if (slot.timestamp <= startTime) continue;
        if (slot.timestamp >= now) continue;

        const nonce = getOrCreateDayNonce(dateStr, eventDef.id);
        const slotSeed = dateStr + '_' + eventDef.id + '_' + nonce + '_' + slot.index;
        setBackfillContext(slot.timestamp, seedRandom(slotSeed));
        try {
          await eventDef.generateContent({ timestamp: slot.timestamp });
          totalGenerated++;
        } catch (e) {
          console.warn('Backfill error:', eventDef.id, dateStr, slot.index, e);
        }
        clearBackfillContext();
        markEventCompleted(eventDef.id, dateStr, slot.index);
        
        // ✅ FIX #2.3: 防止UI卡顿，让出线程
        await sleep(10);
      }
      
      if (totalGenerated >= MAX_BACKFILL_EVENTS) break;
    }
    cursor = new Date(cursor.getTime() + dayMs);
  }
  
  console.log('[DreamEngine] 离线回溯完成，共补充 ' + totalGenerated + ' 条事件');
  STORE.lastActive = now;
}

function startBackgroundBackfill() {
  if (state.backfillPromise) return state.backfillPromise;
  function finishBackfill() {
    renderMessages();
    updateRedDots();
    scheduleTodayEvents();
  }
  state.backfillPromise = runBackfill().then(function() {
    finishBackfill();
  }, function(error) {
    console.warn('Background backfill error:', error);
    STORE.lastActive = Date.now();
    finishBackfill();
  }).then(function() {
    state.backfillPromise = null;
  });
  return state.backfillPromise;
}

// ---- Real-time Scheduler ----
function stopAllDreamEventTimers() {
  Object.values(state.dreamEventTimers).forEach(tid => clearTimeout(tid));
  state.dreamEventTimers = {};
}

function scheduleTodayEvents() {
  const cfg = STORE.config || {};
  const engCfg = cfg.dreamEngine || {};
  const now = Date.now();
  const today = new Date();
  const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

  stopAllDreamEventTimers();

  for (const eventDef of EVENT_TYPE_LIST) {
    if (eventDef.dependsOnUserAction) continue;
    const enabled = (engCfg.enabled && engCfg.enabled[eventDef.id] != null) ? engCfg.enabled[eventDef.id] : true;
    if (!enabled) continue;

    const times = computeEventTimesForDay(dateStr, eventDef);
    for (const slot of times) {
      if (isEventCompleted(eventDef.id, dateStr, slot.index)) continue;

      if (slot.timestamp <= now) {
        // Past-but-not-completed: generate immediately (mini-backfill to prevent data loss)
        const nonce = getOrCreateDayNonce(dateStr, eventDef.id);
        const slotSeed = dateStr + '_' + eventDef.id + '_' + nonce + '_' + slot.index;
        setBackfillContext(slot.timestamp, seedRandom(slotSeed));
        eventDef.generateContent({ timestamp: slot.timestamp })
          .catch(e => console.warn('Catch-up event error:', eventDef.id, slot.index, e))
          .finally(() => {
            clearBackfillContext();
            markEventCompleted(eventDef.id, dateStr, slot.index);
          });
        continue;
      }

      // Future event — schedule
      const delay = Math.max(1000, slot.timestamp - now);
      const timerKey = eventDef.id + '_' + dateStr + '_' + slot.index;
      const nonce = getOrCreateDayNonce(dateStr, eventDef.id);
      const slotSeed = dateStr + '_' + eventDef.id + '_' + nonce + '_' + slot.index;
      state.dreamEventTimers[timerKey] = setTimeout(() => {
        setBackfillContext(slot.timestamp, seedRandom(slotSeed));
        eventDef.generateContent({ timestamp: slot.timestamp })
          .catch(e => console.warn('Scheduled event error:', e))
          .finally(() => {
            clearBackfillContext();
            markEventCompleted(eventDef.id, dateStr, slot.index);
            delete state.dreamEventTimers[timerKey];
          });
      }, delay);
    }
  }
}

// ============ Dream: Auto-post Moments ============
const UNSPLASH_ACCESS_KEY = 'bmDstlNyfCVvmhsGCgNik0Nxqa2pia69w-afDgsKyvQ';
const UNSPLASH_API = 'https://api.unsplash.com/photos/random';

async function getRandomPhotoForDream() {
  try {
    const url = `${UNSPLASH_API}?count=1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(function() { controller.abort(); }, 6000);
    const resp = await fetch(url, {
      headers: { 'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!resp.ok) throw new Error(`Unsplash HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data || !Array.isArray(data) || !data[0] || !data[0].urls || !data[0].urls.regular) throw new Error('Unsplash: no results');
    return data[0].urls.regular;
  } catch (e) {
    console.warn('Unsplash failed:', e.name || e.message);
    return 'https://picsum.photos/1080/1920?random=' + (Math.floor((_timeOverride || Date.now()) / 1000) % 1000);
  }
}

async function postDreamMoment() {
  if(!checkWordCards())return;
  const cfg=STORE.config||{};
  const cardMin=cfg.dreamPostCardMin||1, cardMax=cfg.dreamPostCardMax||5;
  const cardCount=Math.floor(randomBetween(cardMin,cardMax+0.999));
  const visible=getVisibleCards();
  const picked=[];
  for(let i=0;i<cardCount;i++){const c=weightedPick(visible);if(c)picked.push(c.text);}
  const content=picked.join(' ');
  if(!content)return;

  // 60% chance to attach a photo
  let imageUrl = '';
  if (Math.random() < 0.6) {
    imageUrl = await getRandomPhotoForDream();
  }

  const moments=STORE.moments||[];
  moments.push({
    id:'dream_'+Date.now(),
    publisher:'dream',
    content,
    timestamp:Date.now(),
    likes:[],
    comments:[],
    imageUrl,
    dreamProcessed:true,
  });
  STORE.moments=moments;
  // Re-render if moments view is open
  if(state.fsView==='moments')renderFeed();
}

function startDreamPostTimer() {
  stopDreamPostTimer();
  const cfg=STORE.config||{};
  const timing=cfg.timing||{dreamPost:{min:2,max:8}};
  const minMs=(timing.dreamPost?.min||2)*60000;
  const maxMs=(timing.dreamPost?.max||8)*60000;
  function scheduleNext(){
    const delay=randomBetween(minMs,maxMs);
    state.dreamPostTimerId=setTimeout(()=>{
      postDreamMoment();
      scheduleNext();
    },delay);
  }
  scheduleNext();
}

function stopDreamPostTimer() {
  clearTimeout(state.dreamPostTimerId);
  state.dreamPostTimerId=null;
}

// ============ Page Load: Restore Pending Reactions ============
function restorePendingReactions() {
  const moments=STORE.moments||[];
  const now=Date.now();
  moments.forEach(m=>{
    if(m.publisher!=='user'||m.dreamProcessed)return;
    if(m.reactionScheduledTime){
      const remaining=m.reactionScheduledTime-now;
      if(remaining<=0){
        // Time already passed, execute immediately
        executeDreamReaction(m.id);
      } else {
        // Schedule for remaining time
        const tid=setTimeout(()=>executeDreamReaction(m.id),remaining);
        state.pendingReactionTimers[m.id]=tid;
      }
    } else {
      // No scheduled time (old data), schedule now
      scheduleDreamReaction(m.id);
    }
  });
}

function checkWordCards() {
  const visible=getVisibleCards();
  if(!visible||visible.length===0){
    alert('字卡库为空，无法生成梦角内容');
    return false;
  }
  return true;
}

function deleteMoment(mid) {
  if(!confirm('确定删除这条动态吗？'))return;
  let moments=STORE.moments||[], liked=STORE.likedMoments||[];
  moments=moments.filter(m=>m.id!==mid);
  liked=liked.filter(id=>id!==mid);
  STORE.moments=moments; STORE.likedMoments=liked;
  renderFeed();
}

function formatTime(ts) {
  const d=new Date(ts), now=new Date();
  const diff=now-d;
  if(diff<60000)return '刚刚';
  if(diff<3600000)return Math.floor(diff/60000)+'分钟前';
  if(diff<86400000)return Math.floor(diff/3600000)+'小时前';
  if(diff<172800000)return '昨天';
  return d.toLocaleDateString('zh-CN',{month:'long',day:'numeric'})+' '+d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
}

// ============ Rendering: Diary (日记) ============
function renderDiary(container) {
  if (state.diaryFullscreenId) {
    renderDiaryFullscreen(container);
    return;
  }
  if(!state.diaryMonth){ const now=new Date(); state.diaryMonth=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0'); }
  const todayStr=todayDateString();
  const hasUserDiaryToday=hasDiary(todayStr,'user');

  container.innerHTML=`
  <div class="diary-page">
    <div class="diary-toolbar">
      <span class="dt-month" id="diaryMonthLabel"></span>
      <button class="btn-write-diary" id="btnWriteDiary" ${hasUserDiaryToday?'disabled':''}>${hasUserDiaryToday?'今日已写✍️':'✍️ 写日记'}</button>
    </div>
    <div class="calendar-grid" id="calendarGrid"></div>
    <div class="diary-detail" id="diaryDetail">
      <div class="diary-empty">👆 点击日历上的日期查看日记</div>
    </div>
  </div>`;

  renderCalendar();
  bindDiaryEvents(container);
}

function todayDateString() { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }

function hasDiary(dateStr,author) { return (STORE.diaries||[]).some(d=>d.date===dateStr&&d.author===author); }

function renderCalendar() {
  const grid=document.getElementById('calendarGrid'); if(!grid)return;
  const lbl=document.getElementById('diaryMonthLabel'); if(!lbl)return;
  const [y,m]=state.diaryMonth.split('-').map(Number);
  lbl.textContent=y+'年'+m+'月';

  const today=new Date(); const todayStr=todayDateString();
  const firstDay=new Date(y,m-1,1).getDay(); // 0=Sun
  const daysInMonth=new Date(y,m,0).getDate();
  const weekHeaders=['日','一','二','三','四','五','六'];

  let html=weekHeaders.map(h=>`<div class="cg-hdr">${h}</div>`).join('');
  // Empty cells before first day
  for(let i=0;i<firstDay;i++) html+=`<div class="cg-day outside"></div>`;
  // Day cells
  for(let d=1;d<=daysInMonth;d++){
    const ds=y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const isToday=ds===todayStr;
    const isFuture=ds>todayStr;
    const hasUser=hasDiary(ds,'user'); const hasDream=hasDiary(ds,'dream');
    let cls='cg-day'; if(isToday)cls+=' today'; if(isFuture)cls+=' future';
    html+=`<div class="${cls}" data-date="${ds}">
      <span>${d}</span>
      <div class="cg-dots">${hasUser?'<span class="cg-dot user"></span>':''}${hasDream?'<span class="cg-dot dream"></span>':''}</div>
    </div>`;
  }
  grid.innerHTML=html;
}

function showDiaryDetail(dateStr) {
  state.diarySelectedDate = dateStr;
  const detail=document.getElementById('diaryDetail'); if(!detail)return;
  const diaries=STORE.diaries||[];
  const userDiary=diaries.find(d=>d.date===dateStr&&d.author==='user');
  const dreamDiary=diaries.find(d=>d.date===dateStr&&d.author==='dream');
  const todayStr=todayDateString();
  const isToday=dateStr===todayStr;

  let html=`<div class="diary-date-title">${dateStr}</div>`;

  // User diary
  if(userDiary){
    html+=renderDiaryEntry(userDiary,true);
  } else {
    if(isToday){
      html+=`<div class="diary-empty">今日未写日记 <button class="btn-write-diary" id="btnWriteDiaryDetail" style="margin-left:8px;">✍️ 写日记</button></div>`;
    } else {
      html+=`<div class="diary-empty">这一天没有日记</div>`;
    }
  }

  // Dream diary
  if(dreamDiary){
    html+=renderDiaryEntry(dreamDiary,false);
    html+=`<div style="text-align:center;margin-top:8px;"><button class="btn-refresh-diary" data-date="${dateStr}" style="padding:6px 14px;font-size:12px;border-radius:20px;background:var(--bg-warm);color:var(--accent);border:1px solid var(--border);cursor:pointer;transition:all 0.15s;">🔄 刷新梦角日记</button></div>`;
  } else {
    html+=`<div class="diary-empty">🤔 梦角还在酝酿中...</div>`;
    html+=`<div style="text-align:center;margin-top:8px;"><button class="btn-refresh-diary" data-date="${dateStr}" style="padding:6px 14px;font-size:12px;border-radius:20px;background:var(--accent);color:#fff;border:none;cursor:pointer;transition:all 0.15s;">✨ 生成梦角日记</button></div>`;
  }

  detail.innerHTML=html;

  // Bind detail events
  detail.querySelectorAll('.diary-card-openable').forEach(card=>{
    card.addEventListener('click',function(e){
      if(e.target.closest('button,input,textarea,a,.ai-box,.diary-comments'))return;
      openDiaryFullscreen(this.dataset.did);
    });
  });
  if(userDiary){
    detail.querySelector('.btn-edit-diary')?.addEventListener('click',e=>{
      e.stopPropagation();
      openDiaryFullscreen(userDiary.id);
    });
  }
  if(isToday&&!userDiary){
    detail.querySelector('#btnWriteDiaryDetail')?.addEventListener('click',showWriteDiaryModal);
  }
  // Comment buttons
  detail.querySelectorAll('.btn-comment-diary').forEach(btn=>{
    btn.addEventListener('click',function(){
      const section=this.closest('.diary-comments');
      if(section)section.querySelector('.dc-input-row').style.display='flex';
    });
  });
  detail.querySelectorAll('.dc-send').forEach(btn=>{
    btn.addEventListener('click',function(){
      const diaryId=this.dataset.did;
      const inp=this.parentElement.querySelector('input');
      const text=(inp?.value||'').trim();
      if(!text){alert('请输入批阅内容');return;}
      if(inp)inp.value='';
      addDiaryComment(diaryId,'user',text);
    });
  });
  // AI 解读日记按钮
  detail.querySelectorAll('.btn-ai-diary').forEach(btn=>{
    btn.addEventListener('click',function(){
      if(!isAIInterpretReady()){alert('请先到「设置 → AI 解读」开启功能并填写 API Key');return;}
      var did=this.dataset.did;
      var diaries=STORE.diaries||[];
      var diary=diaries.find(d=>d.id===did);
      if(!diary)return;
      var box=this.closest('.diary-entry').querySelector('.ai-box');
      if(!box)return;
      runAIInterpretOnBox(box, {
        targetText: buildDiaryTarget(diary),
        contextMessages: [],
        scene: 'diary',
        loadingText: '解读日记中',
        favoriteMeta: {
          sourceType: 'diary',
          sourceId: diary.id,
          sourceLabel: '日记',
          text: buildDiaryTarget(diary)
        }
      });
    });
  });
  // 刷新/生成梦角日记按钮
  detail.querySelector('.btn-refresh-diary')?.addEventListener('click',async function(){
    var dateStr = this.dataset.date;
    // 删除已有梦角日记
    var diaries = STORE.diaries || [];
    var idx = diaries.findIndex(function(d) { return d.date === dateStr && d.author === 'dream'; });
    if (idx >= 0) diaries.splice(idx, 1);
    STORE.diaries = diaries;
    this.textContent = '生成中...';
    this.disabled = true;
    await generateDreamDiary(dateStr);
    showDiaryDetail(dateStr);
  });
}

function renderDiaryEntry(diary, isUser) {
  const comments=diary.comments||[];
  let commentsHtml='';
  if(comments.length>0){
    commentsHtml=comments.map(c=>{
      const name=c.author==='user'?(STORE.config||{}).userNickname||'我':(STORE.config||{}).characterName||'梦角';
      return `<div class="dc-item"><span class="dc-author">${escapeHtml(name)}：</span>${escapeHtml(c.content)}</div>`;
    }).join('');
  }
  const editBtn=isUser?`<button class="btn-edit-diary">✏️ 编辑</button>`:'';
  const aiBtnDiary=!isUser?`<button class="btn-ai-diary" data-did="${diary.id}">📖 想说什么？</button>`:'';
  const aiBoxDiary=!isUser?`<div class="ai-box" data-ai-target="diary" data-did="${diary.id}"></div>`:'';
  return `<div class="diary-entry diary-card-openable" data-action="openDiaryFullscreen" data-did="${escapeHtml(diary.id)}">
    <div class="de-header"><span class="de-author">${isUser?'📝 '+((STORE.config||{}).userNickname||'我'):(STORE.config||{}).characterName||'梦角'}的日记</span>${editBtn}</div>
    <div class="de-title">${escapeHtml(diary.title||'无题')}</div>
    <div class="de-body">${escapeHtml(diary.content||'')}</div>
    <div class="de-time">${new Date(diary.updatedAt||diary.createdAt).toLocaleString('zh-CN')}</div>
    <div class="de-actions"><button class="btn-comment-diary">💬 批阅 (${comments.length})</button>${aiBtnDiary}</div>
    ${aiBoxDiary}
    <div class="diary-comments">
      ${commentsHtml}
      <div class="dc-input-row" style="display:none;">
        <input type="text" placeholder="写批阅…" maxlength="200">
        <button class="dc-send" data-did="${diary.id}">发送</button>
      </div>
    </div>
  </div>`;
}

function openDiaryFullscreen(diaryId) {
  state.diaryFullscreenId = diaryId;
  var body = document.getElementById('fsBody');
  if (body) renderDiaryFullscreen(body);
}

function closeDiaryFullscreen() {
  var diaries = STORE.diaries || [];
  var diary = diaries.find(d=>d.id===state.diaryFullscreenId);
  var dateStr = diary ? diary.date : state.diarySelectedDate;
  state.diaryFullscreenId = null;
  var body = document.getElementById('fsBody');
  if (body && state.fsView === 'diary') {
    renderDiary(body);
    if (dateStr) showDiaryDetail(dateStr);
  }
}

function renderDiaryFullscreen(container) {
  const diaries=STORE.diaries||[];
  const diary=diaries.find(d=>d.id===state.diaryFullscreenId);
  if(!diary){
    state.diaryFullscreenId=null;
    renderDiary(container);
    return;
  }
  const isUser=diary.author==='user';
  const cfg=STORE.config||{};
  const authorName=isUser?(cfg.userNickname||'我'):(cfg.characterName||'梦角');
  const comments=diary.comments||[];
  const commentsHtml=comments.length>0 ? comments.map(c=>{
    const name=c.author==='user'?(cfg.userNickname||'我'):(cfg.characterName||'梦角');
    return `<div class="dc-item"><span class="dc-author">${escapeHtml(name)}：</span>${escapeHtml(c.content)}</div>`;
  }).join('') : '<div class="mc-empty">暂无批阅</div>';
  const editorHtml=isUser
    ? `<input type="text" class="diary-full-title-input" id="diaryFullTitleInput" value="${escapeHtml(diary.title||'')}" maxlength="50">
       <textarea class="diary-full-content-input" id="diaryFullContentInput">${escapeHtml(diary.content||'')}</textarea>`
    : `<div class="diary-full-read-title">${escapeHtml(diary.title||'无题')}</div>
       <div class="diary-full-read-body">${escapeHtml(diary.content||'')}</div>`;
  const aiHtml=!isUser?`<div class="ai-box" data-ai-target="diary" data-did="${escapeHtml(diary.id)}"></div>`:'';
  const saveBtn=isUser?`<button class="diary-full-btn primary btn-diary-full-save" type="button">保存</button>`:'';
  const dreamTools=!isUser?`<button class="diary-full-btn btn-ai-diary" type="button" data-did="${escapeHtml(diary.id)}">📖 想说什么？</button>
    <button class="diary-full-btn btn-refresh-diary" type="button" data-date="${escapeHtml(diary.date)}">🔄 刷新</button>`:'';

  container.innerHTML=`<div class="diary-fullscreen">
    <div class="diary-full-head">
      <button class="diary-full-btn btn-diary-full-back" type="button">‹ 返回</button>
      <div class="diary-full-titlebar">
        <div class="diary-full-date">${escapeHtml(diary.date)}</div>
        <div class="diary-full-name">${escapeHtml(authorName)}的日记</div>
      </div>
      <div class="diary-full-actions">${dreamTools}${saveBtn}</div>
    </div>
    <div class="diary-full-body">
      <div class="diary-full-paper">
        ${editorHtml}
        <div class="diary-full-meta">更新于 ${new Date(diary.updatedAt||diary.createdAt).toLocaleString('zh-CN')}</div>
        ${aiHtml}
      </div>
      <div class="diary-full-extra">
        <div class="diary-comments">
          ${commentsHtml}
          <div class="dc-input-row">
            <input type="text" placeholder="写批阅…" maxlength="200">
            <button class="dc-send" data-did="${escapeHtml(diary.id)}">发送</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
  bindDiaryFullscreenEvents(container, diary);
}

function bindDiaryFullscreenEvents(container, diary) {
  container.querySelector('.btn-diary-full-back')?.addEventListener('click',closeDiaryFullscreen);
  container.querySelector('.btn-diary-full-save')?.addEventListener('click',function(){
    saveDiaryFullscreenEdit(diary.id);
  });
  container.querySelector('.dc-send')?.addEventListener('click',function(){
    const inp=this.parentElement.querySelector('input');
    const text=(inp?.value||'').trim();
    if(!text){alert('请输入批阅内容');return;}
    if(inp)inp.value='';
    addDiaryComment(diary.id,'user',text);
  });
  container.querySelector('.btn-ai-diary')?.addEventListener('click',function(){
    if(!isAIInterpretReady()){alert('请先到「设置 → AI 解读」开启功能并填写 API Key');return;}
    var box=container.querySelector('.ai-box[data-ai-target="diary"]');
    if(!box)return;
    runAIInterpretOnBox(box, {
      targetText: buildDiaryTarget(diary),
      contextMessages: [],
      scene: 'diary',
      loadingText: '解读日记中',
      favoriteMeta: {
        sourceType: 'diary',
        sourceId: diary.id,
        sourceLabel: '日记',
        text: buildDiaryTarget(diary)
      }
    });
  });
  container.querySelector('.btn-refresh-diary')?.addEventListener('click',async function(){
    var dateStr=this.dataset.date;
    var diaries=STORE.diaries||[];
    var idx=diaries.findIndex(function(d){return d.date===dateStr&&d.author==='dream';});
    if(idx>=0)diaries.splice(idx,1);
    STORE.diaries=diaries;
    this.textContent='生成中...';
    this.disabled=true;
    var diaryNew=await generateDreamDiary(dateStr);
    if(diaryNew)state.diaryFullscreenId=diaryNew.id;
    renderDiaryFullscreen(container);
  });
}

function saveDiaryFullscreenEdit(diaryId) {
  const diaries=STORE.diaries||[];
  const diary=diaries.find(d=>d.id===diaryId);
  if(!diary)return;
  const titleEl=document.getElementById('diaryFullTitleInput');
  const contentEl=document.getElementById('diaryFullContentInput');
  const title=(titleEl?.value||'').trim()||'无题';
  const content=(contentEl?.value||'').trim();
  if(!content){alert('请输入日记内容');return;}
  diary.title=title;
  diary.content=content;
  diary.updatedAt=Date.now();
  STORE.diaries=diaries;
  var body=document.getElementById('fsBody');
  if(body)renderDiaryFullscreen(body);
}

function bindDiaryEvents(container) {
  // Publish button
  container.querySelector('#btnWriteDiary')?.addEventListener('click',showWriteDiaryModal);
  // Swipe month navigation
  addCalendarSwipe(container.querySelector('#calendarGrid'), (dir) => {
    const [y,m]=state.diaryMonth.split('-').map(Number);
    if (dir === 'prev') {
      state.diaryMonth = m===1 ? (y-1)+'-12' : y+'-'+String(m-1).padStart(2,'0');
    } else {
      state.diaryMonth = m===12 ? (y+1)+'-01' : y+'-'+String(m+1).padStart(2,'0');
    }
    renderCalendar();
    document.getElementById('diaryDetail').innerHTML='<div class="diary-empty">👆 点击日历上的日期查看日记</div>';
  });
  // Calendar day click (delegated)
  container.querySelector('#calendarGrid')?.addEventListener('click',e=>{
    const day=e.target.closest('.cg-day');
    if(!day||!day.dataset.date||day.classList.contains('future'))return;
    showDiaryDetail(day.dataset.date);
  });
}

// Reusable swipe handler for calendar grids
function addCalendarSwipe(grid, onChangeMonth) {
  if (!grid) return;
  let startX = 0, startY = 0, started = false;
  grid.addEventListener('touchstart', e => {
    if (e.touches.length === 1) { startX = e.touches[0].clientX; startY = e.touches[0].clientY; started = true; }
  }, { passive: true });
  grid.addEventListener('touchend', e => {
    if (!started) return;
    const dx = (e.changedTouches[0]?.clientX || startX) - startX;
    const dy = (e.changedTouches[0]?.clientY || startY) - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      onChangeMonth(dx > 0 ? 'next' : 'prev');
    }
    started = false;
  });
  grid.addEventListener('mousedown', e => { startX = e.clientX; startY = e.clientY; started = true; });
  grid.addEventListener('mouseup', e => {
    if (!started) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      onChangeMonth(dx > 0 ? 'next' : 'prev');
    }
    started = false;
  });
}

// ============ Diary Actions ============
function showWriteDiaryModal() {
  showModal(`<h3>写日记 - ${todayDateString()}</h3>
    <div class="diary-edit-modal">
      <input type="text" id="deTitle" placeholder="标题（可选）" maxlength="50">
      <textarea id="deContent" placeholder="今天想记录什么..."></textarea>
    </div>
    <div class="modal-btns"><button class="btn-cancel" onclick="hideModal()">取消</button><button class="btn-primary" id="deSave">保存</button></div>`);

  document.getElementById('deSave').addEventListener('click',()=>{
    const title=document.getElementById('deTitle').value.trim()||'无题';
    const content=document.getElementById('deContent').value.trim();
    if(!content){alert('请输入日记内容');return;}
    const dateStr=todayDateString();
    const now=Date.now();
    const diaries=STORE.diaries||[];
    diaries.push({id:dateStr+'_user',date:dateStr,author:'user',title,content,createdAt:now,updatedAt:now,comments:[]});
    STORE.diaries=diaries;
    hideModal();
    // Refresh
    const body=document.getElementById('fsBody');
    if(body&&state.fsView==='diary'){renderDiary(body);showDiaryDetail(dateStr);}
  });
}

function showEditDiaryModal(diaryId) {
  const diaries=STORE.diaries||[], diary=diaries.find(d=>d.id===diaryId);
  if(!diary)return;
  showModal(`<h3>编辑日记 - ${diary.date}</h3>
    <div class="diary-edit-modal">
      <input type="text" id="deTitle" value="${escapeHtml(diary.title||'')}" maxlength="50">
      <textarea id="deContent">${escapeHtml(diary.content||'')}</textarea>
    </div>
    <div class="modal-btns"><button class="btn-cancel" onclick="hideModal()">取消</button><button class="btn-primary" id="deSave">保存修改</button></div>`);

  document.getElementById('deSave').addEventListener('click',()=>{
    diary.title=document.getElementById('deTitle').value.trim()||'无题';
    diary.content=document.getElementById('deContent').value.trim();
    if(!diary.content){alert('请输入日记内容');return;}
    diary.updatedAt=Date.now();
    STORE.diaries=diaries;
    hideModal();
    showDiaryDetail(diary.date);
  });
}

// ============ Dream Diary Generation ============
function collectTodayMaterials(dateStr) {
  var favorites = (STORE.favorites || []).filter(function(f) {
    var d = new Date(f.timestamp).toISOString().slice(0, 10);
    return d === dateStr && f.type === 'message';
  });
  var messages = (STORE.messages || []).filter(function(m) {
    var d = new Date(m.timestamp).toISOString().slice(0, 10);
    return d === dateStr;
  });
  var moments = (STORE.moments || []).filter(function(m) {
    var d = new Date(m.timestamp).toISOString().slice(0, 10);
    return d === dateStr;
  });
  var checkins = (STORE.checkins || []).filter(function(c) {
    var d = new Date(c.timestamp).toISOString().slice(0, 10);
    return d === dateStr;
  });
  return { favorites: favorites, messages: messages, moments: moments, checkins: checkins };
}

function buildMaterialsContext(mat) {
  var cfg = STORE.config || {};
  var charName = cfg.characterName || '梦角';
  var userName = cfg.userNickname || '我';
  var lines = [];

  lines.push('日期：' + new Date().toISOString().slice(0, 10));

  // 聊天记录
  if (mat.messages.length > 0) {
    lines.push('\n【聊天记录】');
    mat.messages.forEach(function(m) {
      var who = m.type === 'user' ? userName : charName;
      var text = m.text || (m.doodle ? '[涂鸦]' : '') || (m.imageData ? '[图片]' : '');
      var t = new Date(m.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      if (text) lines.push(t + ' ' + who + '：' + text);
    });
  }

  // AI解读收藏
  if (mat.favorites.length > 0) {
    lines.push('\n【收藏的AI解读】');
    mat.favorites.forEach(function(f) {
      var t = f.text || '';
      var interp = f.interpretation || '';
      if (t) lines.push('原文：' + t + (interp ? ' → 解读：' + interp : ''));
    });
  }

  // 朋友圈
  if (mat.moments.length > 0) {
    lines.push('\n【朋友圈动态】');
    mat.moments.forEach(function(m) {
      var publisher = m.publisher === 'dream' ? charName : m.publisher === 'user' ? userName : '未知';
      var content = m.content || '';
      lines.push(publisher + '：' + (content || '(无文字)'));
      var likes = m.likes || [];
      if (likes.length > 0) lines.push('  👍 ' + likes.length + '人赞');
      var comments = m.comments || [];
      comments.forEach(function(c) {
        var name = c.commenter === 'dream' ? charName : c.commenter === 'user' ? userName : c.commenter;
        lines.push('  💬 ' + name + '：' + c.content);
      });
    });
  }

  // 打卡
  if (mat.checkins.length > 0) {
    lines.push('\n【打卡记录】');
    mat.checkins.sort(function(a, b) { return a.timestamp - b.timestamp; });
    mat.checkins.forEach(function(c) {
      var who = c.role === 'user' ? userName : charName;
      var t = new Date(c.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      lines.push(t + ' ' + who + '：' + c.content);
    });
  }

  return lines.join('\n');
}

// 模板兜底的日记
function generateFallbackDiaryContent(mat) {
  var cfg = STORE.config || {};
  var charName = cfg.characterName || '梦角';
  var userName = cfg.userNickname || '我';
  var parts = [];

  parts.push(charName + '的日记\n');

  if (mat.messages.length > 0) {
    var userMsgs = mat.messages.filter(function(m) { return m.type === 'user'; });
    var charMsgs = mat.messages.filter(function(m) { return m.type === 'character'; });
    var userTexts = userMsgs.slice(0, 2).map(function(m) { return m.text || ''; }).filter(Boolean);
    var charTexts = charMsgs.slice(0, 2).map(function(m) { return m.text || ''; }).filter(Boolean);
    var chatStr = '';
    if (userTexts.length > 0) chatStr += userName + '跟我说了些有趣的事';
    if (charTexts.length > 0) chatStr += (chatStr ? '，我也' : '我') + '用字卡回应了';
    if (chatStr) parts.push('今天和' + userName + '聊了天，' + chatStr + '。一共' + mat.messages.length + '条消息。');
  }

  if (mat.checkins.length > 0) {
    parts.push('我们一起打卡了' + mat.checkins.length + '次，记录了今天的生活。');
  }

  if (mat.moments.length > 0) {
    parts.push('朋友圈里也很热闹，大家分享了今天的点滴。');
  }

  if (mat.favorites.length > 0) {
    parts.push('我还收藏了几条特别有感触的对话解读。');
  }

  parts.push('今天也是充实的一天，想对' + userName + '说声谢谢陪伴。——' + charName);
  return parts.join('\n\n');
}

// AI生成日记内容（异步）
function generateAIDiaryContent(mat) {
  return new Promise(function(resolve, reject) {
    var cfg = getAIConfig();
    if (!cfg.enabled || !cfg.apiKey) { reject(new Error('AI not configured')); return; }

    var charName = (STORE.config || {}).characterName || '梦角';
    var userName = (STORE.config || {}).userNickname || '我';

    var systemPrompt = '你扮演' + charName + '本人，用第一人称"我"写一篇今天的日记，约200字。\n\n' +
      '要求：\n' +
      '1. 语言自然口语化，像一个真实的年轻人在写日记\n' +
      '2. 把提供的素材自然地融入日记中，不要逐条罗列\n' +
      '3. 表达出对' + userName + '（用"你"或"ta"称呼）的感情和这一天的感受\n' +
      '4. 风格活泼、真诚，偶尔带点撒娇或小感慨\n' +
      '5. 不要写开头称呼（如"亲爱的日记"），直接写正文\n' +
      '6. 只输出日记正文，不要额外说明';

    var userContent = '以下是我今天的活动素材，请根据这些写一篇日记：\n\n' + buildMaterialsContext(mat);

    fetch(cfg.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        stream: false,
        temperature: 0.85,
        max_tokens: 2048
      })
    }).then(function(resp) {
      if (!resp.ok) { return resp.text().then(function(t) { reject(new Error('HTTP ' + resp.status + (t ? ': ' + t.slice(0, 200) : ''))); }); }
      return resp.json();
    }).then(function(data) {
      var content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
      if (!content) { reject(new Error('AI returned empty')); return; }
      resolve(content);
    }).catch(function(err) { reject(err); });
  });
}

async function generateDreamDiary(dateStr) {
  if (hasDiary(dateStr, 'dream')) return null;

  var mat = collectTodayMaterials(dateStr);
  var content = '';

  // 优先尝试AI生成，失败则用模板兜底
  try {
    content = await generateAIDiaryContent(mat);
  } catch (e) {
    content = generateFallbackDiaryContent(mat);
  }

  if (!content || content.length < 10) return null;

  var now = Date.now();
  var diary = {
    id: dateStr + '_dream',
    date: dateStr,
    author: 'dream',
    title: '梦角的日记',
    content: content,
    createdAt: now,
    updatedAt: now,
    comments: []
  };
  var diaries = STORE.diaries || [];
  diaries.push(diary);
  STORE.diaries = diaries;
  setTimeout(updateRedDots, 300);
  return diary;
}

function scheduleDreamDiaryGen() {
  clearTimeout(state.diaryGenTimerId); state.diaryGenTimerId=null;
  const cfg=STORE.config||{};
  const timing=cfg.timing||{diaryGen:{hourMin:21,hourMax:24}};
  const hourMin=timing.diaryGen?.hourMin||21;
  const hourMax=timing.diaryGen?.hourMax||24;

  const now=new Date(); const today=todayDateString();
  // If already past end hour and today's dream diary doesn't exist, generate now
  if(now.getHours()>=hourMax){
    generateDreamDiary(today);
    return;
  }
  // If before start hour, schedule for random time in window
  if(now.getHours()<hourMin){
    const targetMin=hourMin*60+Math.floor(Math.random()*60);
    const nowMin=now.getHours()*60+now.getMinutes();
    const delayMs=(targetMin-nowMin)*60000;
    state.diaryGenTimerId=setTimeout(()=>{
      generateDreamDiary(todayDateString());
      scheduleDreamDiaryGen(); // re-schedule for next day
    },delayMs);
    return;
  }
  // Within window: random remaining minutes
  const remainingMin=(hourMax-now.getHours())*60-now.getMinutes();
  const delayMs=Math.floor(Math.random()*remainingMin)*60000;
  state.diaryGenTimerId=setTimeout(()=>{
    generateDreamDiary(todayDateString());
    scheduleDreamDiaryGen();
  },Math.max(60000,delayMs));
}

// ============ Diary Comments (批阅) ============
function addDiaryComment(diaryId, author, content) {
  const diaries=STORE.diaries||[];
  const diary=diaries.find(d=>d.id===diaryId);
  if(!diary)return;
  if(!Array.isArray(diary.comments))diary.comments=[];
  diary.comments.push({id:'dc_'+Date.now(),author,content,timestamp:Date.now()});
  STORE.diaries=diaries;
  if(state.diaryFullscreenId===diaryId){
    var body=document.getElementById('fsBody');
    if(body)renderDiaryFullscreen(body);
  } else {
    showDiaryDetail(diary.date);
  }
  // Dream replies to user comment on user's diary
  if(author==='user'&&diary.author==='user'){
    scheduleDiaryCommentReply(diaryId);
  }
}

function scheduleDiaryCommentReply(diaryId) {
  const cfg=STORE.config||{};
  const prob=(cfg.prob?.diaryComment||70);
  if(Math.random()*100>=prob)return;
  const timing=cfg.timing||{diaryComment:{min:30,max:120}};
  const minMs=(timing.diaryComment?.min||30)*60000;
  const maxMs=(timing.diaryComment?.max||120)*60000;
  const delay=randomBetween(minMs,maxMs);

  setTimeout(()=>{
    if(!checkWordCards())return;
    const diaries=STORE.diaries||[];
    const diary=diaries.find(d=>d.id===diaryId);
    if(!diary)return;
    const visible=getVisibleCards();
    const picked=[];
    const nCards=Math.floor(randomBetween(2,5));
    for(let i=0;i<nCards;i++){const c=weightedPick(visible);if(c)picked.push(c.text);}
    const content='梦角说：'+picked.join('，');
    if(!Array.isArray(diary.comments))diary.comments=[];
    diary.comments.push({id:'dc_'+Date.now(),author:'dream',content,timestamp:Date.now()});
    STORE.diaries=diaries;
    if(state.fsView==='diary'){
      if(state.diaryFullscreenId===diaryId){
        var body=document.getElementById('fsBody');
        if(body)renderDiaryFullscreen(body);
      } else {
        showDiaryDetail(diary.date);
      }
    }
  },delay);
}

// ============ Letters (写信) ============
function normalizeLetterRange(minValue, maxValue, fallbackMin, fallbackMax, lowerBound, upperBound) {
  var first = Number(minValue);
  var second = Number(maxValue);
  first = Number.isFinite(first) ? first : fallbackMin;
  second = Number.isFinite(second) ? second : fallbackMax;
  first = Math.max(lowerBound, Math.min(upperBound, first));
  second = Math.max(lowerBound, Math.min(upperBound, second));
  return { min: Math.min(first, second), max: Math.max(first, second) };
}

function getLetterConfig() {
  var source = (STORE.config || {}).letter || {};
  return {
    annotationDelay: normalizeLetterRange(
      source.annotationDelay && source.annotationDelay.min,
      source.annotationDelay && source.annotationDelay.max,
      5, 30, 1, 1440
    ),
    coverage: normalizeLetterRange(
      source.coverage && source.coverage.min,
      source.coverage && source.coverage.max,
      25, 50, 1, 100
    ),
    cardCount: normalizeLetterRange(
      source.cardCount && source.cardCount.min,
      source.cardCount && source.cardCount.max,
      1, 1, 1, 3
    )
  };
}

function revealDueLetterAnnotations(now) {
  var letters = STORE.letters || [];
  var changed = false;
  letters.forEach(function(letter) {
    (letter.annotations || []).forEach(function(annotation) {
      if (!annotation.visible && Number(annotation.dueAt) <= now) {
        annotation.visible = true;
        changed = true;
      }
    });
  });
  if (changed) { STORE.letters = letters; setTimeout(updateRedDots, 300); }
  return changed;
}

function scheduleLetterAnnotationReveal() {
  clearTimeout(state.letterRevealTimerId);
  state.letterRevealTimerId = null;
  var nextDueAt = 0;
  (STORE.letters || []).forEach(function(letter) {
    (letter.annotations || []).forEach(function(annotation) {
      if (!annotation.visible && annotation.dueAt && (!nextDueAt || annotation.dueAt < nextDueAt)) nextDueAt = annotation.dueAt;
    });
  });
  if (!nextDueAt) return;
  var wait = Math.max(300, Math.min(nextDueAt - Date.now(), 2147483647));
  state.letterRevealTimerId = setTimeout(function() {
    revealDueLetterAnnotations(Date.now());
    var body = document.getElementById('fsBody');
    if (body && state.fsView === 'letters') {
      if (state.letterFullscreenId || state.letterDraft) renderLetterFullscreen(body);
      else renderLetters(body);
    }
    scheduleLetterAnnotationReveal();
  }, wait);
}

function letterById(letterId) {
  return (STORE.letters || []).find(function(letter) { return letter.id === letterId; });
}

function formatLetterTime(timestamp) {
  return new Date(timestamp).toLocaleString('zh-CN', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

function renderLetters(container) {
  revealDueLetterAnnotations(Date.now());
  scheduleLetterAnnotationReveal();
  var letters = (STORE.letters || []).slice().sort(function(first, second) {
    return (second.sentAt || second.createdAt || 0) - (first.sentAt || first.createdAt || 0);
  });
  var cards = letters.length ? letters.map(function(letter) {
    var visibleCount = (letter.annotations || []).filter(function(annotation) { return annotation.visible; }).length;
    var total = (letter.annotations || []).length;
    var responseLabel = visibleCount ? '已收到 ' + visibleCount + '/' + total + ' 条批注' : '等待回信';
    return '<button type="button" class="letter-card" data-letter-id="' + escapeHtml(letter.id) + '">' +
      '<div class="letter-card-title">' + escapeHtml(letter.title || '给梦角的一封信') + '</div>' +
      '<div class="letter-card-preview">' + escapeHtml(letter.content || '') + '</div>' +
      '<div class="letter-card-meta"><span>' + formatLetterTime(letter.sentAt || letter.createdAt) + '</span><span>' + responseLabel + '</span></div>' +
    '</button>';
  }).join('') : '<div class="letter-empty">还没有寄出的信</div>';

  container.innerHTML = '<div class="letters-page">' +
    '<div class="letters-toolbar"><h2>写信</h2><button type="button" class="btn-write-letter" id="btnWriteLetter">写一封信</button></div>' +
    '<div class="letters-list">' + cards + '</div>' +
  '</div>';
  container.querySelector('#btnWriteLetter')?.addEventListener('click', openLetterComposer);
  container.querySelectorAll('.letter-card').forEach(function(card) {
    card.addEventListener('click', function() { openLetterFullscreen(card.dataset.letterId); });
  });
}

function openLetterComposer() {
  state.letterFullscreenId = null;
  state.letterDraft = { title:'', content:'', createdAt:Date.now() };
  var body = document.getElementById('fsBody');
  if (body) renderLetterFullscreen(body);
}

function openLetterFullscreen(letterId) {
  if (!letterById(letterId)) return;
  state.letterDraft = null;
  state.letterFullscreenId = letterId;
  var body = document.getElementById('fsBody');
  if (body) renderLetterFullscreen(body);
}

function closeLetterFullscreen() {
  state.letterFullscreenId = null;
  state.letterDraft = null;
  var body = document.getElementById('fsBody');
  if (body && state.fsView === 'letters') renderLetters(body);
}

function renderLetterReadContent(letter) {
  var annotationsBySegment = {};
  (letter.annotations || []).forEach(function(annotation) {
    if (annotation.visible) annotationsBySegment[annotation.segmentIndex] = annotation;
  });
  return (letter.segments || []).map(function(segment, index) {
    var annotation = annotationsBySegment[index];
    var annotationHtml = '';
    if (annotation) {
      annotationHtml = '<aside class="letter-annotation">' +
        '<div class="letter-annotation-text">' + escapeHtml(annotation.text) + '</div>' +
        '<div class="letter-annotation-tools"><button type="button" class="btn-ai-letter-annotation" data-letter-id="' + escapeHtml(letter.id) + '" data-annotation-id="' + escapeHtml(annotation.id) + '">解读这条批注</button></div>' +
        '<div class="ai-box" data-ai-target="letter-annotation" data-letter-id="' + escapeHtml(letter.id) + '" data-annotation-id="' + escapeHtml(annotation.id) + '"></div>' +
      '</aside>';
    }
    return '<div class="letter-segment' + (annotation ? ' has-annotation' : '') + '"><span class="letter-segment-text">' + escapeHtml(segment) + '</span></div>' + annotationHtml;
  }).join('');
}

function renderLetterFullscreen(container) {
  revealDueLetterAnnotations(Date.now());
  var draft = state.letterDraft;
  var letter = draft || letterById(state.letterFullscreenId);
  if (!letter) {
    closeLetterFullscreen();
    return;
  }
  var locked = !!letter.lockedAt;
  var cfg = STORE.config || {};
  var recipient = cfg.characterName || '梦角';
  var paper = locked
    ? '<div class="letter-to">寄给 ' + escapeHtml(recipient) + '</div><div class="letter-read-title">' + escapeHtml(letter.title || '给梦角的一封信') + '</div><div class="letter-read-body">' + renderLetterReadContent(letter) + '</div><div class="letter-meta">寄出于 ' + formatLetterTime(letter.sentAt || letter.createdAt) + '</div>'
    : '<input type="text" class="letter-title-input" id="letterTitleInput" value="' + escapeHtml(letter.title || '') + '" placeholder="信的标题" maxlength="60">' +
      '<textarea class="letter-content-input" id="letterContentInput" placeholder="想说的话…" maxlength="10000">' + escapeHtml(letter.content || '') + '</textarea>';

  container.innerHTML = '<div class="letter-fullscreen">' +
    '<div class="letter-full-head">' +
      '<button type="button" class="letter-full-btn btn-letter-full-back">‹ 返回</button>' +
      '<div class="letter-full-titlebar"><div class="letter-full-date">' + (locked ? '已寄出' : '写给 ' + escapeHtml(recipient)) + '</div><div class="letter-full-name">' + (locked ? escapeHtml(letter.title || '给梦角的一封信') : '一封新信') + '</div></div>' +
      '<div class="letter-full-actions">' + (locked ? '' : '<button type="button" class="letter-full-btn primary btn-send-letter">寄出</button>') + '</div>' +
    '</div>' +
    '<div class="letter-full-body"><article class="letter-paper">' + paper + '</article></div>' +
  '</div>';
  bindLetterFullscreenEvents(container, letter, locked);
}

function sendLetter() {
  if (!state.letterDraft || !window.LetterRules) {
    alert('写信功能还没有准备好，请重新打开页面。');
    return;
  }
  var title = (document.getElementById('letterTitleInput')?.value || '').trim() || '给梦角的一封信';
  var content = (document.getElementById('letterContentInput')?.value || '').trim();
  if (!content) {
    alert('先写下想说的话吧。');
    return;
  }
  var segments = window.LetterRules.splitLetterSegments(content);
  var cards = getVisibleCards();
  if (!cards.length) {
    alert('字卡库里没有可用字卡，先启用至少一张字卡再寄出。');
    return;
  }
  var now = Date.now();
  var annotations = window.LetterRules.selectLetterAnnotations(segments, getLetterConfig().coverage, cards, getLetterConfig().cardCount, Math.random);
  if (!annotations.length) {
    alert('这封信暂时没有可以批注的段落。');
    return;
  }
  var letter = {
    id: 'letter_' + genId(),
    title: title,
    content: content,
    segments: segments,
    annotations: window.LetterRules.scheduleLetterAnnotations(annotations, getLetterConfig().annotationDelay, now, Math.random),
    createdAt: state.letterDraft.createdAt || now,
    sentAt: now,
    lockedAt: now,
  };
  var letters = STORE.letters || [];
  letters.unshift(letter);
  STORE.letters = letters;
  state.letterDraft = null;
  state.letterFullscreenId = letter.id;
  scheduleLetterAnnotationReveal();
  var body = document.getElementById('fsBody');
  if (body) renderLetterFullscreen(body);
}

function bindLetterFullscreenEvents(container, letter, locked) {
  container.querySelector('.btn-letter-full-back')?.addEventListener('click', closeLetterFullscreen);
  if (!locked) {
    container.querySelector('.btn-send-letter')?.addEventListener('click', sendLetter);
    return;
  }
  container.querySelectorAll('.btn-ai-letter-annotation').forEach(function(button) {
    button.addEventListener('click', function() {
      if (!isAIInterpretReady()) {
        alert('请先到「设置 → AI 解读」开启功能并填写 API Key');
        return;
      }
      var annotation = (letter.annotations || []).find(function(item) { return item.id === button.dataset.annotationId; });
      if (!annotation) return;
      var box = container.querySelector('.ai-box[data-letter-id="' + button.dataset.letterId + '"][data-annotation-id="' + button.dataset.annotationId + '"]');
      if (!box) return;
      var segment = (letter.segments || [])[annotation.segmentIndex] || '';
      var targetText = '信里的片段：“' + segment + '”。梦角的批注：“' + annotation.text + '”。';
      runAIInterpretOnBox(box, {
        targetText: targetText,
        contextMessages: [],
        scene: 'letter-annotation',
        loadingText: '解读批注中',
        favoriteMeta: {
          sourceType: 'letter-annotation',
          sourceId: letter.id,
          sourceSubId: annotation.id,
          sourceLabel: '信件批注',
          text: targetText
        }
      });
    });
  });
}

// ============ Checkin (打卡) ============

function renderCheckin(container) {
  if (!state.checkinDate) {
    const d = new Date();
    state.checkinDate = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  const words = STORE.checkinWords || [];
  const cfg = STORE.config || {};

  container.innerHTML = `
  <div class="checkin-page">
    <div class="checkin-words-area">
      <div class="checkin-words-row" id="checkinWordsRow">
        ${words.map((w,i) => `
          <span class="checkin-word-chip">
            ${escapeHtml(w)}
            <span class="cw-del" data-idx="${i}" title="删除">×</span>
          </span>`).join('')}
      </div>
      <div class="checkin-word-add">
        <input type="text" id="newWordInput" placeholder="添加新词…" maxlength="12">
        <button id="btnAddWord">+ 添加</button>
      </div>
    </div>
    <div class="checkin-date-nav">
      <button class="cdn-btn" id="cdnPrev">◀</button>
      <span class="cdn-date" id="cdnDate"></span>
      <button class="cdn-btn" id="cdnNext">▶</button>
    </div>
    <div class="checkin-timeline" id="checkinRecords"></div>
    <div class="checkin-input-bar">
      <textarea id="checkinInput" rows="1" placeholder="记录此刻…" maxlength="200"></textarea>
      <button class="btn-ci" id="btnUserCheckin">✏️ 打卡</button>
    </div>
  </div>`;

  bindCheckinEvents(container);
  renderCheckinRecords();
  updateCheckinDateNav();
}

function bindCheckinEvents(container) {
  // Delete word
  container.querySelectorAll('.cw-del').forEach(btn => {
    btn.addEventListener('click', function() {
      const words = STORE.checkinWords || [];
      if (words.length <= 1) { alert('至少保留一个打卡词'); return; }
      words.splice(parseInt(this.dataset.idx), 1);
      STORE.checkinWords = words;
      renderCheckin(container);
    });
  });
  // Add word
  container.querySelector('#btnAddWord').addEventListener('click', () => {
    const inp = container.querySelector('#newWordInput');
    const v = inp.value.trim();
    if (!v) return;
    const words = STORE.checkinWords || [];
    if (words.includes(v)) { alert('该词已存在'); return; }
    words.push(v);
    STORE.checkinWords = words;
    renderCheckin(container);
  });
  container.querySelector('#newWordInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { container.querySelector('#btnAddWord').click(); }
  });
  // Date nav
  container.querySelector('#cdnPrev').addEventListener('click', () => {
    changeCheckinDate(-1);
  });
  container.querySelector('#cdnNext').addEventListener('click', () => {
    changeCheckinDate(1);
  });
  // User checkin
  container.querySelector('#btnUserCheckin').addEventListener('click', () => {
    const inp = container.querySelector('#checkinInput');
    const v = inp.value.trim();
    if (!v) return;
    addCheckin('user', v);
    inp.value = '';
    inp.focus();
  });
  // Input enter key
  container.querySelector('#checkinInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      container.querySelector('#btnUserCheckin').click();
    }
  });
}

function addCheckin(role, content, timestamp) {
  const checkins = STORE.checkins || [];
  checkins.push({
    id: genId(),
    role: role,
    content: content,
    timestamp: timestamp || Date.now(),
  });
  STORE.checkins = checkins;
  renderCheckinRecords();
}

function changeCheckinDate(offset) {
  const parts = state.checkinDate.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
  d.setDate(d.getDate() + offset);
  state.checkinDate = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  updateCheckinDateNav();
  renderCheckinRecords();
}

function updateCheckinDateNav() {
  const el = document.getElementById('cdnDate');
  if (!el) return;
  const parts = state.checkinDate.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
  el.textContent = d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日';
  // Today marker
  const today = new Date();
  const todayStr = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
  if (state.checkinDate === todayStr) {
    el.textContent += ' · 今天';
  }
}

function renderCheckinRecords() {
  const area = document.getElementById('checkinRecords');
  if (!area) return;
  const checkins = STORE.checkins || [];
  const dateStr = state.checkinDate; // 'YYYY-MM-DD'
  // Filter by date
  const filtered = checkins.filter(c => {
    const d = new Date(c.timestamp);
    const ds = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    return ds === dateStr;
  });
  // Sort newest first — latest checkin at the top
  filtered.sort((a,b) => b.timestamp - a.timestamp);

  if (filtered.length === 0) {
    area.innerHTML = '<div class="ci-empty">📌 暂无打卡记录<br><span style="font-size:11px;">在下方输入内容，记录今天吧</span></div>';
    return;
  }

  area.innerHTML = filtered.map(c => {
    const d = new Date(c.timestamp);
    const time = d.toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'});
    const isUser = c.role === 'user';
    // 梦角 (dream) on LEFT: content then time · 我 (user) on RIGHT: time then content
    const inner = isUser
      ? `<span class="ci-time-label">${time}</span><span class="ci-content">${escapeHtml(c.content)}</span>`
      : `<span class="ci-content">${escapeHtml(c.content)}</span><span class="ci-time-label">${time}</span>`;
    return `<div class="ci-entry ${isUser?'user':'dream'}">
      <div class="ci-dot"></div>
      <div class="ci-block">${inner}</div>
    </div>`;
  }).join('');
  area.scrollTop = area.scrollHeight;
}

// ============ Checkin Auto Timer ============
function scheduleNextAutoCheckin() {
  clearTimeout(state.checkinAutoTimerId);
  state.checkinAutoTimerId = null;
  const cfg = STORE.config || {};
  if (!cfg.checkinAutoEnabled) return;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const timing = cfg.timing || {checkin: {timeStart: 9, timeEnd: 21, intervalMin: 30, intervalMax: 120}};
  const startMinutes = (timing.checkin?.timeStart || 9) * 60;
  const endMinutes = (timing.checkin?.timeEnd || 21) * 60;

  if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
    // Inside active window — schedule next checkin
    const delayMin = randomBetween(timing.checkin?.intervalMin || 30, timing.checkin?.intervalMax || 120);
    const delayMs = delayMin * 60000;
    state.checkinAutoTimerId = setTimeout(() => {
      const words = STORE.checkinWords || [];
      if (words.length > 0) {
        const lastWord = STORE.lastCheckinWord || null;
        var pool = words;
        if (lastWord && words.length > 1) {
          pool = words.filter(function(w) { return w !== lastWord; });
          if (pool.length === 0) pool = words;
        }
        const word = pool[Math.floor(Math.random() * pool.length)];
        STORE.lastCheckinWord = word;
        addCheckin('dream', word);
        setTimeout(updateRedDots, 300);
        // Update date to today since auto checkin is always today
        const today = new Date();
        state.checkinDate = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
      }
      scheduleNextAutoCheckin();
    }, delayMs);
  } else {
    // Outside active window — wait until next start time
    let nextStart = new Date(now);
    const timing = cfg.timing || {checkin: {timeStart: 9, timeEnd: 21, intervalMin: 30, intervalMax: 120}};
    nextStart.setHours(timing.checkin?.timeStart || 9, 0, 0, 0);
    if (currentMinutes >= endMinutes) {
      // Past today's window — schedule for tomorrow
      nextStart.setDate(nextStart.getDate() + 1);
    }
    const delayMs = nextStart.getTime() - now.getTime();
    state.checkinAutoTimerId = setTimeout(() => {
      // Update date to today on entry
      const today = new Date();
      state.checkinDate = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
      scheduleNextAutoCheckin();
    }, delayMs);
  }
}

function startCheckinAutoTimer() {
  stopCheckinAutoTimer();
  state.checkinDate = null; // reset to today on next render
  scheduleNextAutoCheckin();
}

function stopCheckinAutoTimer() {
  clearTimeout(state.checkinAutoTimerId);
  state.checkinAutoTimerId = null;
}

// ============ Review (锐评) ============
const RATING_LEVELS=[
  {stars:1,text:'拉完了',emoji:'💩'},
  {stars:2,text:'NPC',emoji:'😶'},
  {stars:3,text:'人上人',emoji:'🚀'},
  {stars:4,text:'顶级',emoji:'👑'},
  {stars:5,text:'夯',emoji:'🔥'},
];

function showReviewModal() {
  showModal(`<h3>💥 梦角锐评 - 从夯到拉</h3>
    <div class="review-modal">
      <div class="rm-hint">请描述你想被锐评的人、事、物…</div>
      <textarea class="rm-textarea" id="rmInput" placeholder="例如：我今天做的菜、某款游戏、我的新发型…" maxlength="200"></textarea>
    </div>
    <div class="modal-btns"><button class="btn-cancel" onclick="hideModal()">取消</button><button class="btn-primary" id="rmStart">开始锐评</button></div>`);

  document.getElementById('rmStart').addEventListener('click',()=>{
    const text=document.getElementById('rmInput').value.trim();
    if(!text){alert('请输入你要锐评的内容');return;}
    hideModal();
    // Check counter-question probability
    const cfg=STORE.config||{};
    const prob=(cfg.prob?.reviewCounter||20);
    if(Math.random()*100<prob){
      showCounterQuestion(text);
    } else {
      generateReview(text);
    }
  });
}

function showCounterQuestion(userInput) {
  showModal(`<div class="cq-modal">
    <div class="cq-emoji">😏</div>
    <div class="cq-text">你确定想听真话？</div>
    <div class="modal-btns" style="justify-content:center;">
      <button class="btn-cancel" onclick="hideModal()">算了不听了</button>
      <button class="btn-primary" id="cqOk">确定，说吧！</button>
    </div></div>`);

  document.getElementById('cqOk').addEventListener('click',()=>{
    hideModal();
    generateReview(userInput);
  });
}

function generateReview(userInput) {
  const cfg=STORE.config||{};
  const mode=cfg.reviewMode||'random';

  // Pick rating level
  let levelIdx;
  if(mode==='random'){
    levelIdx=Math.floor(Math.random()*5);
  } else if(mode==='harsh'){
    // Bias towards low ratings
    const weights=[40,30,15,10,5]; // 1★:40%, 2★:30%, etc.
    let r=Math.random()*100;
    for(let i=0;i<5;i++){r-=weights[i];if(r<=0){levelIdx=i;break;}}
    if(levelIdx===undefined)levelIdx=4;
  } else { // gentle
    const weights=[5,10,15,30,40];
    let r=Math.random()*100;
    for(let i=0;i<5;i++){r-=weights[i];if(r<=0){levelIdx=i;break;}}
    if(levelIdx===undefined)levelIdx=4;
  }

  const level=RATING_LEVELS[levelIdx];

  // Generate comment from word cards
  const cardCount=cfg.reviewCardCount||3;
  let comment='';
  const visible=getVisibleCards();
  if(visible.length>0){
    const picked=[];
    for(let i=0;i<cardCount;i++){const c=weightedPick(visible);if(c)picked.push(c.text);}
    comment=picked.join(' ');
  }
  if(!comment)comment='（字卡缺失，梦角词穷了）';

  // Build stars display
  const starsDisplay='★'.repeat(level.stars)+'☆'.repeat(5-level.stars);

  // Save review
  const reviews=STORE.reviews||[];
  const reviewId=Date.now();
  reviews.push({
    id:reviewId,userInput,
    rating:level.stars,ratingText:level.text,ratingEmoji:level.emoji,
    stars:level.stars,comment,timestamp:Date.now(),sharedToMoments:false
  });
  STORE.reviews=reviews;

  // Add as a special chat message
  const messages=STORE.messages||[];
  messages.push({
    id:genId(),type:'character',text:'',timestamp:Date.now(),
    review:{id:reviewId,userInput,starsDisplay,level,comment}
  });
  STORE.messages=messages;
  renderMessages();
}

function shareReviewToMoments(reviewId) {
  const reviews=STORE.reviews||[];
  const review=reviews.find(r=>r.id===reviewId);
  if(!review||review.sharedToMoments)return;
  review.sharedToMoments=true;
  STORE.reviews=reviews;

  const starsDisplay='★'.repeat(review.stars)+'☆'.repeat(5-review.stars);
  const cfg=STORE.config||{};
  const dreamName=cfg.characterName||'梦角';

  // Random template selection
  const templates=[
    `我问${dreamName}：「${review.userInput}」\n${dreamName}锐评：${starsDisplay} ${review.ratingText} ${review.ratingEmoji}\n评语：「${review.comment}」`,
    `今天鼓起勇气让${dreamName}锐评「${review.userInput}」…\n结果${dreamName}给我打了个 ${review.ratingText} ${review.ratingEmoji}，还说「${review.comment}」`,
    `锐评挑战：让${dreamName}评价「${review.userInput}」\n${dreamName}判定：${starsDisplay} ${review.ratingText} ${review.ratingEmoji}\n附加评语："${review.comment}"\n屏幕前的家人们你们觉得公正吗？🤔`,
  ];
  const content=templates[Math.floor(Math.random()*templates.length)];

  const moments=STORE.moments||[];
  moments.push({
    id:'mom_review_'+Date.now(),
    publisher:'user',
    content,
    timestamp:Date.now(),
    likes:[],comments:[],imageUrl:'',dreamProcessed:false,
  });
  STORE.moments=moments;
  // Refresh chat to update button state
  renderMessages();
  if(state.fsView==='moments')renderFeed();
  // Show confirmation
  setTimeout(()=>alert('已分享到朋友圈！'),100);
}

// ============ Modals ============
function showModal(html){document.getElementById('modalBox').innerHTML=html;document.getElementById('modalOverlay').classList.add('show');}
function hideModal(){document.getElementById('modalOverlay').classList.remove('show');}

function showAddCardModal() {
  const cats=STORE.categories||[],subs=STORE.subcategories||[];
  let curCat=state.selectedCatId||(cats[0]?cats[0].id:'');
  function subOpts(catId){return subs.filter(s=>s.categoryId===catId).map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');}

  showModal(`<h3>添加字卡</h3>
    <div class="form-row"><label>字卡内容</label><input type="text" id="mText" placeholder="输入字卡文字…" maxlength="200"></div>
    <div class="form-row"><label>所属大类</label><select id="mCat">${cats.map(c=>`<option value="${c.id}" ${c.id===curCat?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select></div>
    <div class="form-row"><label>所属小类</label><select id="mSub">${subOpts(curCat)}</select></div>
    <div class="modal-btns"><button class="btn-cancel" onclick="hideModal()">取消</button><button class="btn-primary" id="mOk">确认添加</button></div>`);

  document.getElementById('mCat').addEventListener('change',function(){document.getElementById('mSub').innerHTML=subOpts(this.value);});
  document.getElementById('mOk').addEventListener('click',()=>{
    const text=document.getElementById('mText').value.trim();
    if(!text){alert('请输入字卡内容');return;}
    const catId=document.getElementById('mCat').value,subId=document.getElementById('mSub').value;
    if(!catId||!subId){alert('请选择大类和小类');return;}
    const cards=STORE.cards||[];
    if(cards.find(c=>c.text.trim().toLowerCase()===text.toLowerCase())){alert(`重复字卡：${text}，已跳过`);return;}
    cards.push({id:genId(),text,categoryId:catId,subcategoryId:subId,weight:1});STORE.cards=cards;
    hideModal(); renderCardItems();
  });
}

function showEditCardModal(cardId) {
  const cards=STORE.cards||[],card=cards.find(c=>c.id===cardId); if(!card)return;
  const cats=STORE.categories||[],subs=STORE.subcategories||[];
  function subOpts(catId){return subs.filter(s=>s.categoryId===catId).map(s=>`<option value="${s.id}" ${s.id===card.subcategoryId?'selected':''}>${escapeHtml(s.name)}</option>`).join('');}

  showModal(`<h3>编辑字卡</h3>
    <div class="form-row"><label>字卡内容</label><input type="text" id="mText" value="${escapeHtml(card.text)}" maxlength="200"></div>
    <div class="form-row"><label>所属大类</label><select id="mCat">${cats.map(c=>`<option value="${c.id}" ${c.id===card.categoryId?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select></div>
    <div class="form-row"><label>所属小类</label><select id="mSub">${subOpts(card.categoryId)}</select></div>
    <div class="modal-btns"><button class="btn-cancel" onclick="hideModal()">取消</button><button class="btn-primary" id="mOk">保存修改</button></div>`);

  document.getElementById('mCat').addEventListener('change',function(){document.getElementById('mSub').innerHTML=subOpts(this.value);});
  document.getElementById('mOk').addEventListener('click',()=>{
    const text=document.getElementById('mText').value.trim();
    if(!text){alert('请输入字卡内容');return;}
    const catId=document.getElementById('mCat').value,subId=document.getElementById('mSub').value;
    if(!catId||!subId){alert('请选择大类和小类');return;}
    // Re-read from localStorage for dedup check, then find card in that same array
    const allCards=STORE.cards||[];
    const target=allCards.find(c=>c.id===cardId);
    if(!target)return;
    if(allCards.find(c=>c.id!==cardId&&c.text.trim().toLowerCase()===text.toLowerCase())){alert(`重复字卡：${text}，已跳过`);return;}
    target.text=text; target.categoryId=catId; target.subcategoryId=subId;
    STORE.cards=allCards; hideModal(); renderCardItems();
  });
}

function showBatchImportModal() {
  const cats=STORE.categories||[],subs=STORE.subcategories||[];
  let curCat=state.selectedCatId||(cats[0]?cats[0].id:'');
  function subOpts(catId){return subs.filter(s=>s.categoryId===catId).map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');}

  showModal(`<h3>批量导入字卡</h3>
    <div class="form-row"><label>每行一条字卡</label><textarea id="mBatchText" rows="8" placeholder="加油！&#10;冲啊！&#10;永不放弃！"></textarea></div>
    <div class="form-row"><label>所属大类</label><select id="mBatchCat">${cats.map(c=>`<option value="${c.id}" ${c.id===curCat?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select></div>
    <div class="form-row"><label>所属小类</label><select id="mBatchSub">${subOpts(curCat)}</select></div>
    <div class="modal-btns"><button class="btn-cancel" onclick="hideModal()">取消</button><button class="btn-primary" id="mBatchOk">确认导入</button></div>`);

  document.getElementById('mBatchCat').addEventListener('change',function(){document.getElementById('mBatchSub').innerHTML=subOpts(this.value);});
  document.getElementById('mBatchOk').addEventListener('click',()=>{
    const raw=document.getElementById('mBatchText').value.trim();
    if(!raw){alert('请输入字卡内容');return;}
    const catId=document.getElementById('mBatchCat').value,subId=document.getElementById('mBatchSub').value;
    if(!catId||!subId){alert('请选择大类和小类');return;}
    const lines=raw.split(/[\n\r]+/).map(l=>l.trim()).filter(l=>l);
    const cards=STORE.cards||[], existing=new Set(cards.map(c=>c.text.trim().toLowerCase()));
    let added=0; const skipped=[];
    lines.forEach(line=>{
      if(existing.has(line.toLowerCase())){skipped.push(line);}
      else{cards.push({id:genId(),text:line,categoryId:catId,subcategoryId:subId,weight:1});existing.add(line.toLowerCase());added++;}
    });
    STORE.cards=cards; hideModal();
    if(skipped.length>0)alert(`导入完成：新增 ${added} 条，跳过重复 ${skipped.length} 条\n重复：${skipped.slice(0,5).join('、')}${skipped.length>5?'…':''}`);
    else alert(`导入完成：新增 ${added} 条`);
    renderCardItems();
  });
}

// ============ Export / Import ============
function exportData() {
  const data={categories:STORE.categories,subcategories:STORE.subcategories,cards:STORE.cards,exportedAt:new Date().toISOString()};
  const filename='梦角字卡库_'+new Date().toISOString().slice(0,10)+'.json';
  const json=JSON.stringify(data,null,2);
  // Android WebView：走原生导出通道（与全量导出一致）
  if (window.AndroidBridge && typeof window.AndroidBridge.exportReady === 'function') {
    try {
      window.__exportData = json;
      var ok = window.AndroidBridge.exportReady(filename);
      if (ok) showToast('✅ 请选择保存位置');
      else { delete window.__exportData; showToast('❌ 导出失败，请重试'); }
    } catch (e) { delete window.__exportData; showToast('❌ 导出失败，请重试'); }
    return;
  }
  // 浏览器：直接下载
  const blob=new Blob([json],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;a.click();
  URL.revokeObjectURL(url);
}

// 字卡库导入核心逻辑（浏览器 FileReader 与 Android 原生分块共用）
function applyCardImport(text) {
  try {
    const data=JSON.parse(text);
    if(!data.categories||!data.cards){alert('导入失败：JSON格式不正确');return;}
    if(!confirm(`即将替换现有字卡数据：\n- ${data.categories.length} 个大类\n- ${(data.subcategories||[]).length} 个小类\n- ${data.cards.length} 条字卡\n\n确定替换吗？`))return;
    STORE.categories=data.categories;STORE.subcategories=data.subcategories||[];STORE.cards=data.cards;
    state.selectedCatId=null;state.selectedSubId=null; renderHeader();
    const body=document.getElementById('fsBody');
    if(body&&state.fsView==='cards')renderCardManager(body);
    alert('导入成功！');
  }catch(err){alert('导入失败：无法解析JSON文件');}
}

function importData(file) {
  const r=new FileReader();
  r.onerror=function(){alert('导入失败：无法读取所选文件，请重新选择');};
  r.onload=function(e){applyCardImport((e.target && e.target.result) || '');};
  r.readAsText(file);
}

function exportAllData() {
  var data = {
    categories: STORE.categories,
    subcategories: STORE.subcategories,
    cards: STORE.cards,
    config: STORE.config,
    messages: STORE.messages,
    moments: STORE.moments,
    likedMoments: STORE.likedMoments,
    diaries: STORE.diaries,
    letters: STORE.letters,
    reviews: STORE.reviews,
    checkins: STORE.checkins,
    checkinWords: STORE.checkinWords,
    dreamEvents: STORE.dreamEvents,
    lastSeen: STORE.lastSeen,
    lastActive: STORE.lastActive,
    savedMessages: STORE.savedMessages,
    periods: STORE.periods,
    periodConfig: STORE.periodConfig,
    exports: STORE.exports,
    memory_library: STORE._read('memory_library'),
    mcard_dream_nonces: STORE._read('mcard_dream_nonces'),
    songCache: STORE.songCache,
    exportedAt: new Date().toISOString()
  };
  var filename = 'mengjiao-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  var json = JSON.stringify(data, null, 2);
  // Android WebView：JSON 存入全局变量，由原生端用 evaluateJavascript 分块拉取写入，
  // 彻底绕开 JS→Java 桥传大字符串（该通道会把大数据传丢导致 0 字节文件）
  if (window.AndroidBridge && typeof window.AndroidBridge.exportReady === 'function') {
    try {
      window.__exportData = json;
      var ok = window.AndroidBridge.exportReady(filename);
      if (ok) showToast('✅ 请选择保存位置');
      else { delete window.__exportData; showToast('❌ 导出失败，请重试'); }
    } catch (e) { delete window.__exportData; showToast('❌ 导出失败，请重试'); }
    return;
  }
  // 浏览器：直接下载
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// 导入核心逻辑：解析并应用备份文本（浏览器 FileReader 与 Android 原生分块共用）
function applyImportData(text) {
  if (!text || !text.trim()) {
    alert('导入失败：文件内容为空，可能读取文件失败');
    return;
  }
  try {
    var data = JSON.parse(text);
    var types = [];
    if (data.categories) types.push('大类');
    if (data.subcategories) types.push('小类');
    if (data.cards) types.push('字卡');
    if (data.config) types.push('设置');
    if (data.messages) types.push('聊天记录');
    if (data.moments) types.push('朋友圈');
    if (data.diaries) types.push('日记');
    if (data.letters) types.push('信件');
    if (data.reviews) types.push('锐评');
    if (data.checkins) types.push('打卡');
    if (data.memory_library) types.push('记忆库');
    if (!confirm('即将导入以下数据：\n' + types.join('、') + '\n\n确定替换吗？')) return;
    if (data.categories) STORE.categories = data.categories;
    if (data.subcategories) STORE.subcategories = data.subcategories;
    if (data.cards) STORE.cards = data.cards;
    if (data.config) STORE.config = data.config;
    if (data.messages) STORE.messages = data.messages;
    if (data.moments) STORE.moments = data.moments;
    if (data.likedMoments) STORE.likedMoments = data.likedMoments;
    if (data.diaries) STORE.diaries = data.diaries;
    if (data.letters) STORE.letters = data.letters;
    if (data.reviews) STORE.reviews = data.reviews;
    if (data.checkins) STORE.checkins = data.checkins;
    if (data.checkinWords) STORE.checkinWords = data.checkinWords;
    if (data.dreamEvents) STORE.dreamEvents = data.dreamEvents;
    if (data.lastSeen) STORE.lastSeen = data.lastSeen;
    if (data.lastActive) STORE.lastActive = data.lastActive;
    if (data.savedMessages) STORE.savedMessages = data.savedMessages;
    if (data.periods) STORE.periods = data.periods;
    if (data.periodConfig) STORE.periodConfig = data.periodConfig;
    if (data.exports) STORE.exports = data.exports;
    if (data.memory_library) STORE._write('memory_library', data.memory_library);
    if (data.mcard_dream_nonces) STORE._write('mcard_dream_nonces', data.mcard_dream_nonces);
    if (data.songCache) STORE.songCache = data.songCache;
    state.selectedCatId = null;
    state.selectedSubId = null;
    state.decayRounds = {};
    state.pendingReactionTimers = {};
    state.pendingCommentTimers = {};
    stopAllDreamEventTimers();
    renderHeader();
    renderMessages();
    var body = document.getElementById('fsBody');
    if (body && state.fsView === 'cards') renderCardManager(body);
    if (body && state.fsView === 'settings') renderSettings(body);
    if (body && state.fsView === 'moments') renderMoments(body);
    if (body && state.fsView === 'diary') renderDiary(body);
    if (body && state.fsView === 'checkin') renderCheckin(body);
    if (body && state.fsView === 'letters') renderLetters(body);
    scheduleTodayEvents();
    updateRedDots();
    alert('导入成功！请刷新页面。');
    location.reload();
  } catch (err) { alert('导入失败：无法解析JSON文件\n' + ((err && err.message) ? err.message : '')); }
}

function importAllData(file) {
  var r = new FileReader();
  r.onerror = function() { alert('导入失败：无法读取所选文件，请重新选择'); };
  r.onload = function(e) { applyImportData((e.target && e.target.result) || ''); };
  r.readAsText(file);
}

// Android 原生导入：原生端分块回传内容（按 __importTarget 分发到字卡库或全量导入）
var __importBuf = '';
var __importTarget = 'all';
window.__importChunk = function(chunk) { if (chunk) __importBuf += chunk; };
window.__importChunksDone = function() {
  var t = __importBuf; __importBuf = '';
  if (window.__importTarget === 'cards') { window.__importTarget = 'all'; applyCardImport(t); }
  else { window.__importTarget = 'all'; applyImportData(t); }
};
window.__importFailed = function(msg) { alert('导入失败：' + (msg || '无法读取所选文件')); };

// ============ Period Tracker ============
function parseLocalDate(str) {
  const parts = str.split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}
function formatDateStr(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

const PERIOD_MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function getPeriodCalendarDotDays() {
  const periods = STORE.periods || [];
  const cfg = STORE.periodConfig || {};
  const cycleLen = cfg.cycleLength || 28;
  const dur = cfg.periodDuration || 5;
  const dots = { period: new Set(), ovulation: new Set(), fertile: new Set() };

  // Mark recorded periods
  periods.forEach(p => {
    const start = parseLocalDate(p.startDate);
    for (let i = 0; i < p.duration; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dots.period.add(formatDateStr(d));
    }
  });

  if (periods.length > 0) {
    // Predict from the most recent period
    const last = periods.reduce((a, b) => a.startDate > b.startDate ? a : b);
    const lastStart = parseLocalDate(last.startDate);
    for (let offset = 1; offset <= 6; offset++) {
      const futureStart = new Date(lastStart);
      futureStart.setDate(futureStart.getDate() + offset * cycleLen);
      const hasRecorded = periods.some(p => Math.abs(parseLocalDate(p.startDate) - futureStart) < 3 * 86400000);
      if (!hasRecorded) {
        for (let i = 0; i < dur; i++) {
          const d = new Date(futureStart);
          d.setDate(d.getDate() + i);
          dots.period.add(formatDateStr(d));
        }
        // Ovulation: cycleLength - 14 days before next period
        const ovDay = new Date(futureStart);
        ovDay.setDate(ovDay.getDate() - 14);
        dots.ovulation.add(formatDateStr(ovDay));
        // Fertile window: 5 days before ovulation + ovulation day
        for (let i = -4; i <= 1; i++) {
          const fd = new Date(ovDay);
          fd.setDate(fd.getDate() + i);
          dots.fertile.add(formatDateStr(fd));
        }
      }
    }
    // Also calculate past ovulation/fertile for display context
    for (let offset = 0; offset >= -6; offset--) {
      const pastStart = new Date(lastStart);
      pastStart.setDate(pastStart.getDate() + offset * cycleLen);
      const ovDay = new Date(pastStart);
      ovDay.setDate(ovDay.getDate() - 14);
      dots.ovulation.add(formatDateStr(ovDay));
      for (let i = -4; i <= 1; i++) {
        const fd = new Date(ovDay);
        fd.setDate(fd.getDate() + i);
        dots.fertile.add(formatDateStr(fd));
      }
    }
  }

  return dots;
}

function getNextPredictedPeriod() {
  const periods = STORE.periods || [];
  if (periods.length === 0) return null;
  const cfg = STORE.periodConfig || {};
  const cycleLen = cfg.cycleLength || 28;
  const last = periods.reduce((a, b) => a.startDate > b.startDate ? a : b);
  const lastStart = parseLocalDate(last.startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Find the next predicted period after today
  for (let offset = 0; offset <= 3; offset++) {
    const predicted = new Date(lastStart);
    predicted.setDate(predicted.getDate() + offset * cycleLen);
    if (predicted >= today) {
      // Check if already recorded
      const ps = formatDateStr(predicted);
      const alreadyRecorded = periods.some(p => p.startDate === ps);
      if (!alreadyRecorded) return predicted;
    }
  }
  return null;
}

function updatePeriodReminder() {
  const el = document.getElementById('ctPeriodReminder');
  if (!el) return;
  const next = getNextPredictedPeriod();
  if (!next) { el.classList.remove('show'); return; }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((next - today) / 86400000);
  if (diffDays >= 1 && diffDays <= 3) {
    el.textContent = '距离经期还有' + diffDays + '天';
    el.classList.add('show');
  } else {
    el.classList.remove('show');
  }
}

function renderPeriodTracker(container) {
  const periods = STORE.periods || [];
  const cfg = STORE.periodConfig || {};
  const today = formatDateStr(new Date());
  const displayMonth = new Date();

  container.innerHTML = ''
    + '<div class="period-form-area">'
    + '  <div class="period-form-row">'
    + '    <label>上次经期</label>'
    + '    <input type="date" id="periodStartDate" value="' + today + '">'
    + '    <label>持续</label>'
    + '    <select id="periodDuration">'
    + '      <option value="3"' + ((cfg.periodDuration === 3) ? ' selected' : '') + '>3天</option>'
    + '      <option value="4"' + ((cfg.periodDuration === 4) ? ' selected' : '') + '>4天</option>'
    + '      <option value="5"' + ((cfg.periodDuration === 5) ? ' selected' : '') + '>5天</option>'
    + '      <option value="6"' + ((cfg.periodDuration === 6) ? ' selected' : '') + '>6天</option>'
    + '      <option value="7"' + ((cfg.periodDuration === 7) ? ' selected' : '') + '>7天</option>'
    + '    </select>'
    + '    <label>周期</label>'
    + '    <select id="periodCycleLen">'
    + '      <option value="21"' + ((cfg.cycleLength === 21) ? ' selected' : '') + '>21天</option>'
    + '      <option value="24"' + ((cfg.cycleLength === 24) ? ' selected' : '') + '>24天</option>'
    + '      <option value="26"' + ((cfg.cycleLength === 26) ? ' selected' : '') + '>26天</option>'
    + '      <option value="28"' + ((cfg.cycleLength === 28) ? ' selected' : '') + '>28天</option>'
    + '      <option value="30"' + ((cfg.cycleLength === 30) ? ' selected' : '') + '>30天</option>'
    + '      <option value="32"' + ((cfg.cycleLength === 32) ? ' selected' : '') + '>32天</option>'
    + '      <option value="35"' + ((cfg.cycleLength === 35) ? ' selected' : '') + '>35天</option>'
    + '    </select>'
    + '  </div>'
    + '  <button class="btn-period-add" id="btnPeriodAdd">＋ 记录经期</button>'
    + '</div>'
    + '<div class="period-calendar-area" id="periodCalendarArea"></div>'
    + '<div class="period-history-area" id="periodHistoryArea"></div>';

  bindPeriodTrackerEvents(container);
  renderPeriodCalendar(container, displayMonth);
  renderPeriodHistory(container);
}

function bindPeriodTrackerEvents(container) {
  container.querySelector('#btnPeriodAdd').addEventListener('click', function () {
    const start = container.querySelector('#periodStartDate').value;
    const dur = parseInt(container.querySelector('#periodDuration').value, 10);
    const cycle = parseInt(container.querySelector('#periodCycleLen').value, 10);
    if (!start) return;
    // Update config
    const cfg = STORE.periodConfig || {};
    cfg.cycleLength = cycle;
    cfg.periodDuration = dur;
    STORE.periodConfig = cfg;
    // Add period
    addPeriodEntry(start, dur);
    // Re-render
    renderPeriodCalendarFull(container);
    renderPeriodHistory(container);
    updatePeriodReminder();
  });
}

function addPeriodEntry(startDate, duration) {
  const periods = STORE.periods || [];
  // Deduplicate: skip if within 2 days of existing
  const start = parseLocalDate(startDate);
  const exists = periods.some(p => Math.abs(parseLocalDate(p.startDate) - start) < 2 * 86400000);
  if (exists) { alert('此日期附近已有经期记录'); return; }
  periods.push({
    id: 'pd_' + Date.now(),
    startDate: formatDateStr(start),
    duration: duration
  });
  periods.sort((a, b) => b.startDate.localeCompare(a.startDate));
  STORE.periods = periods;
}

function editPeriodEntry(id, newStart, newDur) {
  const periods = STORE.periods || [];
  const entry = periods.find(p => p.id === id);
  if (!entry) return;
  entry.startDate = newStart;
  entry.duration = newDur;
  periods.sort((a, b) => b.startDate.localeCompare(a.startDate));
  STORE.periods = periods;
}

function deletePeriodEntry(id) {
  const periods = STORE.periods || [];
  STORE.periods = periods.filter(p => p.id !== id);
}

function renderPeriodCalendar(container, displayMonth) {
  const area = container.querySelector('#periodCalendarArea');
  if (!area) return;
  const dots = getPeriodCalendarDotDays();
  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();

  area.innerHTML = ''
    + '<span class="dt-month" style="display:block;text-align:center;padding:4px 0 8px;">' + year + '年 ' + PERIOD_MONTHS[month] + '</span>'
    + '<div class="calendar-grid" id="periodCalendarGrid"></div>'
    + '<div class="period-cal-legend">'
    + '  <span><span class="period-legend-dot pd"></span>经期</span>'
    + '  <span><span class="period-legend-dot ov"></span>排卵日</span>'
    + '  <span><span class="period-legend-dot ft"></span>易孕期</span>'
    + '</div>';

  // Store displayMonth as ISO string for swipe handler access
  area.dataset.displayMonth = displayMonth.toISOString();

  // Render week headers + calendar grid
  const grid = area.querySelector('#periodCalendarGrid');
  const weekHeaders = ['日', '一', '二', '三', '四', '五', '六'];
  let gridHTML = weekHeaders.map(h => '<div class="cg-hdr">' + h + '</div>').join('');
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  const today = formatDateStr(new Date());

  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const ds = formatDateStr(date);
    const isOtherMonth = date.getMonth() !== month;
    const isToday = ds === today;
    let cls = 'cg-day';
    if (isOtherMonth) cls += ' outside';
    if (isToday) cls += ' today';
    if (dots.period.has(ds)) cls += ' pd-dot';
    else if (dots.ovulation.has(ds)) cls += ' ov-dot';
    else if (dots.fertile.has(ds)) cls += ' ft-dot';
    gridHTML += '<div class="' + cls + '">' + date.getDate() + '</div>';
  }
  grid.innerHTML = gridHTML;

  // Add dot styles for the period calendar (once)
  if (!document.getElementById('period-dot-styles')) {
    const style = document.createElement('style');
    style.id = 'period-dot-styles';
    style.textContent = '.cg-day.pd-dot{background:var(--brand-green)!important;color:#fff!important;font-weight:600} .cg-day.ov-dot{background:var(--brand-orange)!important;color:#fff!important;font-weight:600} .cg-day.ft-dot{background:#FDBF5C!important;color:#fff!important}';
    document.head.appendChild(style);
  }

  // Swipe to change month
  addCalendarSwipe(grid, function (dir) {
    const stored = new Date(area.dataset.displayMonth);
    if (isNaN(stored.getTime())) return;
    stored.setMonth(stored.getMonth() + (dir === 'prev' ? -1 : 1));
    renderPeriodCalendar(container, stored);
  });
}

function renderPeriodCalendarFull(container) {
  const displayMonth = new Date();
  renderPeriodCalendar(container, displayMonth);
}

function renderPeriodHistory(container) {
  const area = container.querySelector('#periodHistoryArea');
  if (!area) return;
  const periods = STORE.periods || [];
  if (periods.length === 0) {
    area.innerHTML = '<div class="period-empty">暂无经期记录，添加第一条开始追踪吧～</div>';
    return;
  }
  area.innerHTML = periods.map(p => {
    const start = parseLocalDate(p.startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + p.duration - 1);
    const startStr = start.getFullYear() + '/' + (start.getMonth() + 1) + '/' + start.getDate();
    const endStr = end.getFullYear() + '/' + (end.getMonth() + 1) + '/' + end.getDate();
    return '<div class="period-entry">'
      + '<div class="pe-info">'
      + '  <div class="pe-date">' + startStr + ' – ' + endStr + '</div>'
      + '  <div class="pe-detail">持续 ' + p.duration + ' 天</div>'
      + '</div>'
      + '<div class="pe-actions">'
      + '  <button class="pe-edit-btn" data-pid="' + p.id + '">✏️</button>'
      + '  <button class="pe-del-btn" data-pid="' + p.id + '">🗑️</button>'
      + '</div></div>';
  }).join('');

  // Bind edit/delete buttons
  area.querySelectorAll('.pe-edit-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const pid = this.dataset.pid;
      const periods = STORE.periods || [];
      const entry = periods.find(p => p.id === pid);
      if (!entry) return;
      const ns = prompt('修改经期开始日期 (YYYY-MM-DD)：', entry.startDate);
      if (!ns) return;
      const nd = prompt('修改持续时间（天数）：', entry.duration);
      if (!nd) return;
      const ndNum = parseInt(nd, 10);
      if (isNaN(ndNum) || ndNum < 1 || ndNum > 14) { alert('请输入1~14之间的天数'); return; }
      editPeriodEntry(pid, ns.trim(), ndNum);
      renderPeriodHistory(container);
      renderPeriodCalendarFull(container);
      updatePeriodReminder();
    });
  });
  area.querySelectorAll('.pe-del-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      if (!confirm('确定删除这条经期记录吗？')) return;
      deletePeriodEntry(this.dataset.pid);
      renderPeriodHistory(container);
      renderPeriodCalendarFull(container);
      updatePeriodReminder();
    });
  });
}

// ============ Message Toast ============
var _toastTimer = null;

function showMessageToast(text) {
  var toast = document.getElementById('msgToast');
  if (!toast) return;
  clearTimeout(_toastTimer);
  var cfg = STORE.config || {};
  var name = cfg.characterName || '梦角';
  var avUrl = cfg.avatarUrl || '';
  var avatarHtml = avUrl
    ? '<img src="' + escapeAttr(avUrl) + '" alt="">'
    : '<span>' + escapeHtml(name.slice(0, 1)) + '</span>';
  toast.innerHTML =
    '<div class="toast-inner">' +
      '<div class="toast-avatar">' + avatarHtml + '</div>' +
      '<div class="toast-text">' + escapeHtml(text) + '</div>' +
    '</div>';
  toast.classList.add('show');
  _toastTimer = setTimeout(function() { toast.classList.remove('show'); }, 6000);
}

function returnToChat() {
  var toast = document.getElementById('msgToast');
  if (toast) toast.classList.remove('show');
  clearTimeout(_toastTimer);
  if (state.fsOpen) closeFullscreen();
  if (state.panelOpen) closePanel();
}

// ============ Sticker Panel ============
function openStickerPanel() {
  document.getElementById('stickerPanel').classList.add('open');
  document.getElementById('stickerOverlay').classList.add('show');
  renderStickerGrid();
}

function closeStickerPanel() {
  document.getElementById('stickerPanel').classList.remove('open');
  document.getElementById('stickerOverlay').classList.remove('show');
}

function sendSticker(dataUrl) {
  addMessage('user', '', Date.now(), dataUrl);
  closeStickerPanel();
  scheduleIndicators(); triggerPassiveReply();
}

function deleteSticker(id) {
  if (!confirm('确定删除这个表情吗？')) return;
  var stickers = STORE.stickers || [];
  STORE.stickers = stickers.filter(function(s) { return s.id !== id; });
  renderStickerGrid();
}

function persistStickers(stickers) {
  return STORE._write('mcard_stickers', stickers);
}

function renderStickerGrid() {
  var grid = document.getElementById('stickerGrid');
  if (!grid) return;
  var stickers = STORE.stickers || [];
  if (stickers.length === 0) {
    grid.innerHTML = '<div class="sticker-empty">暂无表情，点击上方按钮添加</div>';
    return;
  }
  grid.innerHTML = stickers.map(function(s) {
    return '<div class="sticker-item" onclick="sendSticker(\'' + s.dataUrl.replace(/'/g,"\\'") + '\')">'
      + '<img src="' + s.dataUrl + '" alt="表情" loading="lazy">'
      + '<button class="sticker-del" onclick="event.stopPropagation();deleteSticker(\'' + s.id + '\')">✕</button>'
      + '</div>';
  }).join('');
}

function addStickersFromFiles(files) {
  var selected = Array.from(files || []);
  if (!selected.length) return;
  var pending = selected.map(function(f) {
    return compressImage(f, 280, 0.6).then(function(dataUrl) {
      return { dataUrl: dataUrl };
    }, function(error) {
      return { error: error };
    });
  });
  Promise.all(pending).then(function(results) {
    var imageData = results.filter(function(result) { return result.dataUrl; });
    if (!imageData.length) {
      alert('图片没有读取成功，请换一张常见格式的图片再试。');
      return;
    }
    var stickers = STORE.stickers || [];
    var now = Date.now();
    imageData.forEach(function(result, index) {
      stickers.push({ id: 'stk_' + now + '_' + index, dataUrl: result.dataUrl, addedAt: now });
    });
    if (!persistStickers(stickers)) {
      alert('表情没有保存成功，可能是本地存储空间不足。请先到设置清理旧图片或数据后再试。');
      return;
    }
    renderStickerGrid();
    var failed = results.length - imageData.length;
    if (failed) alert('有 ' + failed + ' 张图片没有读取成功，其余表情已添加。');
  }).catch(function(e) { console.error('表情压缩失败:', e); alert('表情添加失败，请重试'); });
}

// ============ Search ============
function openSearch() {
  document.getElementById('searchModal').classList.add('show');
  var inp = document.getElementById('searchInput');
  inp.value = ''; inp.focus();
  document.getElementById('searchResults').innerHTML = '<div class="search-empty">输入关键词搜索聊天记录</div>';
}

function closeSearch() {
  document.getElementById('searchModal').classList.remove('show');
}

function performSearch(query) {
  var area = document.getElementById('searchResults');
  if (!query) { area.innerHTML = '<div class="search-empty">输入关键词搜索聊天记录</div>'; return; }
  var q = query.toLowerCase();
  var messages = STORE.messages || [];
  var av = getAvatarHTML();
  var results = [];
  for (var i = messages.length - 1; i >= 0; i--) {
    var m = messages[i];
    var text = m.text || '';
    if (m.doodle) text = '[涂鸦]';
    if (m.review) text = '[锐评] ' + (m.review.comment||'');
    if (m.recall && m.recall.executed) text = '[消息已撤回]';
    if (!text || text.toLowerCase().indexOf(q) === -1) continue;
    results.push(m);
  }
  if (results.length === 0) {
    area.innerHTML = '<div class="search-empty">没有找到包含 "' + escapeHtml(query) + '" 的消息</div>';
    return;
  }
  var html = '<div class="search-hit-count">共找到 ' + results.length + ' 条</div>';
  results.forEach(function(m) {
    var d = new Date(m.timestamp);
    var dateStr = d.getFullYear() + '年' + (d.getMonth()+1) + '月' + d.getDate() + '日 ' +
      d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
    var isUser = m.type === 'user';
    var text = m.text || '';
    if (m.doodle) text = '[涂鸦]';
    if (m.review) text = '[锐评] ' + (m.review.comment||'');
    if (m.recall && m.recall.executed) text = '[消息已撤回]';
    // Highlight keyword
    var display = escapeHtml(text).replace(new RegExp('(' + escapeRegex(query) + ')', 'gi'), '<span class="sr-highlight">$1</span>');
    html += '<div class="sr-item">'
      + '<div class="sr-avatar">' + (isUser ? av.user : av.char) + '</div>'
      + '<div class="sr-body"><div class="sr-text">' + display + '</div>'
      + '<div class="sr-time">' + dateStr + '</div></div></div>';
  });
  area.innerHTML = html;
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

var _viewportSyncFrame = null;

function revealFocusedDiaryEditor() {
  var active = document.activeElement;
  if (!active || !active.matches('input, textarea') || !active.closest('.diary-full-body')) return;
  active.scrollIntoView({ block:'nearest', inline:'nearest' });
}

function syncAppViewport() {
  var viewport = window.visualViewport;
  var height = viewport ? viewport.height : window.innerHeight;
  var layoutHeight = Math.max(window.innerHeight, document.documentElement.clientHeight);
  document.documentElement.style.setProperty('--app-height', Math.round(height) + 'px');
  document.documentElement.classList.toggle('keyboard-open', !!viewport && layoutHeight - height > 120);
  if (_viewportSyncFrame) cancelAnimationFrame(_viewportSyncFrame);
  _viewportSyncFrame = requestAnimationFrame(revealFocusedDiaryEditor);
}

function bindViewportEvents() {
  syncAppViewport();
  window.addEventListener('resize', syncAppViewport, { passive:true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncAppViewport, { passive:true });
    window.visualViewport.addEventListener('scroll', syncAppViewport, { passive:true });
  }
  document.addEventListener('focusin', function(event) {
    if (event.target.matches('input, textarea')) requestAnimationFrame(revealFocusedDiaryEditor);
  });
}

// ============ Event Bindings ============
function bindEvents() {
  // 💥 Review button
  document.getElementById('btnReview').addEventListener('click',showReviewModal);

  // 🔍 Search button
  document.getElementById('btnSearch').addEventListener('click', openSearch);

  // ☰ → toggle side panel
  document.getElementById('btnMenu').addEventListener('click',()=>{
    if(state.fsOpen){closeFullscreen();}
    else if(state.panelOpen)closePanel();
    else openPanel();
  });

  // Overlay → close side panel
  document.getElementById('menuOverlay').addEventListener('click',closePanel);

  // Side panel close button
  document.getElementById('btnSpClose').addEventListener('click',closePanel);

  // Side panel menu buttons → close panel, open fullscreen
  document.querySelectorAll('.sp-menu .menu-btn').forEach(btn=>{
    btn.addEventListener('click',()=>openFullscreen(btn.dataset.view));
  });

  // Fullscreen back button → return to chat
  document.getElementById('btnBackToChat').addEventListener('click',closeFullscreen);

  // Send message
  function sendMsg(){
    const inp=document.getElementById('msgInput'), text=inp.value.trim();
    if(!text)return;
    addMessage('user',text); inp.value='';inp.style.height='auto';
    scheduleIndicators(); triggerPassiveReply();
  }
  document.getElementById('btnSend').addEventListener('click',sendMsg);
  // 📷 聊天配图
  document.getElementById('btnPhoto').addEventListener('click',function(){
    document.getElementById('chatFileInput').click();
  });
  document.getElementById('chatFileInput').addEventListener('change',function(){
    var file = this.files[0];
    if (!file) return;
    compressImage(file).then(function(dataUrl) {
      addMessage('user', '', Date.now(), dataUrl);
      scheduleIndicators(); triggerPassiveReply();
    }).catch(function(e) { console.error('图片压缩失败:', e); alert('图片处理失败，请重试'); });
    this.value = '';
  });
  // 😊 表情包面板
  document.getElementById('btnSticker').addEventListener('click', openStickerPanel);
  document.getElementById('stickerOverlay').addEventListener('click', closeStickerPanel);
  document.getElementById('btnAddSticker').addEventListener('click', function(){
    document.getElementById('stickerFileInput').click();
  });
  document.getElementById('stickerFileInput').addEventListener('change', function(){
    addStickersFromFiles(this.files);
    this.value = '';
  });
  document.getElementById('msgInput').addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}
  });
  document.getElementById('msgInput').addEventListener('input',function(){
    this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px';
  });

  // 单击梦角消息 → 弹出操作浮层（解读/收藏）；点锐评"解读"按钮仍走原逻辑
  document.getElementById('messagesArea').addEventListener('click',function(e){
    // 锐评按钮：单独处理
    var reviewBtn = e.target.closest('.btn-ai-review');
    if(reviewBtn){
      e.stopPropagation();
      if(!isAIInterpretReady()){alert('请先到「设置 → AI 解读」开启功能并填写 API Key');return;}
      var rid = reviewBtn.dataset.rid;
      var bubble = reviewBtn.closest('.msg-bubble');
      var box2 = bubble ? bubble.querySelector('.ai-box') : null;
      if(!box2) return;
      var reviews = STORE.reviews || [];
      var rv = reviews.find(x => x.id == rid);
      if(!rv) return;
      runAIInterpretOnBox(box2, {
        targetText: rv.comment || '',
        contextMessages: rv.userInput ? [{ role: 'user', content: rv.userInput }] : [],
        scene: 'review',
        loadingText: '解读锐评中'
      });
      return;
    }
    // 单击梦角文本消息行 → 弹浮层
    var row = e.target.closest('.msg-row[data-msg-idx]');
    if(row){
      e.stopPropagation();
      var idx = parseInt(row.dataset.msgIdx);
      // 若浮层已对同一消息显示，则收起（toggle）
      if(_mabIdx === idx){ hideMsgActionBar(); return; }
      showMsgActionBarFor(row, idx);
      return;
    }
    // 点到空白处 → 收起浮层
    if(_mabIdx >= 0) hideMsgActionBar();
  });

  // 浮层按钮：解读/收藏/删除
  var actionBar = document.getElementById('msgActionBar');
  if(actionBar){
    actionBar.querySelector('.mab-interpret').addEventListener('click', mabDoInterpret);
    actionBar.querySelector('.mab-fav').addEventListener('click', mabDoFavorite);
    actionBar.querySelector('.mab-del').addEventListener('click', mabDoDelete);
  }
  // 点浮层自身以外（且非消息区）时收起
  document.addEventListener('click', function(e){
    if(_mabIdx < 0) return;
    if(e.target.closest('#msgActionBar')) return;
    if(e.target.closest('#messagesArea')) return; // 消息区有自己的处理
    hideMsgActionBar();
  });
  // 滚动时收起浮层（避免定位错乱）
  document.getElementById('messagesArea').addEventListener('scroll', function(){
    if(_mabIdx >= 0) hideMsgActionBar();
  }, { passive: true });

  // File import
  document.getElementById('fileImport').addEventListener('change',e=>{
    if(e.target.files[0]){importData(e.target.files[0]);e.target.value='';}
  });

  // Modal overlay
  document.getElementById('modalOverlay').addEventListener('click',function(e){if(e.target===this)hideModal();});

  // 🔍 Search modal events
  document.getElementById('btnSearchClose').addEventListener('click', closeSearch);
  document.getElementById('searchInput').addEventListener('input', function(){ performSearch(this.value.trim()); });
  document.getElementById('searchModal').addEventListener('click', function(e){ if (e.target === this) closeSearch(); });

  // Escape
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      if(document.getElementById('modalOverlay').classList.contains('show')){hideModal();}
      else if(document.getElementById('searchModal').classList.contains('show')){closeSearch();}
      else if(document.getElementById('stickerPanel').classList.contains('open')){closeStickerPanel();}
      else if(state.fsOpen){closeFullscreen();}
      else if(state.panelOpen){closePanel();}
    }
  });

  // ---- Dream Engine: heartbeat-based last-active tracking ----
  // Periodic save every 30s. No visibility/beforeunload hooks —
  // those fire during location.reload() and would overwrite test values.
  let _heartbeatId = null;
  function heartbeatSave() {
    STORE.lastActive = Date.now();
    checkPendingRecalls();
    _heartbeatId = setTimeout(heartbeatSave, 30000);
  }
  // Delay first save by 60s so init() backfill has plenty of time to read
  // the pre-existing value before it gets overwritten.
  _heartbeatId = setTimeout(heartbeatSave, 60000);
}

// ============ Init ============
async function init() {
  try { initDefaults(); } catch(e) { console.error('initDefaults error:', e); }
  try {
    bindViewportEvents();
    bindEvents();
    renderHeader(); renderMessages();
    updateRedDots();
    // 网易云歌单缓存：为空或过期(24h)时静默拉取
    var _sc = STORE.songCache || {};
    if (getNeteaseConfig().enabled && (!_sc.songs || !_sc.songs.length || Date.now() - (_sc.fetchedAt || 0) > 86400000)) {
      setTimeout(function() { refreshSongCache(); }, 3000);
    }
    // Check for recalls that happened during offline period
    checkPendingRecalls();
    // Lazy recall checker: runs on user interaction (faster than 30s heartbeat)
    let _recallCheckThrottle = 0;
    function lazyRecallCheck() {
      const now = Date.now();
      if (now - _recallCheckThrottle < 5000) return;
      _recallCheckThrottle = now;
      checkPendingRecalls();
    }
    document.addEventListener('scroll', lazyRecallCheck, {passive: true});
    document.addEventListener('click', lazyRecallCheck, {passive: true});
    document.addEventListener('keydown', lazyRecallCheck, {passive: true});

    const cats=STORE.categories||[];
    if(cats.length>0)state.selectedCatId=cats[0].id;
    scheduleActive();
    restorePendingReactions();
    recoverPendingCommentReplies();
    revealDueLetterAnnotations(Date.now());
    scheduleLetterAnnotationReveal();
    if (STORE.lastActive) startBackgroundBackfill();
    else {
      STORE.lastActive = Date.now();
      scheduleTodayEvents();
    }
    // Show period reminder if within 3 days
    updatePeriodReminder();
  } catch(e) {
    console.error('Init error:', e);
    alert('初始化出错：'+e.message+'\n请尝试清除浏览器缓存后刷新页面。');
  }
}
document.addEventListener('DOMContentLoaded',init);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js').catch(function(error) {
      console.warn('Service worker registration failed:', error);
    });
  });
}

// 将图片裁剪为朋友圈封面比例，居中取景后再保存，避免只显示左上角
function cropMomentsCover(file, targetWidth, targetHeight) {
  targetWidth = targetWidth || 430;
  targetHeight = targetHeight || 258;
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() {
      var img = new Image();
      img.onload = function() {
        var sourceRatio = img.width / img.height;
        var targetRatio = targetWidth / targetHeight;
        var sw, sh, sx, sy;
        if (sourceRatio > targetRatio) {
          sh = img.height; sw = Math.round(sh * targetRatio); sx = Math.round((img.width - sw) / 2); sy = 0;
        } else {
          sw = img.width; sh = Math.round(sw / targetRatio); sx = 0; sy = Math.round((img.height - sh) / 2);
        }
        var canvas = document.createElement('canvas');
        var scale = Math.min(3, Math.max(1, 1200 / targetWidth));
        canvas.width = Math.round(targetWidth * scale); canvas.height = Math.round(targetHeight * scale);
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.onerror = function() { reject(new Error('图片加载失败')); };
      img.src = reader.result;
    };
    reader.onerror = function() { reject(new Error('文件读取失败')); };
    reader.readAsDataURL(file);
  });
}

// ============ Image Compression ============
function compressImage(file, maxSize, quality) {
  maxSize = maxSize || 1000;
  quality = quality || 0.82;
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() {
      var img = new Image();
      img.onload = function() {
        var w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = function() { reject(new Error('图片加载失败')); };
      img.src = reader.result;
    };
    reader.onerror = function() { reject(new Error('文件读取失败')); };
    reader.readAsDataURL(file);
  });
}

// ============ AI Interpret (字卡解读) ============
// 全局 AbortController：同一时刻只允许一个解读请求，新的请求会取消旧的
var _aiAbortCtrl = null;

// 判断 AI 解读是否已配置可用
function isAIInterpretReady() {
  var ai = (STORE.config || {}).aiInterpret || {};
  return ai.enabled && ai.apiKey && ai.apiUrl;
}

// 取当前 AI 配置（带默认值兜底）
function getAIConfig() {
  var ai = (STORE.config || {}).aiInterpret || {};
  return {
    enabled: !!ai.enabled,
    apiUrl: ai.apiUrl || 'https://api.deepseek.com/v1/chat/completions',
    apiKey: ai.apiKey || '',
    model: ai.model || 'deepseek-chat',
    contextCount: (typeof ai.contextCount === 'number') ? ai.contextCount : 5,
    systemPrompt: ai.systemPrompt || defaultAIInterpret().systemPrompt,
  };
}

// 根据场景拼装系统提示词
function buildAISystemPrompt(scene, cfg) {
  var base = cfg.systemPrompt;
  var userName = (STORE.config||{}).userNickname || '我';
  if (scene === 'moments') {
    return '你扮演梦角本人。下面是你（梦角）发的一条朋友圈，以及你和'+userName+'在评论区的互动。\n' + base;
  }
  if (scene === 'moments-friend') {
    return '你扮演梦角本人。下面是你看到的朋友圈动态（发布者是'+userName+'），以及你和'+userName+'在评论区的互动。\n' + base;
  }
  if (scene === 'moments-comment') {
    return '你扮演梦角本人。下面是一条朋友圈的动态和互动，你（梦角）在其中发表了一条评论。\n' + base;
  }
  if (scene === 'diary') {
    return '你扮演梦角本人。下面是你（梦角）写的日记。\n' + base;
  }
  if (scene === 'letter-annotation') {
    return '你扮演梦角本人。下面是你在一封信上圈出的片段和写下的批注。\n' + base;
  }
  if (scene === 'review') {
    return '你扮演梦角本人。'+userName+'让你对某件事物做"锐评"（打分 + 评语），以下是你的评价。\n' + base;
  }
  return base;
}

// 组装 user 消息内容（含上下文 + 目标文本），按场景不同
function buildAIUserContent(scene, targetText, contextMessages) {
  var userName = (STORE.config||{}).userNickname || '我';
  if (scene === 'chat') {
    var ctx = '';
    if (contextMessages && contextMessages.length > 0) {
      ctx = '\n\n【最近的聊天记录】\n' + contextMessages.map(function(m) {
        return (m.role === "assistant" ? '梦角' : userName) + '：' + m.content;
      }).join('\n');
    }
    return '以下是梦角和' + userName + '的聊天记录。请解读梦角说的这句话：' + targetText + '。' + ctx;
  }
  if (scene === 'moments' || scene === 'moments-friend' || scene === 'moments-comment') {
    var cmts = (contextMessages || []).map(function(m) {
      return '  ' + m.content;
    }).join('\n');
    return '以下是一条朋友圈的动态和评论互动：\n' + (cmts || '（暂无内容）');
  }
  if (scene === 'diary') {
    return '以下是梦角（我）写的日记：\n' + (contextMessages && contextMessages[0] ? contextMessages[0].content : targetText);
  }
  if (scene === 'letter-annotation') {
    return userName + '写给我的信里有这样一段内容。请解读我在下面写下的批注真正想表达的意思：\n' + targetText;
  }
  if (scene === 'review') {
    var reviewed = (contextMessages && contextMessages[0]) ? contextMessages[0].content : '';
    return userName + '让我锐评："' + reviewed + '"。\n我的评价：' + targetText;
  }
  return targetText;
}

/**
 * 发起一次 AI 解读请求（流式）。
 * @param opts { targetText, contextMessages, scene, onResult(chunk), onError(msg), onDone() }
 */
function callAIInterpret(opts) {
  var cfg = getAIConfig();
  if (!cfg.enabled) {
    opts.onError && opts.onError('AI 解读未开启，请到「设置 → AI 解读」中开启。');
    return;
  }
  if (!cfg.apiKey) {
    opts.onError && opts.onError('未配置 API Key，请到「设置 → AI 解读」中填写。');
    return;
  }
  // 取消上一个未完成的请求
  if (_aiAbortCtrl) { try { _aiAbortCtrl.abort(); } catch(e){} }
  _aiAbortCtrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;

  var messages = [
    { role: 'system', content: buildAISystemPrompt(opts.scene, cfg) },
  ];

  // ---- LokulMem: inject recent memories into context ----
  var memories = getMemoryList();
  if (memories.length > 0) {
    var speakerMap = { me: '我', mengjiao: '梦角', general: '共同' };
    var memLines = ['【以下是梦角的历史记忆，供你参考】'];
    var count = 0;
    for (var i = 0; i < memories.length && count < 20; i++) {
      var m = memories[i];
      var label = speakerMap[m.speaker] || m.speaker;
      var dateStr = m.timestamp ? new Date(m.timestamp).toISOString().slice(0, 10) : '';
      memLines.push('[' + dateStr + '] ' + label + '：' + m.content);
      count++;
    }
    messages.push({ role: 'system', content: memLines.join('\n') });
  }

  messages.push({ role: 'user', content: buildAIUserContent(opts.scene, opts.targetText, opts.contextMessages) });

  fetch(cfg.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + cfg.apiKey
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: messages,
      stream: true,
      temperature: 0.85
    }),
    signal: _aiAbortCtrl ? _aiAbortCtrl.signal : undefined
  }).then(function(resp) {
    if (!resp.ok) {
      return resp.text().then(function(t) {
        throw new Error('HTTP ' + resp.status + (t ? ('：' + t.slice(0, 200)) : ''));
      });
    }
    if (!resp.body || !resp.body.getReader) {
      // 浏览器不支持流式读取，降级为一次性读取
      return resp.json().then(function(data) {
        var content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
        opts.onResult && opts.onResult(content);
        opts.onDone && opts.onDone();
      });
    }
    var reader = resp.body.getReader();
    var decoder = new TextDecoder('utf-8');
    var buffer = '';
    function pump() {
      reader.read().then(function(res) {
        if (res.done) { opts.onDone && opts.onDone(); return; }
        buffer += decoder.decode(res.value, { stream: true });
        var lines = buffer.split('\n');
        buffer = lines.pop(); // 保留最后未完整的一行
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line || !line.startsWith('data:')) continue;
          var data = line.slice(5).trim();
          if (data === '[DONE]') { opts.onDone && opts.onDone(); return; }
          try {
            var json = JSON.parse(data);
            var delta = json.choices && json.choices[0] && json.choices[0].delta;
            if (delta && delta.content) {
              opts.onResult && opts.onResult(delta.content);
            }
          } catch(e) { /* 忽略无法解析的行 */ }
        }
        pump();
      }).catch(function(err) {
        if (err.name === 'AbortError') return;
        opts.onError && opts.onError('读取失败：' + err.message);
      });
    }
    pump();
  }).catch(function(err) {
    if (err.name === 'AbortError') return;
    var msg = err.message || String(err);
    if (/Failed to fetch|NetworkError|CORS/i.test(msg)) {
      msg = '网络或跨域(CORS)错误，请检查 API 地址是否支持浏览器跨域，以及 Key 是否正确。';
    }
    opts.onError && opts.onError(msg);
  });
}

// 中止当前正在进行的解读请求（用于页面切换/刷新前清理）
function abortAIInterpret() {
  if (_aiAbortCtrl) { try { _aiAbortCtrl.abort(); } catch(e){} _aiAbortCtrl = null; }
}

// ============ AI 解读：UI 渲染辅助 ============
// 把一个 .ai-box 容器初始化为"加载中"状态，并返回用于喂流式文本的元素
function aiBoxStartLoading(box, loadingText) {
  box.classList.add('show', 'loading');
  box.innerHTML = '<div class="ai-loading"><span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-loading-text">' + escapeHtml(loadingText || '组织语言中') + '</span></div><div class="ai-text"></div>';
  // Reset memory-actions flag so fresh interpretation can save/ignore again
  box._memoryBtnsAdded = false;
  delete box.dataset.aiDecision;
  return box.querySelector('.ai-text');
}

// 把 .ai-box 切换为流式输出态（隐藏 loading，开始 append 文本）
function aiBoxStartStreaming(box) {
  box.classList.remove('loading');
  box.classList.add('streaming');
  var loader = box.querySelector('.ai-loading');
  if (loader) loader.style.display = 'none';
}

// 流式 append 一个 chunk（带打字机光标）
function aiBoxAppend(box, chunk) {
  var textEl = box.querySelector('.ai-text');
  if (!textEl) return;
  textEl.appendChild(document.createTextNode(chunk));
}

// 解读完成：去掉光标，加"重新解读"小按钮
function aiBoxFinish(box) {
  box.classList.remove('streaming', 'loading');
  var textEl = box.querySelector('.ai-text');
  if (textEl && textEl.textContent.trim() === '') {
    textEl.textContent = '（AI 没有返回内容）';
  }
}

// 解读失败：显示错误信息
function aiBoxError(box, msg) {
  box.classList.remove('streaming', 'loading');
  box.classList.add('error');
  box.innerHTML = '<div class="ai-error">❌ ' + escapeHtml(msg) + '</div>';
}

function makeFavoriteKey(sourceType, sourceId, sourceSubId) {
  return String(sourceType || 'message') + '::' + String(sourceId || '') + '::' + String(sourceSubId || '');
}

function getFavoriteKey(fav) {
  if (!fav) return '';
  if (fav.favoriteKey) return fav.favoriteKey;
  if (fav.sourceType && fav.sourceId) return makeFavoriteKey(fav.sourceType, fav.sourceId, fav.sourceSubId);
  if (fav.messageId) return makeFavoriteKey('message', fav.messageId, '');
  return '';
}

function getFavoriteSourceLabel(fav) {
  if (!fav) return '';
  if (fav.sourceLabel) return fav.sourceLabel;
  if (fav.sourceType === 'moment') return '朋友圈';
  if (fav.sourceType === 'moment-comment') return '朋友圈评论';
  if (fav.sourceType === 'diary') return '日记';
  if (fav.sourceType === 'letter-annotation') return '信件批注';
  if (fav.sourceType === 'review') return '锐评';
  return '聊天';
}

function findFavoriteIndexByKey(key) {
  var favorites = STORE.favorites || [];
  for (var i = 0; i < favorites.length; i++) {
    if (getFavoriteKey(favorites[i]) === key) return i;
  }
  return -1;
}

function getAIBoxInterpretation(box) {
  if (!box || !box.classList.contains('show')) return '';
  var textEl = box.querySelector('.ai-text');
  return textEl ? textEl.textContent.trim() : '';
}

function toggleAIFavorite(meta, box) {
  if (!meta || !meta.sourceType || !meta.sourceId) return false;
  var favorites = STORE.favorites || [];
  var key = makeFavoriteKey(meta.sourceType, meta.sourceId, meta.sourceSubId);
  var existIdx = findFavoriteIndexByKey(key);
  if (existIdx >= 0) {
    favorites.splice(existIdx, 1);
    STORE.favorites = favorites;
    return false;
  }
  var interp = getAIBoxInterpretation(box) || meta.interpretation || '';
  favorites.unshift({
    id: genId(),
    favoriteKey: key,
    sourceType: meta.sourceType,
    sourceId: meta.sourceId,
    sourceSubId: meta.sourceSubId || '',
    sourceLabel: meta.sourceLabel || getFavoriteSourceLabel(meta),
    type: meta.sourceType,
    text: meta.text || '',
    interpretation: interp,
    timestamp: Date.now()
  });
  STORE.favorites = favorites;
  return true;
}

function addAIFavoriteButton(box, meta) {
  if (!box || !meta || !meta.sourceType || !meta.sourceId) return;
  var key = makeFavoriteKey(meta.sourceType, meta.sourceId, meta.sourceSubId);
  var row = box.querySelector('.ai-fav-row');
  if (!row) {
    row = document.createElement('div');
    row.className = 'ai-fav-row';
    box.appendChild(row);
  }
  var btn = row.querySelector('.ai-fav-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ai-fav-btn';
    if (meta.sourceType === 'diary') btn.classList.add('btn-fav-diary');
    if (meta.sourceType === 'moment-comment') btn.setAttribute('data-action', 'toggleAIFavoriteComment');
    else btn.setAttribute('data-action', 'toggleAIFavorite');
    row.appendChild(btn);
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleAIFavorite(meta, box);
      refreshAIFavoriteButton(btn, key);
    });
  }
  refreshAIFavoriteButton(btn, key);
}

function refreshAIFavoriteButton(btn, key) {
  var isFaved = findFavoriteIndexByKey(key) >= 0;
  btn.classList.toggle('faved', isFaved);
  btn.textContent = isFaved ? '⭐ 已收藏' : '⭐ 收藏解读';
}

// 触发一次解读，自动管理 .ai-box 的生命周期（loading → streaming → finish/error）
function runAIInterpretOnBox(box, aiOpts) {
  var textEl = aiBoxStartLoading(box, aiOpts.loadingText);
  var scene = aiOpts.scene || 'chat';
  var speaker = 'mengjiao'; // All AI interpretations are from 梦角's perspective
  callAIInterpret({
    targetText: aiOpts.targetText,
    contextMessages: aiOpts.contextMessages,
    scene: scene,
    onResult: function(chunk) {
      if (box.classList.contains('loading')) aiBoxStartStreaming(box);
      aiBoxAppend(box, chunk);
    },
    onDone: function() {
      aiBoxFinish(box);
      if (aiOpts.favoriteMeta) addAIFavoriteButton(box, aiOpts.favoriteMeta);
      // Add memory/ignore buttons after finish
      // addMemoryActionButtons(box, scene, speaker);  // <-- 注释掉，后续需要时取消注释
    },
    onError: function(msg) { aiBoxError(box, msg); }
  });
}

function addMemoryActionButtons(box, scene, speaker) {
  if (box._memoryBtnsAdded) return;
  box._memoryBtnsAdded = true;
  // Check if already decided (ignored or saved)
  var decision = box.dataset.aiDecision;
  if (decision === 'ignored') return;
  if (decision === 'saved') return;

  // Check if this interpretation content was previously ignored (saved in session memory)
  var textEl = box.querySelector('.ai-text');
  if (!textEl) return;
  var content = textEl.textContent.trim();
  if (!content) return;
  if (window._ignoredInterpretations && window._ignoredInterpretations.indexOf(content) >= 0) return;

  var btns = document.createElement('div');
  btns.className = 'ai-memory-btns';
  btns.style.cssText = 'display:flex;gap:8px;margin-top:8px;';

  var saveBtn = document.createElement('button');
  saveBtn.textContent = '✅ 存入记忆';
  saveBtn.style.cssText = 'padding:4px 12px;font-size:12px;border-radius:16px;background:var(--accent);color:#fff;cursor:pointer;border:none;';

  var ignoreBtn = document.createElement('button');
  ignoreBtn.textContent = '❌ 忽略';
  ignoreBtn.style.cssText = 'padding:4px 12px;font-size:12px;border-radius:16px;background:var(--bg-warm);color:var(--text-secondary);cursor:pointer;border:1px solid var(--border);';

  saveBtn.addEventListener('click', function() {
    // Check if already in memory library (prevents duplicate on re-interpret)
    var existing = getMemoryList().filter(function(m) { return m.content === content; });
    if (existing.length > 0) {
      saveBtn.textContent = '已存入 ✓';
      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.6';
      ignoreBtn.disabled = true;
      ignoreBtn.style.opacity = '0.6';
      box.dataset.aiDecision = 'saved';
      return;
    }
    saveMemory({
      content: content,
      speaker: speaker,
      source: 'ai_approved',
      timestamp: new Date().toISOString()
    });
    saveBtn.textContent = '已存入 ✓';
    saveBtn.disabled = true;
    saveBtn.style.opacity = '0.6';
    ignoreBtn.disabled = true;
    ignoreBtn.style.opacity = '0.6';
    box.dataset.aiDecision = 'saved';
  });

  ignoreBtn.addEventListener('click', function() {
    if (!window._ignoredInterpretations) window._ignoredInterpretations = [];
    window._ignoredInterpretations.push(content);
    ignoreBtn.textContent = '已忽略 ✗';
    ignoreBtn.disabled = true;
    ignoreBtn.style.opacity = '0.6';
    saveBtn.disabled = true;
    saveBtn.style.opacity = '0.6';
    box.dataset.aiDecision = 'ignored';
  });

  btns.appendChild(saveBtn);
  btns.appendChild(ignoreBtn);
  box.appendChild(btns);
}

// ============ AI 解读：四个场景的上下文组装 ============

// 聊天：取目标消息前 N 条作为上下文，返回 [{role,content}]
function buildChatContext(targetIdx, contextCount) {
  var messages = STORE.messages || [];
  var ctx = [];
  var start = Math.max(0, targetIdx - contextCount);
  for (var i = start; i < targetIdx; i++) {
    var m = messages[i];
    if (!m) continue;
    // 跳过已撤回、涂鸦、锐评（这些拿不到纯文本）
    if (m.recall && m.recall.executed) continue;
    var content = m.text;
    if (m.doodle) content = '[涂鸦]';
    if (m.review) content = '[锐评：' + (m.review.comment || '') + ']';
    if (!content) continue;
    ctx.push({ role: m.type === 'character' ? 'assistant' : 'user', content: content });
  }
  return ctx;
}

// 朋友圈：动态内容 + 全部评论
function buildMomentContext(moment) {
  var ctx = [];
  (moment.comments || []).forEach(function(c) {
    ctx.push({ role: c.commenter === 'dream' ? 'assistant' : 'user', content: c.content });
  });
  return ctx;
}

// 日记：返回标题+正文作为目标文本
function buildDiaryTarget(diary) {
  return (diary.title ? '【' + diary.title + '】\n' : '') + (diary.content || '');
}

// ============ AI 解读 + 收藏：消息操作浮层 ============
// 全局状态：当前浮层关联的消息 idx（-1 表示无）
var _mabIdx = -1;

function getMsgActionBar() { return document.getElementById('msgActionBar'); }

// 显示浮层并定位到目标消息元素旁
function showMsgActionBarFor(rowEl, idx) {
  var bar = getMsgActionBar(); if (!bar || !rowEl) return;
  _mabIdx = idx;
  // 先显示才能测量尺寸
  bar.classList.add('show');
  var rect = rowEl.getBoundingClientRect();
  var barRect = bar.getBoundingClientRect();
  // 水平居中对齐消息行，限制不超出视口
  var left = rect.left + rect.width / 2 - barRect.width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - barRect.width - 8));
  // 默认在消息上方；若上方空间不足则放下方
  var aboveSpace = rect.top;
  var placeBelow = aboveSpace < barRect.height + 16;
  var top;
  if (placeBelow) { top = rect.bottom + 8; bar.classList.add('below'); }
  else { top = rect.top - barRect.height - 8; bar.classList.remove('below'); }
  bar.style.left = left + 'px';
  bar.style.top = top + 'px';
  // 更新收藏按钮态
  updateMabFavState(idx);
  // 用户消息只显示删除按钮
  var isUser = (STORE.messages || [])[idx] && (STORE.messages || [])[idx].type === 'user';
  var interpBtn = bar.querySelector('.mab-interpret');
  var favBtn = bar.querySelector('.mab-fav');
  if (interpBtn) interpBtn.style.display = isUser ? 'none' : '';
  if (favBtn) favBtn.style.display = isUser ? 'none' : '';
}

function hideMsgActionBar() {
  var bar = getMsgActionBar(); if (!bar) return;
  bar.classList.remove('show', 'below');
  _mabIdx = -1;
}

// 根据当前消息是否已收藏，更新浮层收藏按钮样式
function updateMabFavState(idx) {
  var bar = getMsgActionBar(); if (!bar) return;
  var favBtn = bar.querySelector('.mab-fav');
  if (!favBtn) return;
  var messages = STORE.messages || [];
  var m = messages[idx];
  if (!m) return;
  var key = makeFavoriteKey('message', m.id, '');
  var isFaved = (STORE.favorites || []).some(function(f) { return getFavoriteKey(f) === key || f.messageId === m.id; });
  favBtn.classList.toggle('faved', isFaved);
  favBtn.textContent = isFaved ? '⭐ 已收藏' : '⭐ 收藏';
}

// 触发浮层"解读"按钮
function mabDoInterpret() {
  if (_mabIdx < 0) return;
  var idx = _mabIdx;
  hideMsgActionBar();
  if (!isAIInterpretReady()) {
    alert('请先到「设置 → AI 解读」开启功能并填写 API Key');
    return;
  }
  var messages = STORE.messages || [];
  var m = messages[idx];
  if (!m) return;
  var box = document.querySelector('.msg-row[data-msg-idx="' + idx + '"] .ai-box');
  if (!box) return;
  var cfg = getAIConfig();
  runAIInterpretOnBox(box, {
    targetText: m.text,
    contextMessages: buildChatContext(idx, cfg.contextCount),
    scene: 'chat',
    loadingText: '梦角正在组织语言'
  });
}

// 触发浮层"收藏"按钮
function mabDoFavorite() {
  if (_mabIdx < 0) return;
  var idx = _mabIdx;
  var messages = STORE.messages || [];
  var m = messages[idx];
  if (!m) return;
  var favorites = STORE.favorites || [];
  // 已收藏则取消
  var existIdx = -1;
  for (var i = 0; i < favorites.length; i++) {
    if (favorites[i].messageId === m.id) { existIdx = i; break; }
  }
  if (existIdx >= 0) {
    favorites.splice(existIdx, 1);
    STORE.favorites = favorites;
    updateMabFavState(idx);
    return;
  }
  // 收藏：尽量带上当前已生成的解读结果
  var interp = '';
  var box = document.querySelector('.msg-row[data-msg-idx="' + idx + '"] .ai-box');
  interp = getAIBoxInterpretation(box);
  favorites.unshift({
    id: genId(),
    favoriteKey: makeFavoriteKey('message', m.id, ''),
    sourceType: 'message',
    sourceId: m.id,
    sourceLabel: '聊天',
    messageId: m.id,
    type: 'message',
    text: m.text,
    interpretation: interp,
    timestamp: Date.now()
  });
  STORE.favorites = favorites;
  updateMabFavState(idx);
}

// 删除收藏
function removeFavorite(favId) {
  var favorites = STORE.favorites || [];
  favorites = favorites.filter(function(f) { return f.id !== favId; });
  STORE.favorites = favorites;
  var body = document.getElementById('fsBody');
  if (body && state.fsView === 'favorites') renderFavorites(body);
}

// 浮层"删除消息"按钮
function mabDoDelete() {
  if (_mabIdx < 0) return;
  var idx = _mabIdx;
  hideMsgActionBar();
  var messages = STORE.messages || [];
  var m = messages[idx];
  if (!m) return;
  if (!confirm('确定删除这条消息吗？')) return;
  messages.splice(idx, 1);
  STORE.messages = messages;
  renderMessages();
}

// ============ 收藏夹视图 ============
function renderFavorites(container) {
  var favorites = STORE.favorites || [];
  // 按日期分组（今天/昨天/更早）
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var yesterday = new Date(today.getTime() - 86400000);
  var groups = { '今天': [], '昨天': [], '更早': [] };
  favorites.forEach(function(f) {
    var d = new Date(f.timestamp); d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) groups['今天'].push(f);
    else if (d.getTime() === yesterday.getTime()) groups['昨天'].push(f);
    else groups['更早'].push(f);
  });
  var cfg = STORE.config || {};
  var name = cfg.characterName || '梦角';

  if (favorites.length === 0) {
    container.innerHTML = '<div class="fav-page"><div class="fav-empty">⭐ 暂无收藏<br><br>聊天、朋友圈和日记里的 AI 解读<br>都可以收藏到这里</div></div>';
    return;
  }

  var html = '<div class="fav-page">';
  ['今天', '昨天', '更早'].forEach(function(g) {
    if (groups[g].length === 0) return;
    html += '<div class="fav-group"><div class="fav-group-title">' + g + '</div>';
    groups[g].forEach(function(f) {
      var timeStr = new Date(f.timestamp).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
      var sourceLabel = getFavoriteSourceLabel(f);
      html += '<div class="fav-item">'
        + (sourceLabel ? '<div class="fav-item-source">' + escapeHtml(sourceLabel) + '</div>' : '')
        + '<div class="fav-item-text">' + escapeHtml(f.text) + '</div>'
        + (f.interpretation ? '<div class="fav-item-interp"><div class="fav-item-interp-label">💭 解读</div>' + escapeHtml(f.interpretation) + '</div>' : '')
        + '<div class="fav-item-time">' + timeStr + '</div>'
        + '<button class="fav-del" data-fid="' + f.id + '" title="删除">✕</button>'
        + '</div>';
    });
    html += '</div>';
  });
  html += '</div>';

  container.innerHTML = html;
  // 绑定删除按钮
  container.querySelectorAll('.fav-del').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var fid = this.dataset.fid;
      removeFavorite(fid);
    });
  });
}

// ============ Memory Library Rendering ============
function renderMemoryLibrary(container) {
  var memories = getMemoryList();
  var speakerMap = { me: '我', mengjiao: '梦角', general: '共同背景' };
  var sourceMap = { ai_approved: 'AI审批', manual: '手动导入' };

  var html = '<div class="mem-page">'
    + '<div style="text-align:center;padding:0 0 14px;">'
    + '<button class="btn-mem-import" id="btnMemImport">📥 导入历史记忆</button>'
    + '<span class="mem-import-hint" style="display:block;font-size:11px;color:var(--text-muted);margin-top:6px;">点击弹出导入框，支持我：/梦角：前缀</span>'
    + '</div>';

  if (memories.length === 0) {
    html += '<div class="mem-empty">🧠 暂无记忆</div>';
  } else {
    memories.forEach(function(mem) {
      var speakerLabel = speakerMap[mem.speaker] || mem.speaker;
      var sourceLabel = sourceMap[mem.source] || mem.source;
      var sourceIcon = mem.source === 'manual' ? '📥 ' : '🤖 ';
      var timeStr = mem.timestamp ? new Date(mem.timestamp).toLocaleString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '';
      var speakerCls = mem.speaker === 'me' ? 'speaker-me' : (mem.speaker === 'mengjiao' ? 'speaker-mengjiao' : 'speaker-general');
      var sourceCls = mem.source === 'ai_approved' ? 'source-ai' : 'source-manual';
      html += '<div class="mem-item" data-speaker="' + mem.speaker + '">'
        + '<div class="mem-item-content" title="' + escapeHtml(mem.content) + '">' + escapeHtml(mem.content) + '</div>'
        + '<div class="mem-item-meta">'
        + '<span class="mem-tag ' + speakerCls + '">' + speakerLabel + '</span>'
        + '<span class="mem-tag ' + sourceCls + '">' + sourceIcon + sourceLabel + '</span>'
        + '</div>'
        + '<div class="mem-time">' + timeStr + '</div>'
        + '<div class="mem-item-actions">'
        + '<button class="mem-edit" data-mid="' + mem.id + '" title="编辑">✏️</button>'
        + '<button class="mem-del" data-mid="' + mem.id + '" title="删除">✕</button>'
        + '</div>'
        + '</div>';
    });
  }
  html += '</div>';
  container.innerHTML = html;

  // Bind import button → show modal
  var importBtn = container.querySelector('#btnMemImport');
  if (importBtn) {
    importBtn.addEventListener('click', function() {
      showModal('<h3>📥 导入历史记忆</h3>'
        + '<div class="mem-import-modal">'
        + '<textarea id="memImportText" rows="8" placeholder="每行一条记忆&#10;例如：我：今天去公园散步了&#10;例如：梦角：加油！冲啊！&#10;例如：两个人都喜欢雨天" style="width:100%;border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;font-size:13px;line-height:1.6;background:var(--bg-warm);resize:vertical;box-sizing:border-box;font-family:inherit;"></textarea>'
        + '<div style="font-size:11px;color:var(--text-muted);margin-top:6px;line-height:1.6;">📌 每行一条记忆<br>支持前缀：<b>我：</b>、<b>梦角：</b> —— 或直接输入（视为共同背景）</div>'
        + '<div style="display:flex;align-items:center;gap:10px;margin-top:10px;">'
        + '<button class="btn-primary" id="memImportConfirm" style="padding:8px 20px;">✅ 确认导入</button>'
        + '<span id="memImportStatus" style="font-size:12px;color:var(--brand-green);font-weight:600;"></span>'
        + '</div></div>');

      document.getElementById('memImportConfirm').addEventListener('click', function() {
        var textarea = document.getElementById('memImportText');
        var status = document.getElementById('memImportStatus');
        if (!textarea) return;
        var raw = textarea.value.trim();
        if (!raw) { alert('请输入要导入的记忆内容'); return; }
        var lines = raw.split(/[\n\r]+/).map(function(l) { return l.trim(); }).filter(function(l) { return l; });
        var combined = lines.join("\n");
        saveMemory({ content: combined, speaker: 'general', source: 'manual' });
        if (status) status.textContent = '✅ 成功导入 1 组对话（共 ' + lines.length + ' 条消息）';
        textarea.value = '';
        renderMemoryLibrary(container);
      });
    });
  }

  // Bind delete buttons
  container.querySelectorAll('.mem-del').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var mid = this.dataset.mid;
      if (!confirm('确定删除这条记忆吗？')) return;
      deleteMemory(mid);
      renderMemoryLibrary(container);
    });
  });

  // Bind edit buttons → inline edit
  container.querySelectorAll('.mem-edit').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var mid = this.dataset.mid;
      var memories = getMemoryList();
      var mem = memories.find(function(m) { return m.id === mid; });
      if (!mem) return;

      var item = this.closest('.mem-item');
      if (!item) return;
      var contentDiv = item.querySelector('.mem-item-content');
      if (!contentDiv) return;
      var actions = item.querySelector('.mem-item-actions');
      if (!actions) return;

      // Replace content with textarea
      var origContent = mem.content;
      contentDiv.innerHTML = '<div class="mem-edit-area">'
        + '<textarea class="mem-edit-textarea" rows="3">' + escapeHtml(origContent) + '</textarea>'
        + '<div class="mem-edit-actions">'
        + '<button class="mem-edit-save">保存</button>'
        + '<button class="mem-edit-cancel">取消</button>'
        + '</div></div>';

      // Hide edit/del buttons while editing
      actions.style.display = 'none';

      // Save
      var saveBtn = contentDiv.querySelector('.mem-edit-save');
      if (saveBtn) {
        saveBtn.addEventListener('click', function() {
          var newText = contentDiv.querySelector('.mem-edit-textarea').value.trim();
          if (!newText) { alert('内容不能为空'); return; }
          updateMemory(mid, newText);
          renderMemoryLibrary(container);
        });
      }

      // Cancel
      var cancelBtn = contentDiv.querySelector('.mem-edit-cancel');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
          renderMemoryLibrary(container);
        });
      }
    });
  });
}
