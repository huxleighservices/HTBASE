// Bunk data from master bunk 2026 session 1 PDF — do not edit manually

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
        campers: ['Emerson Durst', 'Shaina Gerber', 'Hannah Goldman', 'Ilana Hammerstein', 'Maya Mangini', 'Mueller Evie', 'Eloise Parker', 'Ava Shapiro', 'Quinn Spanovich', 'Bella Tobe'],
        staff: ['Lily Cantor', 'Adi Farbman'],
      },
      {
        id: 'circle_2',
        label: 'Circle 2',
        unit: 'sabra',
        grade: '4th Grade Girls',
        campers: ['Clara Creswell', 'Hannah Frank', 'Claudia Grubman', 'Madeline Katz', 'Stella Peleato', 'Schultz Dakota', 'Hazel Shaw', 'Sloane Small', 'Sophie Tannenbaum', 'Skylar Weinstein'],
        staff: ['Parker Cohn', 'Izzy West'],
      },
      {
        id: 'circle_3',
        label: 'Circle 3',
        unit: 'sabra',
        grade: '2nd/3rd Grade Girls',
        campers: ['Edith Davis', 'Reese Fleming', 'Miriam Kryger', 'Phoebe Leers', 'Abby Paul', 'Vivian Parker', 'Dani Sagman', 'Olivia Schacter', 'Gavi Stamm', 'Madi Wedner'],
        staff: ['Eden Chesler', 'Hannah Schneider'],
      },
      {
        id: 'circle_4',
        label: 'Circle 4',
        unit: 'sabra',
        grade: '2nd/3rd Grade Girls',
        campers: ['Lila Bailey', 'Livvy Ford', 'Ella Kertesz', 'Andi Lohmueller', 'Lily Mallgrave', 'Blakely Rothstein', 'Elle Simone', 'Mathilda Sparling', 'Lilith Sutcliffe', 'Libby Weinbaum'],
        staff: ['Rose Fuller', 'Zoe Stern'],
      },
      {
        id: 'circle_5',
        label: 'Circle 5',
        unit: 'sabra',
        grade: '2nd/3rd Grade Boys',
        campers: ['Blake Americus', 'Jamie Eberhard', 'Avi Frisch', 'Artie Glick', 'Noam Hersch', 'Gabriel Kater', 'James MacAloney', 'Ben Sohinki', 'Dylan Speck', 'Sam Stein'],
        staff: ['Solomon Donner', 'Dan Greenberg'],
      },
      {
        id: 'circle_6',
        label: 'Circle 6',
        unit: 'sabra',
        grade: '4th Grade Boys',
        campers: ['Adam Antin', 'Maddox Beech', 'Theo Blazin', 'Ajax Costakos', 'Everett Ennis', 'Oliver Hilovsky', 'Ethan Morrissey', 'Micah Schreiber', 'Sidney Sniderman', 'Leo Stamm'],
        staff: ['Adam Teplitz', 'Sam Stahl'],
      },
      {
        id: 'circle_7',
        label: 'Circle 7',
        unit: 'sabra',
        grade: '2nd/3rd Grade Boys',
        campers: ['Mario Berges', 'Arthur Busis', 'Timber Kelly', 'Adam Novak', 'Morris Samberg', 'Owen Steinbauer'],
        staff: ['Ashton Pliskin', 'Ariel Kosky'],
      },
      {
        id: 'circle_8',
        label: 'Circle 8',
        unit: 'sabra',
        grade: '4th Grade Girls',
        campers: ['Ruby Baer', 'Zarya Fagerburg', 'Gemma Gabelman', 'Isadora Mennen', 'Remy Oleksiuk', 'Claire Schmidt'],
        staff: ['Sophie Fienberg', 'Lucy Hurowitz'],
      },
      {
        id: 'circle_9',
        label: 'Circle 9',
        unit: 'sabra',
        grade: '4th Grade Boys',
        campers: ['Theo Duff', 'Levi Feinman', 'Eli Fisher', 'Matthew Katz', 'Sean MacAloney', 'Shawn Mallgrave', 'Max Munoz', 'Jackson Simonds', 'Jackson Sloan', 'Ezra Sparling'],
        staff: ['Reuben Kay', 'Jack Leon'],
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
        campers: ['Emma Eger', 'Lizzy Hauskens', 'Eleanor McHenry', 'Sarah McKain', 'Nellie Reisig', 'Candice Rothstein', 'Vivienne Simone', 'Lydia Stahlman', 'Clementine Wezcowicz'],
        staff: ['Harlow Greenwald', 'Juliana Fienberg', 'Abby Weinstein', 'Franki Kurlansky'],
      },
      {
        id: 'street_2',
        label: 'Street 2',
        unit: 'kineret',
        grade: '5th Grade Girls',
        campers: ['Olivia Albert', 'Marnie Americus', 'Ruth Davis', 'Emma Hameroff', 'Olivia Hameroff', 'Wynne Karlin', 'Audrey Madsen', 'Avery Mallinger', 'Elena Smyth', 'Lily Wedner'],
        staff: ['Madison Greenwald', 'Lara Sitton', 'Brooke Manasse', 'Gemma Wainstein'],
      },
      {
        id: 'street_3',
        label: 'Street 3',
        unit: 'kineret',
        grade: '5th Grade Girls',
        campers: ['Chelsea Hall', 'Eva Longman', 'Rose MacAloney', 'Maddy McGrath', 'Mender Ryan', 'Veera Mishra Sinha', 'Ivy Schwartz', 'Angelica Shaw', 'Ilana Spry', 'Sylvia Wietmarschen'],
        staff: ['Sylvia Svoboda', 'Tash Collins', 'Nastya Bondarchuk', 'Katie Leigh'],
      },
      {
        id: 'street_4',
        label: 'Street 4',
        unit: 'kineret',
        grade: '6th Grade Girls',
        campers: ['Sarah Berman', 'Jackie Cohen', 'Kathryn Cooney', 'Coralie Ennis', 'Cece Friedman', 'Leena Frisch', 'Leslie Pollner', 'Ramona Rinn', 'Ava Spitz', 'Alexa van Adelsberg'],
        staff: ['Ella Ettinger', 'Annie Donnachie', 'Maya Ben Zur', 'Cara Zweig'],
      },
      {
        id: 'street_5',
        label: 'Street 5',
        unit: 'kineret',
        grade: '6th Grade Girls',
        campers: ['Cora Duff', 'Milla Geht', 'Nora Griffin', 'Kate Iglin', 'Julia McGovern', 'Emmanuelle Mennen', 'Maya Nagler', 'Ana Oleksiuk', 'Anna Rose Sloan', 'Charlotte Wood'],
        staff: ['Scarlett Preis', 'Sadie Smith', 'Cameron Smith', 'Roni Nevo'],
      },
      {
        id: 'street_6',
        label: 'Street 6',
        unit: 'kineret',
        grade: '6th Grade Girls',
        campers: ['Arielle Baer', 'MaiLan Cooper', 'Sada Hammerstein', 'Aubrey Henderson', 'Mili Hersch', 'Millie Messick', 'Reese Pakler', 'Reagan Richman', 'Lucy Schacter'],
        staff: ['Kate Clougherty', 'Lexi Rogers', 'Mollie Kaplan', 'Talia Lando'],
      },
      {
        id: 'street_7',
        label: 'Street 7',
        unit: 'kineret',
        grade: '5th Grade Boys',
        campers: ['Isaac Braun', 'Max Eberhard', 'Aaron Fisher', 'Otto Glick', 'Wolf Glick', 'Nir Levy', 'Ben Novak', 'Thomas Oller', 'Ari Pomerantz', 'Beckett Soria Fech', 'Clayton Styen', 'Max Warshafsky'],
        staff: ['Jake Schacter', 'Luke Brodsky'],
      },
      {
        id: 'street_8',
        label: 'Street 8',
        unit: 'kineret',
        grade: '5th Grade Boys',
        campers: ['Ari Brecher', 'Malik El-Gharbawie', 'Levi Klein', 'Noah McVeagh', 'Sonny Mello', 'Marcel Nabiev', 'Noah Perer', 'Landon Pumar', 'Caleb Roth', 'Henry Weisberg'],
        staff: ['Jayden Cuniff', 'Ezra Hulnick', 'Sasha Bondarchuk'],
      },
      {
        id: 'street_9',
        label: 'Street 9',
        unit: 'kineret',
        grade: '5th Grade Boys',
        campers: ['Grayson Dennis', 'Jack Eckel', 'Graham Fleming', 'Ethan Hall', 'Asher Herman', 'Jacob Munoz', 'Theo Ruland', 'Tanner Rumbaugh', 'Henry Vestal', 'Greyson Zawid'],
        staff: ['Ran Sidi', 'Mitchell Mazer'],
      },
      {
        id: 'street_10',
        label: 'Street 10',
        unit: 'kineret',
        grade: '6th Grade Boys',
        campers: ['Connor Hayes Kutina', 'Sammy Leers', 'Max Mangini', 'Jett Mihalick', 'Samuel Rudd Chang', 'Nate Shriber', 'Charlie Sohinki', 'Sean Steinbauer', 'George Whitlatch', 'Benji Winston'],
        staff: ['Jonny Kitrilakis', 'Ido Yakov', 'Blake Silverman'],
      },
      {
        id: 'street_11',
        label: 'Street 11',
        unit: 'kineret',
        grade: '6th Grade Boys',
        campers: ['Gur Alon', 'Jonah Bartos', 'Rowan Bartos', 'Judah Clay', 'Sam Grubman', 'Rahm Schwartz', 'Moses Sutcliffe', 'Noah Tobias', 'Ido Zion'],
        staff: ['Yuval Gamliel', 'Rikki Tomes', 'Sasha Bondarchuk'],
      },
      {
        id: 'street_12',
        label: 'Street 12',
        unit: 'kineret',
        grade: '6th Grade Boys',
        campers: ['Evan Barr', 'Cole Berkowitz', 'Solomon Booker', 'Evan Hartz', 'Max Hilovsky', 'Mason Jenkinson', 'Charlie Ritchey', 'Isaac Senser'],
        staff: ['Thomas Levine', 'Adam Fienberg', 'Blake Silverman'],
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
        grade: '8th Grade Girls',
        campers: ['Shalev Cohen Karni', 'Madelyn Daffner', 'Charlise Johnson', 'Eliana Marcus', 'Mae Norwood', 'Sophie Novak', 'Maddie Perlow', 'Eden Schwartz', 'Elliot Zur'],
        staff: ['Haley Levine', 'Izzy Jacobs', 'Hannah Hurowitz', 'Noa Ever'],
      },
      {
        id: 'park_2',
        label: 'Park 2',
        unit: 'halutzim',
        grade: '8th Grade Girls',
        campers: ['Sylvia Billig Feinstein', 'Frances Doolittle', 'Ivy Foreman', 'Natalie Griffin', 'Sylvie Lang', 'Ziva Lantzman', 'Ellie McKain', 'Scarlett Rock', 'Hanna Southwick', 'Piper Stahlman'],
        staff: ['Rebekah Katz', 'Jordan Pollner', 'Dalia Shvartsman', 'Ayelet Katash'],
      },
      {
        id: 'park_3',
        label: 'Park 3',
        unit: 'halutzim',
        grade: '8th Grade Girls',
        campers: ['Teddy Booker', 'Emma Butterworth', 'Kenley Hayes Kutina', 'Emma Kime', 'Ryan Mallinger', 'Natalie McGovern', 'Anna Olshan', 'Mila Spanovich'],
        staff: ['Amelia Roscow', 'Karli Garcia', 'Zerya Sofir', 'Rahel Yehula'],
      },
      {
        id: 'park_4',
        label: 'Park 4',
        unit: 'halutzim',
        grade: '8th Grade Girls',
        campers: ['Jean Davis', 'Virgina Davis', 'Sydney Dennis', 'Sophie Drucker', 'Ruth Garcia', 'Jenna Goldberg', 'Alexa Hyman', 'Madeline Landis', 'Zoe Levi', 'Samara Shensa', 'Brooke Sogoloff', 'Maya Spitz', 'Simona Svoboda'],
        staff: ['Shayna Strong Jacobson', 'Sophie Lichten'],
      },
      {
        id: 'park_5',
        label: 'Park 5',
        unit: 'halutzim',
        grade: '7th Grade Boys',
        campers: ['Macin Davis', 'Pasha Geht', 'Logan Songer', 'Roey Tuti', 'Max Vestal', 'Jacob Wilschek'],
        staff: ['Ofir Zinger', 'Joe Curry'],
      },
      {
        id: 'park_6',
        label: 'Park 6',
        unit: 'halutzim',
        grade: '7th Grade Boys',
        campers: ['Elon Brecher', 'Eli Olshan', 'Michael Pomerantz', 'Ezra Ruttenberg', 'Eli Shapiro', 'Asher Tobe', 'Barrett Wood'],
        staff: ['Matthew Siff', 'Kyle Royston'],
      },
      {
        id: 'park_7',
        label: 'Park 7',
        unit: 'halutzim',
        grade: '8th Grade Boys',
        campers: ['Henry Berger', 'Mattan Even', 'Judah Goldston', 'Riley Herman', 'Mack Johnson', 'Alex Kitrilakis', 'Teddy Lloyd', 'Dylan McGrath', 'Charlie Messick', 'Benny Rovner', 'Josh Solomon', 'Charles Stanley'],
        staff: ['Aidan Stein', 'Eli Lando'],
      },
      {
        id: 'park_8',
        label: 'Park 8',
        unit: 'halutzim',
        grade: '8th Grade Boys',
        campers: ['Jonah Albert', 'Cal Birnbaum', 'Arieh Friedman', 'Eyal Friedman', 'Wes Gavin', 'Olliver Glick', 'Aidan Hameroff', 'John Nestico', 'Dylan Pollner', 'Jordan Pollner', 'Charles Regan', 'Jayden Seyidov'],
        staff: ['Shahar Shem Tov', 'Ben Seewald'],
      },
      {
        id: 'park_10',
        label: 'Park 10',
        unit: 'halutzim',
        grade: '7th Grade Girls',
        campers: ['Monica Berges', 'Riley Davis', 'Safi El Gharbawie', 'Ellen Gusenoff', 'Maya Hooven', 'Helena Kuehn', 'Micah Lieberthal', 'Estella Woodgrave'],
        staff: ['Sadie Morgenstern', 'Ronni Greenberg', 'Sukhi Singh', 'Yael Benkovich'],
      },
      {
        id: 'park_11',
        label: 'Park 11',
        unit: 'halutzim',
        grade: '7th Grade Girls',
        campers: ['Siena Bailey', 'Hanna Bar Av', 'Violet Eckel', 'Savannah Gustman', 'Nora Nernberg', 'Marina Smyth', 'Audrey Valen'],
        staff: ['Aviva Monaco Polk', 'Sarah Nixon', 'Naomi Hantman', 'Bianca Belinsky'],
      },
      {
        id: 'park_12',
        label: 'Park 12',
        unit: 'halutzim',
        grade: '7th Grade Girls',
        campers: ['Ella Bar Av', 'Gabriella Cohen', 'Hannah Kingsley', 'Hannah Lasus', 'Ayvah Morrissey', 'Alex Nabieva', 'Bella Ruland', 'Sivia Selig', 'Signer Sunny', 'Morgan Styen'],
        staff: ['Aliza Shear', 'Hila Shafir', 'Lily Feinman', 'Maya Ben Simon'],
      },
    ],
  },
  {
    id: 'teens',
    label: 'Teens',
    cabins: [
      {
        id: 'quad_1',
        label: 'Quad 1',
        unit: 'teens',
        grade: '',
        campers: [],
        staff: ['Cooper Boone'],
      },
      {
        id: 'quad_1__tent_1',
        label: 'Quad 1 - Tent 1',
        unit: 'teens',
        grade: '9th Grade Boys',
        campers: ['Will Chernyak', 'Miles Sandler', 'Lucas Shriber', 'Lucas Simonds'],
        staff: ['Ian Goldfeder', 'Harry Mayer'],
      },
      {
        id: 'quad_1__tent_2',
        label: 'Quad 1 - Tent 2',
        unit: 'teens',
        grade: '9th Grade Boys',
        campers: ['Enzo Fossi', 'Eli Leveton', 'Eli Lipman', 'Makar Lopata', 'Parker Vogelstein'],
        staff: ['Steven Kitrilakis'],
      },
      {
        id: 'quad_1__tent_3',
        label: 'Quad 1 - Tent 3',
        unit: 'teens',
        grade: '',
        campers: [],
        staff: ['Ido Shmueli', 'Guy Tshuva'],
      },
      {
        id: 'quad_3__tent_1',
        label: 'Quad 3 - Tent 1',
        unit: 'teens',
        grade: '10th Grade Boys',
        campers: ['Scott Harinstein', 'Cash Holtzman', 'Bergstrom Norwood', 'Thomas Ritchey'],
        staff: ['Eli Firman'],
      },
      {
        id: 'quad_3__tent_2',
        label: 'Quad 3 - Tent 2',
        unit: 'teens',
        grade: '10th Grade Boys',
        campers: ['Sam Bauman', 'Jaylen Green', 'Chase Mender', 'Phineas Regan'],
        staff: ['Jacob Friedberg'],
      },
      {
        id: 'quad_3__tent_3',
        label: 'Quad 3 - Tent 3',
        unit: 'teens',
        grade: '10th Grade Boys',
        campers: ['Eli Eidinger', 'Idan Feinberg', 'Jack Johnson', 'Eli Lasus'],
        staff: ['Daniel Seewald'],
      },
      {
        id: 'quad_3__tent_4',
        label: 'Quad 3 - Tent 4',
        unit: 'teens',
        grade: '',
        campers: [],
        staff: ['Everett Meade'],
      },
      {
        id: 'quad_5__tent_1',
        label: 'Quad 5 - Tent 1',
        unit: 'teens',
        grade: '10th Grade Girls',
        campers: ['Leah Alpert', 'Maya Capezzuto', 'Zoey Friedman', 'Drew Puffenberger', 'Sasha Svoboda'],
        staff: ['Teah Foreman'],
      },
      {
        id: 'quad_5__tent_2',
        label: 'Quad 5 - Tent 2',
        unit: 'teens',
        grade: '10th Grade Girls',
        campers: ['Ellie Berger', 'Sydney Feldman', 'Angie Nestico', 'Makayla Todd'],
        staff: ['Casey Bloom'],
      },
      {
        id: 'quad_5__tent_3',
        label: 'Quad 5 - Tent 3',
        unit: 'teens',
        grade: '10th Grade Girls',
        campers: ['Julia Cantor', 'Maddie Feinman', 'Aviva Jacobs', 'Kat Oppenheim'],
        staff: ['Maya Golden'],
      },
      {
        id: 'quad_5__tent_4',
        label: 'Quad 5 - Tent 4',
        unit: 'teens',
        grade: '',
        campers: [],
        staff: ['Rylan Milenthal', 'Hadar Mula'],
      },
      {
        id: 'quad_6__tent_1',
        label: 'Quad 6 - Tent 1',
        unit: 'teens',
        grade: '9th Grade Girls',
        campers: ['Violet Eshelbrenner', 'Chloe Madsen', 'Margaret McHenry', 'Sadie West'],
        staff: ['Caroline Rock'],
      },
      {
        id: 'quad_6__tent_2',
        label: 'Quad 6 - Tent 2',
        unit: 'teens',
        grade: '9th Grade Girls',
        campers: ['Pearl Booker', 'Lydia Gordon', 'Zoey Hotchkiss', 'Maya Kingsley', 'Ella Levy', 'Eliana Mirvish'],
        staff: ['Dani Riofrio'],
      },
      {
        id: 'quad_6__tent_3',
        label: 'Quad 6 - Tent 3',
        unit: 'teens',
        grade: '9th Grade Girls',
        campers: ['Morgan Greenwald', 'Alivia Gustman', 'Sophie Kahn', 'Laila Tobe', 'Lielle Touaf', 'Sarey Winston'],
        staff: ['Liza Bondarchuk'],
      },
      {
        id: 'quad_6__tent_4',
        label: 'Quad 6 - Tent 4',
        unit: 'teens',
        grade: '9th Grade Girls',
        campers: ['Sophia Alpert', 'Ava Garcia', 'Lilly Haber', 'Daniella Spry', 'Ava Velazquez'],
        staff: ['Almog Shlenger'],
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
