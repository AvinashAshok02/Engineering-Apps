/* Chapter: Engines. Animated cutaways of six air-breathing engines. */
(() => {
"use strict";
const { at, clamp, fmt } = App;
/* ---------- engine definitions ----------
   x runs 0 (front) to 1 (back). y is radius for mirrored (round) engines,
   signed height for the scramjet. Profiles are [[x, value], ...]. */

// Turbojet
const TJ = (() => {
  const D = [[0,.165],[.12,.165],[.42,.14],[.45,.17],[.58,.17],[.6,.155],[.68,.165],[.88,.165],[.94,.125],[1,.145]];
  const SK = [[0,.18],[.03,.195],[.9,.195],[1,.16]];
  const HUB = [[0,0],[.005,.02],[.05,.055],[.12,.07],[.42,.105],[.45,.055],[.58,.055],[.6,.075],[.68,.085],[.8,0],[1,0]];
  const rows = [];
  [.145,.18,.215,.25,.285,.32,.355,.39].forEach((x,i) => rows.push({type:"row", x, w:.016, lo:HUB, hi:D, rotor:i%2===0, group:"hp"}));
  [.607,.628,.649,.67].forEach((x,i) => rows.push({type:"row", x, w:.014, lo:HUB, hi:D, rotor:i%2===1, group:"hp"}));
  return {
    id:"turbojet", name:"Turbojet", tabNote:"M0–3", mirror:true, vref:200,
    cond:"Sea-level take-off, full afterburner",
    solids:[{lo:D, hi:SK, x0:0, x1:1, tone:"case"}, {lo:0, hi:HUB, x0:0, x1:.8, tone:"hub"}],
    channels:[{lo:HUB, hi:D, w:1, main:true,
      T:[[0,288],[.12,292],[.42,610],[.45,620],[.5,1400],[.58,1400],[.68,1060],[.72,1060],[.77,1900],[.9,1950],[1,1250]],
      P:[[0,1],[.12,1.02],[.42,12],[.58,11.4],[.68,4.2],[.88,3.9],[.94,2],[1,1]],
      V:[[0,150],[.12,170],[.42,120],[.45,60],[.58,140],[.68,280],[.74,260],[.88,420],[.94,620],[1,1050]]}],
    parts:[
      ...rows,
      {type:"shaft", x0:.05, x1:.67, r:.02, group:"hp"},
      {type:"combustor", x0:.455, x1:.575, lo:.07, hi:.155},
      {type:"vgutter", x:.74, r:[.06,.12]},
      {type:"injector", x:.725, r:[.04,.09,.14]},
      {type:"flame", x0:.75, x1:.99, lo:0, hi:[[.75,.15],[.88,.16],[.94,.12],[1,.14]], k:.9}
    ],
    steps:[
      {title:"Turbojet", overview:true, tagline:"The original jet engine. Every gram of air goes through the hot core, and all of the thrust comes from one fast, hot jet.",
        body:"<p>A turbojet is a gas turbine in its simplest form: compress the air, burn fuel in it, let the hot gas spin a turbine that keeps the compressor running, and blast what is left out of a nozzle. It is loud and thirsty at low speed, but its fast exhaust keeps working at Mach 2 and beyond, where slower-jet engines run out of push.</p>",
        facts:[["Speed range","Mach 0 to about 3"],["Thrust from","100% core jet"],["Pressure ratio","About 12 : 1"],["Seen on","Concorde (Olympus 593), F-104 (J79), cruise missiles"]],
        at:"Leaving the nozzle"},
      {title:"Intake", stn:"0 → 2", x:[0,.12],
        body:"<p>The intake's job is to hand the compressor smooth, even air at about Mach 0.5, whatever the aircraft is doing. At take-off it pulls air in; in supersonic flight it has to slow the air down, and that slowing already raises the pressure a little.</p>"},
      {title:"Axial compressor", stn:"2 → 3", x:[.12,.43],
        body:"<p>Rows of spinning rotor blades push the air backwards and speed it up. Between them, fixed stator vanes turn the flow and slow it, which converts that speed into pressure. Eight or more stage pairs take the pressure to around twelve times ambient.</p><p>Squeezing air heats it. It leaves the compressor near 600 K (about 330 °C) before any fuel is burned.</p>",
        hint:"Watch the annulus narrow: the same air takes less room as its density climbs."},
      {title:"Combustor", stn:"3 → 4", x:[.43,.59],
        body:"<p>Fuel is sprayed into the compressed air and burns continuously at almost constant pressure. Only about a quarter of the air takes part in the flame; the rest flows around the liner and is mixed in afterwards to cool the gas down to something the turbine can survive, around 1,400 K.</p>"},
      {title:"Turbine", stn:"4 → 5", x:[.59,.69],
        body:"<p>The hot gas expands through the turbine and spins it. The turbine sits on the same shaft as the compressor, so this is where the engine pays for its own compression. In a turbojet it takes only what the compressor needs; the leftover pressure and heat go on to make thrust.</p>"},
      {title:"Afterburner", stn:"5 → 7", x:[.69,.88],
        body:"<p>The gas leaving the turbine still holds plenty of unburned oxygen. Spray bars inject more fuel straight into the jet pipe and V-shaped flame holders keep it alight. The gas reaches close to 2,000 K, adding up to half again as much thrust, at the cost of roughly three times the fuel flow.</p>"},
      {title:"Nozzle", stn:"7 → 9", x:[.88,1],
        body:"<p>A converging-diverging nozzle squeezes the flow to Mach 1 at the throat, then lets it expand and accelerate to supersonic speed, around 1,000 m/s on afterburner. Thrust is the mass of air per second multiplied by how much faster it leaves than it arrived.</p>", next:true}
    ]
  };
})();

// Turbofan
const TF = (() => {
  const NI = [[0,.3],[.1,.3],[.2,.29],[.45,.27],[.58,.245]];
  const NO = [[0,.305],[.02,.33],[.12,.345],[.4,.33],[.58,.25]];
  const CCo = [[.17,.125],[.24,.155],[.5,.155],[.7,.145],[.86,.105]];
  const CCi = [[.17,.12],[.27,.112],[.44,.088],[.46,.115],[.56,.115],[.62,.112],[.76,.13],[.86,.1]];
  const HUB = [[0,0],[.01,.02],[.06,.06],[.12,.075],[.17,.08],[.27,.082],[.44,.075],[.46,.05],[.56,.05],[.6,.065],[.62,.07],[.76,.078],[.95,0],[1,0]];
  const coreHi = [[0,.125],[.17,.12], ...CCi.slice(1), [1,.1]];
  const bypLo = [[0,.125], ...CCo, [1,.1]];
  const bypHi = [...NI, [.7,.235], [1,.225]];
  const rows = [{type:"row", x:.1, w:.03, lo:HUB, hi:NI, rotor:true, group:"lp"},
                {type:"row", x:.25, w:.014, lo:CCo, hi:NI, rotor:false}];
  [.19,.215,.24].forEach((x,i) => rows.push({type:"row", x, w:.014, lo:HUB, hi:CCi, rotor:i%2===0, group:"lp"}));
  [.29,.315,.34,.365,.39,.415,.435].forEach((x,i) => rows.push({type:"row", x, w:.013, lo:HUB, hi:CCi, rotor:i%2===0, group:"hp"}));
  [.57,.59].forEach((x,i) => rows.push({type:"row", x, w:.014, lo:HUB, hi:CCi, rotor:i===1, group:"hp"}));
  [.63,.655,.68,.705,.73].forEach((x,i) => rows.push({type:"row", x, w:.014, lo:HUB, hi:CCi, rotor:i%2===0, group:"lp"}));
  return {
    id:"turbofan", name:"Turbofan", tabNote:"M0–0.9", mirror:true, vref:200,
    cond:"Sea-level take-off, high-bypass airliner engine",
    solids:[{lo:NI, hi:NO, x0:0, x1:.58, tone:"nacelle"}, {lo:CCi, hi:CCo, x0:.17, x1:.86, tone:"case"}, {lo:0, hi:HUB, x0:0, x1:.95, tone:"hub"}],
    channels:[
      {name:"bypass", lo:bypLo, hi:bypHi, w:.72,
        T:[[0,288],[.08,288],[.12,330],[1,325]], P:[[0,1],[.08,.97],[.12,1.5],[.5,1.45],[.58,1],[1,1]],
        V:[[0,170],[.08,190],[.12,170],[.22,180],[.45,220],[.58,300],[1,300]]},
      {name:"core", lo:HUB, hi:coreHi, w:.28, main:true,
        T:[[0,288],[.08,288],[.12,330],[.17,335],[.27,420],[.44,880],[.47,900],[.53,1900],[.56,1880],[.62,1300],[.76,860],[1,820]],
        P:[[0,1],[.08,.97],[.12,1.5],[.17,1.5],[.27,3.6],[.44,45],[.56,43],[.62,11],[.76,1.7],[.86,1.3],[1,1]],
        V:[[0,170],[.08,190],[.12,170],[.27,150],[.44,110],[.47,60],[.56,150],[.62,250],[.76,300],[.86,420],[1,450]]}
    ],
    parts:[
      ...rows,
      {type:"shaft", x0:.29, x1:.6, r:.028, group:"hp"},
      {type:"shaft", x0:.1, x1:.74, r:.014, group:"lp"},
      {type:"combustor", x0:.465, x1:.555, lo:.058, hi:.108}
    ],
    steps:[
      {title:"Turbofan", overview:true, tagline:"A turbojet wrapped around a giant fan. Most of the air never goes near the flame.",
        body:"<p>Pushing a lot of air gently is more efficient than pushing a little air hard. A modern airliner turbofan sends roughly ten times as much air around the core as through it. That cool bypass stream makes most of the thrust and most of the quiet.</p><p>Two shafts spin at different speeds: a slow low-pressure spool (teal) for the fan, and a fast high-pressure spool (amber) for the core compressor.</p>",
        facts:[["Speed range","Mach 0 to 0.9 (low-bypass fighter versions reach Mach 2+)"],["Thrust from","About 80% fan, 20% core jet"],["Bypass ratio","About 10 : 1"],["Pressure ratio","40 to 60 : 1 overall"],["Seen on","A320neo (LEAP-1A), 787 (GEnx), 777X (GE9X)"]],
        at:"Leaving the core nozzle"},
      {title:"Fan", stn:"2 → 13", x:[.06,.14],
        body:"<p>The fan is a single huge rotor, over 3 m across on the biggest engines, with blade tips moving faster than sound. It raises pressure by only about 1.5 times, but on an enormous mass of air: well over a tonne per second at take-off.</p><p>Behind the fan the flow splits. The inner part feeds the core; the outer part goes down the bypass duct.</p>"},
      {title:"Bypass duct", stn:"13 → 19", x:[.14,.6], ch:"bypass", probe:.58,
        body:"<p>Outlet guide vanes take the swirl out of the fan stream, and the duct carries it straight to its own nozzle. It leaves at roughly 300 m/s and barely warmer than the outside air. This cold stream makes about four-fifths of the thrust.</p>"},
      {title:"Booster", stn:"21 → 25", x:[.17,.27],
        body:"<p>The low-pressure compressor, or booster, sits on the same slow shaft as the fan. A few stages more than double the core air's pressure before handing it to the high-pressure compressor.</p>"},
      {title:"High-pressure compressor", stn:"25 → 3", x:[.27,.45],
        body:"<p>Nine to eleven stages on a separate, faster shaft. Small blades have to spin fast to do useful work, so the high-pressure spool turns several times quicker than the fan.</p><p>By the last stage the air is at around 45 times ambient pressure and about 900 K, hot enough to glow faintly in the dark, before any fuel is added.</p>"},
      {title:"Combustor", stn:"3 → 4", x:[.45,.56],
        body:"<p>A ring-shaped (annular) combustor burns fuel in the compressed air. Gas enters the turbine at around 1,900 K, hotter than the melting point of the nickel alloys the turbine blades are made of. They survive on single-crystal metal, ceramic thermal-barrier coatings, and cool air bled from the compressor and blown out through hundreds of tiny holes as a protective film.</p>"},
      {title:"High-pressure turbine", stn:"4 → 45", x:[.56,.62],
        body:"<p>One or two stages take the hottest gas and drive the high-pressure compressor through the outer of the two concentric shafts. These are the most stressed parts in the engine: red-hot, spinning at over 10,000 rpm, each blade pulling tonnes of centrifugal load.</p>"},
      {title:"Low-pressure turbine", stn:"45 → 5", x:[.62,.77],
        body:"<p>Several larger, slower stages extract most of the remaining energy and send it forward to the fan through a thin shaft that runs inside the high-pressure shaft. Geared turbofans add a gearbox here so the fan can turn slower than the turbine, letting each run at its best speed.</p>"},
      {title:"Core nozzle", stn:"5 → 9", x:[.77,1],
        body:"<p>What comes out of the core is only moderately fast, around 450 m/s, because the turbines have already taken most of its energy to drive the fan. A slower jet wastes less energy as leftover speed in the wake, which is why turbofans burn much less fuel than turbojets at airliner speeds.</p>", next:true}
    ]
  };
})();

// Turboprop
const TP = (() => {
  const D = [[0,.14],[.1,.14],[.14,.13],[.2,.125],[.32,.105],[.34,.11],[.4,.15],[.44,.15],[.56,.15],[.59,.13],[.72,.14],[.82,.15],[.92,.15]];
  const HUB = [[0,0],[.01,.03],[.05,.07],[.1,.085],[.14,.088],[.2,.075],[.32,.08],[.34,.075],[.4,.11],[.42,.1],[.44,.05],[.56,.05],[.59,.075],[.72,.085],[.84,.06],[.92,0],[1,0]];
  const SK = [[0,.14],[.06,.17],[.12,.18],[.8,.18],[.92,.16]];
  const rows = [];
  [.21,.24,.27,.3].forEach((x,i) => rows.push({type:"row", x, w:.014, lo:HUB, hi:D, rotor:i%2===0, group:"hp"}));
  [.575,.6].forEach((x,i) => rows.push({type:"row", x, w:.014, lo:HUB, hi:D, rotor:i===1, group:"hp"}));
  [.64,.665,.69,.715].forEach((x,i) => rows.push({type:"row", x, w:.014, lo:HUB, hi:D, rotor:i%2===1, group:"lp"}));
  return {
    id:"turboprop", name:"Turboprop", tabNote:"M0–0.65", mirror:true, vref:90,
    cond:"Sea-level take-off, regional airliner engine",
    solids:[{lo:D, hi:SK, x0:.06, x1:.92, tone:"nacelle"}, {lo:0, hi:HUB, x0:0, x1:.92, tone:"hub"}],
    channels:[
      {name:"prop", lo:[[0,.17],[.06,.18],[.12,.19],[.92,.19],[1,.18]], hi:[[0,.42],[.05,.42],[.2,.37],[1,.35]], w:.6,
        T:[[0,288],[.04,288],[.06,291],[1,291]], P:[[0,1],[.035,.97],[.06,1.08],[.2,1.03],[1,1]], V:[[0,60],[.035,65],[.07,95],[.3,100],[1,100]]},
      {name:"core", lo:HUB, hi:D, w:.4, main:true,
        T:[[0,288],[.14,290],[.32,480],[.42,650],[.45,660],[.5,1350],[.56,1380],[.59,1120],[.62,1100],[.72,860],[1,820]],
        P:[[0,1],[.14,1.02],[.32,4],[.42,12],[.56,11.5],[.59,4.2],[.62,4],[.72,1.15],[1,1]],
        V:[[0,60],[.14,120],[.32,110],[.42,90],[.45,50],[.56,120],[.6,220],[.72,180],[.84,110],[1,100]]}
    ],
    parts:[
      ...rows,
      {type:"impeller", x0:.34, x1:.41, lo:HUB, hi:D, group:"hp"},
      {type:"shaft", x0:.21, x1:.6, r:.026, group:"hp"},
      {type:"shaft", x0:.05, x1:.715, r:.013, group:"lp"},
      {type:"gearbox", x:.105, r:.07},
      {type:"combustor", x0:.45, x1:.555, lo:.06, hi:.14},
      {type:"prop", x:.045, r:.42, hub:.07, n:4, group:"lp"}
    ],
    steps:[
      {title:"Turboprop", overview:true, tagline:"A gas turbine whose real job is turning a propeller.",
        body:"<p>Instead of making a fast jet, a turboprop's turbines take nearly all the gas energy and turn it into shaft power for a propeller. The propeller is the ultimate high-bypass fan: it moves a huge tube of air only slightly faster. That makes it the most fuel-efficient choice for short routes and slower aircraft.</p><p>Its limit is the propeller tips. Above roughly Mach 0.6 they approach the speed of sound, shock waves form and efficiency falls away.</p>",
        facts:[["Speed range","Mach 0 to about 0.65"],["Thrust from","About 90% propeller, 10% exhaust"],["Shaft power","1,000 to 11,000 hp"],["Seen on","ATR 72 (PW127), King Air (PT6A), A400M (TP400)"]],
        at:"In the exhaust"},
      {title:"Propeller", stn:"0 → 1", x:[0,.09], ch:"prop", probe:.3,
        body:"<p>Variable-pitch blades twist to take a bigger or smaller bite of air, so the propeller can hold a steady rpm while the pilot changes power. Air through the disc speeds up from about 60 to 100 m/s at take-off. That small speed change over a wide disc is what makes it so efficient.</p>"},
      {title:"Reduction gearbox", stn:"Gearbox", x:[.06,.16],
        body:"<p>The power turbine spins at 20,000 to 30,000 rpm, while a propeller must stay near 1,000 to 2,000 rpm to keep its tips subsonic. A planetary gearbox makes the 15 : 1 or so reduction, and carries every kilowatt the engine produces.</p>"},
      {title:"Compressor", stn:"2 → 3", x:[.16,.43],
        body:"<p>Small engines often pair a few axial stages with a final centrifugal stage, a single impeller that flings air outward. Centrifugal stages handle small flows and dirt well and pack a big pressure rise into one part. Pressure ends up near 12 times ambient.</p><p>Many turboprops (the PT6A family included) are built back to front: air enters at the rear and flows forward, so the exhaust is at the front near the propeller. The physics is the same.</p>"},
      {title:"Combustor", stn:"3 → 4", x:[.43,.57],
        body:"<p>Fuel burns in the compressed air, raising its temperature to about 1,400 K. Some designs fold the combustor back on itself (reverse flow) to keep the engine short.</p>"},
      {title:"Gas-generator turbine", stn:"4 → 45", x:[.57,.62],
        body:"<p>The first turbine drives only the compressor. Together, the compressor, combustor and this turbine form the gas generator: a machine that makes hot, high-pressure gas for the rest of the engine to use.</p>"},
      {title:"Free power turbine", stn:"45 → 5", x:[.62,.73],
        body:"<p>A second turbine on its own shaft takes nearly everything left in the gas and sends it forward through the core to the gearbox. It is free: not mechanically connected to the compressor, so the propeller and the gas generator can each run at the speed that suits them.</p>"},
      {title:"Exhaust", stn:"5 → 9", x:[.73,1],
        body:"<p>With most of its energy spent in the turbines, the exhaust leaves slow, around 100 m/s, and adds only a small share of the thrust. Look at the readout: almost all the pressure is gone by the time the gas leaves.</p>", next:true}
    ]
  };
})();

// Turboshaft
const TS = (() => {
  const D = [[.1,.13],[.16,.14],[.24,.14],[.27,.118],[.32,.1],[.34,.105],[.4,.15],[.44,.15],[.56,.15],[.59,.13],[.72,.14],[.8,.15],[1,.19]];
  const HUB = [[0,.025],[.1,.025],[.12,.06],[.16,.075],[.27,.077],[.32,.08],[.34,.075],[.4,.11],[.42,.1],[.44,.05],[.56,.05],[.59,.075],[.72,.085],[.8,.07],[.98,.05],[1,.05]];
  const SK = [[.1,.15],[.12,.165],[.9,.165],[1,.205]];
  const coreHi = [[0,.1],[.17,.112],[.25,.112],[.27,.118],[.32,.1],[.34,.105],[.4,.15],[.44,.15],[.56,.15],[.59,.13],[.72,.14],[.8,.15],[1,.19]];
  const rows = [{type:"row", x:.135, w:.012, lo:HUB, hi:D, rotor:false}];
  [.28,.293,.306,.319,.332].forEach((x,i) => rows.push({type:"row", x, w:.009, lo:HUB, hi:D, rotor:i%2===0, group:"hp"}));
  [.575,.6].forEach((x,i) => rows.push({type:"row", x, w:.014, lo:HUB, hi:D, rotor:i===1, group:"hp"}));
  [.64,.665,.69,.715].forEach((x,i) => rows.push({type:"row", x, w:.014, lo:HUB, hi:D, rotor:i%2===1, group:"lp"}));
  return {
    id:"turboshaft", name:"Turboshaft", tabNote:"Helicopters", mirror:true, vref:100,
    cond:"Sea-level, maximum continuous power",
    solids:[{lo:D, hi:SK, x0:.1, x1:1, tone:"case"}, {lo:[[.17,.112],[.25,.112]], hi:[[.17,.116],[.25,.12]], x0:.17, x1:.25, tone:"case"}, {lo:0, hi:HUB, x0:0, x1:1, tone:"hub"}],
    channels:[
      {name:"dust", lo:[[0,.1],[.17,.118],[.25,.124]], hi:[[0,.14],[.16,.14],[.25,.14]], w:.1, x1:.25, color:"#c9a46b",
        T:288, P:1, V:[[0,80],[.25,110]]},
      {name:"core", lo:HUB, hi:coreHi, w:.9, main:true,
        T:[[0,288],[.27,290],[.34,520],[.42,720],[.45,730],[.5,1500],[.56,1500],[.59,1180],[.62,1150],[.73,880],[1,850]],
        P:[[0,1],[.27,.98],[.34,5],[.42,17],[.56,16.3],[.59,5.5],[.62,5.3],[.73,1.1],[1,1]],
        V:[[0,80],[.27,120],[.34,120],[.42,90],[.45,50],[.56,120],[.6,220],[.73,200],[1,60]]}
    ],
    parts:[
      ...rows,
      {type:"impeller", x0:.34, x1:.41, lo:HUB, hi:D, group:"hp"},
      {type:"shaft", x0:.28, x1:.6, r:.026, group:"hp"},
      {type:"shaft", x0:0, x1:.715, r:.013, group:"lp"},
      {type:"combustor", x0:.45, x1:.555, lo:.06, hi:.14},
      {type:"label", x:.005, y:-.185, text:"← to rotor gearbox", align:"left"}
    ],
    steps:[
      {title:"Turboshaft", overview:true, tagline:"A turboprop without the propeller. All the output is torque on a shaft.",
        body:"<p>The core is the same gas generator you saw in the turboprop, but the power turbine drives a shaft that leaves the engine to turn something else: a helicopter rotor, a ship's propeller, a tank's tracks or an electric generator. The exhaust is deliberately slowed down, since any jet thrust is wasted energy here.</p>",
        facts:[["Output","Shaft power, about 2,000 hp for a T700"],["Thrust from","Essentially none; power goes to the shaft"],["Pressure ratio","About 17 : 1"],["Seen on","UH-60 Black Hawk and AH-64 Apache (T700), M1 Abrams (AGT1500), warships (LM2500)"]],
        at:"In the exhaust"},
      {title:"Inlet and particle separator", stn:"1 → 2", x:[.08,.27],
        body:"<p>Helicopters hover in their own dust storm. Swirl vanes at the inlet spin the incoming air so heavy sand and grit are thrown outward, past a splitter lip and overboard (the tan particles). Clean air turns inward to the compressor. Without this, sand would erode the compressor blades in hours.</p>"},
      {title:"Compressor", stn:"2 → 3", x:[.27,.43],
        body:"<p>Five small axial stages and one centrifugal impeller raise the pressure about 17 times. Turboshafts favour this mix because the airflow is small and the engine has to be short and rugged.</p>"},
      {title:"Combustor", stn:"3 → 4", x:[.43,.57],
        body:"<p>Fuel burns continuously, taking the gas to about 1,500 K. The engine's control unit trims fuel flow many times a second to hold the rotor at constant rpm as the pilot pulls more or less collective.</p>"},
      {title:"Gas-generator turbine", stn:"4 → 45", x:[.57,.62],
        body:"<p>Two stages on the high-pressure shaft drive the compressor and nothing else.</p>"},
      {title:"Power turbine", stn:"45 → 5", x:[.62,.73],
        body:"<p>A free turbine extracts as much of the remaining energy as possible. Its shaft (teal) runs forward through the middle of the whole engine and comes out of the front.</p>"},
      {title:"Output shaft", stn:"Drive", x:[0,.13],
        body:"<p>The shaft leaves the engine at around 20,000 rpm. The helicopter's main gearbox brings that down to the 250 to 300 rpm a main rotor needs, while also driving the tail rotor and accessories.</p>"},
      {title:"Exhaust diffuser", stn:"5 → 9", x:[.73,1],
        body:"<p>The exhaust duct widens so the gas slows down and the pressure behind the power turbine is as low as possible. That lets the turbine extract more work. The gas leaves at only about 60 m/s and is usually angled away from the tail boom.</p>", next:true}
    ]
  };
})();

// Ramjet
const RJ = (() => {
  const HUB = [[0,0],[.2,.07],[.27,.078],[.34,.06],[.42,0],[1,0]];
  const D = [[0,.14],[.13,.14],[.16,.133],[.27,.122],[.34,.13],[.44,.155],[.5,.16],[.82,.16],[.9,.105],[1,.145]];
  const SK = [[.13,.142],[.2,.17],[.85,.175],[1,.155]];
  return {
    id:"ramjet", name:"Ramjet", tabNote:"M2–5", mirror:true, vref:600,
    cond:"Mach 3 cruise at 18 km altitude",
    solids:[{lo:D, hi:SK, x0:.13, x1:1, tone:"case"}, {lo:0, hi:HUB, x0:0, x1:.42, tone:"hub"}],
    channels:[{lo:HUB, hi:D, w:1, main:true,
      T:[[0,217],[.04,217],[.13,420],[.27,440],[.29,600],[.45,610],[.53,620],[.6,1800],[.75,2200],[.82,2200],[.9,1950],[1,1300]],
      P:[[0,1],[.04,1],[.13,6],[.27,9],[.29,25],[.5,24],[.82,20],[.9,11],[1,1]],
      V:[[0,885],[.04,885],[.13,700],[.27,600],[.29,180],[.45,150],[.53,150],[.82,450],[.9,800],[1,1500]]}],
    parts:[
      {type:"injector", x:.48, r:[.04,.09,.14]},
      {type:"vgutter", x:.52, r:[.06,.12]},
      {type:"flame", x0:.53, x1:.98, lo:0, hi:[[.53,.15],[.82,.16],[.9,.105],[1,.14]], k:1},
      {type:"shock", pts:[[0,0],[.13,.14]]},
      {type:"shock", pts:[[.2,.07],[.13,.14]], a:.5},
      {type:"shock", pts:[[.285,.078],[.285,.124]]}
    ],
    steps:[
      {title:"Ramjet", overview:true, tagline:"No compressor, no turbine. Speed does the squeezing.",
        body:"<p>At Mach 3 the air arriving at the intake carries so much energy that simply slowing it down compresses it 20 to 30 times, more than many turbine compressors manage. A ramjet is just a carefully shaped duct that does that, adds fuel and burns it.</p><p>The catch: at standstill there is no ram pressure, so a ramjet makes no thrust. It has to be boosted to speed by a rocket or another engine first, and it works best between Mach 2 and 5.</p>",
        facts:[["Speed range","Starts near Mach 1; best Mach 2 to 5"],["Moving parts","None in the gas path (the inlet spike may slide)"],["Thrust from","100% exhaust jet"],["Seen on","Bloodhound and BrahMos missiles, Lockheed D-21 drone, Meteor (ducted rocket)"]],
        at:"Leaving the nozzle"},
      {title:"Spike and shocks", stn:"0 → 1", x:[0,.3],
        body:"<p>Air arrives at 885 m/s. The cone-shaped spike creates oblique shock waves, thin surfaces where pressure and temperature jump in a fraction of a millimetre, aimed to land right on the cowl lip. A final normal shock in the throat drops the flow to subsonic speed.</p><p>Each oblique shock wastes less energy than one big normal shock would, which is why the spike is there. On real inlets the spike moves fore and aft to keep the shocks in place as Mach number changes.</p>"},
      {title:"Diffuser", stn:"1 → 2", x:[.27,.47],
        body:"<p>The widening duct slows the subsonic air further, to about 150 m/s. Its kinetic energy becomes pressure and heat: the air is now at 25 times outside pressure and over 600 K, purely from slowing down. Switch to velocity colouring to see how sharply the flow brakes.</p>"},
      {title:"Fuel and flame holders", stn:"Injection", x:[.47,.55],
        body:"<p>Fuel is sprayed in ahead of a set of V-gutter flame holders. Behind each gutter is a pocket of slow, recirculating gas where the flame can anchor. Without them the flame would simply be blown out of the back of the engine.</p>"},
      {title:"Combustion", stn:"2 → 4", x:[.53,.84],
        body:"<p>The burning mixture reaches around 2,200 K. There is no turbine to protect, so the only limits are the walls and the chemistry. The flow stays subsonic all the way through the burner.</p>"},
      {title:"Nozzle", stn:"4 → 9", x:[.82,1],
        body:"<p>The converging-diverging nozzle chokes the flow at its throat, then expands it to around 1,500 m/s, much faster than the 885 m/s it arrived at. That difference is the thrust.</p><p>Push past about Mach 5 and slowing the air to subsonic heats it so much that the fuel stops adding useful energy, and the pressure loads become brutal. That is where the scramjet takes over.</p>", next:true}
    ]
  };
})();

// Scramjet (2-D, drawn as a slice through a hypersonic vehicle)
const SJ = (() => {
  const BODY = [[0,.28],[.18,.16],[.36,.06],[.42,.05],[.72,.05],[.82,.1],[1,.24]];
  const capLo = [[0,-.12],[.4,0],[.43,-.004],[.76,-.004],[1,-.06]];
  return {
    id:"scramjet", name:"Scramjet", tabNote:"M5–15", mirror:false, vref:1800, yr:[-.2,.31],
    cond:"Mach 7 at 30 km altitude",
    solids:[{lo:BODY, hi:.31, x0:0, x1:1, tone:"case"},
            {lo:[[.4,0],[.43,-.035],[.76,-.035],[.8,-.03]], hi:[[.4,0],[.43,-.004],[.76,-.004],[.8,-.03]], x0:.4, x1:.8, tone:"case"}],
    channels:[
      {name:"captured", lo:capLo, hi:BODY, w:.78, main:true,
        T:[[0,227],[.18,227],[.21,560],[.36,580],[.4,800],[.45,1100],[.52,1120],[.6,2200],[.72,2500],[.82,2000],[1,1200]],
        P:[[0,1],[.18,1],[.21,6],[.36,7],[.4,20],[.45,50],[.52,50],[.72,40],[.82,15],[1,2]],
        V:[[0,2100],[.18,2100],[.21,2000],[.38,1850],[.45,1700],[.52,1700],[.72,1500],[.82,2000],[1,2500]]},
      {name:"outside", lo:-.2, hi:[[0,-.13],[.4,-.045],[.8,-.045],[1,-.08]], w:.22,
        T:[[0,227],[.4,227],[.45,300],[1,280]], P:1, V:2100}
    ],
    parts:[
      {type:"shock", pts:[[0,.28],[.4,0]], a:.55},
      {type:"shock", pts:[[.18,.16],[.4,0]], a:.55},
      {type:"shock", pts:[[.36,.06],[.4,0]], a:.45},
      {type:"shock", pts:[[.4,0],[.44,.05],[.48,-.004],[.52,.05]], a:.6},
      {type:"injector", x:.53, r:[.05,-.004]},
      {type:"flame", x0:.54, x1:.86, lo:[[.54,0],[.76,-.004],[.86,-.03]], hi:[[.54,.05],[.72,.05],[.82,.1],[.86,.12]], k:.85}
    ],
    steps:[
      {title:"Scramjet", overview:true, tagline:"A ramjet that never lets the air slow below supersonic speed. The whole aircraft is the engine.",
        body:"<p>Supersonic combustion ramjet. At Mach 7 the air arrives at about 2,100 m/s. Slowing it to subsonic, as a ramjet does, would heat it beyond 2,000 K before any fuel was added. A scramjet compresses it only partway, keeps it at around Mach 2.5, and burns fuel in the supersonic stream.</p><p>The vehicle's underside is the intake ramp and its tail is the nozzle. This view is a vertical slice through the middle of the vehicle, not a round engine.</p>",
        facts:[["Speed range","Starts near Mach 5; flown to Mach 9.6; theory to about 15"],["Moving parts","None"],["Flow time through combustor","About 1 millisecond"],["Seen on","NASA X-43A (Mach 9.6, 2004), Boeing X-51A (Mach 5.1 for 210 s, 2013)"]],
        at:"Leaving the nozzle"},
      {title:"Forebody compression", stn:"0 → 1", x:[0,.4],
        body:"<p>Two angled ramps on the vehicle's nose each generate an oblique shock. Both are designed to meet at the cowl lip, so the engine captures exactly the compressed air and none spills around it. The lower stream outside the cowl just slides past.</p>"},
      {title:"Inlet and isolator", stn:"1 → 3", x:[.38,.53],
        body:"<p>Inside the cowl, shocks bounce between the walls, compressing the air to around 50 times outside pressure and 1,100 K while it is still moving at about Mach 2.5.</p><p>The isolator, a short constant-area section, holds this shock train. It keeps the pressure rise from combustion from creeping forward and blowing the inlet shocks out of the front, an event called unstart that can wreck a flight in milliseconds.</p>"},
      {title:"Supersonic combustion", stn:"3 → 4", x:[.5,.78],
        body:"<p>Fuel is injected through wall ports and struts and has to mix and burn in about a thousandth of a second: famously compared to lighting a match in a hurricane. Hydrogen (X-43A) ignites fastest; hydrocarbon fuel (X-51A) is denser and easier to carry.</p><p>Adding heat to supersonic flow slows it slightly. The gas reaches about 2,500 K while still moving at 1,500 m/s.</p>"},
      {title:"Expansion nozzle", stn:"4 → 9", x:[.72,1],
        body:"<p>The vehicle's upswept underbelly is one half of the nozzle; the open air below is the other. The gas expands and accelerates to around 2,500 m/s, a few hundred m/s faster than it came in. The margin is thin, which is why drag and every bit of heat loss matter so much for scramjets.</p>", next:true}
    ]
  };
})();

const ENGINES = [TJ, TF, TP, TS, RJ, SJ];
const COMPARE = {
  turbojet:["Axial compressor driven by turbine","Compressor + turbine on one spool","Hot core jet only","Concorde, early fighters, missiles"],
  turbofan:["Fan, then booster and HP compressor","Fan + two or three spools","Mostly the cold bypass stream","Nearly every airliner and business jet"],
  turboprop:["Axial + centrifugal compressor","Gas generator + free power turbine + gearbox","Propeller (about 90%)","Regional airliners, transports, trainers"],
  turboshaft:["Axial + centrifugal compressor","Gas generator + free power turbine","None; delivers shaft power","Helicopters, tanks, ships, generators"],
  ramjet:["Inlet shocks and diffuser (ram)","None","Hot jet, needs a boost to start","Supersonic missiles, test drones"],
  scramjet:["Vehicle forebody shocks","None","Supersonic hot jet over the aft body","Hypersonic research vehicles"]
};
const MACH = [
  {id:"turboshaft", a:0, b:.3},
  {id:"turboprop", a:0, b:.65},
  {id:"turbofan", a:0, b:.9, ea:.9, eb:2.2, note:"low-bypass military to ~2.2"},
  {id:"turbojet", a:0, b:3},
  {id:"ramjet", a:2, b:5, ea:.8, eb:2, note:"needs a boost to start"},
  {id:"scramjet", a:5, b:9.6, ea:9.6, eb:15, note:"flown to 9.6"}
];

/* ---------- colour maps ---------- */
const hex = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const T_STOPS = [[220,"#2e5bdb"],[300,"#4fb0ff"],[500,"#8fe0c8"],[800,"#ffe066"],[1200,"#ff9f1c"],[1700,"#ff4f1f"],[2500,"#fff1c9"]].map(([v,c]) => [v, hex(c)]);
const V_STOPS = [[30,"#3a2a7a"],[100,"#3b6fd8"],[300,"#2fb5a8"],[900,"#a6e05a"],[3000,"#fff07a"]].map(([v,c]) => [Math.log(v), hex(c)]);
function ramp(stops, v) {
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const [a, ca] = stops[i-1], [b, cb] = stops[i], f = (v - a) / (b - a);
      return [0,1,2].map(k => Math.round(ca[k] + (cb[k] - ca[k]) * f));
    }
  }
  return stops[stops.length-1][1];
}
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const tColor = T => ramp(T_STOPS, T);
const vColor = V => ramp(V_STOPS, Math.log(Math.max(30, V)));
const gradCss = (stops, labels) => "linear-gradient(90deg," + stops.map((s, i) => `${rgb(s[1])} ${(i/(stops.length-1)*100).toFixed(0)}%`).join(",") + ")";

