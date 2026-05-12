export type NavSubLink = {
  label: string;
  href: string;
};

export type NavCategory = {
  title: string;
  links: NavSubLink[];
};

export type NavItemData = {
  id: number;
  label: string;
  goal: string;
  categories: NavCategory[];
};

export const NAVIGATION_DATA: NavItemData[] = [
  {
    id: 1,
    label: "TASKS",
    goal: "Tasks posted by users that need completion",
    categories: [
      {
        title: "Development & Engineering",
        links: [
          { label: "Frontend Development", href: "#" },
          { label: "Backend Development", href: "#" },
          { label: "Full Stack Tasks", href: "#" },
          { label: "Mobile App Development", href: "#" },
          { label: "API Integration", href: "#" },
          { label: "Debugging & Bug Fixes", href: "#" },
        ],
      },
      {
        title: "AI & Data",
        links: [
          { label: "Machine Learning Tasks", href: "#" },
          { label: "Data Analysis", href: "#" },
          { label: "Chatbot Development", href: "#" },
          { label: "Model Training", href: "#" },
          { label: "Automation Scripts", href: "#" },
          { label: "Computer Vision Tasks", href: "#" },
        ],
      },
      {
        title: "Design & Creative",
        links: [
          { label: "UI/UX Design", href: "#" },
          { label: "Graphic Design", href: "#" },
          { label: "Logo & Branding", href: "#" },
          { label: "Illustrations", href: "#" },
          { label: "Presentation Design", href: "#" },
          { label: "Video Editing", href: "#" },
        ],
      },
      {
        title: "Academic & Research",
        links: [
          { label: "Assignment Help", href: "#" },
          { label: "Mini / Final Year Projects", href: "#" },
          { label: "Research Paper Help", href: "#" },
          { label: "PPT Preparation", href: "#" },
          { label: "Lab Record Completion", href: "#" },
          { label: "Technical Reports", href: "#" },
        ],
      },
      {
        title: "Writing & Documentation",
        links: [
          { label: "Resume Writing", href: "#" },
          { label: "Technical Documentation", href: "#" },
          { label: "Blog Writing", href: "#" },
          { label: "Content Editing", href: "#" },
          { label: "Documentation Setup", href: "#" },
        ],
      },
      {
        title: "Collaboration & Teams",
        links: [
          { label: "Need Team Member", href: "#" },
          { label: "Hackathon Partner", href: "#" },
          { label: "Startup Collaboration", href: "#" },
          { label: "Project Co-founder", href: "#" },
          { label: "Study Partner", href: "#" },
        ],
      },
    ],
  },
  {
    id: 2,
    label: "P2P",
    goal: "Hire skilled individuals directly",
    categories: [
      {
        title: "Developers",
        links: [
          { label: "React Developer", href: "#" },
          { label: "Node Developer", href: "#" },
          { label: "Full Stack Developer", href: "#" },
          { label: "Python Developer", href: "#" },
          { label: "Java Developer", href: "#" },
          { label: "Mobile App Developer", href: "#" },
        ],
      },
      {
        title: "AI / ML Experts",
        links: [
          { label: "Machine Learning Engineer", href: "#" },
          { label: "Data Scientist", href: "#" },
          { label: "AI Engineer", href: "#" },
          { label: "NLP Specialist", href: "#" },
          { label: "Computer Vision Engineer", href: "#" },
        ],
      },
      {
        title: "Designers",
        links: [
          { label: "UI Designer", href: "#" },
          { label: "UX Designer", href: "#" },
          { label: "Graphic Designer", href: "#" },
          { label: "Illustrator", href: "#" },
          { label: "Brand Designer", href: "#" },
        ],
      },
      {
        title: "Academic Mentors",
        links: [
          { label: "DSA Tutor", href: "#" },
          { label: "OS Tutor", href: "#" },
          { label: "DBMS Tutor", href: "#" },
          { label: "CN Tutor", href: "#" },
          { label: "Programming Mentor", href: "#" },
        ],
      },
      {
        title: "Project Experts",
        links: [
          { label: "MERN Stack Expert", href: "#" },
          { label: "Firebase Expert", href: "#" },
          { label: "WebRTC Expert", href: "#" },
          { label: "Deployment Expert", href: "#" },
          { label: "API Architect", href: "#" },
        ],
      },
      {
        title: "Career Support",
        links: [
          { label: "Resume Review", href: "#" },
          { label: "Portfolio Review", href: "#" },
          { label: "Mock Interviews", href: "#" },
          { label: "LinkedIn Optimization", href: "#" },
          { label: "Career Guidance", href: "#" },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "WORKSHOPS",
    goal: "Live learning sessions",
    categories: [
      {
        title: "Development Workshops",
        links: [
          { label: "React Workshop", href: "#" },
          { label: "MERN Bootcamp", href: "#" },
          { label: "Backend Masterclass", href: "#" },
          { label: "Full Stack Bootcamp", href: "#" },
          { label: "Mobile App Workshop", href: "#" },
        ],
      },
      {
        title: "AI & Data Workshops",
        links: [
          { label: "Machine Learning Basics", href: "#" },
          { label: "Generative AI Workshop", href: "#" },
          { label: "Prompt Engineering", href: "#" },
          { label: "Data Science Bootcamp", href: "#" },
          { label: "Computer Vision Workshop", href: "#" },
        ],
      },
      {
        title: "Design Workshops",
        links: [
          { label: "UI Design Workshop", href: "#" },
          { label: "Figma Bootcamp", href: "#" },
          { label: "UX Case Study", href: "#" },
          { label: "Branding Workshop", href: "#" },
          { label: "Illustration Workshop", href: "#" },
        ],
      },
      {
        title: "Career Workshops",
        links: [
          { label: "Resume Building", href: "#" },
          { label: "Interview Preparation", href: "#" },
          { label: "Portfolio Building", href: "#" },
          { label: "Freelancing Guide", href: "#" },
          { label: "Startup Fundamentals", href: "#" },
        ],
      },
      {
        title: "Academic Workshops",
        links: [
          { label: "DSA Crash Course", href: "#" },
          { label: "OS Revision", href: "#" },
          { label: "DBMS Workshop", href: "#" },
          { label: "CN Workshop", href: "#" },
          { label: "Programming Bootcamp", href: "#" },
        ],
      },
      {
        title: "Live Collaboration",
        links: [
          { label: "Pair Programming", href: "#" },
          { label: "Live Debugging", href: "#" },
          { label: "Code Review Session", href: "#" },
          { label: "Project Build Live", href: "#" },
          { label: "Hackathon Prep", href: "#" },
        ],
      },
    ],
  },
  {
    id: 4,
    label: "TOP NOTES",
    goal: "High quality study material",
    categories: [
      {
        title: "Computer Science",
        links: [
          { label: "Data Structures", href: "#" },
          { label: "Operating Systems", href: "#" },
          { label: "DBMS", href: "#" },
          { label: "Computer Networks", href: "#" },
          { label: "OOPs", href: "#" },
        ],
      },
      {
        title: "Programming",
        links: [
          { label: "Java", href: "#" },
          { label: "Python", href: "#" },
          { label: "C++", href: "#" },
          { label: "JavaScript", href: "#" },
          { label: "Web Development", href: "#" },
        ],
      },
      {
        title: "AI & Data",
        links: [
          { label: "Machine Learning", href: "#" },
          { label: "Deep Learning", href: "#" },
          { label: "NLP", href: "#" },
          { label: "Data Science", href: "#" },
          { label: "Statistics", href: "#" },
        ],
      },
      {
        title: "Engineering",
        links: [
          { label: "Digital Electronics", href: "#" },
          { label: "Microprocessors", href: "#" },
          { label: "Signals & Systems", href: "#" },
          { label: "Control Systems", href: "#" },
        ],
      },
      {
        title: "Career Prep",
        links: [
          { label: "Interview Questions", href: "#" },
          { label: "Cheat Sheets", href: "#" },
          { label: "Quick Revision Notes", href: "#" },
          { label: "Project Guides", href: "#" },
        ],
      },
    ],
  },
  {
    id: 5,
    label: "WHY US?",
    goal: "Why choose our platform",
    categories: [
      {
        title: "Coming Soon",
        links: [
          { label: "More info coming soon", href: "#" },
        ],
      },
    ],
  },
];
