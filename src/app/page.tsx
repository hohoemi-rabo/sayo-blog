import HeroSection from "@/components/HeroSection";

export default function Home() {
  return (
    <>
      <HeroSection />

      {/* Placeholder for future content (FilterBar, Card Grid, Pagination) */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center text-text-secondary font-noto-sans-jp">
          <p className="text-lg">記事一覧コンテンツは次のチケットで実装されます</p>
          <p className="text-sm mt-2">(FilterBar, Card Grid, Pagination)</p>
        </div>
      </section>
    </>
  );
}