/* ---------- state ---------- */
const reduceMotion = App.reduceMotion;
const S = { eng: ENGINES[0], step: 0, playing: !reduceMotion, mode: "T", speed: 1, t: 0, particles: [] };
let ui, stage, scrolly, cvO, pvO, cv, ctx, pv, pctx;
let W = 0, H = 0, PW = 0, PH = 0, dpr = 1;
const css = App.tokens;
const q = sel => stage.root.querySelector(sel);
function readTokens() {
  stage.keyline.innerHTML = `<span><i style="background:${rgb(tColor(1500))}"></i>Temperature</span><span><i style="background:${css["stage-fg"]}"></i>Pressure</span>`;
}
function resize() {
  cvO.fit(); pvO.fit();
  dpr = cvO.dpr; W = cvO.w; H = cvO.h; PW = pvO.w; PH = pvO.h;
}
/* engine-space → canvas */
const MX = 14;
let yTop = .3, yBot = -.3, ky = 1;
function setFrame() {
  const e = S.eng;
  if (e.yr) { yBot = e.yr[0]; yTop = e.yr[1]; }
  else {
    let m = 0;
    e.solids.forEach(s => { for (let x = 0; x <= 1; x += .02) m = Math.max(m, at(s.hi, x)); });
    e.parts.forEach(p => { if (p.type === "prop") m = Math.max(m, p.r); });
    yTop = m * 1.06; yBot = -yTop;
  }
}
const X = x => MX + x * (W - 2 * MX);
const invX = px => (px - MX) / (W - 2 * MX);
const Y = y => { const pad = 24; ky = (H - pad - 8) / (yTop - yBot); return pad + (yTop - y) * ky; };

