"use client";
import React, { useState } from "react";
import { Save, Check, User, School, BookOpen, Layers, Image as ImageIcon, Gauge, PanelTop, Trash2 } from "lucide-react";
import { NIVEIS_DIFICULDADE } from "@/lib/niveis";
import { CONFIG_PADRAO } from "@/lib/local";
import { DISCIPLINAS, NIVEIS, ESTILOS, CAPAS } from "@/lib/opcoes";

const Campo = ({ icone: Icone, rotulo, ajuda, children }) => (
  <label className="block">
    <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600">
      <Icone className="h-3.5 w-3.5 text-violet-400" /> {rotulo}
    </span>
    {children}
    {ajuda && <span className="mt-1 block text-[11px] text-slate-400">{ajuda}</span>}
  </label>
);

export default function Configuracoes({ config, onSalvar, totalMateriais, onLimparLista }) {
  const [cfg, setCfg] = useState(config);
  const [salvo, setSalvo] = useState(false);
  const set = (k) => (e) => {
    setCfg((c) => ({ ...c, [k]: e.target.value }));
    setSalvo(false);
  };

  const salvar = (e) => {
    e.preventDefault();
    onSalvar(cfg);
    setSalvo(true);
  };

  return (
    <form onSubmit={salvar} className="max-w-3xl space-y-6">
      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800">Seus dados</h2>
        <p className="mb-5 text-xs text-slate-400">Aparecem no cabeçalho e na capa de todo material novo.</p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo icone={User} rotulo="Nome do(a) professor(a)">
            <input value={cfg.professor} onChange={set("professor")} className="ipt" placeholder="Ex.: Prof. Paulo Souza" />
          </Campo>
          <Campo icone={School} rotulo="Escola" ajuda="Opcional. Sai no cabeçalho da folha.">
            <input value={cfg.escola} onChange={set("escola")} className="ipt" placeholder="Ex.: EMEF ..." />
          </Campo>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800">Padrões do formulário</h2>
        <p className="mb-5 text-xs text-slate-400">O formulário de geração já abre com estas escolhas.</p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo icone={BookOpen} rotulo="Disciplina">
            <select value={cfg.disciplina} onChange={set("disciplina")} className="ipt">
              {DISCIPLINAS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Campo>
          <Campo icone={Layers} rotulo="Nível de ensino">
            <select value={cfg.nivel} onChange={set("nivel")} className="ipt">
              {NIVEIS.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Campo>
          <Campo icone={Gauge} rotulo="Dificuldade">
            <select value={cfg.dificuldade} onChange={set("dificuldade")} className="ipt">
              {NIVEIS_DIFICULDADE.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.rotulo}
                </option>
              ))}
            </select>
          </Campo>
          <Campo icone={ImageIcon} rotulo="Estilo das ilustrações">
            <select value={cfg.estilo} onChange={set("estilo")} className="ipt">
              {ESTILOS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Campo>
          <Campo icone={PanelTop} rotulo="Capa" ajuda="A capa escolar clara economiza tinta.">
            <select value={cfg.capa} onChange={set("capa")} className="ipt">
              {CAPAS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.rotulo}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200"
        >
          {salvo ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {salvo ? "Salvo" : "Salvar configurações"}
        </button>
        <button
          type="button"
          onClick={() => {
            setCfg(CONFIG_PADRAO);
            setSalvo(false);
          }}
          className="btn-prev"
        >
          Restaurar padrões
        </button>
        <span className="text-xs text-slate-400" aria-live="polite">
          {salvo ? "Preferências guardadas neste navegador." : ""}
        </span>
      </div>

      <section className="rounded-3xl border border-rose-100 bg-rose-50/50 p-6">
        <h2 className="text-base font-bold text-rose-700">Lista de materiais</h2>
        <p className="mt-1 text-xs text-rose-600/80">
          {totalMateriais} {totalMateriais === 1 ? "material salvo" : "materiais salvos"} neste navegador. Limpar a lista não apaga
          os links já compartilhados.
        </p>
        <button
          type="button"
          disabled={!totalMateriais}
          onClick={() => window.confirm("Limpar a lista de materiais deste navegador?") && onLimparLista()}
          className="btn-prev mt-3 !text-rose-600"
        >
          <Trash2 className="h-3.5 w-3.5" /> Limpar lista
        </button>
      </section>
    </form>
  );
}
