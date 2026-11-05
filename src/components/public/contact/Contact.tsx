import { Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/src/components/shared/Container";

const schoolAddress = "Rongpur Part III, Rongpur, Silchar, Assam 788009";

type ContactProps = {
  phone: string;
  email: string;
};

export function Contact({ phone, email }: ContactProps) {
  return (
    <section aria-labelledby="contact-heading" className="py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-800">
            Get in touch
          </p>
          <h1
            id="contact-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-[#193e66] sm:text-4xl"
          >
            Contact us
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-gray-600">
            We would be happy to hear from you. Reach out or visit Red Rose Academy.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <ContactCard icon={<MapPin aria-hidden="true" className="size-5" />} title="Visit us">
              <address className="not-italic">{schoolAddress}</address>
            </ContactCard>
            <ContactCard icon={<Phone aria-hidden="true" className="size-5" />} title="Call us">
              <a
                href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                className="wrap-break-word hover:text-sky-800 focus-visible:outline-2 focus-visible:outline-sky-800"
              >
                {phone}
              </a>
            </ContactCard>
            <ContactCard icon={<Mail aria-hidden="true" className="size-5" />} title="Email us">
              <a
                href={`mailto:${email}`}
                className="wrap-break-word hover:text-sky-800 focus-visible:outline-2 focus-visible:outline-sky-800"
              >
                {email}
              </a>
            </ContactCard>
          </div>
        </div>
      </Container>
    </section>
  );
}

function ContactCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
      <div className="flex size-10 items-center justify-center rounded-full bg-sky-50 text-sky-800">
        {icon}
      </div>
      <h2 className="mt-4 font-semibold text-[#193e66]">{title}</h2>
      <div className="mt-2 text-sm leading-6 text-gray-600">{children}</div>
    </div>
  );
}
