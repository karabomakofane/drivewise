/* =============================================
   data.js
   All static content for DriveWise:
   - Sign arrays for the signs page
   - Rules and lane rules for accordions
   - GAME_SIGNS with lessons, quiz questions,
     and fun facts for celebration cards
   - AI Coach system prompt
   ============================================= */

/* =============================================
   SIGNS PAGE DATA
   ============================================= */
const warningSigns = [
  { icon:'⚠️', shape:'tri', name:'Dangerous Curve',     desc:'Sharp bend ahead — reduce speed significantly.' },
  { icon:'🚸', shape:'tri', name:'Pedestrian Crossing',  desc:'Watch for pedestrians crossing the road.' },
  { icon:'🚧', shape:'tri', name:'Road Works',           desc:'Construction ahead. Reduce speed and be cautious.' },
  { icon:'🦌', shape:'tri', name:'Animals on Road',      desc:'Animals may cross — be prepared to stop.' },
  { icon:'🌊', shape:'tri', name:'Slippery Road',        desc:'Slippery surface — avoid sudden braking.' },
  { icon:'🚂', shape:'tri', name:'Railway Crossing',     desc:'Train track ahead — stop if barriers are down.' },
];

const regulatorySigns = [
  { icon:'STOP', shape:'oct', name:'Stop Sign',        desc:'Mandatory full stop before the line.' },
  { icon:'🚫',   shape:'cir', name:'No Entry',         desc:'Vehicles prohibited from entering.' },
  { icon:'60',   shape:'cir', name:'Speed Limit 60',   desc:'Maximum speed of 60 km/h.' },
  { icon:'⛔',   shape:'cir', name:'No Overtaking',    desc:'Overtaking prohibited in this zone.' },
  { icon:'↩️',   shape:'cir', name:'No U-Turn',        desc:'U-turns not permitted here.' },
  { icon:'🅿️',   shape:'cir', name:'No Parking',       desc:'Parking or stopping prohibited.' },
];

const infoSigns = [
  { icon:'🏥', shape:'rb', name:'Hospital Ahead',  desc:'Medical facility nearby.' },
  { icon:'⛽', shape:'rb', name:'Petrol Station',  desc:'Fuel available at upcoming exit.' },
  { icon:'🛣️', shape:'rg', name:'Freeway Start',   desc:'Freeway begins — different rules apply.' },
  { icon:'🔄', shape:'rg', name:'Detour',          desc:'Road closed — follow the detour route.' },
  { icon:'🅿️', shape:'rb', name:'Parking Area',   desc:'Public parking available ahead.' },
  { icon:'🚌', shape:'rb', name:'Bus Stop',        desc:'Designated bus stop area.' },
];

/* =============================================
   RULES ACCORDION DATA
   ============================================= */
const rulesData = [
  { q:'What is the urban speed limit?',         a:'60 km/h unless otherwise posted. School zones may be reduced to 40 km/h.' },
  { q:'Right of way at a 4-way stop?',          a:'First to arrive goes first. Simultaneous arrival: the vehicle on the right has priority.' },
  { q:'When must you use headlights?',          a:'From 30 minutes after sunset to 30 minutes before sunrise, or when visibility is under 150m.' },
  { q:'What is the blood alcohol limit?',       a:'0.05 g/100ml for ordinary drivers; 0.02 g/100ml for professional and learner drivers.' },
  { q:'When is overtaking prohibited?',         a:'At pedestrian crossings, railway crossings, blind rises, curves, or where signs prohibit it.' },
  { q:'What is a safe following distance?',     a:'3-second gap minimum. Double in rain, fog, or when towing a trailer.' },
  { q:'What to do at a yellow traffic light?',  a:'Stop if it is safe to do so. Do NOT accelerate through it.' },
  { q:'When may you use the emergency lane?',   a:'Only for genuine vehicle breakdowns or signposted freeway peak-traffic use.' },
];

