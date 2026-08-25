import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

const schema = z.object({
  name: z.string().min(2, "Ism kamida 2 ta belgidan iborat bo'lishi kerak"),
  email: z.string().email("Noto'g'ri email manzili"),
  subject: z.string().min(3, "Mavzu kamida 3 ta belgidan iborat bo'lishi kerak"),
  message: z.string().min(10, "Xabar kamida 10 ta belgidan iborat bo'lishi kerak"),
});

type FormValues = z.infer<typeof schema>;

export default function Contact() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    await new Promise((r) => setTimeout(r, 600));
    console.log("Contact form submitted (mock):", values);
    toast.success("Xabaringiz yuborildi!");
    reset();
  };

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Biz bilan bog'laning</h1>
          <p className="mt-2 text-slate-500">
            Savollaringiz bo'lsa, quyidagi forma orqali yuboring.
          </p>
        </div>

        <Card padded>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Ismingiz"
              placeholder="Ismingiz"
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              label="Email"
              type="email"
              placeholder="email@example.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Mavzu"
              placeholder="Xabar mavzusi"
              error={errors.subject?.message}
              {...register("subject")}
            />
            <Textarea
              label="Xabar"
              rows={5}
              placeholder="Xabaringizni shu yerga yozing..."
              error={errors.message?.message}
              {...register("message")}
            />
            <Button type="submit" loading={isSubmitting} rightIcon={<Send className="h-4 w-4" />}>
              Yuborish
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
