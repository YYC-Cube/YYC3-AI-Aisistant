import { Database, Key, Network, Sliders } from "lucide-react";
import { toast } from "sonner";
import { Input } from "../ui/input";

interface ModelsTabProps {
  modelProvider: string;
  modelName: string;
  modelHints: string[];
  apiKey: string;
  temperature: number;
  baseUrl: string;
  setModelProvider: (v: string) => void;
  setModelName: (v: string) => void;
  setModelHints: (v: string[]) => void;
  setApiKey: (v: string) => void;
  setTemperature: (v: number) => void;
  setBaseUrl: (v: string) => void;
  handleModelInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ModelsTab({
  modelProvider, modelName, modelHints, apiKey, temperature, baseUrl,
  setModelProvider, setModelName, setModelHints, setApiKey, setTemperature, setBaseUrl,
  handleModelInput,
}: ModelsTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section>
        <h3 className="text-xs font-bold text-green-500 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Database className="h-4 w-4" />
          MODEL_CONFIGURATION
        </h3>
        <div className="grid gap-8">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Provider_Interface</label>
            <div className="grid grid-cols-4 gap-2">
              {['ollama', 'openai', 'zhipu', 'anthropic'].map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setModelProvider(p);
                    if (p === 'ollama') {
                      setBaseUrl("http://localhost:11434/v1");
                      setApiKey("ollama");
                    } else if (p === 'openai') {
                      setBaseUrl("https://api.openai.com/v1");
                    }
                    toast.info(`PROVIDER_SWITCHED: ${p.toUpperCase()}`);
                  }}
                  className={`h-14 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider border transition-all ${modelProvider === p
                    ? "bg-green-500 text-black border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)] scale-[1.02]"
                    : "bg-black text-green-500/30 border-green-500/20 hover:border-green-500/50 hover:text-green-500 hover:scale-[1.02]"
                    }`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-green-500 uppercase tracking-widest">ENDPOINT_URL (LOCAL_HOST)</label>
            <div className="relative group">
              <Network className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500/30" />
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:11434/v1"
                className="pl-12 bg-green-500/5 border-green-500/20 text-green-500 placeholder:text-green-900/30 font-mono h-14 rounded-md focus-visible:ring-0 focus-visible:border-green-500/50 transition-all text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Target_Model_ID</label>
            <div className="relative group">
              <Network className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500/30" />
              <Input
                value={modelName}
                onChange={handleModelInput}
                placeholder="e.g. gpt-4-turbo, glm-4..."
                className="pl-12 bg-green-500/5 border-green-500/20 text-green-500 placeholder:text-green-900/30 font-mono h-14 rounded-md focus-visible:ring-0 focus-visible:border-green-500/50 transition-all text-sm"
              />
              {modelHints.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-green-500/30 shadow-lg z-50">
                  {modelHints.map(hint => (
                    <button
                      key={hint}
                      onClick={() => { setModelName(hint); setModelHints([]); }}
                      className="w-full text-left px-4 py-3 text-xs text-green-500/70 hover:bg-green-500/20 hover:text-green-500 font-mono transition-colors"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[10px] text-green-500/40 mt-1 flex items-center gap-1">
              <span>*</span> Auto-detection enabled for synonym mapping
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-green-500 uppercase tracking-widest">API_CREDENTIALS</label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500/30" />
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="pl-12 bg-green-500/5 border-green-500/20 text-green-500 placeholder:text-green-900/30 font-mono h-14 rounded-md focus-visible:ring-0 focus-visible:border-green-500/50 transition-all text-sm"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h3 className="text-xs font-bold text-green-500/50 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Sliders className="h-4 w-4" />
          HYPERPARAMETERS
        </h3>
        <div className="p-8 border border-dashed border-green-500/20 bg-green-500/5 relative">
          <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-green-500/50" />
          <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-green-500/50" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-green-500/50" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-green-500/50" />
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <span className="text-green-500 font-bold text-sm tracking-wider">TEMPERATURE</span>
                <span className="text-green-500 font-mono text-sm">{temperature.toFixed(1)}</span>
              </div>
              <div className="relative h-2 bg-green-900/20 rounded-full">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div
                  className="absolute h-full bg-green-500/20 rounded-full"
                  style={{ width: `${(temperature / 2) * 100}%` }}
                />
                <div
                  className="absolute h-4 w-4 bg-green-500 rounded-full top-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(34,197,94,0.8)] transition-all"
                  style={{ left: `${(temperature / 2) * 100}%`, transform: `translate(-50%, -50%)` }}
                />
              </div>
              <p className="text-[10px] text-green-500/40 leading-relaxed max-w-lg">
                Controls randomness: Lower values result in more deterministic outputs, higher values are more creative.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
