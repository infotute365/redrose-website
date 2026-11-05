import { HomeExperience } from "@/src/components/public/home/HomeExperience";
import { Edu_Img_Showcase } from "@/src/components/public/home/Eduction-Md-Principal/EduImgShowcase";
import { MessageDesk } from "@/src/components/public/home/Eduction-Md-Principal/Message-Desk";
import { PrincipalMessage } from "@/src/components/public/home/Eduction-Md-Principal/Prinicipal-Message";
import { EventsSection } from "@/src/components/public/home/inforamation-events/events-section";
import { getCirculars } from "@/src/lib/circulars";
import { getHomeSlides, getSchoolEvents } from "@/src/lib/dynamic-sections";
export const dynamic = "force-dynamic";
export default async function Home() {
  const [circulars, slides, events] = await Promise.all([
    getCirculars(),
    getHomeSlides(),
    getSchoolEvents(),
  ]);
  return (
    <main className="flex-1">
      <HomeExperience circulars={circulars} slides={slides} />
      <Edu_Img_Showcase />
      <MessageDesk />
      <PrincipalMessage />
      <EventsSection events={events} />
    </main>
  );
}