/* ---------- particles ---------- */
function pickChannel(e) {
  let r = Math.random(), tot = e.channels.reduce((a, c) => a + c.w, 0) * r;
  for (let i = 0; i < e.channels.length; i++) { tot -= e.channels[i].w; if (tot <= 0) return i; }
  return e.channels.length - 1;
}
function spawn(p, e, initial) {
  p.c = pickChannel(e);
  const s = .08 + Math.random() * .84;
  p.s = e.mirror ? (Math.random() < .5 ? -s : s) : s;
  p.x = initial ? -.05 + Math.random() * 1.05 : -.02 - Math.random() * .08;
  p.j = Math.random();
}
function resetParticles() {
  const n = W < 520 ? 260 : 460;
  S.particles = Array.from({length: n}, () => { const p = {}; spawn(p, S.eng, true); return p; });
}
function pY(e, ch, s, x) {
  const lo = at(ch.lo, x), hi = at(ch.hi, x);
  if (e.mirror) { const r = lo + Math.abs(s) * (hi - lo); return s < 0 ? -r : r; }
  return lo + s * (hi - lo);
}

/* ---------- drawing ---------- */
function regionPath(c, lo, hi, x0, x1, sign) {
  const xs = new Set();
  const N = 70;
  for (let i = 0; i <= N; i++) xs.add(x0 + (x1 - x0) * i / N);
  [lo, hi].forEach(p => { if (Array.isArray(p)) p.forEach(([x]) => { if (x > x0 && x < x1) xs.add(x); }); });
  const arr = [...xs].sort((a, b) => a - b);
  c.beginPath();
  arr.forEach((x, i) => { const y = Y(sign * at(hi, x)); i ? c.lineTo(X(x), y) : c.moveTo(X(x), y); });
  for (let i = arr.length - 1; i >= 0; i--) c.lineTo(X(arr[i]), Y(sign * at(lo, arr[i])));
  c.closePath();
}
const signs = e => e.mirror ? [1, -1] : [1];