const laneRules = [
  { q:'Keep Left Principle',       a:'Always keep left unless overtaking or turning right. It is the law in South Africa.' },
  { q:'When to use the right lane', a:'The right lane is for overtaking only. Return to the left lane immediately after passing.' },
  { q:'What lane markings mean',   a:'Broken white = may change lanes when safe. Solid white = no lane change. Double yellow = no overtaking in either direction.' },
  { q:'Changing lanes safely',     a:'Follow MSPSL: check mirrors, indicate for 3+ seconds, position, adjust speed, check blind spot, then move.' },
];

/* =============================================
   GAME SIGNS
   Each sign has:
   - id, label, emoji, color
   - action   (brake / slow / normal)
   - points   awarded for correct reaction
   - msg      shown in the feedback bar
   - warning  shown in the mid-game warning flash
   - fact     shown in the celebration card
   - lesson   title + body for crash quiz
   - questions array of 3 quiz questions
   ============================================= */
const GAME_SIGNS = [
  {
    id:     'stop',
    label:  'STOP',
    emoji:  '🛑',
    color:  '#c0392b',
    action: 'brake',
    points: 30,
    msg:    'STOP sign! You must brake!',

    /* Mid-game warning flash — shown 2s before obstacle reaches player */
    warning: {
      action: 'BRAKE NOW',
      tip:    'Complete stop required by law',
      color:  '#c0392b',
    },

    /* Fun fact shown in celebration card on correct reaction */
    fact: '🇿🇦 The STOP sign is the only 8-sided sign in South Africa. Its shape was chosen so drivers can recognise it even when it is obscured by snow or dirt — a design used since 1954.',

    lesson: {
      title: 'The STOP Sign',
      body:  `A <strong>STOP sign</strong> is a <strong>red octagon</strong> — the only 8-sided sign on South African roads.\n\nThe law requires a <strong>complete stop</strong> behind the stop line before proceeding. A rolling stop is illegal — even if the road appears clear.\n\n<strong>Correct action:</strong> Brake fully, wait for a safe gap, then proceed.`,
    },
    questions: [
      { q:'What shape is a STOP sign?',                  opts:['Circle','Triangle','Octagon (8-sided)','Rectangle'],                                                              ans:2, exp:'A STOP sign is an octagon — 8 sides. It is the only 8-sided sign in South Africa.' },
      { q:'A rolling slow-down at a STOP sign is...',    opts:['Acceptable if no cars are coming','Legal at quiet intersections','Illegal — a complete stop is required','Only required at night'], ans:2, exp:'A complete stop is mandatory by law regardless of conditions. A rolling stop is a criminal offence.' },
      { q:'What action does a STOP sign require in the game?', opts:['Steer left to dodge','Maintain speed','Press ↓ or SPACE to brake','Accelerate to clear quickly'],          ans:2, exp:'Press ↓ or SPACE to brake immediately. Fast reactions earn bonus points.' },
    ],
  },
  {
    id:     'warning',
    label:  'WARNING',
    emoji:  '⚠️',
    color:  '#e05c4b',
    action: 'slow',
    points: 20,
    msg:    'Warning sign! Reduce your speed!',

    warning: {
      action: 'SLOW DOWN',
      tip:    'Hazard ahead — ease off the accelerator',
      color:  '#e05c4b',
    },

    fact: '⚠️ South Africa has over 14,000 road fatalities per year. Most happen on open roads where warning signs are ignored. Slowing down by just 10 km/h reduces crash severity by 40%.',

    lesson: {
      title: 'Warning Signs (Red Triangle)',
      body:  `<strong>Warning signs</strong> are red equilateral triangles. They alert you to a <strong>hazard ahead</strong> — curves, roadworks, slippery surfaces, pedestrians, or animals.\n\nYou must <strong>reduce your speed</strong> and be prepared to stop. Ignoring a warning sign makes you criminally liable.\n\n<strong>Correct action:</strong> Ease off the accelerator, reduce speed, stay alert.`,
    },
    questions: [
      { q:'What colour and shape are warning signs?',               opts:['Blue rectangle','Red octagon','Red triangle with white background','Yellow circle'],                    ans:2, exp:'Warning signs are red equilateral triangles with a white or yellow background.' },
      { q:'What action is required when you see a warning sign?',   opts:['Maintain speed — they are advisory only','Reduce speed and prepare to stop','Come to a complete stop','Increase speed to pass faster'], ans:1, exp:'Reduce speed and prepare to stop. Slowing gives you time to react safely.' },
      { q:'In the game, a WARNING sign requires you to:',           opts:['Do nothing','Steer right','Hold ↓ or SPACE to slow down','Hoot and continue'],                       ans:2, exp:'Hold ↓ or SPACE when you see a WARNING sign. Braking completely also counts.' },
    ],
  },
  {
    id:     'pedestrian',
    label:  'PEDESTRIAN',
    emoji:  '🚸',
    color:  '#f5a623',
    action: 'slow',
    points: 20,
    msg:    'Pedestrian crossing! Slow down!',

    warning: {
      action: 'SLOW DOWN',
      tip:    'Pedestrians have right of way',
      color:  '#f5a623',
    },

    fact: '🚶 In South Africa, a pedestrian is struck by a vehicle every 20 minutes. Marked crossings only help when drivers slow down. Yielding to pedestrians is not just polite — it is the law.',

    lesson: {
      title: 'Pedestrian Crossing Sign',
      body:  `The <strong>pedestrian crossing sign</strong> warns that a marked crossing is ahead. Pedestrians have <strong>right of way</strong> at all marked crossings.\n\nFailing to yield can result in injury, criminal charges, and licence suspension.\n\n<strong>Correct action:</strong> Reduce speed. If a pedestrian is crossing or waiting, stop completely.`,
    },
    questions: [
      { q:'Who has right of way at a marked pedestrian crossing?',          opts:['Vehicles always have priority','Pedestrians — you must yield','Only cyclists','Only if traffic lights are present'], ans:1, exp:'Pedestrians have right of way at all marked crossings.' },
      { q:'A pedestrian is waiting at the kerb. You must:',                 opts:['Hoot to warn them and continue','Speed up to pass before they step out','Slow down and stop to let them cross','Only stop if a traffic officer is present'], ans:2, exp:'Stop to let them cross safely.' },
      { q:'In the game, a PEDESTRIAN sign requires:',                       opts:['Full stop (brake)','Slow down — hold ↓','Swerve left','No action needed'],                   ans:1, exp:'Hold ↓ or SPACE to slow down.' },
    ],
  },
  {
    id:     'railway',
    label:  'RAILWAY',
    emoji:  '🚂',
    color:  '#7f8c8d',
    action: 'brake',
    points: 30,
    msg:    'Railway crossing! Brake now!',

    warning: {
      action: 'BRAKE NOW',
      tip:    'Never race the barriers',
      color:  '#7f8c8d',
    },

    fact: '🚂 A fully loaded freight train at 80 km/h needs over 1 kilometre to stop — that is 14 football fields. The train driver can see you but cannot stop. You must always stop for the train.',

    lesson: {
      title: 'Railway Level Crossing',
      body:  `A freight train at 80 km/h needs <strong>over 1 kilometre</strong> to stop.\n\n<strong>Rules:</strong>\n• Stop if barriers are down or lights are flashing\n• Never race the barriers\n• Never stop on the tracks\n\n<strong>Correct action:</strong> Brake, check both directions, proceed only when completely safe.`,
    },
    questions: [
      { q:'How far does a freight train at 80 km/h need to stop?', opts:['About 50 metres','About 200 metres','Over 1 kilometre','Trains can stop instantly'],                  ans:2, exp:'A freight train at 80 km/h needs over 1 km to stop.' },
      { q:'The railway barriers are coming down. What should you do?', opts:['Speed up to cross before they close','Stop before the barriers and wait','Hoot and proceed slowly','Drive around the barriers'], ans:1, exp:'Stop before the barriers. Never race them.' },
      { q:'In the game, a RAILWAY sign requires:',                    opts:['Steer right','Slow slightly','Full brake — press ↓ or SPACE','No action'],                        ans:2, exp:'Railway crossings need a full brake action.' },
    ],
  },
  {
    id:     'animals',
    label:  'ANIMALS',
    emoji:  '🦌',
    color:  '#795548',
    action: 'slow',
    points: 20,
    msg:    'Animals on road! Slow down!',

    warning: {
      action: 'SLOW DOWN',
      tip:    'Brake straight — never swerve',
      color:  '#795548',
    },

    fact: '🦌 Swerving to avoid an animal causes more deaths than hitting the animal. At speed, a sharp swerve can flip your vehicle. Always brake in a straight line and only steer if you have full control.',

    lesson: {
      title: 'Animals on Road Sign',
      body:  `Animals are unpredictable and most active at <strong>dawn and dusk</strong>.\n\n<strong>Correct action:</strong> Reduce speed significantly. If an animal appears, <strong>brake in a straight line</strong> — never swerve sharply.`,
    },
    questions: [
      { q:'When are animals most likely to be on the road?',        opts:['Midday','Dawn and dusk','Only in winter','Only near farms'],                                          ans:1, exp:'Animals are most active at dawn and dusk.' },
      { q:'An animal suddenly appears. The safest response is:',   opts:['Swerve sharply to avoid it','Brake in a straight line','Speed up to pass before it moves','Hoot and continue'], ans:1, exp:'Brake in a straight line. Swerving can cause rollover.' },
      { q:'In the game, an ANIMALS sign requires:',                 opts:['Steer left','Hold ↓ to slow down','Full stop','No action'],                                          ans:1, exp:'Hold ↓ or SPACE to slow down.' },
    ],
  },
  {
    id:     'clear',
    label:  'CLEAR',
    emoji:  '✅',
    color:  '#2e7d32',
    action: 'normal',
    points: 10,
    msg:    'Road clear — maintain normal speed.',

    warning: {
      action: 'MAINTAIN SPEED',
      tip:    'No hazard — stay alert and scan ahead',
      color:  '#2e7d32',
    },

    fact: '✅ Studies show that drivers who scan the road 12–15 seconds ahead have 35% fewer accidents. Your eyes should be constantly moving — mirrors, road ahead, mirrors again every 5–8 seconds.',

    lesson: {
      title: 'Clear Road / Normal Driving',
      body:  `"Clear" never means "switch off." Good drivers always scan:\n\n• Check mirrors every 5–8 seconds\n• Scan 12–15 seconds of road ahead\n\n<strong>Correct action:</strong> Maintain normal, legal speed. Drive smoothly.`,
    },
    questions: [
      { q:'How often should you check mirrors on a clear road?',    opts:['Every 30 seconds','Only when turning','Every 5–8 seconds','Only when changing lanes'],               ans:2, exp:'Check mirrors every 5–8 seconds.' },
      { q:'A green CLEAR sign appears. The correct reaction is:',   opts:['Brake hard','Steer left','Maintain normal speed — no action needed','Speed up for bonus points'],   ans:2, exp:'No braking needed. Smooth, controlled driving is correct.' },
      { q:'"Scanning 12–15 seconds ahead" means:',                  opts:['Looking 12 metres ahead','Checking mirrors 15 times','Looking as far as you will travel in 12–15 seconds','Using a 15-second countdown'], ans:2, exp:'At 60 km/h that equals about 200–250 metres ahead.' },
    ],
  },
];

/* =============================================
   AI COACH SYSTEM PROMPT
   ============================================= */
const COACH_SYSTEM = `You are Coach Thabo, a friendly but firm South African driving instructor and K53 road safety expert. You analyse a learner driver's simulator performance and give short, punchy, personalised feedback.

Rules:
- Address them as "driver"
- Reference their EXACT stats — score, reaction time, mistakes, which specific signs they failed
- Be encouraging but honest — if they did badly, say so directly
- Give exactly 2 specific actionable tips based on their actual mistakes
- End with one short motivational sentence
- Keep total response under 110 words
- Use natural South African English — warm but direct
- Write in flowing sentences, no bullet points or lists`;