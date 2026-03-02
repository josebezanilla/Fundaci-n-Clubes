import React, { useState, useEffect } from 'react';
import { BookOpen, FileText, Gavel, Users, ExternalLink, ShieldAlert, FolderOpen, Settings, Trash2, Info, Edit2, Check, X, Lightbulb } from 'lucide-react';

export default function Sidebar() {
  const [clubProfile, setClubProfile] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    const savedProfile = localStorage.getItem('club_profile');
    setClubProfile(savedProfile);
    if (savedProfile) setEditValue(savedProfile);

    const handleStorage = () => {
      const profile = localStorage.getItem('club_profile');
      setClubProfile(profile);
      if (profile) setEditValue(profile);
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('profileUpdated', handleStorage);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('profileUpdated', handleStorage);
    };
  }, []);

  const handleResetProfile = () => {
    if (confirm('¿Estás seguro de que quieres borrar la información de tu club? El asistente dejará de tener este contexto personalizado.')) {
      localStorage.removeItem('club_profile');
      setClubProfile(null);
      setEditValue('');
      window.location.reload();
    }
  };

  const handleSaveProfile = () => {
    if (editValue.trim()) {
      localStorage.setItem('club_profile', editValue.trim());
      setClubProfile(editValue.trim());
      setIsEditing(false);
      window.dispatchEvent(new Event('profileUpdated'));
    }
  };

  const resources = [
    {
      title: "Leyes y Normas",
      items: [
        { name: "Ley 19.712 (Deporte)", icon: Gavel, url: "https://www.bcn.cl/leychile/navegar?idNorma=181636" },
        { name: "Decreto 59 (Reglamento)", icon: FileText, url: "https://www.bcn.cl/leychile/navegar?idNorma=196442" },
        { name: "Protocolo 22 (Seguridad)", icon: ShieldAlert, url: "https://ind.cl/protocolo-contra-el-abuso-sexual-acoso-sexual-maltrato-y-discriminacion-en-la-actividad-deportiva-nacional/" }
      ]
    },
    {
      title: "Formatos Útiles",
      items: [
        { name: "Carpeta de plantillas Documentos y Actas para Clubes", icon: FolderOpen, url: "https://drive.google.com/drive/folders/1O1R0WPrtCJH_qoggCAKatOyayoP5RP0R?usp=sharing" }
      ]
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Brand Card */}
      <div className="bg-[#fffbf2] p-6 rounded-3xl border border-orange-100 shadow-sm">
        <h2 className="text-xl font-ubuntu font-bold text-brand-primary mb-4">
          SOMOS
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed font-medium mb-4">
          ONG deportiva. ⚽️🏐🏀 Estamos fortaleciendo el tejido social y el amor al prójimo a través de los Clubes sociales y deportivos de barrio.
        </p>
        <a 
          href="https://www.fundacionclubes.org/impulsanos"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
        >
          ¡APÓYANOS! - Cuota mensual voluntaria para crecer juntos ❤️
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Club Profile (Onboarding Context) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-brand-primary uppercase tracking-wider flex items-center gap-2">
            <Info className="w-4 h-4" />
            Tu Organización
          </h3>
          <div className="flex items-center gap-1">
            {!isEditing ? (
              <>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 text-slate-400 hover:text-brand-primary transition-colors"
                  title="Editar perfil"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {clubProfile && (
                  <button 
                    onClick={handleResetProfile}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    title="Borrar perfil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            ) : (
              <>
                <button 
                  onClick={handleSaveProfile}
                  className="p-1.5 text-green-600 hover:text-green-700 transition-colors"
                  title="Guardar"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setEditValue(clubProfile || '');
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Cancelar"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
        
        {isEditing ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary min-h-[80px] resize-none"
            placeholder="Nombre del club, comuna, deportes, desafíos..."
          />
        ) : (
          clubProfile ? (
            <p className="text-xs text-slate-700 italic line-clamp-4">
              "{clubProfile}"
            </p>
          ) : (
            <p className="text-xs text-slate-400 italic">
              Llena acá los datos elementales de tu club: nombre, comuna, deportes, otros.
            </p>
          )
        )}
      </div>

      {/* Resources */}
      {resources.map((section, idx) => (
        <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            {section.title}
          </h3>
          <ul className="space-y-3">
            {section.items.map((item, i) => (
              <li key={i}>
                {item.url ? (
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-sm text-slate-700 hover:text-brand-primary transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-slate-400 group-hover:text-brand-primary" />
                      <span>{item.name}</span>
                    </div>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ) : (
                  <div className="flex items-center gap-3 text-sm text-slate-700 cursor-help">
                    <item.icon className="w-4 h-4 text-slate-400" />
                    <span>{item.name}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Info Card */}
      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 shadow-sm">
        <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2 uppercase tracking-tight">
          <Lightbulb className="w-4 h-4 text-blue-500" />
          ¡RECUERDA!
        </h4>
        <p className="text-xs text-blue-700/80 mb-4 leading-relaxed font-medium">
          La institución a la que debes dirigir tus ideas, propuestas o reclamos sobre el deporte nacional es el Ministerio del Deporte y el Instituto Nacional de Deportes (IND).
        </p>
        <a 
          href="https://www.mindep.cl/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          Ir a mindep.cl
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

    </div>
  );
}
