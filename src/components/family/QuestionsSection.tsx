import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { familyApi, fmtDateTime } from "@/lib/family-api";
import { useFamilyAuth } from "./FamilyAuth";

const TOPICS = ["Как начать разговор", "Близкий отказывается лечиться", "Созависимость и я", "Срыв после лечения", "Лечение и реабилитация", "Дети и подростки", "Другое"];

const QuestionsSection = () => {
  const qc = useQueryClient();
  const { refresh } = useFamilyAuth();
  const { data, isLoading } = useQuery({ queryKey: ["family", "questions"], queryFn: familyApi.questions });
  const [topic, setTopic] = useState(TOPICS[0]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const items = data?.items ?? [];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 10) { toast.error("Опишите ситуацию чуть подробнее"); return; }
    setBusy(true);
    try {
      await familyApi.ask({ topic, question: text });
      setText("");
      toast.success("Вопрос отправлен психологу");
      qc.invalidateQueries({ queryKey: ["family", "questions"] });
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="order-2 flex flex-col gap-4 xl:order-1">
        <h2 className="font-heading text-xl font-semibold">Мои вопросы</h2>
        {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-card" />}
        {!isLoading && items.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-card/50 p-10 text-center text-muted-foreground">
            <Icon name="MessagesSquare" size={32} className="mx-auto" />
            <p className="mt-3">Здесь появятся ваши вопросы и ответы психолога</p>
          </div>
        )}
        {items.map((q) => (
          <article key={q.id} className="overflow-hidden rounded-2xl bg-card">
            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {q.topic && <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">{q.topic}</span>}
                <span className="text-xs text-muted-foreground">{fmtDateTime(q.created_at)}</span>
              </div>
              <p className="mt-3 whitespace-pre-line leading-relaxed">{q.question}</p>
            </div>
            {q.status === "answered" && q.answer ? (
              <div className="border-t bg-emerald-50/60 p-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white"><Icon name="UserRoundCheck" size={15} /></span>
                  <div>
                    <p className="text-sm font-semibold">{q.answered_by_name || "Психолог клиники"}</p>
                    <p className="text-xs text-muted-foreground">{fmtDateTime(q.answered_at)}</p>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-line leading-relaxed">{q.answer}</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 border-t bg-secondary/50 px-5 py-3 text-sm text-muted-foreground">
                <Icon name="Clock" size={15} />Психолог ответит в течение 24 часов
              </div>
            )}
          </article>
        ))}
      </div>

      <form onSubmit={submit} className="order-1 h-fit rounded-2xl bg-ink p-5 text-ink-foreground xl:sticky xl:top-6 xl:order-2">
        <p className="flex items-center gap-2 font-heading text-lg font-semibold"><Icon name="MessageCircleQuestion" size={20} />Задать вопрос</p>
        <p className="mt-1 text-sm text-white/60">Ответит психолог клиники — письменно, бесплатно, конфиденциально.</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {TOPICS.map((t) => (
            <button type="button" key={t} onClick={() => setTopic(t)} className={`rounded-full px-3 py-1.5 text-xs transition-colors ${topic === t ? "bg-primary text-primary-foreground" : "bg-white/10 hover:bg-white/15"}`}>{t}</button>
          ))}
        </div>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder="Опишите ситуацию: кто ваш близкий, что происходит, что вы уже пробовали и что беспокоит больше всего"
          className="mt-4 border-white/10 bg-white/5 text-white placeholder:text-white/40" />
        <button disabled={busy} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary font-medium text-primary-foreground disabled:opacity-60">
          <Icon name={busy ? "Loader2" : "Send"} size={15} className={busy ? "animate-spin" : ""} />Отправить вопрос
        </button>
        <p className="mt-3 text-xs text-white/50">Если ситуация срочная или есть угроза жизни — звоните 112 или на нашу линию 24/7.</p>
      </form>
    </div>
  );
};

export default QuestionsSection;
