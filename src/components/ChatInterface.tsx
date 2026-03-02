import React, { useState, useRef, useEffect } from 'react';
import { Send, User as UserIcon, Bot, Loader2, Download, FileText, Scale, ShieldAlert, Coins, Heart, Search, LogIn, CreditCard, ShieldCheck, FileDown, History, X, MessageSquare, Plus } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GeminiService, Message } from '../services/geminiService';
import { cn } from '../utils';
import { auth, User, db } from '../lib/firebase';
import { collection, addDoc, query, where, orderBy, getDocs, Timestamp, limit, doc, getDoc } from 'firebase/firestore';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

interface ChatSession {
  id: string;
  title: string;
  timestamp: any;
}

interface ChatInterfaceProps {
  user: User | null;
}

export default function ChatInterface({ user }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clubProfile, setClubProfile] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const geminiService = useRef<GeminiService | null>(null);

  useEffect(() => {
    try {
      geminiService.current = new GeminiService();
    } catch (e) {
      console.error("Failed to initialize GeminiService:", e);
      setInitError("Error de configuración: La llave de IA no está disponible.");
    }
    
    const savedProfile = localStorage.getItem('club_profile');
    if (savedProfile) {
      setClubProfile(savedProfile);
      const nameMatch = savedProfile.match(/(?:soy|somos|club|organización)\s+(?:del\s+|de\s+la\s+|de\s+)?([^.,\n]+)/i);
      if (nameMatch && nameMatch[1]) {
        let name = nameMatch[1].trim();
        name = name.replace(/^(?:del|de la|de)\s+/i, '');
        name = name.charAt(0).toUpperCase() + name.slice(1);
        setClubName(name);
      }
    }
  }, []);

  const loadSessions = async () => {
    if (!user || !db) return;
    try {
      const q = query(
        collection(db, 'sessions'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      const querySnapshot = await getDocs(q);
      const loadedSessions: ChatSession[] = [];
      querySnapshot.forEach((doc) => {
        loadedSessions.push({ id: doc.id, ...doc.data() } as ChatSession);
      });
      setSessions(loadedSessions);
    } catch (error) {
      console.error("Error loading sessions:", error);
    }
  };

  useEffect(() => {
    if (user) {
      loadSessions();
      startNewChat();
    }
  }, [user]);

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([
      {
        role: 'model',
        content: user 
          ? `¡Hola ${user.displayName || ''}! Soy tu Asistente digital de Fundación Clubes. Estoy listo para apoyar a tu organización. ¿Qué trámite, acta o proyecto vamos a trabajar hoy?`
          : '¡Hola! Soy tu Asistente digital de Fundación Clubes. Antes de empezar, me encantaría conocerte mejor: ¿De qué organización deportiva eres? Cuéntanos detalles para poder brindarte una asesoría técnica personalizada.'
      }
    ]);
  };

  const loadSession = async (sessionId: string) => {
    if (!db) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'chats'),
        where('sessionId', '==', sessionId),
        orderBy('timestamp', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const history: Message[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        history.push({ role: data.role, content: data.content });
      });
      setMessages(history);
      setCurrentSessionId(sessionId);
      setShowHistory(false);
    } catch (error) {
      console.error("Error loading session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const saveMessageToFirestore = async (role: 'user' | 'model', content: string) => {
    if (!user || !db) return;
    try {
      let sessionId = currentSessionId;
      
      // Create new session if it doesn't exist
      if (!sessionId) {
        const sessionDoc = await addDoc(collection(db, 'sessions'), {
          userId: user.uid,
          title: content.slice(0, 40) + (content.length > 40 ? '...' : ''),
          timestamp: Timestamp.now()
        });
        sessionId = sessionDoc.id;
        setCurrentSessionId(sessionId);
        loadSessions(); // Refresh list
      }

      await addDoc(collection(db, 'chats'), {
        userId: user.uid,
        sessionId,
        role,
        content,
        timestamp: Timestamp.now()
      });
    } catch (error) {
      console.error("Error saving message to Firestore:", error);
    }
  };

  const downloadAsDocx = async (content: string) => {
    // Helper to clean markdown symbols from text
    const cleanText = (text: string) => text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/__/g, '').replace(/###/g, '').replace(/##/g, '').replace(/#/g, '').trim();

    const paragraphs = content.split('\n').filter(p => p.trim() !== '').map(line => {
      let text = line.trim();
      let level: any = undefined;
      let isListItem = false;

      // Detect Headers
      if (text.startsWith('### ')) {
        level = HeadingLevel.HEADING_3;
        text = text.replace('### ', '');
      } else if (text.startsWith('## ')) {
        level = HeadingLevel.HEADING_2;
        text = text.replace('## ', '');
      } else if (text.startsWith('# ')) {
        level = HeadingLevel.HEADING_1;
        text = text.replace('# ', '');
      }

      // Detect List Items
      if (text.startsWith('* ') || text.startsWith('- ')) {
        isListItem = true;
        text = text.substring(2);
      }

      // Process inline bold text (approximate for docx)
      // We split by ** to find bold segments
      const parts = text.split(/(\*\*.*?\*\*)/g);
      const children = parts.map(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return new TextRun({
            text: part.replace(/\*\*/g, ''),
            bold: true,
            size: 24
          });
        }
        return new TextRun({
          text: part,
          size: 24
        });
      });

      return new Paragraph({
        heading: level,
        children: children,
        bullet: isListItem ? { level: 0 } : undefined,
        spacing: { after: 200, before: level ? 400 : 0 },
        alignment: AlignmentType.LEFT
      });
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "FUNDACIÓN CLUBES",
                bold: true,
                size: 32,
                color: "8f2778"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Asistente Técnico para la Autogestión Deportiva",
                italics: true,
                size: 20,
                color: "666666"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 500 }
          }),
          ...paragraphs
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Asesoria_Fundacion_Clubes_${new Date().toISOString().slice(0,10)}.docx`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    
    // Save user message to Firestore
    saveMessageToFirestore('user', userMessage);

    try {
      if (!geminiService.current) throw new Error("Service not initialized");
      
      let fullResponse = '';
      const modelMessageIndex = messages.length + 1; 
      setMessages(prev => [...prev, { role: 'model', content: '' }]);
      
      const messageWithContext = clubProfile 
        ? `[Contexto del Club: ${clubProfile}] ${userMessage}`
        : userMessage;
        
      const stream = geminiService.current.sendMessageStream(messageWithContext);
      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[modelMessageIndex] = { role: 'model', content: fullResponse };
          return newMessages;
        });
      }
      
      // Save model response to Firestore
      saveMessageToFirestore('model', fullResponse);
    } catch (error: any) {
      console.error('Error sending message:', error);
      let errorMessage = 'Lo siento, hubo un error al procesar tu mensaje.';
      
      if (error.message?.includes('CONFIG_ERROR') || error.message?.includes('API key not valid')) {
        errorMessage = '¡Hola! No te preocupes por ese cuadro de "Paid Project". Para que el chat funcione gratis, solo debes ir a la pestaña "Secrets" (o "Variables") en el panel izquierdo de este editor y agregar una variable llamada LLAVE_IA_PERSONAL con tu llave de Google AI Studio. Una vez que la agregues, el chat se activará automáticamente.';
      }
      
      // Remove the empty bubble we added and show the error
      setMessages(prev => {
        const filtered = prev.filter((_, i) => i !== prev.length - 1 || prev[i].content !== '');
        return [...filtered, { 
          role: 'model', 
          content: errorMessage
        }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { icon: FileText, label: 'Redactar Acta', prompt: 'Necesito redactar un acta de asamblea. ¿Qué datos necesitas para armar el borrador?' },
    { icon: Search, label: 'Busca en Fundación Clubes', prompt: 'Busca en la web fundacionclubes.org información relevante sobre: ' },
    { icon: Scale, label: 'Ley del Deporte', prompt: 'Dime los puntos clave de la Ley 19.712 y el Decreto 59 para mi club.' },
    { icon: ShieldAlert, label: 'Protocolo 22', prompt: '¿Cómo implemento el Protocolo 22 contra el maltrato en mi organización?' },
    { 
      icon: Heart, 
      label: 'Impúlsanos! Aporta una cuota mensual', 
      url: 'https://www.fundacionclubes.org/impulsanos',
      description: 'Desde $1.000 - Cortas cuando quieras'
    },
  ];

  return (
    <div className="flex bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl h-[700px] max-h-[85vh] relative">
      {/* Backdrop for History Drawer */}
      {showHistory && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setShowHistory(false)}
        />
      )}

      {/* Sidebar History - Now a Drawer/Overlay */}
      <div className={cn(
        "fixed inset-y-0 left-0 w-80 bg-white border-r border-slate-200 z-50 transition-transform duration-300 ease-in-out transform shadow-2xl",
        showHistory ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
            <History className="w-4 h-4 text-brand-primary" />
            Mis Asesorías
          </h3>
          <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-3 overflow-y-auto h-[calc(100%-65px)] custom-scrollbar">
          <div className="space-y-1">
            {sessions.length === 0 ? (
              <div className="text-center py-10 px-4">
                <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-[11px] text-slate-400">Aquí aparecerán tus chats guardados automáticamente.</p>
              </div>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => loadSession(session.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-all group border",
                    currentSessionId === session.id 
                      ? "bg-brand-primary text-white border-brand-primary shadow-md" 
                      : "bg-white border-transparent hover:border-slate-200 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <MessageSquare className={cn(
                      "w-4 h-4 mt-0.5 shrink-0",
                      currentSessionId === session.id ? "text-white" : "text-slate-400"
                    )} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate pr-2">{session.title}</p>
                      <p className={cn(
                        "text-[10px] mt-0.5",
                        currentSessionId === session.id ? "text-white/70" : "text-slate-400"
                      )}>
                        {session.timestamp?.toDate().toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30">
        {/* Header */}
        <div className="bg-brand-primary p-4 border-b border-brand-primary/20 flex items-center justify-between flex-shrink-0 shadow-md z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowHistory(true)}
              className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors shadow-inner"
            >
              <History className="w-5 h-5" />
            </button>
            <div className="bg-white w-10 h-10 rounded-xl shadow-lg flex items-center justify-center overflow-hidden">
              <img 
                src="https://www.fundacionclubes.org/favicon.ico" 
                alt="FC" 
                className="w-7 h-7 object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // Fallback to a text-based logo if image fails
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div>
              <h2 className="font-bold leading-tight text-white text-base sm:text-lg tracking-tight">Asistente Fundación Clubes</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] sm:text-xs text-white/80 italic font-medium">¡Arriba el deporte en los barrios!</p>
                {(clubName || clubProfile) && (
                  <div className="hidden sm:flex items-center gap-1.5 bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-sm">
                    <ShieldCheck className="w-3 h-3" />
                    <span className="text-[9px] font-black uppercase tracking-wider">
                      {clubName || 'Club Identificado'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={startNewChat}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors text-[10px] font-bold uppercase tracking-widest border border-white/5"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo
            </button>
          </div>
        </div>

        {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {initError && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3 text-red-600 text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <p>{initError}</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "flex gap-3 max-w-[95%] items-start",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              msg.role === 'user' ? "bg-[#eae3d3] text-[#8f2778]" : "bg-slate-100 text-brand-primary"
            )}>
              {msg.role === 'user' ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            <div className={cn(
              "p-4 rounded-2xl text-sm leading-relaxed relative group/msg",
              msg.role === 'user' 
                ? "bg-[#eae3d3] text-[#8f2778] rounded-tr-none font-medium shadow-sm" 
                : "bg-white text-slate-800 border border-slate-100 rounded-tl-none shadow-sm"
            )}>
              {msg.role === 'model' && msg.content === '' ? (
                <div className="flex gap-1 items-center h-5 px-1">
                  <div className="w-1.5 h-1.5 bg-brand-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-brand-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-brand-primary/40 rounded-full animate-bounce"></div>
                </div>
              ) : (
                <div className="markdown-body">
                  <Markdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, ...props }) => (
                        <a {...props} target="_blank" rel="noopener noreferrer" />
                      )
                    }}
                  >
                    {msg.content}
                  </Markdown>
                </div>
              )}
              {msg.role === 'model' && msg.content && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(msg.content);
                    }}
                    className="p-1.5 rounded-md bg-white/80 border border-slate-200 text-slate-400 hover:text-brand-primary hover:bg-white shadow-sm"
                    title="Copiar al portapapeles"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => downloadAsDocx(msg.content)}
                    className="p-1.5 rounded-md bg-white/80 border border-slate-200 text-slate-400 hover:text-brand-primary hover:bg-white shadow-sm"
                    title="Descargar como .docx"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {/* End of messages */}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length === 1 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5 justify-center">
          {quickActions.map((action, idx) => (
            'url' in action ? (
              <a
                key={idx}
                href={action.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-primary/20 bg-brand-primary/5 hover:bg-brand-primary/10 transition-all group shadow-sm"
              >
                <action.icon className="w-3.5 h-3.5 text-brand-primary animate-pulse" />
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-bold text-brand-primary leading-none">{action.label}</span>
                  {action.description && <span className="text-[8px] text-brand-primary/70 mt-0.5">{action.description}</span>}
                </div>
              </a>
            ) : (
              <button
                key={idx}
                onClick={() => setInput(action.prompt || '')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 bg-white hover:border-brand-primary hover:bg-slate-50 transition-all group shadow-sm"
              >
                <action.icon className="w-3 h-3 text-slate-400 group-hover:text-brand-primary" />
                <span className="text-[9px] font-bold text-slate-600 group-hover:text-brand-primary uppercase tracking-tight">{action.label}</span>
              </button>
            )
          ))}
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu consulta aquí..."
            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-brand-primary text-white p-3 rounded-xl hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 text-center">
          Asistente Técnico para la Autogestión Deportiva • Fundación Clubes
        </p>
      </form>
    </div>
  </div>
);
}
