"use client";

import { useState } from 'react';
import { MovieMatchResult } from '@/lib/schemas/validation';
import { Loader2, Search, Star, Film, Users, Send } from 'lucide-react';

export default function Dashboard() {
  const [plot, setPlot] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MovieMatchResult | null>(null);

  // Chat state
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [chatStreaming, setChatStreaming] = useState(false);

  const handleMatch = async () => {
    if (!plot) return;
    setLoading(true);
    setResult(null);
    setChatHistory([]);
    
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plot })
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to search movies. Check console.');
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async () => {
    if (!chatMessage || !result) return;
    
    const userMsg = chatMessage;
    setChatMessage('');
    setChatStreaming(true);
    
    const newHistory = [...chatHistory, { role: 'user', content: userMsg }];
    setChatHistory([...newHistory, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plot: result.originalQuery,
          genre: 'Any',
          message: userMsg,
          history: chatHistory,
          movies: result.movies
        })
      });

      if (!res.body) throw new Error("No readable stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      let assistantResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') break;
            if (!dataStr) continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.content) {
                assistantResponse += data.content;
                setChatHistory([...newHistory, { role: 'assistant', content: assistantResponse }]);
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChatStreaming(false);
    }
  };

  return (
    <main className="container mx-auto p-4 md:p-8 max-w-7xl">
      <header className="mb-8 border-b border-neutral-800 pb-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent flex items-center gap-3">
          <Film className="text-pink-500" />
          AI Movie Matcher
        </h1>
        <p className="text-neutral-400 mt-2">Describe a movie plot in your head, and we'll find real movies that match it!</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Column: Input Panel */}
        <div className="space-y-6 lg:col-span-1 border border-neutral-800 rounded-xl p-6 bg-neutral-900/50 h-max sticky top-8">
          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-300">Describe the Plot</label>
            <textarea 
              className="w-full h-40 bg-neutral-950 border border-neutral-800 rounded-md p-3 text-white focus:ring-2 focus:ring-pink-500 outline-none resize-none"
              placeholder="A hacker discovers the world is a simulation and fights agents..."
              value={plot}
              onChange={(e) => setPlot(e.target.value)}
            />
          </div>

          <button
            onClick={handleMatch}
            disabled={loading || plot.length < 10}
            className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-md transition-colors flex items-center justify-center gap-2 shadow-lg shadow-pink-900/20"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
            {loading ? 'Searching Databases...' : 'Find Movie Matches'}
          </button>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-3 space-y-8">
          
          {!result && !loading && (
            <div className="h-full min-h-[400px] flex items-center justify-center border border-dashed border-neutral-800 rounded-xl text-neutral-500 flex-col gap-4">
              <Search className="w-12 h-12 text-neutral-700" />
              <span>Enter a plot description to see matches here.</span>
            </div>
          )}

          {loading && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border border-neutral-800 rounded-xl bg-neutral-900/20 text-pink-400">
              <Loader2 className="animate-spin w-10 h-10 mb-4" />
              <p>Analyzing description and matching databases...</p>
            </div>
          )}

          {result && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-semibold border-b border-neutral-800 pb-2">
                Top Matches Ranking
              </h2>
              
              <div className="grid grid-cols-1 gap-6">
                {result.movies.map((movie) => (
                  <div key={movie.title} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col sm:flex-row hover:border-neutral-700 transition-colors">
                    
                    {/* Dynamic Poster Image */}
                    <div className="sm:w-48 sm:min-w-[12rem] bg-neutral-950 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-neutral-800 relative overflow-hidden group shrink-0">
                      <div className="absolute top-2 left-2 z-10 bg-pink-600 font-bold text-xs px-2 py-1 rounded shadow">
                        #{movie.rank}
                      </div>
                      
                      {/* Generates a dynamic placeholder image with the movie title or uses Wikipedia fetch */}
                      <img 
                        src={movie.posterUrl || `https://placehold.co/400x600/0a0a0a/e81cff?text=${encodeURIComponent(movie.title)}`}
                        alt={`${movie.title} poster`}
                        className="w-full h-48 sm:h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                      />

                      {/* Content overlayed on the image */}
                      <div className="absolute bottom-4 left-0 right-0 z-10 flex flex-col items-center justify-center p-4">
                        <div className="flex items-center gap-1 bg-black/80 px-3 py-1 rounded-full text-yellow-400 text-sm font-bold shadow border border-yellow-400/20">
                          <Star className="w-4 h-4 fill-yellow-400" />
                          {movie.rating} / 10
                        </div>
                      </div>
                    </div>
                    
                    {/* Movie Info */}
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-2xl font-bold text-white mb-2">{movie.title}</h3>
                      <p className="text-neutral-400 text-sm mb-4 leading-relaxed">{movie.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 text-xs">
                        <div className="bg-neutral-950/50 p-2 rounded">
                          <span className="block text-neutral-500 font-medium mb-1">DIRECTOR</span>
                          <span className="text-neutral-200">{movie.director}</span>
                        </div>
                        <div className="bg-neutral-950/50 p-2 rounded">
                          <span className="block text-neutral-500 font-medium mb-1">PRODUCER</span>
                          <span className="text-neutral-200">{movie.producer}</span>
                        </div>
                        <div className="col-span-2 md:col-span-1 bg-neutral-950/50 p-2 rounded flex-1">
                          <span className="flex items-center gap-1 text-neutral-500 font-medium mb-1"><Users className="w-3 h-3"/> CAST</span>
                          <span className="text-neutral-200">{movie.cast.join(", ")}</span>
                        </div>
                      </div>
                      
                      <div className="mt-auto pt-4 border-t border-neutral-800">
                        <span className="text-pink-400 text-xs font-semibold uppercase tracking-wider block mb-1">Why it matches:</span>
                        <p className="text-sm text-neutral-300 italic">"{movie.matchReasoning}"</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Column */}
              <div className="mt-8 border border-neutral-800 rounded-xl overflow-hidden bg-neutral-900/50 flex flex-col h-[400px]">
                <div className="bg-neutral-800/50 p-4 border-b border-neutral-800 font-medium flex items-center gap-2">
                  <Film className="w-4 h-4 text-pink-400" /> Ask Follow-up Questions
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatHistory.length === 0 ? (
                    <div className="text-center text-neutral-500 mt-10 text-sm">
                      Do none of these ring a bell? Ask for more specific matches!
                    </div>
                  ) : (
                    chatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl p-3 px-5 text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-pink-600 text-white' : 'bg-neutral-800 text-neutral-200'}`}>
                          {msg.content}
                          {msg.role === 'assistant' && msg.content === '' && chatStreaming && (
                            <Loader2 className="animate-spin w-4 h-4 inline" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                    placeholder="E.g. What about the one with Keanu Reeves?"
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-full px-4 text-sm outline-none focus:border-pink-500"
                    disabled={chatStreaming}
                  />
                  <button 
                    onClick={handleChat}
                    disabled={chatStreaming || !chatMessage.trim()}
                    className="bg-pink-600 text-white p-3 rounded-full hover:bg-pink-700 disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </main>
  );
}
