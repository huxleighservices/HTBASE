// Cabin schedules — EKC Session 1, Week 1
// Slot IDs: ACT1–ACT7 map to Acts Aleph–Zayin
// Sabra/Kineret: ACT3 = Free Swim (always). Halutzim/Teens: ACT4 = Free Swim (always).
// Sunday = Camp Opening Day ("Happy First Day of Camp 2026!") — no per-slot activities.
// Saturday = Shabbat. Friday evening activities left blank.
// Teens: schedules are per-Quad; all tents in a Quad share the schedule.

export type DayKey = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
export type SlotKey = 'ACT1' | 'ACT2' | 'ACT3' | 'ACT4' | 'ACT5' | 'ACT6' | 'ACT7';
export type WeekSchedule = Partial<Record<DayKey, Partial<Record<SlotKey, string>>>>;

const FREE_SWIM = 'Free Swim';
const OPENING = 'Happy First Day of Camp 2026!';
const SHABBAT = 'Shabbat';

// Helper: build Sabra/Kineret cabin (ACT3 = Free Swim every day, Sun = opening)
function sk(
  mon: [string,string,string,string,string,string],
  tue: [string,string,string,string,string,string],
  wed: [string,string,string,string,string,string],
  thu: [string,string,string,string,string,string],
  fri: [string,string],
): WeekSchedule {
  const day = (a1:string,a2:string,a4:string,a5:string,a6:string,a7:string) =>
    ({ ACT1:a1, ACT2:a2, ACT3:FREE_SWIM, ACT4:a4, ACT5:a5, ACT6:a6, ACT7:a7 });
  return {
    Sun: { ACT1: OPENING },
    Mon: day(...mon),
    Tue: day(...tue),
    Wed: day(...wed),
    Thu: day(...thu),
    Fri: { ACT1:fri[0], ACT2:fri[1], ACT3:FREE_SWIM },
    Sat: { ACT1: SHABBAT },
  };
}

// Helper: build Halutzim/Teens cabin (ACT4 = Free Swim, ACT3 has activities, Sun = opening)
function ht(
  mon: [string,string,string,string,string,string],
  tue: [string,string,string,string,string,string],
  wed: [string,string,string,string,string,string],
  thu: [string,string,string,string,string,string],
  fri: [string,string,string],
): WeekSchedule {
  const day = (a1:string,a2:string,a3:string,a5:string,a6:string,a7:string) =>
    ({ ACT1:a1, ACT2:a2, ACT3:a3, ACT4:FREE_SWIM, ACT5:a5, ACT6:a6, ACT7:a7 });
  return {
    Sun: { ACT1: OPENING },
    Mon: day(...mon),
    Tue: day(...tue),
    Wed: day(...wed),
    Thu: day(...thu),
    Fri: { ACT1:fri[0], ACT2:fri[1], ACT3:fri[2], ACT4:FREE_SWIM },
    Sat: { ACT1: SHABBAT },
  };
}