function stripes(x0, x1, y0, y1, color, gap, slant, offset) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, Math.min(y0, y1), x1 - x0, Math.abs(y1 - y0)); ctx.clip();
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, (x1 - x0) * .12);
  const top = Math.min(y0, y1) - gap * 2, bot = Math.max(y0, y1) + gap * 2;
  const o = ((offset % gap) + gap) % gap;
  ctx.beginPath();
  for (let y = top + o; y < bot; y += gap) { ctx.moveTo(x0, y); ctx.lineTo(x1, y - slant); }
  ctx.stroke();
  ctx.restore();
}

function drawSolid(e, s) {
  for (const sg of signs(e)) {
    regionPath(ctx, s.lo, s.hi, s.x0, s.x1, sg);
    const g = ctx.createLinearGradient(0, Y(sg * at(s.hi, (s.x0+s.x1)/2)), 0, Y(sg * at(s.lo, (s.x0+s.x1)/2)));
    if (s.tone === "hub") { g.addColorStop(0, css["metal"]); g.addColorStop(1, css["hub"]); }
    else if (s.tone === "nacelle") { g.addColorStop(0, css["metal-hi"]); g.addColorStop(1, css["metal"]); }
    else { g.addColorStop(0, css["metal"]); g.addColorStop(1, css["metal-hi"]); }
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1; ctx.stroke();
  }
}

