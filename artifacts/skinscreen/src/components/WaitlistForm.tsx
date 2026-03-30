import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useWaitlist } from "@/hooks/use-waitlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormValues = z.infer<typeof formSchema>;

export function WaitlistForm({ className, buttonSize = "lg", buttonLabel = "Join the waitlist" }: { className?: string, buttonSize?: "default" | "lg", buttonLabel?: string }) {
  const joinWaitlist = useWaitlist();
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (values: FormValues) => {
    joinWaitlist.mutate(
      { data: values },
      {
        onSuccess: () => {
          setIsSuccess(true);
        }
      }
    );
  };

  if (isSuccess) {
    return (
      <div className={cn("p-4 rounded-xl bg-primary/5 border border-primary/20 text-center animate-in fade-in zoom-in duration-300", className)}>
        <p className="text-primary font-medium">You're on the list!</p>
        <p className="text-sm text-muted-foreground mt-1">We'll let you know when SkinScreen launches.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn("w-full max-w-md", className)}>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Input 
            {...register("email")}
            placeholder="Enter your email" 
            className={cn("w-full bg-white/80 backdrop-blur-sm", errors.email && "border-destructive focus-visible:ring-destructive")}
            disabled={joinWaitlist.isPending}
          />
          {errors.email && (
            <p className="absolute -bottom-6 left-1 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <Button 
          type="submit" 
          size={buttonSize}
          disabled={joinWaitlist.isPending}
          className="min-w-[140px]"
        >
          {joinWaitlist.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            buttonLabel
          )}
        </Button>
      </div>
    </form>
  );
}
