// ====== TRIBES — MOCK DATA ======

const CATEGORIES = [
  { id: "young-entrepreneurs", mono: "Y", name: "Young Entrepreneurs", desc: "Founders, hustlers, and first-time CEOs building in public.", tone: 1, members: 2847, vibe: "Professional", ages: ["18-24","25-34"], loc: "global" },
  { id: "slay-gurls", mono: "S", name: "Slay Gurls", desc: "Main character energy. Confidence, style, community.", tone: 2, members: 5120, vibe: "Gen-Z", ages: ["16-20","21-25"], loc: "global" },
  { id: "cs2-gamers", mono: "C", name: "CS2 Gamers", desc: "5-stacks, ranked clutches, skin talk. Competitive and casual both welcome.", tone: 3, members: 8431, vibe: "Gamer", ages: ["16-20","21-25","25-34"], loc: "global" },
  { id: "coffee-nerds", mono: "C", name: "Coffee Nerds", desc: "V60, espresso tuning, bean reviews. Pour-over evangelists.", tone: 4, members: 1203, vibe: "Chill", ages: ["25-34","35+"], loc: "global" },
  { id: "gym-bros", mono: "G", name: "Gym Bros", desc: "Split routines, form checks, progressive overload.", tone: 5, members: 3902, vibe: "Gamer", ages: ["18-24","25-34"], loc: "global" },
  { id: "indie-devs", mono: "I", name: "Indie Devs", desc: "Shipping side projects, chasing first $1, debugging at 3am.", tone: 1, members: 1789, vibe: "Professional", ages: ["21-25","25-34","35+"], loc: "global" },
  { id: "k-pop-stans", mono: "K", name: "K-Pop Stans", desc: "Comeback watchers, lightstick hauls, concert buddies.", tone: 2, members: 6874, vibe: "Gen-Z", ages: ["16-20","21-25"], loc: "global" },
  { id: "thrift-queens", mono: "T", name: "Thrift Queens", desc: "Vintage hauls, flip finds, Depop drops.", tone: 3, members: 2210, vibe: "Gen-Z", ages: ["16-20","21-25"], loc: "global" },
  { id: "book-club", mono: "B", name: "Book Club", desc: "Fiction readers, fantasy nerds, BookTok refugees.", tone: 4, members: 1842, vibe: "Chill", ages: ["21-25","25-34","35+"], loc: "global" },
  { id: "plant-parents", mono: "P", name: "Plant Parents", desc: "Monstera moms, variegated hunters, amateur soil scientists.", tone: 5, members: 987, vibe: "Chill", ages: ["25-34","35+"], loc: "global" },
  { id: "valorant-mains", mono: "V", name: "Valorant Mains", desc: "Duelist mains, smoke mains, ranked LFG.", tone: 1, members: 5612, vibe: "Gamer", ages: ["16-20","21-25"], loc: "global" },
  { id: "digital-nomads", mono: "D", name: "Digital Nomads", desc: "Laptop in Bali, wifi in Lisbon. Remote worker fam.", tone: 2, members: 2145, vibe: "Professional", ages: ["25-34","35+"], loc: "global" },
  { id: "anime-gang", mono: "A", name: "Anime Gang", desc: "Seasonal watchers, manga readers, cosplay plans.", tone: 3, members: 7321, vibe: "Gen-Z", ages: ["16-20","21-25"], loc: "global" },
  { id: "producers", mono: "P", name: "Producers", desc: "FL Studio, Ableton, Logic. Beatmakers and bedroom DJs.", tone: 4, members: 1654, vibe: "Gen-Z", ages: ["16-20","21-25","25-34"], loc: "global" },
  { id: "skate-crew", mono: "S", name: "Skate Crew", desc: "Park sessions, kickflips, Thrasher reads.", tone: 5, members: 1123, vibe: "Gen-Z", ages: ["16-20","21-25"], loc: "global" },
  { id: "writers-room", mono: "W", name: "Writers Room", desc: "Essays, newsletters, fiction drafts. Share and critique.", tone: 1, members: 942, vibe: "Chill", ages: ["21-25","25-34","35+"], loc: "global" },
];

const VIBES = ["Gen-Z", "Gamer", "Professional", "Chill"];
const AGE_BUCKETS = ["16-20", "21-25", "25-34", "35+"];
const LOCATIONS = ["Global", "NYC", "LA", "London", "Tokyo", "Berlin"];