function drawPart(e, p) {
  const t = S.t;
  const spin = (g) => (g === "hp" ? 160 : 90);
  switch (p.type) {
    case "row": {
      const x0 = X(p.x - p.w/2), x1 = X(p.x + p.w/2);
      for (const sg of signs(e)) {
        const ya = Y(sg * at(p.lo, p.x)), yb = Y(sg * at(p.hi, p.x));
        const col = p.rotor ? css[p.group] : css["metal-hi"];
        ctx.fillStyle = p.rotor ? col + "40" : "rgba(116,133,143,.28)";
        ctx.fillRect(x0, Math.min(ya, yb), x1 - x0, Math.abs(yb - ya));
        const gap = Math.max(5, (x1 - x0) * .9);
        stripes(x0, x1, ya, yb, p.rotor ? col : "rgba(160,176,186,.7)", gap, p.rotor ? (x1 - x0) * .9 : -(x1 - x0) * .7, p.rotor ? -t * spin(p.group) : 0);
      }
      break;
    }
    case "impeller": {
      const col = css[p.group];
      for (const sg of signs(e)) {
        ctx.beginPath();
        ctx.moveTo(X(p.x0), Y(sg * at(p.lo, p.x0)));
        ctx.lineTo(X(p.x0), Y(sg * (at(p.lo, p.x0) + (at(p.hi, p.x0) - at(p.lo, p.x0)) * .85)));
        ctx.quadraticCurveTo(X(p.x0 + (p.x1-p.x0)*.75), Y(sg * at(p.hi, p.x0 + (p.x1-p.x0)*.4)), X(p.x1), Y(sg * at(p.hi, p.x1) * .97));
        ctx.lineTo(X(p.x1), Y(sg * at(p.lo, p.x1)));
        ctx.closePath();
        ctx.fillStyle = col + "50"; ctx.fill();
        ctx.save(); ctx.clip();
        const ya = Y(sg * at(p.hi, p.x1)), yb = Y(sg * at(p.lo, p.x0));
        stripes(X(p.x0), X(p.x1), ya, yb, col, 7, 10, -t * 160);
        ctx.restore();
      }
      break;
    }
    case "shaft": {
      const x0 = X(p.x0), x1 = X(p.x1), ya = Y(p.r), yb = Y(-p.r);
      ctx.fillStyle = css[p.group]; ctx.globalAlpha = .55;
      ctx.fillRect(x0, ya, x1 - x0, yb - ya); ctx.globalAlpha = 1;
      ctx.save(); ctx.beginPath(); ctx.rect(x0, ya, x1 - x0, yb - ya); ctx.clip();
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 2;
      const gap = 9, o = ((t * spin(p.group) * .6) % gap + gap) % gap;
      ctx.beginPath();
      for (let x = x0 - 20 + o; x < x1 + 20; x += gap) { ctx.moveTo(x, ya); ctx.lineTo(x + (yb - ya) * .6, yb); }
      ctx.stroke(); ctx.restore();
      break;
    }
    case "combustor": {
      const x0 = X(p.x0), x1 = X(p.x1);
      for (const sg of signs(e)) {
        const ya = Y(sg * p.hi), yb = Y(sg * p.lo);
        const top = Math.min(ya, yb), h = Math.abs(yb - ya);
        // flame
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        const fl = .75 + .25 * Math.sin(t * 21 + sg) * Math.sin(t * 13.7);
        const g = ctx.createLinearGradient(x0, 0, x1, 0);
        g.addColorStop(0, "rgba(255,200,90,0)");
        g.addColorStop(.18, `rgba(255,170,60,${.55 * fl})`);
        g.addColorStop(.6, `rgba(255,90,30,${.35 * fl})`);
        g.addColorStop(1, "rgba(255,60,20,.05)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, top + h / 2, (x1 - x0) / 2, h * .38 * (0.9 + .1 * fl), 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // liner
        ctx.strokeStyle = css["metal-hi"]; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, top, x1 - x0, h, Math.min(8, h / 2)) : ctx.rect(x0, top, x1 - x0, h); ctx.stroke();
        ctx.fillStyle = "#e8d36a"; ctx.fillRect(x0 - 3, top + h / 2 - 2, 5, 4);
      }
      break;
    }
    case "flame": {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (const sg of signs(e)) {
        regionPath(ctx, p.lo, p.hi, p.x0, p.x1, sg);
        const fl = .8 + .2 * Math.sin(t * 17 + sg * 2) * Math.cos(t * 9.3);
        const g = ctx.createLinearGradient(X(p.x0), 0, X(p.x1), 0);
        g.addColorStop(0, "rgba(255,190,90,0)");
        g.addColorStop(.12, `rgba(255,160,60,${.42 * p.k * fl})`);
        g.addColorStop(.55, `rgba(255,85,40,${.3 * p.k * fl})`);
        g.addColorStop(1, "rgba(255,70,40,0)");
        ctx.fillStyle = g; ctx.fill();
      }
      ctx.restore();
      break;
    }
    case "vgutter": {
      ctx.strokeStyle = css["metal-hi"]; ctx.lineWidth = 2;
      const s = 7;
      for (const sg of signs(e)) for (const r of p.r) {
        const cx = X(p.x), cy = Y(sg * r);
        ctx.beginPath(); ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx, cy); ctx.lineTo(cx + s, cy + s); ctx.stroke();
      }
      break;
    }
    case "injector": {
      ctx.fillStyle = "#e8d36a";
      for (const sg of signs(e)) for (const r of p.r) { ctx.beginPath(); ctx.arc(X(p.x), Y(sg * r), 2.6, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case "shock": {
      ctx.save();
      ctx.strokeStyle = `rgba(235,245,255,${p.a ?? .7})`; ctx.lineWidth = 1.4;
      ctx.shadowColor = "rgba(160,210,255,.8)"; ctx.shadowBlur = 6;
      for (const sg of signs(e)) {
        ctx.beginPath();
        p.pts.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(sg * y)) : ctx.moveTo(X(x), Y(sg * y)));
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case "gearbox": {
      const cx = X(p.x), cy = Y(0), R = Math.abs(Y(p.r * .45) - cy), r2 = R * .55;
      gear(cx, cy, R, 14, S.t * 2.2, css["lp"]);
      gear(cx, cy - R - r2 + 1, r2, 8, -S.t * 2.2 * 14 / 8, css["metal-hi"]);
      gear(cx, cy + R + r2 - 1, r2, 8, -S.t * 2.2 * 14 / 8, css["metal-hi"]);
      break;
    }
    case "prop": {
      const n = p.n, cx = X(p.x), cy = Y(0), hubPx = Math.abs(Y(p.hub) - cy), Rpx = Math.abs(Y(p.r) - cy);
      ctx.strokeStyle = "rgba(200,215,225,.12)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(cx, cy, 6, Rpx, 0, 0, Math.PI * 2); ctx.stroke();
      const blades = [];
      for (let k = 0; k < n; k++) { const th = S.t * 9 + k * 2 * Math.PI / n; blades.push(th); }
      blades.sort((a, b) => Math.sin(a) - Math.sin(b));
      for (const th of blades) {
        const c = Math.cos(th), sn = Math.sin(th);
        const tip = cy - c * Rpx, root = cy - Math.sign(c || 1) * hubPx * .8;
        const wRoot = 10, wTip = 4 + 5 * Math.abs(sn);
        ctx.fillStyle = sn > 0 ? css["lp"] : "rgba(92,194,174,.45)";
        ctx.beginPath();
        ctx.moveTo(cx - wRoot / 2, root); ctx.lineTo(cx - wTip / 2, tip); ctx.lineTo(cx + wTip / 2, tip); ctx.lineTo(cx + wRoot / 2, root);
        ctx.closePath(); ctx.fill();
      }
      break;
    }
    case "label": {
      ctx.fillStyle = css["stage-muted"]; ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = p.align || "left"; ctx.fillText(p.text, X(p.x), Y(p.y));
      break;
    }
  }
}
function gear(cx, cy, r, teeth, ang, col) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = i * Math.PI / teeth, rr = i % 2 ? r * .82 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fillStyle = col; ctx.globalAlpha = .85; ctx.fill(); ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.arc(0, 0, r * .25, 0, Math.PI * 2); ctx.fillStyle = css["hub"]; ctx.fill();
  ctx.restore();
}

function drawParticles(e) {
  ctx.lineCap = "round";
  ctx.lineWidth = W < 520 ? 1.6 : 2;
  for (const p of S.particles) {
    const ch = e.channels[p.c];
    if (p.x < -0.04) continue;
    const v = at(ch.V, Math.max(0, p.x));
    const len = clamp(.004 + .01 * v / e.vref, .004, .035);
    const xa = Math.max(-.04, p.x - len);
    const col = ch.color ? hex(ch.color) : (S.mode === "T" ? tColor(at(ch.T, Math.max(0, p.x))) : vColor(v));
    let a = 1;
    if (ch.x1 && p.x > ch.x1 - .03) a = clamp((ch.x1 - p.x) / .03, 0, 1);
    if (p.x > .97) a = clamp((1.04 - p.x) / .07, 0, 1);
    ctx.strokeStyle = rgb(col, .9 * a);
    ctx.beginPath();
    ctx.moveTo(X(xa), Y(pY(e, ch, p.s, xa)));
    ctx.lineTo(X(p.x), Y(pY(e, ch, p.s, p.x)));
    ctx.stroke();
  }
}

function currentRange() {
  const st = S.eng.steps[S.step];
  return st && st.x ? st.x : null;
}

function draw() {
  const e = S.eng;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = css["stage-bg"]; ctx.fillRect(0, 0, W, H);
  // faint grid, like a test-cell wall
  ctx.strokeStyle = css["stage-rule"]; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) { const x = Math.round(X(i / 20)) + .5; ctx.moveTo(x, 20); ctx.lineTo(x, H); }
  ctx.stroke();
  if (e.mirror) {
    ctx.setLineDash([8, 6]); ctx.strokeStyle = css["stage-muted"]; ctx.globalAlpha = .35;
    ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  e.parts.filter(p => p.type === "flame" || p.type === "combustor").forEach(p => drawPart(e, p));
  drawParticles(e);
  e.solids.forEach(s => drawSolid(e, s));
  e.parts.filter(p => p.type === "shaft" && p.group === "hp").forEach(p => drawPart(e, p));
  e.parts.filter(p => p.type === "shaft" && p.group === "lp").forEach(p => drawPart(e, p));
  e.parts.filter(p => !["flame","combustor","shaft"].includes(p.type)).forEach(p => drawPart(e, p));

  // highlight the active station
  const rg = currentRange();
  if (rg) {
    const a = X(rg[0]), b = X(rg[1]);
    ctx.fillStyle = css["stage-bg"]; ctx.globalAlpha = .62;
    ctx.fillRect(0, 20, a, H); ctx.fillRect(b, 20, W - b, H);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = css["stage-fg"]; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(a + .5, 16); ctx.lineTo(a + .5, 9); ctx.lineTo(b - .5, 9); ctx.lineTo(b - .5, 16); ctx.stroke();
    ctx.font = "600 13px 'Saira Condensed', sans-serif"; ctx.fillStyle = css["stage-fg"];
    const label = S.eng.steps[S.step].title.toUpperCase();
    const tw = ctx.measureText(label).width;
    let lx = (a + b) / 2 - tw / 2; lx = clamp(lx, 4, W - tw - 4);
    ctx.fillStyle = css["stage-bg"]; ctx.fillRect(lx - 4, 2, tw + 8, 14);
    ctx.fillStyle = css["stage-fg"]; ctx.textAlign = "left"; ctx.fillText(label, lx, 13);
  }
}

function drawProfile() {
  const e = S.eng, ch = e.channels.find(c => c.main);
  pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  pctx.fillStyle = css["stage-panel"]; pctx.fillRect(0, 0, PW, PH);
  const top = 6, bot = PH - 6, PX = x => MX + x * (PW - 2 * MX);
  const N = 160;
  let Tm = 0, Pm = 0;
  for (let i = 0; i <= N; i++) { Tm = Math.max(Tm, at(ch.T, i / N)); Pm = Math.max(Pm, at(ch.P, i / N)); }
  const rg = currentRange();
  if (rg) { pctx.fillStyle = css["stage-rule"]; pctx.fillRect(PX(rg[0]), 0, PX(rg[1]) - PX(rg[0]), PH); }
  // temperature line, coloured by temperature
  pctx.lineWidth = 2.2; pctx.lineCap = "round";
  for (let i = 0; i < N; i++) {
    const x0 = i / N, x1 = (i + 1) / N, T0 = at(ch.T, x0), T1 = at(ch.T, x1);
    pctx.strokeStyle = rgb(tColor((T0 + T1) / 2));
    pctx.beginPath();
    pctx.moveTo(PX(x0), bot - (T0 / Tm) * (bot - top));
    pctx.lineTo(PX(x1), bot - (T1 / Tm) * (bot - top));
    pctx.stroke();
  }
  pctx.strokeStyle = css["stage-fg"]; pctx.lineWidth = 1.4; pctx.setLineDash([4, 3]);
  pctx.beginPath();
  for (let i = 0; i <= N; i++) { const x = i / N, y = bot - (at(ch.P, x) / Pm) * (bot - top); i ? pctx.lineTo(PX(x), y) : pctx.moveTo(PX(x), y); }
  pctx.stroke(); pctx.setLineDash([]);
  pctx.font = "10px 'IBM Plex Mono', monospace"; pctx.fillStyle = css["stage-muted"]; pctx.textAlign = "left";
  pctx.fillText(`peak ${fmt(Tm)} K · ×${fmt(Pm)} pressure`, 6, 13);
}

/* ---------- readouts ---------- */
function updateReadouts() {
  const e = S.eng, st = e.steps[S.step];
  const ch = st.ch ? e.channels.find(c => c.name === st.ch) : e.channels.find(c => c.main);
  const x = st.probe ?? (st.x ? st.x[1] - .004 : .999);
  const T = at(ch.T, x), P = at(ch.P, x), V = at(ch.V, x);
  stage.setReadouts([
    ["Temperature", `${fmt(T)}<small>K · ${fmt(T - 273)} °C</small>`],
    ["Pressure", `×${P < 10 ? P.toFixed(1) : fmt(P)}<small>ambient</small>`],
    ["Gas speed", `${fmt(Math.round(V / 10) * 10)}<small>m/s</small>`]
  ]);
  stage.where.textContent = st.at || (st.ch === "bypass" ? "Leaving the bypass duct" : st.ch === "prop" ? "Behind the propeller" : `Leaving the ${st.title.toLowerCase()}`);
}

/* ---------- steps ---------- */
function renderStep(st, i, n) {
  const e = S.eng, idx = ENGINES.indexOf(e), nxt = ENGINES[(idx + 1) % ENGINES.length];
  if (st.overview) {
    return `<span class="label">Engine ${idx + 1} of ${ENGINES.length}</span>
      <h2>${st.title}</h2><p class="tagline">${st.tagline}</p>${st.body}
      <dl class="facts">${st.facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
      <p class="hint">Scroll to follow the air through the engine. Tap a part of the drawing to jump to it. Switch engines with the buttons above the drawing.</p>`;
  }
  return `<p class="stn"><b>STN ${st.stn}</b><span class="label">${i} / ${n - 1}</span></p>
    <h3>${st.title}</h3>${st.body}${st.hint ? `<p class="hint">${st.hint}</p>` : ""}
    ${st.next ? `<button class="next-btn" type="button" data-next="${nxt.id}">Next: ${nxt.name} →</button>` : ""}`;
}
function onStep(i) {
  S.step = i;
  updateReadouts();
  drawProfile();
}

/* ---------- engine selection ---------- */
function selectEngine(id, scroll) {
  const e = ENGINES.find(x => x.id === id) || ENGINES[0];
  S.eng = e; S.step = 0;
  stage.root.querySelectorAll(".chip").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.id === e.id)));
  stage.cond.textContent = e.cond;
  setFrame(); resetParticles();
  scrolly.render(e.steps);
  ui.steps.querySelectorAll("[data-next]").forEach(b => b.addEventListener("click", () => { selectEngine(b.dataset.next, true); }));
  App.setHash(e.id);
  if (scroll) App.jumpTop();
  scrolly.set(0);
  scrolly.update();
}

