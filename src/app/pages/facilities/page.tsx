import { Facilities } from "@/src/components/public/facilities/Facilities";

export default function facilites() {
  return (
    <Facilities
      facilities={[
        {
          title: "Science Labs",
          description:
            "Well-equipped, modern, and up-to-date learning facilities. The labs provide sufficient equipment for all lab-based subjects—Physics, Chemistry, and Biology—in line with the Board’s prescriptions. They also include a substantial collection of science and other project work.",
          image: "/images/facilities/ScienceLab.jpg",
          imageAlt: "Students presenting a science project",
        },

        {
          title: "Computer Labs ",
          description:
            "Two numbers of equipped computer lab along with aptly designed curriculum makes the school an ideal place for the students to nurture their IT skills.",
          image: "/images/facilities/computer-lab.jpg",
          imageAlt: "Computer lab",
        },
        {
          title: "Library",
          description:
            "The spacious school library has extensive collection of text and reference books. The library is also equipped with a wide variety of magazines , periodicals and newspapers with reading room facilities. The school library is a nerve Centre for learning and library is open to all students of the school during school hours. All classes are provided with one library period per week.",
          image: "/images/facilities/school_library.jpg",
          imageAlt: "Library image",
        },
        {
          title: "Transportation",
          description:
            "School provide own transportation facilities . All matters related to the conveyance should be referred to the school office and our transport manager. Mr. Meloy Deb ( contact : 9612147983)",
          image: "/images/facilities/transportation.jpg",
          imageAlt: "School Bus",
        },
        {
          title: "Medium Instruction",
          description:
            "The medium of institution is English out and out as per rules of CBSE examination, New Delhi. The school also has the provision of teaching of Hindi and Bengali as second languages.",
          image: "/images/facilities/medium_instruction.jpg",
          imageAlt: "Teacher teaching",
        },
        {
          title: "Classes",
          description:
            "The classes are from Play group to VIII. The school shall soon be upgraded to senior secondary level.",
          image: "/images/facilities/school_classes.jpg",
          imageAlt: "school claasses",
        },
        {
          title: "Smart class",
          description:
            "To understand anything , visual effect is very important. So, we have introduced chapter wise smart classes for all subjects.",
          image: "/images/facilities/smart_classes.jpg",
          imageAlt: "Smart class",
        },
        {
          title: "Club Activity",
          description:
            " Club activities are an integral part of the online school. School clubs create small communities . They attract students who share the same interests such as in music , arts or sports. Club activities help students develop sense of unity and team work, learning how to work with others in reaching the same goals . They help learners develop social skills.",
          image: "/images/facilities/club_activities.jpg",
          imageAlt: "Activities in school",
        },
      ]}
      extraFacilities={[
        {
          title: "Study tour/ Excursions",
          description:
            "The school arranges small trips / study tour for students under the guidance of teachers every year where we make the students explore new things.",
          image: "/images/facilities/excursions.jpg",
          imageAlt: "kids in the bus",
        },
        {
          title: "Annual function and Sports",
          description:
            "Every year in the month of November the school celebrates its foundation day through prize giving ceremony and cultural concert in Auditoriums, and every year in the month of January , Annual sports is conducted for 2-3 days and ends with exciting prize distribution ceremony on Republic day.",
          image: "/images/facilities/sports.jpg",
          imageAlt: "volleball net and ball",
        },
        {
          title: "Exhibition",
          description:
            "Every year the school arranges an exhibition where students demonstrate their work in front of renowned guests under the guidance of their teachers.",
          image: "/images/facilities/exhibition.jpg",
          imageAlt: "two girls showing their art",
        },
        {
          title: "Health Camp",
          description:
            "Health is Wealth” Therefore , every year we organize free Health check up camp in collaboration with Reputed Health organizations for students.",
          image: "/images/facilities/healthcamp.jpg",
          imageAlt: "doctor monitioring a kid",
        },
        {
          title: "Health and Fitness",
          description:
            "According to CBSE curriculum all the students are given fitness classes everyday under the strict guidance of proficient teachers.",
          image: "/images/facilities/fitness.jpg",
          imageAlt: "kids stretching by holding volleballs",
        },
        {
          title: "Others Events",
          description:
            "School also celebrates several events like Saraswati Puja , Teachers day, Children’s day, Bhasha Sahid Divas and all the important observation days.",
          image: "/images/facilities/other_events.jpg",
          imageAlt: "events",
        },
      ]}
    />
  );
}
