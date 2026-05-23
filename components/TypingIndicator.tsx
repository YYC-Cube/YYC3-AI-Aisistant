export function TypingIndicator() {
  return (
    <div className="flex flex-col gap-1 max-w-2xl px-2 md:px-0 font-mono mb-8">
      {/* Header Line */}
      <div className="flex items-center gap-2 select-none mb-1 opacity-50">
        <span className="text-xs font-bold text-green-500">system@claude</span>
        <span className="text-gray-600">:</span>
        <span className="text-blue-300">~</span>
        <span className="text-gray-600">$</span>
        <span className="text-xs text-green-500/50 uppercase tracking-widest ml-2 animate-pulse">
          PROCESSING...
        </span>
      </div>

      {/* Content Area */}
      <div className="pl-4 border-l-2 border-green-500/30 text-green-500/70">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest">GENERATING_RESPONSE</span>
          <div className="flex gap-1">
             <div className="w-1.5 h-3 bg-green-500 animate-[pulse_0.5s_ease-in-out_infinite]" />
             <div className="w-1.5 h-3 bg-green-500/50 animate-[pulse_0.5s_ease-in-out_infinite_0.1s]" />
             <div className="w-1.5 h-3 bg-green-500/20 animate-[pulse_0.5s_ease-in-out_infinite_0.2s]" />
          </div>
        </div>
        <div className="mt-2 text-[10px] text-green-500/30 font-mono">
           {`> analyzing_input_vector`}
           <br/>
           {`> accessing_neural_weights`}
        </div>
      </div>
    </div>
  );
}
