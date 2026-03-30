import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Minimize2, Maximize2, X, Sparkles, MessageSquare, Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  intent?: string;
}

const AIChatAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I am your NexVigil Intelligence Assistant. How can I help you today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCall, setLastCall] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Speech Recognition Setup
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error("Speech recognition failed. Try again.");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // --- STEP 5: PREVENT SPAM (SMART WAY - 5s COOLDOWN) ---
    const now = Date.now();
    if (now - lastCall < 5000) {
      toast.info("Surveillance Intelligence is processing. Please wait 5 seconds...");
      return;
    }

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);
    setLastCall(now);

    try {
      // --- REAL RESPONSE FLOW ---
      const response: any = await api.ai.chat(userMsg);
      const chatData = response.data;
      
      if (chatData && chatData.answer) {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: chatData.answer,
          intent: chatData.intent 
        }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Communication link offline. Please try again." }]);
      }
    } catch (err) {
      // --- ONLY REAL ERROR ---
      setMessages(prev => [...prev, { role: "assistant", content: "Connectivity issue. Retrying security link..." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
                opacity: 1, 
                y: 0, 
                scale: 1,
                height: isMinimized ? "64px" : "500px"
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "bg-background/90 backdrop-blur-2xl border border-border shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-2xl overflow-hidden flex flex-col mb-4",
              "w-[350px] sm:w-[400px]"
            )}
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-primary/20 to-accent/20 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-background rounded-full animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-widest text-foreground">NexVigil Sentinel</h3>
                  <p className="text-[10px] text-muted-foreground font-medium italic">Active Surveillance Intelligence</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsMinimized(!isMinimized)}>
                  {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive" onClick={() => setIsOpen(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Chat Area */}
            {!isMinimized && (
              <>
                <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
                  <div className="space-y-5 pb-4">
                    {messages.map((m, i) => (
                      <div key={i} className={cn("flex items-start gap-2", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
                        <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-1 shadow-sm", 
                           m.role === "user" ? "bg-accent/10 border border-accent/20" : "bg-primary/10 border border-primary/20")}>
                           {m.role === "user" ? <User className="w-3 h-3 text-accent" /> : <Bot className="w-3 h-3 text-primary" />}
                        </div>
                        <div className={cn(
                          "max-w-[80%] p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm",
                          m.role === "user" 
                            ? "bg-primary text-primary-foreground rounded-tr-none font-medium" 
                            : "bg-secondary/80 border border-border/40 rounded-tl-none text-foreground"
                        )}>
                          {m.content}
                          {m.intent === "RULE" && (
                            <div className="mt-2.5 pt-2.5 border-t border-border/20 flex items-center gap-2 text-[10px] font-bold text-primary animate-pulse">
                              <Sparkles className="w-3 h-3" /> SECURITY RULE DEPLOYED
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Bot className="w-3 h-3 text-primary" />
                        </div>
                        <div className="bg-secondary/40 p-3 rounded-2xl rounded-tl-none flex gap-2 items-center shadow-sm">
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                          <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Thinking</span>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="p-4 bg-secondary/20 border-t border-border/50 flex items-center gap-2">
                  <Input 
                    placeholder={isLoading ? "Analyzing..." : isListening ? "Listening..." : "Query NexVigil..."} 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    disabled={isLoading}
                    className="h-10 text-xs bg-background/50 border-border/60 rounded-xl focus-visible:ring-primary/20 backdrop-blur-sm"
                  />
                  <div className="flex gap-1.5">
                    <Button 
                      size="icon" 
                      variant={isListening ? "destructive" : "secondary"}
                      onClick={toggleListening}
                      className={cn("h-10 w-10 rounded-xl shrink-0 transition-all", isListening && "animate-pulse")}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" onClick={handleSend} disabled={isLoading} className="h-10 w-10 rounded-xl shrink-0 shadow-lg shadow-primary/20">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="h-16 w-16 rounded-full shadow-[0_15px_30px_rgba(var(--primary),0.3)] bg-primary hover:scale-110 active:scale-90 transition-all group overflow-hidden"
      >
        <div className="relative z-10">
          {isOpen ? <X className="w-7 h-7" /> : <MessageSquare className="w-7 h-7" />}
        </div>
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent scale-0 group-hover:scale-100 transition-transform duration-500" />
      </Button>
    </div>
  );
};

export default AIChatAssistant;
