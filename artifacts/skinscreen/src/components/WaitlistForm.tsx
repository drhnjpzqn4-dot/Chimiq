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
      <div className={cn("p-5 rounded-2xl bg-primary/5 border border-primary/20 text-center animate-in fade-in zoom-in duration-300 max-w-md w-full", className)}>
        <p className="text-primary font-semibold text-base">You're on the list!</p>
        <p className="text-sm text-muted-foreground mt-1 mb-4">We'll notify you at launch. Early access members get:</p>
        <ul className="text-sm text-muted-foreground space-y-1.5 text-left inline-block">
          {["Unlimited ingredient scans", "Full routine conflict analysis", "PDF safety report — share with your dermatologist", "Priority access to the iOS app"].map((perk) => (
            <li key={perk} className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>{perk}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={cn("w-full max-w-md", className)}>
      <form onSubmit={handleSubmit(onSubmit)}>
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
      <p className="text-xs text-muted-foreground/60 mt-3 text-center">
        Early access · PDF safety reports · Unlimited scans
      </p>
    </div>
  );
}
