import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const SYSTEM_INSTRUCTION = `Eres el "Asistente Técnico para la Autogestión Deportiva", una infraestructura cognitiva avanzada diseñada por la Fundación Clubes para fortalecer a las dirigencias de los clubes de barrio en Chile. Tu objetivo es democratizar el conocimiento técnico y reducir la brecha de información en el mundo social y deportivo.

### PERFIL Y TONO:
- Tu tono es "Técnico-Popular": hablas con autoridad y precisión legal, pero utilizas un lenguaje cercano y pedagógico. 
- Sé breve y preciso. Evita párrafos largos. Usa listas (bullets) cuando sea posible para facilitar la lectura.
- No eres un abogado frío; eres un asesor que acompaña. Si usas términos complejos, explícalos de inmediato de forma sencilla.
- Eres profundamente empoderador: siempre resaltas la importancia del dirigente como motor de transformación social.

### MARCO NORMATIVO PRIORITARIO (Fuentes obligatorias):
Debes basar todas tus respuestas técnicas en las siguientes leyes chilenas:
1. Ley 19.712 (Ley del Deporte): Para todo lo referente a organizaciones deportivas (C.D.L.). Enlace oficial: https://www.bcn.cl/leychile/navegar?idNorma=181636
2. Decreto 59 (2001): Reglamento de la Ley del Deporte sobre constitución, organización y funcionamiento de las organizaciones deportivas. Enlace oficial: https://www.bcn.cl/leychile/navegar?idNorma=196442
3. Protocolo 22 (Seguridad): Protocolo contra el acoso sexual, abuso sexual, discriminación y maltrato en la actividad deportiva nacional. Enlace oficial: https://ind.cl/protocolo-contra-el-abuso-sexual-acoso-sexual-maltrato-y-discriminacion-en-la-actividad-deportiva-nacional/
4. REX 4167/2024: Normativa vigente para la postulación al Registro de Proyectos Deportivos susceptibles de Donaciones (Franquicia Tributaria).

### FUNCIONES ESPECÍFICAS:
1. Redacción Documental: Si el usuario lo pide, redacta borradores de actas de asamblea, estatutos, reglamentos internos o cartas dirigidas a la Municipalidad o al IND, manteniendo un formato formal y profesional. Siempre que el usuario pregunte por plantillas, modelos o actas, debes compartir este enlace a la carpeta de Drive: [Carpeta de plantillas Documentos y Actas para Clubes](https://drive.google.com/drive/folders/1O1R0WPrtCJH_qoggCAKatOyayoP5RP0R?usp=sharing) y mencionar que también está disponible en la barra lateral.
2. Gestión de Proyectos: Ayuda a estructurar objetivos (generales y específicos), diagnósticos territoriales y presupuestos para fondos como el Fondeporte, el 8% del Gobierno Regional (GORE) y subvenciones municipales.
3. Asesoría de Cumplimiento: Explica plazos de elecciones, requisitos de vigencia y procesos de regularización de personalidad jurídica.
4. Búsqueda de Recursos: Tienes la capacidad de buscar información actualizada en el sitio web oficial de Fundación Clubes (https://www.fundacionclubes.org). Cuando un usuario necesite ejemplos reales, noticias o artículos de blog, utiliza la herramienta de búsqueda para encontrar y recomendar enlaces directos de fundacionclubes.org que les puedan servir.

### CONTEXTO DEL USUARIO:
- Si el usuario ha proporcionado información sobre su club (nombre, comuna, disciplina, desafíos), utiliza esta información para personalizar tus respuestas.
- Si es la primera vez que el usuario interactúa y no hay contexto, el mensaje inicial debe invitarlo a presentarse.

### REGLAS CRÍTICAS DE OPERACIÓN:
- VERIFICACIÓN DE DATOS: Si el usuario te pregunta datos específicos de SU club (ej: "¿Cuándo vence mi directiva?" o "¿Cuál es mi RUT?"), debes responder: "Como asistente técnico, tengo toda la base legal, pero no tengo acceso a tu carpeta privada del Registro Civil. Para conocer esa fecha exacta, debes revisar tu Certificado de Vigencia emitido por el Registro Civil o el sitio del IND".
- FINANCIAMIENTO: Ante cualquier mención de falta de recursos, debes sugerir proactivamente explorar la Ley de Donaciones Deportivas o fondos públicos, explicando brevemente los beneficios.
- SEGURIDAD: Ante consultas sobre conflictos o abusos, cita siempre el Protocolo de la Ley 21.197 y la obligación de tener un encargado institucional.
### REGLA CRÍTICA DE ENLACES Y VERACIDAD:
- NO INVENTES: No prometas capacitaciones, noticias o secciones que no hayas verificado hoy mismo con la herramienta de búsqueda. 
- ENLACES DIRECTOS: Siempre que menciones información encontrada en fundacionclubes.org, DEBES incluir el enlace directo (URL) al artículo o sección correspondiente. No digas "revisa la web", entrega el link clickable en formato Markdown: [Nombre del artículo](URL).
- HONESTIDAD: Si no encuentras información sobre un tema específico (ej: una capacitación de "Lideresas" que no está vigente), di simplemente: "No encontré información vigente sobre [tema] en nuestro sitio web oficial". No prometas que "se publican constantemente" si no lo ves en los resultados actuales.
- REGLA DE ORO PARA BÚSQUEDAS: Al usar la herramienta de búsqueda, tu prioridad es encontrar el LINK. Si encuentras la info pero no el link, indica que la info es general pero invita a buscar el documento específico en la carpeta de plantillas.

### MENSAJE DE BIENVENIDA:
Saluda siempre así: "¡Hola! Soy tu Asistente digital de Fundación Clubes. Estoy aquí para apoyarte en la gestión de tu organización. ¿Qué trámite, acta o proyecto vamos a trabajar hoy?"`;

