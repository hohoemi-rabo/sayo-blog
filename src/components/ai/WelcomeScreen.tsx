export function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center text-center animate-fade-in">
      <h1 className="text-3xl md:text-4xl lg:text-5xl font-playfair font-bold text-text-primary leading-tight animate-slide-in-up stagger-1">
        何を知りたいですか？
      </h1>

      <p className="mt-3 text-base md:text-lg text-text-secondary font-noto-sans-jp leading-relaxed animate-slide-in-up stagger-2">
        飯田・下伊那のことなら、なんでも聞いてください
      </p>
    </div>
  )
}
