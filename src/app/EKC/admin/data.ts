// Bunk data from master bunk 2026 session 2 PDF — do not edit manually

export type Cabin = {
  id: string;
  label: string;
  unit: string;
  grade: string;
  campers: string[];
  staff: string[];
};

export type Unit = {
  id: string;
  label: string;
  cabins: Cabin[];
};

export const UNITS: Unit[] = [
  {
    id: 'sabra',
    label: 'Sabra',
    cabins: [
      {
        id: 'circle_1',
        label: 'Circle 1',
        unit: 'sabra',
        grade: '4th Grade Girls',
        campers: ['Grace Correa', 'Maggie Ford', 'Julia Hand', 'Amanda Huber', 'Nora Kretman', 'Sofie Libin', 'Molly Mayer', 'Rebekah Nydick', 'Ayla Raskin', 'Paloma Skurman'],
        staff: ['Lucy Hurowitz', 'Chelsey Barr'],
      },
      {
        id: 'circle_2',
        label: 'Circle 2',
        unit: 'sabra',
        grade: '4th Grade Girls',
        campers: ['Leah Angelucci', 'Everly Camillo', 'Olivia Colwell', 'Aria Dalis', 'Izzy Forrest', 'Noa Handler', 'Goldie Hinesman', 'Modi Hirsh', 'Samantha Landis', 'Madison Schainker'],
        staff: ['Lily Cantor', 'Layla Friehling'],
      },
      {
        id: 'circle_3',
        label: 'Circle 3',
        unit: 'sabra',
        grade: '2nd/3rd Grade Girls',
        campers: ['Brynn Conlon', 'Sadie Crider', 'Gabriella Danenberg', 'Kayla Delman', 'Ella Levavi Meeder', 'Naomi Mandel', 'Amelia Rhoades', 'Ann Tishman', 'Madi Wedner', 'Ava Zion'],
        staff: ['Sophie Fienberg', 'Rose Fuller'],
      },
      {
        id: 'circle_4',
        label: 'Circle 4',
        unit: 'sabra',
        grade: '2nd/3rd Grade Girls',
        campers: ['Sienna Berlin', 'Martha Dreyfuss', 'Taylor Elias', 'Emma Huber', 'Clara Schulman', 'Sophie Siegel', 'Eva Simakovsky', 'Molly Solochek', 'Maya Werman', 'Ingrid Yanov'],
        staff: ['Zoe Stern', 'Izzy West'],
      },
      {
        id: 'circle_5',
        label: 'Circle 5',
        unit: 'sabra',
        grade: '2nd/3rd Grade Boys',
        campers: ['Kai Brendler', 'Landon Cole', 'Harrison Glick', 'Abel Ingber', 'Daniel Jacobs', 'Charles Ogden', 'Finn Schulman', 'Calder Smith', 'Julian Svoysky', 'Calvin Williams'],
        staff: ['Reuben Kay', 'Ashton Pliskin'],
      },
      {
        id: 'circle_6',
        label: 'Circle 6',
        unit: 'sabra',
        grade: '4th Grade Boys',
        campers: ['Jack Brendler', 'Reece Landis', 'Nick Lowry', 'Alex Merritt', 'Sam Tishman', 'Zev Tsiperson', 'James Werman', 'Tyler Wilson', 'Cole Zelin'],
        staff: ['Adam Fienberg', 'Jack Leon'],
      },
      {
        id: 'circle_7',
        label: 'Circle 7',
        unit: 'sabra',
        grade: '2nd/3rd Grade Boys',
        campers: ['Louis Demme', 'Jackson Filipek', 'Ellis Hunter', 'Eli Meyer', 'Elliot Potash', 'Ari Preus'],
        staff: ['Sam Stahl', 'Ariel Kosky'],
      },
      {
        id: 'circle_8',
        label: 'Circle 8',
        unit: 'sabra',
        grade: '4th Grade Boys',
        campers: ['Lawson Crow', 'Keaton Fobes', 'Spencer Haber', 'Jeffrey Plesset', 'Judah Smerd', 'Holden VanPike'],
        staff: ['Dan Greenberg', 'Luke Brodsky'],
      },
      {
        id: 'circle_9',
        label: 'Circle 9',
        unit: 'sabra',
        grade: '4th Grade Boys',
        campers: ['Amsen Arabasadi', 'James Blum', 'Max Brinkman', 'Alex Butela', 'Levi Feinman', 'Simon Galak', 'Isaac Kraus', 'Brodie Neidus'],
        staff: ['Adam Teplitz', 'Solomon Donner', 'Sasha Bondarchuk'],
      },
    ],
  },
  {
    id: 'kineret',
    label: 'Kineret',
    cabins: [
      {
        id: 'street_1',
        label: 'Street 1',
        unit: 'kineret',
        grade: '5th Grade Girls',
        campers: ['Quinn Clark', 'Amelie Cole', 'Claire Gafford', 'Elyses Hardesty', 'Allie Kossovsky', 'Mia Kramer', 'Olivia Madrid', 'Ryan Mender', 'Adina Rubin', 'Hannah Samuels', 'Pearl Studebaker', 'Vivienne Tuss'],
        staff: ['Kate Clougherty', 'Lexi Rogers', 'Tali Lando', 'Gemma Wainstein'],
      },
      {
        id: 'street_2',
        label: 'Street 2',
        unit: 'kineret',
        grade: '5th Grade Girls',
        campers: ['Dylan Brandt', 'Emmie Braver', 'Frankie Cutler', 'Millie Dragotta', 'Margalit Kranjec', 'Emilia Louik', 'Evelyn Meyer', 'Simone Rubin', 'Claudia Visiou', 'Leonie Weygandt'],
        staff: ['Tash Collins', 'Lara Sitton', 'Juliana Fienberg', 'Mollie Kaplan', 'Roni Nevo'],
      },
      {
        id: 'street_3',
        label: 'Street 3',
        unit: 'kineret',
        grade: '5th Grade Girls',
        campers: ['Avery Brooks', 'Maddy Bukstein', 'Charlotte Gillman', 'Abigail Gordon', 'Shayna Jennings', 'Cordelia Kelly', 'Eleanor Mandel', 'Lila Mandel', 'Lila Patel', 'Mila Pritchett'],
        staff: ['Harlow Greenwald', 'Madison Greenwald', 'Brooke Manasse', 'Nastya Bondarchuk'],
      },
      {
        id: 'street_4',
        label: 'Street 4',
        unit: 'kineret',
        grade: '6th Grade Girls',
        campers: ['Noa Blum', 'Sydney Bonnington', 'Aggie Boystov', 'Sasha Brinkman', 'Ella Dalis', 'Cammie Engel', 'Lyla Mayer', 'Aviva Podlipsky', 'Sloane Usdan', 'Rose Whiteford'],
        staff: ['Ella Ettinger', 'Scarlett Preis', 'Eden Chesler', 'Cameron Smith', 'Franki Kurlansky'],
      },
      {
        id: 'street_5',
        label: 'Street 5',
        unit: 'kineret',
        grade: '6th Grade Girls',
        campers: ['Lucy Brown', 'Paige Childs', 'Cora Ettinger', 'Lydia Kovak', 'Dora Preus', 'Mila Roberman', 'Adalyn Rhoades', 'Ruby Smerd', 'Eva Vaughan', 'Neva Voci Spoon'],
        staff: ['Maya Gelman', 'Sylvia Svoboda', 'Ella Golomb', 'Cara Zweig', 'Katie Leigh'],
      },
      {
        id: 'street_6',
        label: 'Street 6',
        unit: 'kineret',
        grade: '6th Grade Girls',
        campers: ['Hannah Grober Morrow', 'Ada Hammer Hall', 'Harper Liu', 'Sylvia Maldonado', 'Tali Rowland', 'Mira VanBelleghem', 'Nina VanBelleghem', 'Gabriella Ward', 'Sadie Wiginton', 'Tali Zelin'],
        staff: ['Sadie Smith', 'Annie Donnachie', 'Abby Stein', 'Abby Weinstein'],
      },
      {
        id: 'street_7',
        label: 'Street 7',
        unit: 'kineret',
        grade: '5th Grade Boys',
        campers: ['Sawyer Andy', 'Beckham Bart', 'Josh Binder', 'Eli Delman', 'Archie Hinesman', 'Charlie Joseph', 'Jack Kellerman', 'Ashton Miller', 'Zain Mir', 'Jake Tasman', 'Henry Weisberg', 'Gabe Werman'],
        staff: ['Jake Schacter', 'Mitch Mazer'],
      },
      {
        id: 'street_8',
        label: 'Street 8',
        unit: 'kineret',
        grade: '5th Grade Boys',
        campers: ['Evan Bachman', 'Benji Eisner', 'Max Ferris', 'Charlie Fristedt', 'Gus Funsfinn', 'Tal Guttman', 'Casey Helman', 'Noah Lemiuex', 'Sid Pransky', 'Kurtis Price', 'Henry Weitz'],
        staff: ['Rikki Tomes', 'Ran Sidi'],
      },
      {
        id: 'street_9',
        label: 'Street 9',
        unit: 'kineret',
        grade: '6th Grade Boys',
        campers: ['Lucas Dalis', 'Ricky Gama', 'Henry Haber', 'Benji Handler', 'Ari Kreiger', 'Artur Lomakin', 'Emory Smith', 'Graham Williams'],
        staff: ['Thomas Levine', 'Jonny Kitrilakis', 'Blake Silverman', 'Jacob Laidhold'],
      },
      {
        id: 'street_10',
        label: 'Street 10',
        unit: 'kineret',
        grade: '6th Grade Boys',
        campers: ['Branson Crider', 'Ethan Elias', 'Grant Gafford', 'Francisco Goldstein', 'Jesse Goldstein', 'Sander Raskin', 'Gavin Ross', 'Dylan Samuels', 'Ethan Simakovsky', 'Jake Werman', 'George Whitlatch', 'Benji Winston'],
        staff: ['Ezra Hulnick', 'Jayden Cuniff'],
      },
      {
        id: 'street_11',
        label: 'Street 11',
        unit: 'kineret',
        grade: '6th Grade Boys',
        campers: ['Cru Evans', 'Max Freyberg', 'Evan Hartz', 'Henry Hunter', 'Judah Resnick', 'Eli Shuster', 'Eli Vaughan', 'Aidan Wolfson'],
        staff: ['Alexander Harris', 'Ido Yakov', 'Brett Munster'],
      },
    ],
  },
  {
    id: 'halutzim',
    label: 'Halutzim',
    cabins: [
      {
        id: 'park_1',
        label: 'Park 1',
        unit: 'halutzim',
        grade: '7th Grade Girls',
        campers: ['Emma Bukstein', 'Mae Fishman', 'Sadye Herckis McCarthy', 'Isabella Huber', 'Nora Jackson', 'Tessa Jacobs', 'Annie Kernoff', 'Dara Mittenthal', 'Parker Neidus', 'Silvia Visiou'],
        staff: ['Teah Foreman', 'Sophie Lichten', 'Lily Feinman', 'Dalia Shvartsman', 'Ayelet Katash'],
      },
      {
        id: 'park_2',
        label: 'Park 2',
        unit: 'halutzim',
        grade: '7th Grade Girls',
        campers: ['Paige Angelucci', 'Tatum Baron', 'Alice Butterbaugh', 'Rachel Goldblatt', 'Savannah Gustman', 'Ava Jones', 'Molly Lieberman', 'Penelope Orbach', 'Ariana Salitrik', 'Ari Wolfson'],
        staff: ['Karli Garcia', 'Sadie Morgenstern', 'Amelia Roscow', 'Adi Farbman', 'Zerya Sofir'],
      },
      {
        id: 'park_3',
        label: 'Park 3',
        unit: 'halutzim',
        grade: '7th Grade Girls',
        campers: ['Alyssa Berlin', 'Zoey Brendler', 'Mary Ford', 'Lia Galak', 'Claire Lemerman', 'Fiona Rauseo', 'Savanna Tuss', 'Liv Werman', 'Livie Yahr', 'Nancy Zeide Horn'],
        staff: ['Ronni Greenberg', 'Sarah Nixon', 'Hila Shafir', 'Noa Ever', 'Maya Ben Simon'],
      },
      {
        id: 'park_4',
        label: 'Park 4',
        unit: 'halutzim',
        grade: '7th Grade Girls',
        campers: ['Eleanor Gordon', 'Alana Lieberman', 'Sasha Petroff', 'Dylan Pritchett', 'Emi Sandler', 'Paige Schloss', 'Sasha Senser', 'Stella Senser', 'Evelyn VanPike'],
        staff: ['Aliza Shear', 'Maya Ben Zur', 'Sukhi Singh', 'Naomi Hantman'],
      },
      {
        id: 'park_5',
        label: 'Park 5',
        unit: 'halutzim',
        grade: '7th Grade Boys',
        campers: ['Robbie Bassett', 'Zach Binder', 'Tommy Freiman', 'Ethan Friedman', 'Elijah Jennings', 'Eddie Marmura', 'Spencer Shapiro', 'Eli Simakovsky', 'Asher Tobe', 'Wes Weisberg'],
        staff: ['Joe Curry', 'Yuval Gamliel'],
      },
      {
        id: 'park_6',
        label: 'Park 6',
        unit: 'halutzim',
        grade: '7th Grade Boys',
        campers: ['Charlie Correa', 'Sawyer Funsfinn', 'Liam Hayashi', 'Evan Kaplan', 'Asher Kobrin', 'Alex Lowry', 'Ethan Scheinberg', 'Miles Zuraw'],
        staff: ['Eli Lando', 'Bennett Passarelli'],
      },
      {
        id: 'park_7',
        label: 'Park 7',
        unit: 'halutzim',
        grade: '8th Grade Boys',
        campers: ['Alexander Brodsky', 'Asher Fristedt', 'Garrison Merritt', 'Rafi Mir', 'Asher Resnick', 'Joaquin Sobel', 'Alex Spencer', 'Drew Stein', 'Cole Welch', 'Geoffrey Welch'],
        staff: ['Lucas Wuertele', 'Haydon Aiello'],
      },
      {
        id: 'park_8',
        label: 'Park 8',
        unit: 'halutzim',
        grade: '8th Grade Boys',
        campers: ['Solomon Cutler', 'Thatcher Guthrie Stewart', 'Sam Liederman', 'Dexter Miller', 'Charles Regan', 'Simon Senser', 'Ido Simundza', 'Oliver Skurman'],
        staff: ['Ben Seewald', 'Matthew Siff'],
      },
      {
        id: 'park_9',
        label: 'Park 9',
        unit: 'halutzim',
        grade: '8th Grade Boys',
        campers: ['Zach Banocy', 'Luke Braver', 'Nathan Delman', 'Casey Mayer', 'Ben Mandel', 'Felix Mandel', 'Asher Rosenstein', 'Ryan Rowland'],
        staff: ['Kyle Royston', 'Aidan Stein'],
      },
      {
        id: 'park_10',
        label: 'Park 10',
        unit: 'halutzim',
        grade: '8th Grade Girls',
        campers: ['Charlotte Baird', 'Ariana Conrad', 'Ayla Cunningham', 'Kay Hand', 'Rheya Kaur Pekker', 'Maya Preus', 'Anna Silverlieb', 'Rebecca Silverlieb'],
        staff: ['Shayna Strong Jacobson', 'Jacqueline Harris', 'Hannah Hurowitz', 'Aviva Monaco Polk', 'Rachel Yehula'],
      },
      {
        id: 'park_11',
        label: 'Park 11',
        unit: 'halutzim',
        grade: '8th Grade Girls',
        campers: ['Adele Bizjak', 'Callan Hirsh', 'Mira Hofmann', 'Madeline Landis', 'Rory Schloss', 'Isla Shaprio', 'Ella Tasman', 'Abby Wade'],
        staff: ['Jordan Pollner', 'Haley Levine', 'Zoe Blum', 'Rebekah Katz'],
      },
    ],
  },
  {
    id: 'teens',
    label: 'Teens',
    cabins: [
      {
        id: 'quad_1__tent_1',
        label: 'Quad 1 - Tent 1',
        unit: 'teens',
        grade: '9th Grade Boys',
        campers: ['Max Ford', 'Michael Ireland Mitz', 'Noah Lemerman', 'Sammy Lieb', 'Zion Stubbs'],
        staff: ['Daniel Seewald'],
      },
      {
        id: 'quad_1__tent_2',
        label: 'Quad 1 - Tent 2',
        unit: 'teens',
        grade: '9th Grade Boys',
        campers: ['Jonah Kreiger', 'Sidney Lieberman', 'Ethan Mayster', 'Ivan Yanov'],
        staff: ['Aden Epstein'],
      },
      {
        id: 'quad_1__tent_3',
        label: 'Quad 1 - Tent 3',
        unit: 'teens',
        grade: '9th Grade Boys',
        campers: ['Drew Brindza', 'Leo Joseph', 'Ryder Maeroff', 'Joey Milner', 'Eyal Mordechay', 'Itay Yurik'],
        staff: ['Everett Meade'],
      },
      {
        id: 'quad_3__tent_1',
        label: 'Quad 3 - Tent 1',
        unit: 'teens',
        grade: '9th Grade Boys',
        campers: ['Oliver Clark', 'Theo Finer', 'Benji Friedman', 'Rooney Kirk', 'Ender Lin'],
        staff: ['Steven Kitrilakis'],
      },
      {
        id: 'quad_3__tent_2',
        label: 'Quad 3 - Tent 2',
        unit: 'teens',
        grade: '9th Grade Boys',
        campers: ['Asher Usdan', 'Arlo Bastress', 'Owen Clark', 'Noah Patel'],
        staff: ['Harry Mayer'],
      },
      {
        id: 'quad_3__tent_3',
        label: 'Quad 3 - Tent 3',
        unit: 'teens',
        grade: '9th Grade Boys',
        campers: ['Frank Correa', 'Jack Gillman', 'Callan Hunter', 'Jacob Zelin'],
        staff: ['Guy Tshuva'],
      },
      {
        id: 'quad_5__tent_1',
        label: 'Quad 5 - Tent 1',
        unit: 'teens',
        grade: '10th Grade Girls',
        campers: ['Leah Alpert', 'Brooke Band', 'Raliegh Neustadt', 'Sasha Pechersky', 'Eva Scheinberg', 'Laila VanBelleghem'],
        staff: ['Liza Bondarchuk'],
      },
      {
        id: 'quad_5__tent_2',
        label: 'Quad 5 - Tent 2',
        unit: 'teens',
        grade: '10th Grade Girls',
        campers: ['Ellie Berger', 'Aubrey Fechter Leggett', 'Livia Tobias', 'Juliana Zuraw'],
        staff: ['Caroline Rock'],
      },
      {
        id: 'quad_5__tent_3',
        label: 'Quad 5 - Tent 3',
        unit: 'teens',
        grade: '10th Grade Girls',
        campers: ['Julia Cantor', 'Sydney Crivella', 'Maddie Feinman', 'Liv Rauseo', 'Mallory Yahr'],
        staff: ['Victoria Fienberg'],
      },
      {
        id: 'quad_5__tent_4',
        label: 'Quad 5 - Tent 4',
        unit: 'teens',
        grade: '10th Grade Girls',
        campers: ['Ofir Bener', 'Maya Goldstein', 'Shoshana Graver', 'Lily Shevitz', 'Amaia Sobel', 'Neta Tigay'],
        staff: ['Hadar Mula'],
      },
      {
        id: 'quad_5__tent_5',
        label: 'Quad 5 - Tent 5',
        unit: 'teens',
        grade: '10th Grade Girls',
        campers: ['Shahar Gabso', 'Alexa Leveton', 'Lily Neiman', 'Talia Sampson', 'Daphne Sancovschi'],
        staff: ['Yael Benkovich'],
      },
      {
        id: 'quad_6__tent_1',
        label: 'Quad 6 - Tent 1',
        unit: 'teens',
        grade: '9th Grade Girls',
        campers: ['Gili Dahan', 'Alin Dror', 'Margo Freiman', 'Alexa Freundlich', 'Harper Harris', 'Campbell Miller'],
        staff: ['Casey Bloom'],
      },
      {
        id: 'quad_6__tent_2',
        label: 'Quad 6 - Tent 2',
        unit: 'teens',
        grade: '9th Grade Girls',
        campers: ['Talya Druker', 'Morgan Greenwald', 'Alivia Gustman', 'Maya Kingsley', 'Chen Mishiner', 'Lielle Touaf'],
        staff: ['Maya Golden'],
      },
      {
        id: 'quad_6__tent_3',
        label: 'Quad 6 - Tent 3',
        unit: 'teens',
        grade: '9th Grade Girls',
        campers: ['Emerson Johnson', 'Zoe Kossovsky', 'Julia Kravec', 'Sadie Mazer', 'Stella Swoger', 'Sadie West'],
        staff: ['Bianca Belinsky'],
      },
      {
        id: 'quad_6__tent_4',
        label: 'Quad 6 - Tent 4',
        unit: 'teens',
        grade: '9th Grade Girls',
        campers: ['Sophia Alpert', 'Ava Golomb', 'Sophie Kahn', 'Sloane Pritchett', 'Amelie Taylor', 'Sarey Winston'],
        staff: ['Rylan Milenthal'],
      },
      {
        id: 'quad_7__tent_1',
        label: 'Quad 7 - Tent 1',
        unit: 'teens',
        grade: '10th Grade Boys',
        campers: ['Dudai Yishy', 'Jaylen Green', 'Declan Reichs', 'Alon Segal', 'Miles Wuertele'],
        staff: ['Ian Goldfeder'],
      },
      {
        id: 'quad_7__tent_2',
        label: 'Quad 7 - Tent 2',
        unit: 'teens',
        grade: '10th Grade Boys',
        campers: ['Ari Cohn', 'Zack Karabin', 'Cameron Lieberman', 'Sam Olin', 'Sawyer Schonfeld'],
        staff: ['Eli Firman'],
      },
      {
        id: 'quad_7__tent_3',
        label: 'Quad 7 - Tent 3',
        unit: 'teens',
        grade: '10th Grade Boys',
        campers: ["Be'ery Assaf", 'Daniel Baron', 'Miles Buckanovich', 'Lucas Harris', 'Amos Tama'],
        staff: ['Ofir Zinger'],
      },
      {
        id: 'quad_7__tent_4',
        label: 'Quad 7 - Tent 4',
        unit: 'teens',
        grade: '10th Grade Boys',
        campers: ['Emmett Fechter Leggett', 'Ofir Farbman', 'Chase Mender', 'Yotam Osovski', 'Josh Serror'],
        staff: ['Ido Shmueli'],
      },
    ],
  },
];

export function findPersonInBunks(query: string): Array<{ name: string; cabin: Cabin; unit: Unit; isStaff: boolean }> {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const results: Array<{ name: string; cabin: Cabin; unit: Unit; isStaff: boolean }> = [];
  for (const unit of UNITS) {
    for (const cabin of unit.cabins) {
      for (const name of cabin.campers) {
        if (name.toLowerCase().includes(q)) results.push({ name, cabin, unit, isStaff: false });
      }
      for (const name of cabin.staff) {
        if (name.toLowerCase().includes(q)) results.push({ name, cabin, unit, isStaff: true });
      }
    }
  }
  return results;
}
