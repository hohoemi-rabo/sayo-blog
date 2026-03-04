import { ChatHeader } from "@/components/ai/ChatHeader";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ChatHeader />
      <main className="h-[calc(100dvh-56px)]">
        {children}
      </main>
    </>
  );
}