const PEOPLE = [
  { id: "me", name: "Neil", handle: "@neil", mono: "N", tone: 1, bio: "Building Tribes. Hmu if you're shipping something.", loc: "NYC", age: "25-34", tribes: ["young-entrepreneurs","indie-devs","coffee-nerds"] },
  { id: "u1", name: "Kai", handle: "@kaii", mono: "K", tone: 2, bio: "23, fashion and vintage. Chasing the next Depop drop.", loc: "NYC", age: "21-25", tribes: ["slay-gurls","thrift-queens","k-pop-stans"] },
  { id: "u2", name: "Maya", handle: "@mayacodes", mono: "M", tone: 3, bio: "Indie dev shipping microsaas. Building in public.", loc: "Berlin", age: "25-34", tribes: ["indie-devs","young-entrepreneurs","coffee-nerds"] },
  { id: "u3", name: "Jordan", handle: "@j0rdxn", mono: "J", tone: 4, bio: "CS2 IGL. LFG 5-stack for ranked. Mic required.", loc: "London", age: "21-25", tribes: ["cs2-gamers","valorant-mains","gym-bros"] },
  { id: "u4", name: "Zara", handle: "@zaraaa", mono: "Z", tone: 5, bio: "18, Depop seller. Thrift and vintage finds weekly.", loc: "LA", age: "16-20", tribes: ["slay-gurls","thrift-queens","anime-gang"] },
  { id: "u5", name: "Rohan", handle: "@rohan.builds", mono: "R", tone: 1, bio: "Founder at stealth. 2x exits. Cold brew enthusiast.", loc: "NYC", age: "25-34", tribes: ["young-entrepreneurs","coffee-nerds","digital-nomads"] },
  { id: "u6", name: "Elle", handle: "@ellewrites", mono: "E", tone: 2, bio: "Reading 40 books this year. Fantasy head. Always up for recs.", loc: "London", age: "25-34", tribes: ["book-club","plant-parents","writers-room"] },
  { id: "u7", name: "Dex", handle: "@dexfps", mono: "D", tone: 3, bio: "Valorant Radiant. Coaching on the side. 19.", loc: "LA", age: "16-20", tribes: ["valorant-mains","cs2-gamers","producers"] },
  { id: "u8", name: "Lin", handle: "@lin.cafe", mono: "L", tone: 4, bio: "Third wave barista. V60 zealot. Find me at a cafe.", loc: "Tokyo", age: "21-25", tribes: ["coffee-nerds","book-club"] },
  { id: "u9", name: "Bella", handle: "@bellaslays", mono: "B", tone: 5, bio: "17, slay squad captain. Main character always.", loc: "LA", age: "16-20", tribes: ["slay-gurls","k-pop-stans","anime-gang"] },
  { id: "u10", name: "Tariq", handle: "@tariqlifts", mono: "T", tone: 1, bio: "PPL split, 6 days. Chasing a 225 bench.", loc: "NYC", age: "21-25", tribes: ["gym-bros","cs2-gamers"] },
  { id: "u11", name: "Sae", handle: "@sae.prod", mono: "S", tone: 2, bio: "Makes beats. FL Studio head. DM for collabs.", loc: "Tokyo", age: "21-25", tribes: ["producers","anime-gang","k-pop-stans"] },
  { id: "u12", name: "Nico", handle: "@nicoflips", mono: "N", tone: 3, bio: "Skate or die. Vintage tee addict. 22.", loc: "Berlin", age: "21-25", tribes: ["skate-crew","thrift-queens","producers"] },
  { id: "u13", name: "Priya", handle: "@priya.eth", mono: "P", tone: 4, bio: "On-chain dev. Shipping indie experiments.", loc: "Global", age: "25-34", tribes: ["indie-devs","digital-nomads"] },
  { id: "u14", name: "Oli", handle: "@olinomad", mono: "O", tone: 5, bio: "Remote PM. 34 countries. Currently in Lisbon.", loc: "Global", age: "25-34", tribes: ["digital-nomads","coffee-nerds","young-entrepreneurs"] },
  { id: "u15", name: "Fern", handle: "@fernhaus", mono: "F", tone: 1, bio: "44 plants. Variegated monstera enthusiast.", loc: "London", age: "35+", tribes: ["plant-parents","book-club"] },
];

const POSTS = [
  { user: "u2", tribe: "indie-devs", time: "2h", body: "Shipped v0.3 today. First paying customer. $19/mo but it counts.", likes: 142, comments: 18 },
  { user: "u5", tribe: "young-entrepreneurs", time: "6h", body: "Hot take: your first startup will fail. Plan for it. Learn fast. Go again.", likes: 412, comments: 89 },
  { user: "u8", tribe: "coffee-nerds", time: "8h", body: "V60 at 1:16, 94c, 2:45 total. Finally got the geisha tasting right. Floral notes coming through.", likes: 203, comments: 31 },
  { user: "u3", tribe: "cs2-gamers", time: "1h", body: "5-stack needs an AWP and IGL. EU servers, mic required. Silver to Gold welcome.", likes: 67, comments: 24 },
  { user: "u13", tribe: "indie-devs", time: "3h", body: "Three months in, two churned customers, one roadmap burnout. Still shipping.", likes: 189, comments: 56 },
  { user: "u11", tribe: "producers", time: "5h", body: "Dropped a new lofi pack. Free DL. Lmk what you flip.", likes: 98, comments: 14 },
];

const DM_THREADS = [
  {
    id: "t1",
    withUser: "u2",
    unread: true,
    time: "2m",
    messages: [
      { from: "u2", text: "Yooo saw your Tribes idea. Looks sick", time: "Yesterday" },
      { from: "u2", text: "You indexing on any particular vertical first?", time: "Yesterday" },
      { from: "me", text: "Thinking interest-first rather than geo-first tbh", time: "Yesterday" },
      { from: "u2", text: "Makes sense. Stan", time: "2m" },
    ]
  },
  {
    id: "t2",
    withUser: "u5",
    unread: false,
    time: "1h",
    messages: [
      { from: "me", text: "Hey saw your post on first startup failing. Needed that.", time: "1h" },
      { from: "u5", text: "Real. DM me if you ever wanna chat. Love what you're building.", time: "1h" },
    ]
  },
  {
    id: "t3",
    withUser: "u3",
    unread: true,
    time: "20m",
    messages: [
      { from: "u3", text: "You down to queue CS2?", time: "30m" },
      { from: "u3", text: "LFG 5-stack Silver to Gold ok?", time: "20m" },
    ]
  },
];
