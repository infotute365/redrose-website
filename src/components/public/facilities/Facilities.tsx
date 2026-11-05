import Image from "next/image";

export type Facility = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
};

export function Facilities({
  facilities,
  extraFacilities = [],
  title = "Our Facilities",
  description,
}: {
  facilities: Facility[];
  extraFacilities?: Facility[];
  title?: string;
  description?: string;
}) {
  return (
    <section className="py-12 sm:py-20" aria-labelledby="facilities-heading">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <header className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
          <h1
            id="facilities-heading"
            className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl"
          >
            {title}
          </h1>
          {description && <p className="mt-4 text-base leading-7 text-stone-600">{description}</p>}
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {facilities.map((facility, index) => (
            <article
              key={facility.title}
              className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm"
            >
              <Image
                src={facility.image}
                alt={facility.imageAlt}
                width={1200}
                height={800}
                loading={index === 0 ? "eager" : "lazy"}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="aspect-3/2 w-full object-cover"
              />
              <div className="p-5 sm:p-6">
                <h2 className="text-xl font-semibold tracking-tight text-stone-900">
                  {facility.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-stone-600">{facility.description}</p>
              </div>
            </article>
          ))}
        </div>

        <section className="mt-16 sm:mt-20" aria-labelledby="extra-facilities-heading">
          <header className="mb-8">
            <h2
              id="extra-facilities-heading"
              className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl"
            >
              Extra Facilities
            </h2>
          </header>
          {extraFacilities.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {extraFacilities.map((facility) => (
                <article
                  key={facility.title}
                  className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm"
                >
                  <Image
                    src={facility.image}
                    alt={facility.imageAlt}
                    width={1200}
                    height={800}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="aspect-3/2 w-full object-cover"
                  />
                  <div className="p-5 sm:p-6">
                    <h3 className="text-xl font-semibold tracking-tight text-stone-900">
                      {facility.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-stone-600">{facility.description}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-stone-500">More facilities will be added here.</p>
          )}
        </section>
      </div>
    </section>
  );
}
