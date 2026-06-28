// Cabin schedules — EKC Session 1, Week 2 (week of June 28, 2026)
// Slot IDs: ACT1–ACT7 map to Acts Aleph–Zayin
// Sabra/Kineret: ACT3 = Free Swim (always). Halutzim/Teens: ACT4 = Free Swim (always).
// Wednesday = Israel Day for all cabins.
// Friday: Big Sibling (ACT1) + Trip! (ACT2) then Shabbat for all cabins.
// Saturday = Shabbat.
// Circle 3/4 and Circle 5/7 are combined cabins sharing one schedule this week.

export type DayKey = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
export type SlotKey = 'ACT1' | 'ACT2' | 'ACT3' | 'ACT4' | 'ACT5' | 'ACT6' | 'ACT7';
export type WeekSchedule = Partial<Record<DayKey, Partial<Record<SlotKey, string>>>>;

const FREE_SWIM = 'Free Swim';
const SHABBAT = 'Shabbat';

// SK (Sabra/Kineret): ACT3 = Free Swim every day; Fri = Big Sibling/Trip!/Free Swim; Sat = Shabbat
function sk(
  sun: [string,string,string,string,string,string],
  mon: [string,string,string,string,string,string],
  tue: [string,string,string,string,string,string],
  wed: [string,string,string,string,string,string],
  thu: [string,string,string,string,string,string],
): WeekSchedule {
  const day = (a1:string,a2:string,a4:string,a5:string,a6:string,a7:string) =>
    ({ ACT1:a1, ACT2:a2, ACT3:FREE_SWIM, ACT4:a4, ACT5:a5, ACT6:a6, ACT7:a7 });
  return {
    Sun: day(...sun),
    Mon: day(...mon),
    Tue: day(...tue),
    Wed: day(...wed),
    Thu: day(...thu),
    Fri: { ACT1:'Big Sibling', ACT2:'Trip!', ACT3:FREE_SWIM },
    Sat: { ACT1: SHABBAT },
  };
}

// HT (Halutzim/Teens): ACT4 = Free Swim every day; Fri = Big Sibling/Trip!/Trip!/Free Swim; Sat = Shabbat
function ht(
  sun: [string,string,string,string,string,string],
  mon: [string,string,string,string,string,string],
  tue: [string,string,string,string,string,string],
  wed: [string,string,string,string,string,string],
  thu: [string,string,string,string,string,string],
): WeekSchedule {
  const day = (a1:string,a2:string,a3:string,a5:string,a6:string,a7:string) =>
    ({ ACT1:a1, ACT2:a2, ACT3:a3, ACT4:FREE_SWIM, ACT5:a5, ACT6:a6, ACT7:a7 });
  return {
    Sun: day(...sun),
    Mon: day(...mon),
    Tue: day(...tue),
    Wed: day(...wed),
    Thu: day(...thu),
    Fri: { ACT1:'Big Sibling', ACT2:'Trip!', ACT3:'Trip!', ACT4:FREE_SWIM },
    Sat: { ACT1: SHABBAT },
  };
}

