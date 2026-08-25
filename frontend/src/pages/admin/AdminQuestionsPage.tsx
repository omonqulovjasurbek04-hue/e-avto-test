import React, { useEffect, useState } from "react";
import { adminService } from "../../services/admin.service";
import { Question } from "../../types/question";
import { Button, Card, Badge, Input, Modal, Spinner } from "../../components/ui";
import { Plus, Trash2, Search, CheckCircle2, HelpCircle } from "lucide-react";
import { toast } from "sonner";

export const AdminQuestionsPage: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New question form state
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ruleClause, setRuleClause] = useState("");
  const [explanation, setExplanation] = useState("");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("EASY");
  const [options, setOptions] = useState([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);

  const fetchQuestions = async () => {
    setIsLoading(true);
    const data = await adminService.getQuestions();
    setQuestions(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleAddOptionText = (index: number, val: string) => {
    const next = [...options];
    next[index].text = val;
    setOptions(next);
  };

  const handleSetCorrectOption = (index: number) => {
    const next = options.map((opt, idx) => ({
      ...opt,
      isCorrect: idx === index,
    }));
    setOptions(next);
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text) {
      toast.error("Savol matnini kiriting");
      return;
    }
    const hasEmptyOption = options.some((o) => !o.text.trim());
    if (hasEmptyOption) {
      toast.error("Barcha 4 ta variant matnini to'ldiring");
      return;
    }

    try {
      const newQ = await adminService.createQuestion({
        text,
        imageUrl: imageUrl || null,
        ruleClause: ruleClause || null,
        explanation: explanation || null,
        difficulty,
        options: options.map((o, idx) => ({
          text: o.text,
          isCorrect: o.isCorrect,
          order: idx + 1,
        })),
      });

      setQuestions([newQ, ...questions]);
      setIsAddModalOpen(false);
      setText("");
      setImageUrl("");
      setRuleClause("");
      setExplanation("");
      toast.success("Yangi savol muvaffaqiyatli qo'shildi!");
    } catch {
      toast.error("Savol qo'shishda xatolik yuz berdi");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Haqiqatan ham ushbu savolni o'chirmoqchimisiz?")) return;
    await adminService.deleteQuestion(id);
    setQuestions(questions.filter((q) => q.id !== id));
    toast.success("Savol o'chirildi");
  };

  const filtered = questions.filter((q) =>
    q.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Savollar Banki</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Jami {questions.length} ta rasmiy savollar mavjud
          </p>
        </div>

        <div className="flex gap-3">
          <Input
            placeholder="Savollarni qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"
            leftIcon={<Search className="h-4 w-4" />}
          />
          <Button
            variant="accent"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Yangi Savol
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q, idx) => (
            <div
              key={q.id}
              className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-400">#{idx + 1}</span>
                  {q.ruleClause && (
                    <Badge variant="neutral" size="sm">
                      {q.ruleClause}
                    </Badge>
                  )}
                  <Badge variant={q.difficulty === "HARD" ? "danger" : "primary"} size="sm">
                    {q.difficulty}
                  </Badge>
                </div>
                <h4 className="text-sm font-bold text-white leading-relaxed">{q.text}</h4>
                <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-400">
                  {q.options.map((opt) => (
                    <span
                      key={opt.id}
                      className={`px-2 py-0.5 rounded ${
                        opt.isCorrect
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold"
                          : "bg-slate-900 text-slate-400 border border-slate-800"
                      }`}
                    >
                      {opt.text}
                    </span>
                  ))}
                </div>
              </div>

              <Button
                size="sm"
                variant="danger"
                onClick={() => handleDelete(q.id)}
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                O'chirish
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Question Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Yangi Savol Qo'shish"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateQuestion} className="space-y-4 py-2 text-slate-900 dark:text-slate-100">
          <Input
            label="Savol matni"
            placeholder="Masalan: Ushbu yo'l belgisining ma'nosi nima?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Rasm havolasi (URL - ixtiyoriy)"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <Input
              label="YHQ moddasi / bandi"
              placeholder="YHQ 12.3-band"
              value={ruleClause}
              onChange={(e) => setRuleClause(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Qonuniy izoh / Tushuntirish
            </label>
            <textarea
              rows={2}
              placeholder="Savolning to'g'ri javobi bo'yicha tushuntirish..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Options */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Javob variantlari (To'g'risini tanlang):
            </label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correctOption"
                  checked={opt.isCorrect}
                  onChange={() => handleSetCorrectOption(idx)}
                  className="h-4 w-4 text-emerald-600 cursor-pointer"
                />
                <input
                  type="text"
                  placeholder={`${idx + 1}-variant matni`}
                  value={opt.text}
                  onChange={(e) => handleAddOptionText(idx, e.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  required
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsAddModalOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button type="submit" variant="primary" className="flex-1 font-bold">
              Savolni Saqlash
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
