import { useJoinWaitlist as useJoinWaitlistMutation } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function useWaitlist() {
  const { toast } = useToast();
  
  return useJoinWaitlistMutation({
    mutation: {
      onSuccess: (data) => {
        if (data.alreadyRegistered) {
          toast({
            title: "Already on the list!",
            description: "You're already on the list — we'll be in touch soon!",
            duration: 5000,
          });
        } else {
          toast({
            title: "You're on the list!",
            description: "We'll let you know when SkinScreen launches.",
            duration: 5000,
          });
        }
      },
      onError: (error: any) => {
        toast({
          title: "Something went wrong",
          description: error?.response?.data?.error || "Please try again later.",
          variant: "destructive",
          duration: 5000,
        });
      }
    }
  });
}