function stepAt(px) {
  const x = invX(px), e = S.eng;
  let best = -1, w = Infinity;
  e.steps.forEach((st, i) => { if (st.x && x >= st.x[0] && x <= st.x[1] && st.x[1] - st.x[0] < w) { w = st.x[1] - st.x[0]; best = i; } });
  return best;
}

function setPlaying(v) { S.playing = v; const b = q("#engPlay"); b.textContent = v ? "Pause" : "Play"; b.setAttribute("aria-pressed", String(!v)); }
function setMode(m) {
  S.mode = m;
  q("#engModeT").setAttribute("aria-pressed", String(m === "T"));
  q("#engModeV").setAttribute("aria-pressed", String(m === "V"));
  q(".legend .bar").style.background = gradCss(m === "T" ? T_STOPS : V_STOPS);
  q("#engLegLo").textContent = m === "T" ? "220 K" : "30 m/s";
  q("#engLegHi").textContent = m === "T" ? "2,500 K" : "3,000 m/s";
}

/* ---------- comparison chart & table ---------- */
function buildCompare(host) {
  host.innerHTML = `<span class="label">Side by side</span>
    <h2>Where each engine works</h2>
    <p>No single engine covers the whole speed range. Turbines need the air slowed to subsonic speed at the compressor face; ramjets need the vehicle already moving fast; scramjets need it moving very fast. Solid bars are the normal operating range, faint bars are the stretch. Select a row to load that engine.</p>
    <div class="scroll-x"><svg class="chart" id="machChart" role="img" aria-label="Flight Mach number range for each engine type, on a square-root scale from Mach 0 to 15"></svg></div>
    <div class="scroll-x"><table><thead><tr><th>Engine</th><th>How it compresses air</th><th>Rotating parts</th><th>Where the push comes from</th><th>Flies on</th></tr></thead><tbody id="cmpBody"></tbody></table></div>
    <p class="lede">Turbine engines are shown at sea-level take-off, the ramjet at Mach 3 cruise and the scramjet at Mach 7. Pressure is a multiple of the air pressure ahead of the engine. Station numbers follow the gas-turbine convention: 2 compressor face, 3 compressor exit, 4 turbine entry, 5 turbine exit, 9 nozzle exit.</p>`;
  const svg = host.querySelector("#machChart"), NS = "http://www.w3.org/2000/svg";
  const Wc = 760, left = 150, right = 30, rowH = 46, top = 14, Hc = top + MACH.length * rowH + 44;
  svg.setAttribute("viewBox", `0 0 ${Wc} ${Hc}`);
  const sx = m => left + Math.sqrt(m / 15) * (Wc - left - right);
  const el = (t, a, parent = svg) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); parent.appendChild(n); return n; };
  const axisY = top + MACH.length * rowH + 6;
  [0, .5, 1, 2, 3, 5, 10, 15].forEach(m => {
    el("line", {x1: sx(m), x2: sx(m), y1: top - 6, y2: axisY, stroke: "var(--rule)", "stroke-width": m === 1 ? 1.6 : 1, "stroke-dasharray": m === 1 ? "" : "2 4"});
    const tx = el("text", {x: sx(m), y: axisY + 16, "text-anchor": "middle"}); tx.textContent = m;
  });
  const ax = el("text", {x: sx(15), y: axisY + 34, "text-anchor": "end"}); ax.textContent = "Flight Mach number (square-root scale)";
  const sb = el("text", {x: sx(1) + 5, y: top + 2}); sb.textContent = "speed of sound";
  MACH.forEach((r, i) => {
    const e = ENGINES.find(x => x.id === r.id), y = top + i * rowH + 10;
    const g = el("g", {class: "row", tabindex: "0", role: "button", "aria-label": `Load ${e.name}`});
    el("rect", {x: 0, y: y - 8, width: Wc, height: rowH - 4, fill: "transparent"}, g);
    const nm = el("text", {x: 0, y: y + 13, class: "rowname"}, g); nm.textContent = e.name;
    if (r.ea != null) el("rect", {x: sx(r.ea), y, width: sx(r.eb) - sx(r.ea), height: 18, rx: 2, fill: "var(--accent-soft)"}, g);
    el("rect", {x: sx(r.a), y, width: Math.max(3, sx(r.b) - sx(r.a)), height: 18, rx: 2, fill: "var(--accent)"}, g);
    if (r.note) {
      const n = el("text", {x: sx(Math.min(r.a, r.ea ?? r.a)), y: y + 32, style: "font-size:11px"}, g); n.textContent = r.note;
    }
    const go = () => { selectEngine(r.id, true); };
    g.addEventListener("click", go);
    g.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); go(); } });
  });
  host.querySelector("#cmpBody").innerHTML = ENGINES.map(e => `<tr><td>${e.name}</td>${COMPARE[e.id].map(c => `<td>${c}</td>`).join("")}</tr>`).join("");
}