export const SCHEDULES: Record<string, WeekSchedule> = {

  // ── SABRA ─────────────────────────────────────────────────────────────────

  circle_1: sk(
    ['Arts & Crafts','Blob and Rave','Cooking','Israeli Culture','Volleyball','Unit Program'],
    ['Zipline','Sabra I.S.','Mud Hike','Dance','Library / Board Games','Sabra Story-time'],
    ['JTM','Sabra I.S.','Archery','Ceramics','Counselors Choice','Pool Party!'],
    ['Sabra Free Day','Day yay!','Canteen','Garden','Lawn Games','Big Sibling'],
    ['HBR','Wild World of Animals'],
  ),

  circle_2: sk(
    ['HBR','Archery','JTM','Arts & Crafts','Blob and Rave','Unit Program'],
    ['STEM','Sabra I.S.','Bouncing Around with Ben','Ceramics','Lawn Games','Sabra Story-time'],
    ['Zipline','Sabra I.S.','Dance','Mud Hike','Library / Board Games','Pool Party!'],
    ['Sabra Free Day','Day yay!','Cooking','Counselors Choice','Soccer','Big Sibling'],
    ['Tubing','Wild World of Animals'],
  ),

  circle_3: sk(
    ['Sabra I.S.','Blob and Rave','Zipline','Canteen','Library / Board Games','Unit Program'],
    ['Blob and Rave','Ceramics','Random Acts of Kindness','Israeli Culture','PuH-PuH','Sabra Story-time'],
    ['Sabra I.S.','Random Acts of Kindness','Arts & Crafts','Cooking','Archery','Pool Party!'],
    ['Sabra Free Day','Day yay!','HBR','Music','Counselors Choice','Big Sibling'],
    ['Tubing','Wild World of Animals'],
  ),

  circle_4: sk(
    ['Sabra I.S.','Music with Marshall','Arts & Crafts','Cooking','Archery','Unit Program'],
    ['HBR','Magic with Marshall','Israeli Culture','Cooking','Counselors Choice','Sabra Story-time'],
    ['Sabra I.S.','Canteen','Zipline','STEM','PuH-PuH','Pool Party!'],
    ['Sabra Free Day','Day yay!','JTM','Ceramics','Library / Board Games','Big Sibling'],
    ['Blob and Rave','Wild World of Animals'],
  ),

  circle_5: sk(
    ['Sabra I.S.','Blob and Rave','STEM','Ceramics','Canteen','Unit Program'],
    ['JTM','Archery','Random Acts of Kindness','Library / Board Games','Archery','Sabra Story-time'],
    ['Sabra I.S.','Zipline','Theatre','Arts & Crafts','Basketball','Pool Party!'],
    ['Sabra Free Day','Day yay!','Basketball','Cooking','Mud Hike','Big Sibling'],
    ['Canteen','Wild World of Animals'],
  ),

  circle_6: sk(
    ['Blob and Rave','Sabra I.S.','Library / Board Games','HBR','Flying Squirrel','Unit Program'],
    ['Library / Board Games','Cooking','Canteen','JTM','Pool Games','Sabra Story-time'],
    ['Ceramics','Israeli Culture','Tubing','Archery','Mud Hike','Pool Party!'],
    ['Sabra Free Day','Day yay!','Tubing','Sabra I.S.','Counselors Choice','Big Sibling'],
    ['Zipline','Wild World of Animals'],
  ),

  circle_7: sk(
    ['Sabra I.S.','Arts & Crafts','Ceramics','HBR','Flying Squirrel','Unit Program'],
    ['JTM','Theatre','Cooking','JTM','Pool','Sabra Story-time'],
    ['Sabra I.S.','Blob and Rave','Ultimate Frisbee','Archery','Mud Hike','Pool Party!'],
    ['Sabra Free Day','Day yay!','Dance','Library / Board Games','Zipline','Big Sibling'],
    ['Archery','Wild World of Animals'],
  ),

  circle_8: sk(
    ['STEM','Cooking','Tubing','Flying Squirrel','Mud Hike','Unit Program'],
    ['Canteen','Sabra I.S.','Pickleball','HBR','Blob and Rave','Sabra Story-time'],
    ['JTM','Sabra I.S.','Ceramics','Library / Board Games','Random Acts of Kindness','Pool Party!'],
    ['Sabra Free Day','Day yay!','Arts & Crafts','Israeli Culture','Zipline','Big Sibling'],
    ['Dance','Wild World of Animals'],
  ),

  circle_9: sk(
    ['Archery','Sabra I.S.','HBR','Lawn Games','Pool Games','Unit Program'],
    ['Tubing','Music','Canteen','JTM','Random Acts of Kindness','Sabra Story-time'],
    ['Flying Squirrel','Ceramics','Cooking','Arts & Crafts','Zipline','Pool Party!'],
    ['Sabra Free Day','Day yay!','Garden','Sabra I.S.','Basketball','Big Sibling'],
    ['Library / Board Games','Ceramics'],
  ),

  // ── KINERET ──────────────────────────────────────────────────────────────

  street_1: sk(
    ['Zipline','Israeli Culture','Archery','Library / Board Games / Arts & Crafts','HBR','Chugim Bet'],
    ['Kineret I.S.','STEM','Tubing','Arts & Crafts','Volleyball','Chugim Bet'],
    ['Kineret I.S.','Chugim','Lawn Games','Kineret I.S.','Dance','Unit Program'],
    ['Blob and Rave','Day yay!','Ceramics','Canteen','Counselors Choice','Chugim Bet'],
    ['Gymnastics Center','Party Trip!'],
  ),

  street_2: sk(
    ['Dance','Ceramics','Canteen','Archery','Paddleboard','Chugim Bet'],
    ['Kineret I.S.','Zipline','Library / Board Games','Arts & Crafts','Mud Hike','Chugim Bet'],
    ['Kineret I.S.','Chugim','Tubing','Kineret I.S.','Lawn Games','Unit Program'],
    ['Tennis','Day yay!','HBR','Random Acts of Kindness','Blob and Rave','Chugim Bet'],
    ['Gymnastics Center','Party Trip!'],
  ),

  street_3: sk(
    ['Tubing','Soccer','Mud Hike','JTM','Dance','Chugim Bet'],
    ['Kineret I.S.','Library / Board Games','Blob and Rave','Music','Counselors Choice','Chugim Bet'],
    ['Kineret I.S.','Chugim','STEM','Kineret I.S.','Vertical Playground','Unit Program'],
    ['HBR','Day yay!','Zipline','Archery','Canteen','Chugim Bet'],
    ['Gymnastics Center','Party Trip!'],
  ),

  street_4: sk(
    ['Paddleboard','JTM','Library / Board Games','Theatre','PuH-PuH','Chugim Bet'],
    ['Archery','Blob and Rave','Zipline','Volleyball','Canteen','Chugim Bet'],
    ['Kineret I.S.','Chugim','Tubing','Dance','Random Acts of Kindness','Unit Program'],
    ['Music','Garden','Israeli Culture','HBR','Kickball vs S5','Chugim Bet'],
    ['Gymnastics Center','Party Trip!'],
  ),

  street_5: sk(
    ['Ceramics','JTM','Giants Ladder','Hockey','Tubing','Chugim Bet'],
    ['Arts & Crafts','Counselors Choice','Archery','Canteen','Zipline','Chugim Bet'],
    ['Kineret I.S.','Chugim','Library / Board Games','HBR','Pool Games','Unit Program'],
    ['Garden','Israeli Culture','Blob and Rave','Lawn Games','Kickball vs S4','Chugim Bet'],
    ['Gymnastics Center','Party Trip!'],
  ),

  street_6: sk(
    ['Theatre','HBR','Low Ropes','Paddleboard','Pickleball','Chugim Bet'],
    ['Arts & Crafts','JTM','Frisbee','STEM','Tubing','Chugim Bet'],
    ['Kineret I.S.','Chugim','Music','Canteen','Pool Games','Unit Program'],
    ['Blob and Rave','Ceramics','Archery','Counselors Choice','Sittin\' w/ Syd','Chugim Bet'],
    ['Gymnastics Center','Party Trip!'],
  ),

  street_7: sk(
    ['Lawn Games','Canteen','Blob and Rave','Music','Giants Ladder','Chugim Bet'],
    ['Israeli Culture','Mud Hike','Ceramics','Zipline','Archery','Chugim Bet'],
    ['Kineret I.S.','Chugim','HBR','Counselors Choice','Tubing','Unit Program'],
    ['JTM','Library / Board Games','Hockey','Theatre','Canoe / Kayak','Chugim Bet'],
    ['Gymnastics Center','Party Trip!'],
  ),

  street_8: sk(
    ['Basketball','Low Ropes','Blob and Rave','Pool Games','Canteen','Chugim Bet'],
    ['Theatre','Canoe / Kayak','STEM','Archery','Random Acts of Kindness','Chugim Bet'],
    ['Kineret I.S.','Chugim','Israeli Culture','Zipline','HBR','Unit Program'],
    ['JTM','PuH-PuH','Mud Hike','Arts & Crafts','Tubing','Chugim Bet'],
    ['Gymnastics Center','Party Trip!'],
  ),

  street_9: sk(
    ['Canteen','Zipline','Arts & Crafts','Blob and Rave','Basketball','Chugim Bet'],
    ['Tennis','Paddleboard','Music','Lawn Games','Low Ropes','Chugim Bet'],
    ['Kineret I.S.','Chugim','JTM','Vertical Playground','Counselors Choice','Unit Program'],
    ['Ceramics','Cove Games','Tubing','Mud Hike','Archery','Chugim Bet'],
    ['Gymnastics Center','Party Trip!'],
  ),

  street_10: sk(
    ['Low Ropes','STEM','Dance','Tubing','Random Acts of Kindness','Chugim Bet'],
    ['Paddleboard','Canteen','Arts & Crafts','Pool Games','Frisbee','Chugim Bet'],
    ['Kineret I.S.','Chugim','JTM','Blob and Rave','Cooking','Unit Program'],
    ['Softball vs S11','Cove Games','Music','Zipline','PuH-PuH','Chugim Bet'],
    ['Gymnastics Center','Party Trip!'],
  ),

  street_11: sk(
    ['Volleyball','Dance','Israeli Culture','Zipline','Stories w/ Syd','Chugim Bet'],
    ['Music','Mud Hike','Tubing','Pool Games','Basketball','Chugim Bet'],
    ['Kineret I.S.','Chugim','PuH-PuH','JTM','Cove Games','Unit Program'],
    ['Softball vs S10','Canteen','Library / Board Games','Blob and Rave','Random Acts of Kindness','Chugim Bet'],
    ['Gymnastics Center','Party Trip!'],
  ),

  street_12: sk(
    ['Music','Library / Board Games','Lawn Games','Cooking','Zipline','Chugim Bet'],
    ['Low Ropes','Hockey','Canoe / Kayak','Pool Games','Counselors Choice','Chugim Bet'],
    ['Kineret I.S.','Chugim','Mud Hike','JTM','Blob and Rave','Unit Program'],
    ['Tubing','Random Acts of Kindness','Giants Ladder','Volleyball','Dance','Chugim Bet'],
    ['Gymnastics Center','Party Trip!'],
  ),

  // ── HALUTZIM ─────────────────────────────────────────────────────────────

  park_1: ht(
    ['PuH-PuH','Canoe / Kayak','JTM','Low Ropes / Counselors Choice','STEM','Chugim Bet'],
    ['Soccer','Halutzim','chug Aleph','Counselors Choice / Tubing','Arts & Crafts','Chugim Bet'],
    ['Library / Board Games','Mud Hike','chug Aleph','Tubing / Pool Games','Swaneys / Theatre','Unit Program'],
    ['Canteen','Halutzim','chug Aleph','Pool Games','Theatre','Chugim Bet'],
    ['Lawn Games','Cooking','Zipline'],
  ),

  park_2: ht(
    ['Tennis','Cove Games','Cooking','PuH-PuH / Mud Hike','Theatre','Chugim Bet'],
    ['Climbing Wall','Halutzim','chug Aleph','Mud Hike','JTM','Chugim Bet'],
    ['Canteen','Library / Board Games','Zipline','Volleyball / Tubing','Swaneys / Arts & Crafts','Unit Program'],
    ['Counselors Choice','Halutzim','chug Aleph','Tubing','Random Acts of Kindness','Chugim Bet'],
    ['Pamper Pole','HBR','Paddleboard'],
  ),

  park_3: ht(
    ['Pamper Pole','Cove Games','JTM','Pickleball','Library / Board Games','Chugim Bet'],
    ['Counselors Choice','Halutzim','chug Aleph','Tubing','STEM','Chugim Bet'],
    ['Theatre','Mud Hike','Blob and Rave','Lawn Games / Pool Games','Swaneys / Israeli Culture','Unit Program'],
    ['Random Acts of Kindness','Halutzim','chug Aleph','Pool Games','HBR','Chugim Bet'],
    ['Arts & Crafts','Zipline','HBR'],
  ),

  park_4: ht(
    ['Hockey','Lawn Games','HBR','Pamper Pole','Israeli Culture','Chugim Bet'],
    ['Counselors Choice','Halutzim','chug Aleph','Canoe / Kayak','JTM','Chugim Bet'],
    ['PuH-PuH','Tubing','Low Ropes','Theatre / Swaneys','Random Acts of Kindness','Unit Program'],
    ['Paddleboard','Halutzim','chug Aleph','Giants Ladder','Random Acts of Kindness','Chugim Bet'],
    ['Arts & Crafts','Library / Board Games','Dance'],
  ),

  park_5: ht(
    ['Climbing Wall','Tennis','Ceramics','Dance','Canteen','Chugim Bet'],
    ['Pamper Pole','Halutzim','chug Aleph','Tubing','Lawn Games','Chugim Bet'],
    ['Frisbee','JTM','Cooking','Random Acts of Kindness / Swaneys','Israeli Culture','Unit Program'],
    ['Mud Hike','Halutzim','chug Aleph','Low Ropes','Library / Board Games','Chugim Bet'],
    ['Israeli Culture','Arts & Crafts','Zipline'],
  ),

  park_6: ht(
    ['Hockey','Lawn Games','HBR','Pamper Pole','Israeli Culture','Chugim Bet'],
    ['Counselors Choice','Halutzim','chug Aleph','Canoe / Kayak','JTM','Chugim Bet'],
    ['PuH-PuH','Tubing','Low Ropes','Theatre / Swaneys','Random Acts of Kindness','Unit Program'],
    ['Paddleboard','Halutzim','chug Aleph','Giants Ladder','Random Acts of Kindness','Chugim Bet'],
    ['Arts & Crafts','Library / Board Games','Dance'],
  ),

  park_7: ht(
    ['Mud Hike','PuH-PuH','Tubing','Volleyball / Random Acts of Kindness','JTM','Chugim Bet'],
    ['Cove Games','Halutzim','chug Aleph','Tubing','Ceramics','Chugim Bet'],
    ['Music','Pamper Pole','Library / Board Games','Hockey / Swaneys','Lawn Games','Unit Program'],
    ['Theatre','Halutzim','chug Aleph','Soccer','Lawn Games','Chugim Bet'],
    ['Garden','Arts & Crafts','Low Ropes'],
  ),

  park_8: ht(
    ['Arts & Crafts','Random Acts of Kindness','Canoe / Kayak','Adventures with Adrian','JTM','Chugim Bet'],
    ['Lawn Games','Halutzim','chug Aleph','Giants Ladder','Canteen','Chugim Bet'],
    ['Israeli Culture','Basketball','Tubing','Paddleboard / Swaneys','Random Acts of Kindness','Unit Program'],
    ['Volleyball','Halutzim','chug Aleph','Basketball / Dance','Ceramics','Chugim Bet'],
    ['Theatre','Low Ropes','Library / Board Games'],
  ),

  park_10: ht(
    ['Random Acts of Kindness','Theatre','Vertical Playground','Pool Games','PuH-PuH','Chugim Bet'],
    ['Dance','Halutzim','chug Aleph','Basketball','Library / Board Games','Chugim Bet'],
    ['STEM','Soccer','JTM','Tubing / Swaneys','Counselors Choice','Unit Program'],
    ['Low Ropes','Halutzim','chug Aleph','Lacrosse','Counselors Choice','Chugim Bet'],
    ['Mud Hike','Canoe / Kayak','Lawn Games'],
  ),

  park_11: ht(
    ['Library / Board Games','Pamper Pole','Blob and Rave','Lacrosse','Arts & Crafts','Chugim Bet'],
    ['PuH-PuH','Halutzim','chug Aleph','Mud Hike','Theatre','Chugim Bet'],
    ['Paddleboard','Counselors Choice','JTM','Soccer / Swaneys','Canteen','Unit Program'],
    ['Israeli Culture','Halutzim','chug Aleph','Tubing','Garden','Chugim Bet'],
    ['Random Acts of Kindness','Garden','Climbing Wall'],
  ),

  park_12: ht(
    ['Cove Games','Volleyball','Low Ropes','Tubing','Arts & Crafts','Chugim Bet'],
    ['Mud Hike','Halutzim','chug Aleph','Pamper Pole','Theatre','Chugim Bet'],
    ['Blob and Rave','Soccer','JTM','Swaneys','Blob and Rave','Unit Program'],
    ['Dance','Israeli Culture','chug Aleph','Tubing','Dance','Chugim Bet'],
    ['Paddleboard','Theatre','Random Acts of Kindness'],
  ),

  // ── TEENS ────────────────────────────────────────────────────────────────
  // Keyed by Quad (all tents in a Quad share the same schedule)

  quad_1: ht(
    ['Mud Hike','Climbing Wall','Library / Board Games','Chat w/ Pippa / Cove Games','Acrobating with Abby / Random Acts of Kindness','JTM'],
    ['Frisbee','Lawn Games','JTM','PuH-PuH','PuH-PuH','Low Ropes'],
    ['Quad','Quests','Fun','Paddleboard','Arts & Crafts','Zipline'],
    ['Lacrosse','Music','Tubing / Canteen','Paddleboard / Counselor-led','Basketball','Israeli Culture'],
    ['Pool Games','Hockey',''],
  ),

  quad_3: ht(
    ['Random Acts of Kindness','Arts & Crafts','Tubing','Chat w/ Pippa / Lacrosse','Lawn Games / Counselors Choice','Israeli Culture'],
    ['Doing Stuff with Daniel','Climbing Wall','JTM','Lacrosse','Counselors Choice','Archery'],
    ['Quad','Quests','Fun','Bball','Ceramics','Low Ropes'],
    ['Mud Hike','Vertical Playground','Canoe / Kayak','PuH-PuH','Cove Games','Big Sibling'],
    ['Pool Games','Music',''],
  ),

  quad_5: ht(
    ['Soccer','Tubing','PuH-PuH','Chat w/ Pippa / Advocating with Abby','Music / Israeli Culture','Zipline'],
    ['Counselors Choice','Volleyball','Ceramics','Mud Hike','JTM','Solomon\'s Circuit'],
    ['Quad','Quests','Fun','Arts & Crafts','Random Acts of Kindness','Cooking'],
    ['Solomon\'s Circuit','Jammin\' w/ Jamie','Canteen','Arts & Crafts','Big Sibling','Big Sibling'],
    ['Softball','Pamper Pole',''],
  ),

  quad_6: ht(
    ['Soccer','Mud Hike','Lawn Games','Chat w/ Pippa / PuH-PuH','Canteen / Random Acts of Kindness','JTM'],
    ['Volleyball','Eating w/ EHM','Blob and Rave','PuH-PuH','Random Acts of Kindness','Low Ropes'],
    ['Quad','Quests','Fun','Israeli Culture','Theatre','Arts & Crafts'],
    ['Archery','Kickball','Cove Games','Counselors Choice','Music','Zipline'],
    ['Softball','Tubing',''],
  ),
};

// Map Teens tent cabin IDs to their Quad schedule key
export const TEENS_TENT_TO_QUAD: Record<string, string> = {
  'quad_1__tent_1': 'quad_1',
  'quad_1__tent_2': 'quad_1',
  'quad_1__tent_3': 'quad_1',
  'quad_3__tent_1': 'quad_3',
  'quad_3__tent_2': 'quad_3',
  'quad_3__tent_3': 'quad_3',
  'quad_3__tent_4': 'quad_3',
  'quad_5__tent_1': 'quad_5',
  'quad_5__tent_2': 'quad_5',
  'quad_5__tent_3': 'quad_5',
  'quad_5__tent_4': 'quad_5',
  'quad_6__tent_1': 'quad_6',
  'quad_6__tent_2': 'quad_6',
  'quad_6__tent_3': 'quad_6',
  'quad_6__tent_4': 'quad_6',
};

export function getSchedule(cabinId: string): WeekSchedule | undefined {
  return SCHEDULES[cabinId] ?? SCHEDULES[TEENS_TENT_TO_QUAD[cabinId] ?? ''];
}
