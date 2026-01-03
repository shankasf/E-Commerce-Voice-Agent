import Image from "next/image";

const LOGOS = [
  {
    name: "Northwind",
    src: "https://placehold.co/180x56/f3f4f6/374151/png?text=Northwind",
  },
  {
    name: "Acme Retail",
    src: "https://placehold.co/180x56/f9fafb/374151/png?text=Acme+Retail",
  },
  {
    name: "Loop Stores",
    src: "https://placehold.co/180x56/f3f4f6/374151/png?text=Loop+Stores",
  },
  {
    name: "BrightGrocer",
    src: "https://placehold.co/180x56/f9fafb/374151/png?text=BrightGrocer",
  },
];

export function LogoCloud() {
  return (
    <div aria-label="Customer logos" className="mx-auto mt-10 max-w-5xl">
      <div className="grid grid-cols-2 items-center gap-6 sm:grid-cols-4">
        {LOGOS.map((logo) => (
          <div
            key={logo.name}
            className="group flex h-20 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 transition hover:border-gray-300 hover:bg-gray-100"
          >
            <Image
              src={logo.src}
              alt={`${logo.name} logo`}
              width={180}
              height={56}
              className="h-12 w-auto object-contain opacity-90 transition group-hover:opacity-100"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