/* ---------- chapter ---------- */
App.register({
  id: "engines", nav: "Engines", subs: ENGINES.map(e => e.id),
  build() {
    ui = App.section(this);
    this.ui = ui;
    stage = App.stage(ui.stageHost, {
      title: `<span class="chips">${ENGINES.map(e => `<button class="chip" type="button" data-id="${e.id}" aria-pressed="false">${e.name}</button>`).join("")}</span>`,
      aspect: "2 / 1", extraCanvas: true,
      controls: `<button class="ctrl-btn" id="engPlay" type="button">Pause</button>
        <span class="seg" role="group" aria-label="Colour particles by"><button type="button" id="engModeT" aria-pressed="true">Temp</button><button type="button" id="engModeV" aria-pressed="false">Velocity</button></span>
        <label class="rng" for="engSpeed">Flow <input type="range" id="engSpeed" min="0.2" max="2" step="0.1" value="1"></label>
        <span class="legend"><span id="engLegLo">220 K</span><span class="bar"></span><span id="engLegHi">2,500 K</span></span>`
    });
    // the chip row replaces the plain title so engines can be switched from the panel
    stage.title.classList.remove("stage-title");
    cvO = stage.cv; pvO = stage.sub; cv = cvO.el; ctx = cvO.ctx; pv = pvO.el; pctx = pvO.ctx;
    cv.setAttribute("role", "img"); cv.setAttribute("aria-label", "Animated cutaway of the selected engine");
    stage.root.querySelectorAll(".chip").forEach(b => b.addEventListener("click", () => selectEngine(b.dataset.id, true)));
    q("#engPlay").addEventListener("click", () => setPlaying(!S.playing));
    q("#engModeT").addEventListener("click", () => setMode("T"));
    q("#engModeV").addEventListener("click", () => setMode("V"));
    q("#engSpeed").addEventListener("input", ev => { S.speed = +ev.target.value; });
    cv.addEventListener("click", ev => { const i = stepAt(ev.clientX - cv.getBoundingClientRect().left); if (i >= 0) scrolly.goto(i); });
    cv.addEventListener("mousemove", ev => { cv.style.cursor = stepAt(ev.clientX - cv.getBoundingClientRect().left) >= 0 ? "pointer" : "default"; });
    scrolly = this.scrolly = App.scrolly(ui.steps, S.eng.steps, onStep, renderStep);
    buildCompare(ui.extras);
    setMode("T"); setPlaying(S.playing);
  },
  activate(sub) {
    resize(); readTokens();
    if (sub || !this._init) { this._init = true; selectEngine(sub || S.eng.id, false); }
    else App.setHash(this.id);
  },
  resize() { resize(); if (this._init) { resetParticles(); drawProfile(); } },
  themeChanged() { readTokens(); drawProfile(); },
  frame(dt) {
    if (!W) return;
    if (S.playing) {
      S.t += dt * S.speed;
      const e = S.eng, base = .16 * S.speed;
      for (const p of S.particles) {
        const ch = e.channels[p.c];
        p.x += dt * base * (at(ch.V, Math.max(0, p.x)) / e.vref) * (.92 + .16 * p.j);
        if (p.x > 1.04 || (ch.x1 && p.x > ch.x1)) spawn(p, e, false);
      }
    }
    draw();
  }
});
})();