export const SCHEDULES: Record<string, WeekSchedule> = {

  // ── SABRA ─────────────────────────────────────────────────────────────────

  circle_1: sk(
    ['Super Cleanup','Music','STEM','Frisbee w/ C8','Low Ropes','Campfire'],
    ['Sabra I.S.','Ceramics','Counselors Choice','Arts & Crafts','Pool Games','Sabra Kickball'],
    ['Sabra','Free Day','Softball v C2','Library / Board Games','PUH PUH','Sabra Story Time'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Extended Shower Time'],
    ['SPARK!','Sabra I.S.','Cove Games','Theatre','Pool Party','Extended Shower Time'],
  ),

  circle_2: sk(
    ['Super Cleanup','Flying Squirrel','Cove Games','Theatre','PUH PUH','Campfire'],
    ['Sabra I.S.','Library / Board Games','Tubing','Frisbee','Pool Games','Sabra Kickball'],
    ['Sabra','Free Day','Softball v C1','Random Acts of Kindness','Low Ropes','Sabra Story Time'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Extended Shower Time'],
    ['Mud Hike','Sabra I.S.','Arts & Crafts','Music','Pool Party','Extended Shower Time'],
  ),

  // Circle 3/4 share one schedule this week
  circle_3: sk(
    ['Super Cleanup','Sabra I.S.','Mud Hike','Soccer v C4','Lawn Games','Campfire'],
    ['Flying Squirrel','Sabra I.S.','Theatre','Arts & Crafts','Pool Games','Sabra Kickball'],
    ['Sabra','Free Day','Basketball','Counselors Choice','Dance','Sabra Story Time'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Extended Shower Time'],
    ['SPARK!','JTM','Cove Games','Random Acts of Kindness','Pool Party','Extended Shower Time'],
  ),

  circle_4: sk(
    ['Super Cleanup','Sabra I.S.','Mud Hike','Soccer v C4','Lawn Games','Campfire'],
    ['Flying Squirrel','Sabra I.S.','Theatre','Arts & Crafts','Pool Games','Sabra Kickball'],
    ['Sabra','Free Day','Basketball','Counselors Choice','Dance','Sabra Story Time'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Extended Shower Time'],
    ['SPARK!','JTM','Cove Games','Random Acts of Kindness','Pool Party','Extended Shower Time'],
  ),

  // Circle 5/7 share one schedule this week
  circle_5: sk(
    ['Super Cleanup','Israeli Culture','JTM','Sabra I.S.','Tennis','Campfire'],
    ['Softball v C9','Dance','Arts & Crafts','Counselors Choice','PUH PUH','Sabra Kickball'],
    ['Sabra','Free Day','Low Ropes','Tubing','Volleyball v C8','Sabra Story Time'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Extended Shower Time'],
    ['Sabra I.S.','Flying Squirrel','Music','Pool Games','Pool Party','Extended Shower Time'],
  ),

  circle_6: sk(
    ['Super Cleanup','Lawn Games','Dance','Mud Hike','Cove Games','Campfire'],
    ['STEM','Low Ropes','Blob & Rave','Library / Board Games','Random Acts of Kindness','Sabra Kickball'],
    ['Sabra','Free Day','Counselors Choice','Volleyball','Sabra I.S.','Sabra Story Time'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Extended Shower Time'],
    ['Music','SPARK!','Arts & Crafts','PUH PUH','Pool Party','Extended Shower Time'],
  ),

  circle_7: sk(
    ['Super Cleanup','Israeli Culture','JTM','Sabra I.S.','Tennis','Campfire'],
    ['Softball v C9','Dance','Arts & Crafts','Counselors Choice','PUH PUH','Sabra Kickball'],
    ['Sabra','Free Day','Low Ropes','Tubing','Volleyball v C8','Sabra Story Time'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Extended Shower Time'],
    ['Sabra I.S.','Flying Squirrel','Music','Pool Games','Pool Party','Extended Shower Time'],
  ),

  circle_8: sk(
    ['Super Cleanup','PUH PUH','Counselors Choice','Frisbee w/ C1','Cove Games','Campfire'],
    ['Sabra I.S.','Theatre','Climbing Wall','Tennis','Arts & Crafts','Sabra Kickball'],
    ['Sabra','Free Day','Music','Lawn Games','Volleyball v C5','Sabra Story Time'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Extended Shower Time'],
    ['Low Ropes','Sabra I.S.','Frisbee','Pool Games','Pool Party','Extended Shower Time'],
  ),

  circle_9: sk(
    ['Super Cleanup','Tennis','Volleyball','Arts & Crafts','Cove Games','Campfire'],
    ['Softball v C5','Dance','Dance','Counselors Choice','Low Ropes','Sabra Kickball'],
    ['Sabra','Free Day','Library / Board Games','STEM','Sabra I.S.','Sabra Story Time'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Extended Shower Time'],
    ['Israeli Culture','Climbing Wall','Mud Hike','Theatre','Pool Party','Extended Shower Time'],
  ),

  // ── KINERET ──────────────────────────────────────────────────────────────

  street_1: sk(
    ['Super Cleanup','Low Ropes','Boat Ride','Music','Cooking','Pool Party'],
    ['Morning','Chugim','HBR','Lawn Games','Counselors Choice','Chugim Bet'],
    ['Kineret I.S.','Frisbee','Theatre','Pool Games','Arts & Crafts','Chugim Bet'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Unit Program'],
    ['PUH PUH','Ceramics','Vertical Playground','Canoe / Kayak','Random Acts of Kindness','Chugim Bet'],
  ),

  street_2: sk(
    ['Super Cleanup','Frisbee','PUH PUH','Theatre','Boat Ride','Pool Party'],
    ['Morning','Chugim','Volleyball','Theatre','Random Acts of Kindness','Chugim Bet'],
    ['Kineret I.S.','Counselors Choice','Arts & Crafts','Low Ropes','Library / Board Games','Chugim Bet'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Unit Program'],
    ['Soccer v S4','Israeli Culture','Cooking','STEM','Climbing Wall','Chugim Bet'],
  ),

  street_3: sk(
    ['Super Cleanup','Ceramics','HBR','Counselors Choice','Frisbee','Pool Party'],
    ['Morning','Chugim','PUH PUH','Climbing Wall','Boat Ride','Chugim Bet'],
    ['Kineret I.S.','STEM','Cooking','Random Acts of Kindness','Mud Hike','Chugim Bet'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Unit Program'],
    ['Theatre','Cove Games','Israeli Culture','Softball v S7','Low Ropes','Chugim Bet'],
  ),

  street_4: sk(
    ['Super Cleanup','Tennis','Israeli Culture','Low Ropes','Mud Hike','Pool Party'],
    ['Morning','Chugim','Ceramics','STEM','Soccer v S5','Chugim Bet'],
    ['Random Acts of Kindness','Cooking','JTM','Pool Games','Boat Ride','Chugim Bet'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Unit Program'],
    ['Soccer v S2','Cove Games','Counselors Choice','Flying Squirrel','Vertical Playground','Chugim Bet'],
  ),

  street_5: sk(
    ['Super Cleanup','Giants Ladder','Music','PUH PUH','Library / Board Games','Pool Party'],
    ['Morning','Chugim','Low Ropes','Cooking','Soccer v S4','Chugim Bet'],
    ['Theatre','Pool Games','JTM','Random Acts of Kindness','Frisbee','Chugim Bet'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Unit Program'],
    ['Dance','Boat Ride','Counselors Choice','Tennis','Arts & Crafts','Chugim Bet'],
  ),

  street_6: sk(
    ['Super Cleanup','Cooking','Vertical Playground','Dance','Arts & Crafts','Pool Party'],
    ['Morning','Chugim','Boat Ride','Kickball v S10','Ziplining','Chugim Bet'],
    ['Counselors Choice','Ceramics','PUH PUH','Pool Games','Mud Hike','Chugim Bet'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Unit Program'],
    ['Lawn Games','Canoe / Kayak','Climbing Wall','Israeli Culture','Library / Board Games','Chugim Bet'],
  ),

  street_7: sk(
    ['Super Cleanup','Soccer','Counselors Choice','STEM','Vertical Playground','Pool Party'],
    ['Morning','Chugim','Lawn Games','Low Ropes','Canoe / Kayak','Chugim Bet'],
    ['Library / Board Games','Pool Games','Climbing Wall','Dance','Random Acts of Kindness','Chugim Bet'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Unit Program'],
    ['Morning','PUH PUH','JTM','Softball v S3','Arts & Crafts','Chugim Bet'],
  ),

  street_8: sk(
    ['Super Cleanup','Library / Board Games','Giants Ladder','Cooking','Soccer','Pool Party'],
    ['Morning','Chugim','STEM','Boat Ride','Dance','Chugim Bet'],
    ['Music','Pool Games','Arts & Crafts','Random Acts of Kindness','Tubing','Chugim Bet'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Unit Program'],
    ['Climbing Wall','Counselors Choice','Ceramics','Lawn Games','Volleyball','Chugim Bet'],
  ),

  street_9: sk(
    ['Super Cleanup','Random Acts of Kindness','Cooking','Lawn Games','HBR','Pool Party'],
    ['Morning','Chugim','Library / Board Games','Vertical Playground','Arts & Crafts','Chugim Bet'],
    ['Frisbee','Counselors Choice','Pool Games','PUH PUH','Climbing Wall','Chugim Bet'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Unit Program'],
    ['Garden','Volleyball','Theatre','Boat Ride','Mud Hike','Chugim Bet'],
  ),

  street_10: sk(
    ['Super Cleanup','Random Acts of Kindness','Ceramics','Football','Giants Ladder','Pool Party'],
    ['Morning','Chugim','Canoe / Kayak','Kickball v S6','HBR','Chugim Bet'],
    ['Climbing Wall','Lawn Games','Dance','Israeli Culture','Counselors Choice','Chugim Bet'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Unit Program'],
    ['Arts & Crafts','Mud Hike','JTM','Vertical Playground','Boat Ride','Chugim Bet'],
  ),

  street_11: sk(
    ['Super Cleanup','Tubing','Arts & Crafts','Library / Board Games','Counselors Choice','Pool Party'],
    ['Morning','Chugim','Cooking','PUH PUH','Giants Ladder','Chugim Bet'],
    ['Random Acts of Kindness','Tennis','Ceramics','Theatre','HBR','Chugim Bet'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Unit Program'],
    ['JTM','Lawn Games','Garden','Volleyball','Boat Ride','Chugim Bet'],
  ),

  street_12: sk(
    ['Super Cleanup','Canteen','Theatre','Cove Games','Dance','Pool Party'],
    ['Morning','Chugim','Music','Ceramics','Frisbee','Chugim Bet'],
    ['PUH PUH','Counselors Choice','Boat Ride','Pickleball','Arts & Crafts','Chugim Bet'],
    ['Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program','Unit Program'],
    ['JTM','Mud Hike','HBR','Random Acts of Kindness','Canoe / Kayak','Chugim Bet'],
  ),

  // ── HALUTZIM ─────────────────────────────────────────────────────────────

  park_1: ht(
    ['Super Cleanup','Kickball v P10','Ceramics','HBR','Music','Campfire'],
    ['Archery','PUH PUH','Arts & Crafts','Pamper Pole','Counselors Choice','Chugim Bet'],
    ['Library / Board Games','Morning','Chugim','Mud Hike','Leaping with Levit','Chugim Bet'],
    ['Israel Day','Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program'],
    ['Cove Games','Morning','Chugim','JTM','Random Acts of Kindness','Chugim Bet'],
  ),

  park_2: ht(
    ['Super Cleanup','Arts & Crafts','Vertical Playground','Counselors Choice','Music','Campfire'],
    ['Random Acts of Kindness','Archery','Ceramics','Blob & Rave','Mud Hike','Chugim Bet'],
    ['Pamper Pole','Morning','Chugim','Frisbee','STEM','Chugim Bet'],
    ['Israel Day','Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program'],
    ['Cove Games','Morning','Chugim','JTM','Lawn Games','Chugim Bet'],
  ),

  park_3: ht(
    ['Super Cleanup','Theatre','PUH PUH','Giants Ladder','STEM','Campfire'],
    ['HBR','Mud Hike','Canoe / Kayak','Archery','Music','Chugim Bet'],
    ['Blob & Rave','Morning','Chugim','Cooking','Israeli Culture','Chugim Bet'],
    ['Israel Day','Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program'],
    ['Ceramics','Morning','Chugim','Arts & Crafts','Canteen','Chugim Bet'],
  ),

  park_4: ht(
    ['Super Cleanup','Climbing Wall','Cooking','Boat Ride','Lawn Games','Campfire'],
    ['Library / Board Games','Mud Hike','Arts & Crafts','Blob & Rave','Random Acts of Kindness','Chugim Bet'],
    ['Canteen','Morning','Chugim','Ceramics','Music','Chugim Bet'],
    ['Israel Day','Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program'],
    ['Pamper Pole','Morning','Chugim','Archery','Counselors Choice','Chugim Bet'],
  ),

  park_5: ht(
    ['Super Cleanup','JTM','HBR','Arts & Crafts','Ceramics','Campfire'],
    ['Canoe / Kayak','Music','Soccer','Jumping with Jake M','Counselors Choice','Chugim Bet'],
    ['Volleyball','Morning','Chugim','Mud Hike','Lawn Games','Chugim Bet'],
    ['Israel Day','Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program'],
    ['Pickleball','Morning','Chugim','Pamper Pole','Random Acts of Kindness','Chugim Bet'],
  ),

  park_6: ht(
    ['Super Cleanup','JTM','Dance','Archery','Counselors Choice','Campfire'],
    ['Theatre','Cooking','Vertical Playground','Volleyball v P7','Random Acts of Kindness','Chugim Bet'],
    ['Boat Ride','Morning','Chugim','Arts & Crafts','Music','Chugim Bet'],
    ['Israel Day','Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program'],
    ['Canteen','Morning','Chugim','Cove Games','Mud Hike','Chugim Bet'],
  ),

  park_7: ht(
    ['Super Cleanup','Random Acts of Kindness','Arts & Crafts','Canoe / Kayak','Basketball (counselor led)','Campfire'],
    ['Dance','Cove Games','Giants Ladder','Volleyball v P6','Counselors Choice','Chugim Bet'],
    ['Boat Ride','Morning','Chugim','Canteen','Music','Chugim Bet'],
    ['Israel Day','Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program'],
    ['Hockey','Morning','Chugim','Mud Hike','Mud Hike','Chugim Bet'],
  ),

  park_8: ht(
    ['Super Cleanup','Dance','Climbing Wall','Softball v P12','Counselors Choice','Campfire'],
    ['Giants Ladder','Blob & Rave','Cooking','Cove Games','Random Acts of Kindness','Chugim Bet'],
    ['Doing Stuff w/ David','Morning','Chugim','Basketball','Mud Hike','Chugim Bet'],
    ['Israel Day','Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program'],
    ['Tubing','Morning','Chugim','Hockey','Music','Chugim Bet'],
  ),

  park_10: ht(
    ['Super Cleanup','Kickball v P1','JTM','Blob & Rave','Random Acts of Kindness','Campfire'],
    ['Lawn Games','Canteen','Dance','Music','Library / Board Games','Chugim Bet'],
    ['Ceramics','Morning','Chugim','Mud Hike','Acrobatics with Abby','Chugim Bet'],
    ['Israel Day','Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program'],
    ['Archery','Morning','Chugim','Climbing Wall','PUH PUH','Chugim Bet'],
  ),

  park_11: ht(
    ['Super Cleanup','Archery','Low Ropes','Ceramics','PUH PUH','Campfire'],
    ['Cove Games','Pamper Pole','Tennis','Counselors Choice','Theatre','Chugim Bet'],
    ['Lawn Games','Morning','Chugim','Arts & Crafts','Random Acts of Kindness','Chugim Bet'],
    ['Israel Day','Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program'],
    ['Mud Hike','Morning','Chugim','Dance','Mud Hike','Chugim Bet'],
  ),

  park_12: ht(
    ['Super Cleanup','Arts & Crafts','JTM','Softball v P8','Library / Board Games','Campfire'],
    ['Cove Games','Tennis','PUH PUH','Canteen','Ceramics','Chugim Bet'],
    ['Lacrosse','Morning','Chugim','Blob & Rave','Lawn Games','Chugim Bet'],
    ['Israel Day','Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Unit Program'],
    ['Canoe / Kayak','Morning','Chugim','Dance','Counselors Choice','Chugim Bet'],
  ),

  // ── TEENS ────────────────────────────────────────────────────────────────

  quad_1: ht(
    ['Super Cleanup','Lake Livin\'','Lake Livin\'','Pamper Pole','Mud Hike','Dance'],
    ['Tennis','Random Acts of Kindness','HBR','Boat Ride','PUH PUH','Low Ropes'],
    ['Soccer','Downtime w/ David','Library / Board Games','Tubing','Ceramics','TC Cheers'],
    ['Israel Day','Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Teen Lawn Games'],
    ['Arts & Crafts','Garden','Volleyball','Cooking','JTM','TC Tugs'],
  ),

  // Quad 3 was on White Water Rafting trip Sun–Mon; Monday = return/unpack
  quad_3: ht(
    ['White Water','White Water','Rafting','','',''],
    ['','','','','','Clean Up / Unpack'],
    ['STEM','Kickball v S5','Giants Ladder','Cove Games','Theatre','TC Cheers'],
    ['Israel Day','Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Teen Lawn Games'],
    ['HBR','Tennis','JTM','Blob & Rave','Library / Board Games','TC Tugs'],
  ),

  // Quad 5 was on White Water Rafting trip Sun–Mon; Monday = return/unpack
  quad_5: ht(
    ['White Water','White Water','Rafting','','',''],
    ['','','','','','Clean Up / Unpack'],
    ['Low Ropes','Kickball v Q3','Cove Games','JTM','Library / Board Games','TC Cheers'],
    ['Israel Day','Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Teen Lawn Games'],
    ['Blob & Rave','Theatre','Giants Ladder','HBR','STEM','TC Tugs'],
  ),

  quad_6: ht(
    ['Super Cleanup','Lake Livin\'','Lake Livin\'','Energizing with Ella','Theatre','Frisbee'],
    ['Ceramics','Soccer','Canteen','Pool Games','STEM','PUH PUH'],
    ['Dance','Tubing','Tubing','Pamper Pole','JTM','TC Cheers'],
    ['Israel Day','Israel Day','ISRAEL DAY','Tel Aviv','Beach Party','Teen Lawn Games'],
    ['Giants Ladder','Cooking','Cooking','Library / Board Games','Israeli Culture','TC Tugs'],
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
