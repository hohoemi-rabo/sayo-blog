import Header from "@/components/Header";

// 公開ヘッダー (h-16 mobile / h-20 desktop) は維持しつつ、main 自体を
// チャット用に「viewport - header」高にする (Footer は描画しない)。
// (public) レイアウトの min-h-screen + Footer によって発生する body 側スクロールバー
// 問題と、flex+overflow のネスト深い問題を回避するための専用レイアウト。
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="h-[calc(100dvh-4rem)] md:h-[calc(100dvh-5rem)] overflow-hidden">
        {children}
      </main>
    </>
  );
}
