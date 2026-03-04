import Header from "@/components/Header";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="h-[calc(100dvh-64px)] md:h-[calc(100dvh-80px)]">
        {children}
      </main>
    </>
  );
}
