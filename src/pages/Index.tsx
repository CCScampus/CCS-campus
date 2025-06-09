import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
});

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, user, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  if (user && !loading) {
    navigate("/dashboard");
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      await signIn(data.email, data.password);
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ccs-dark via-ccs-blue to-ccs-dark opacity-50"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48ZyB0cmFuc2Zvcm09InJvdGF0ZSg0NSAxLjQxNCA1LjQxNCkiIGZpbGw9IiNGRkYiIGZpbGwtb3BhY2l0eT0iLjA1Ij48cmVjdCB3aWR0aD0iNyIgaGVpZ2h0PSI3Ii8+PHJlY3QgeD0iOCIgeT0iOCIgd2lkdGg9IjciIGhlaWdodD0iNyIvPjwvZz48L2c+PC9zdmc+')] opacity-10"></div>
      </div>

      <div className="w-full max-w-md z-10 animate-fade-in">
        <div className="text-center mb-6">
          <div className="flex justify-center items-center gap-2 mb-2">
            <span className="font-bold text-4xl text-white">CCS</span>
            <span className="font-bold text-3xl text-accent">CAMPUS</span>
          </div>
          <h2 className="text-xl text-white/80">Student Management System</h2>
        </div>

        <Card className="border-card bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>
              Enter your credentials to access the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col items-center text-sm text-muted-foreground">
            <p>Forgot your password? Contact administrator.</p>
          </CardFooter>
        </Card>

        <div className="mt-8 text-center text-white/70 text-sm">
          <p>CCS CAMPUS © 2023 All Rights Reserved</p>
          <p className="mt-1">Vivekanand Public School, Sec. 23, Kakroi Road, Sonipat</p>
          <p className="mt-1">Mobile: 8930309222-8222, 9615007222</p>
          <p className="mt-1">Email: ccscampus0103@gmail.com</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
