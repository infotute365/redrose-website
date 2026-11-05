export type SchoolEvent = {
  slug: string;
  category: string;
  tone: "amber" | "rose" | "sky" | "emerald";
  title: string;
  description: string;
  image: string;
  alt: string;
};

export const eventsSection = {
  eyebrow: "News & events",
  title: "Information",
  highlight: "& events.",
};

export const schoolEvents: SchoolEvent[] = [
  {
    slug: "prize-distribution",
    category: "Achievements",
    tone: "amber",
    title: "Celebrating achievements",
    description: "Highlights from our Annual Prize Distribution, honouring a year of hard work.",
    image: "/images/events/Event1.jpeg",
    alt: "Three students standing on a winners' podium in front of a tricolour backdrop",
  },
  {
    slug: "beyond-the-classroom",
    category: "Extracurricular",
    tone: "rose",
    title: "Beyond the classroom",
    description: "Dance, music and performances that let every student shine on stage.",
    image: "/images/events/Event3.jpeg",
    alt: "Young students in white outfits performing a dance on a colourful stage",
  },
  {
    slug: "science-exhibition",
    category: "Science",
    tone: "sky",
    title: "The Science Exhibition",
    description: "Young innovators discovering the wonders of science through hands-on models.",
    image: "/images/events/Event2.jpeg",
    alt: "Three boys presenting their science model of a town with roads and green fields",
  },
  {
    slug: "honouring-our-values",
    category: "Heritage",
    tone: "emerald",
    title: "Honouring our values",
    description: "Assemblies and celebrations that connect students with our heritage.",
    image: "/images/events/Event4.jpeg",
    alt: "A student giving a speech at a podium beside a classmate wearing a tricolour sash",
  },
];

export const classroomShowcase = [
  {
    id: "new-journey",
    title: "A new journey begins",
    description:
      "Excitement filled the air as students stepped into their classrooms, ready for a year of learning, friendship, and growth. Here’s to new beginnings!",
    src: "/images/home2.jpeg",
    alt: "Two students smiling at a classroom desk",
  },
  {
    id: "learning-growth",
    title: "A place to learn and grow",
    description:
      "Our school is a welcoming place to explore, discover, and thrive. Every day brings new ideas, new skills, and new opportunities to grow.",
    src: "/images/home1.jpeg",
    alt: "Red Rose School building",
  },
  {
    id: "together",
    title: "Together as one",
    description:
      "Each morning, students gather to share ideas and start the day with a sense of community, school spirit, and motivation.",
    src: "/images/home3.jpeg",
    alt: "Students gathered for morning assembly",
  },
];