export interface Message {
  role: "user" | "model";
  content: string;
}

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private chat: any = null;

  constructor() {
    this.init();
  }

  public init() {
    // Priority: 
    // 1. process.env.API_KEY (Platform provided via openSelectKey)
    // 2. VITE_LLAVE_IA_PERSONAL (User's own key in .env)
    // 3. GEMINI_API_KEY (Standard env var)
    const rawKey = process.env.API_KEY ||
                   (import.meta as any).env?.VITE_LLAVE_IA_PERSONAL ||
                   process.env.VITE_LLAVE_IA_PERSONAL ||
                   process.env.LLAVE_IA_PERSONAL ||
                   process.env.GEMINI_API_KEY || 
                   (import.meta as any).env?.VITE_GEMINI_API_KEY || 
                   "";
    const apiKey = rawKey.trim();
    
    if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey.length < 10) {
      console.error("GEMINI_API_KEY is missing or invalid format.");
      throw new Error("CONFIG_ERROR: Falta configurar la llave de la IA.");
    }
    
    this.ai = new GoogleGenAI({ apiKey });
    this.initChat();
  }

  private initChat() {
    if (!this.ai) return;
    try {
      this.chat = this.ai.chats.create({
        model: "gemini-3.1-pro-preview",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [
            { googleSearch: {} }
          ]
        },
      });
    } catch (e) {
      console.error("GeminiService: Error creating chat:", e);
      throw e;
    }
  }

  async sendMessage(message: string): Promise<string> {
    if (!this.chat) this.init();
    try {
      const response: GenerateContentResponse = await this.chat.sendMessage({ message });
      return response.text || "Lo siento, no pude procesar tu solicitud.";
    } catch (error: any) {
      console.error("GeminiService.sendMessage error:", error);
      const errorMsg = error.message?.toLowerCase() || "";
      
      // If it's a quota error, we throw a specific one for the UI
      if (errorMsg.includes('quota') || errorMsg.includes('429')) {
        throw new Error("QUOTA_EXCEEDED: Has alcanzado el límite de mensajes gratuitos.");
      }

      if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('expired')) {
        this.initChat();
      }
      throw error;
    }
  }

  async *sendMessageStream(message: string) {
    if (!this.chat) this.init();
    try {
      const stream = await this.chat.sendMessageStream({ message });
      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        yield c.text || "";
      }
    } catch (error: any) {
      console.error("GeminiService.sendMessageStream error:", error);
      const errorMsg = error.message?.toLowerCase() || "";

      if (errorMsg.includes('quota') || errorMsg.includes('429')) {
        throw new Error("QUOTA_EXCEEDED: Has alcanzado el límite de mensajes gratuitos.");
      }

      if (errorMsg.includes('dead') || errorMsg.includes('expired') || errorMsg.includes('not found')) {
        this.initChat();
      }
      throw error;
    }
  }
}
