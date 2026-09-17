from pathlib import Path

path = Path('src/routes/match-bot.tsx')
text = path.read_text()

text = text.replace('step === "bot" ? "pt-6 pb-40"', 'step === "bot" ? "pt-6 pb-56"')
text = text.replace('''                  <span className="text-lg">{bot.flag}</span>\n''', '')
text = text.replace(
    '''          <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 bg-gradient-to-t from-white via-white/95 to-white/0 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-8">\n            <button onClick={() => goToStep("category")} className={`sg4-ryder-next ${ryderNext} shadow-xl`}>Spela mot {bot.name} <ChevronRight className="h-5 w-5" /></button>\n          </div>''',
    '''          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center bg-gradient-to-t from-white via-white/98 to-white/0 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-10">\n            <div className="pointer-events-auto w-full max-w-md">\n              <button onClick={() => goToStep("category")} className={`sg4-ryder-next ${ryderNext} shadow-xl`}>Spela mot {bot.name} <ChevronRight className="h-5 w-5" /></button>\n            </div>\n          </div>'''
)

path.write_text(text)
