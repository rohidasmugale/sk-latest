import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, ArrowLeft, Sparkles } from "lucide-react";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsLoading(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (data.success) {
                setSent(true);
                toast.success("Check your email for reset instructions");
            } else {
                toast.error(data.message || "Something went wrong");
            }
        } catch {
            toast.error("Network error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <Card className="bg-gray-900/80 backdrop-blur-xl border-gray-800 shadow-2xl">
                    <CardHeader className="text-center space-y-3">
                        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                            <Mail className="h-8 w-8 text-white" />
                        </div>
                        <CardTitle className="text-3xl font-bold text-white">
                            {sent ? "Check Your Email" : "Forgot Password?"}
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                            {sent
                                ? "If that email is registered, we've sent a reset link. It expires in 30 minutes."
                                : "Enter your registered email and we'll send you a reset link."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!sent ? (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <Input
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-12 h-12 bg-gray-800/50 border-gray-700 text-white"
                                            required
                                        />
                                    </div>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold"
                                >
                                    {isLoading ? "Sending..." : "Send Reset Link"}
                                </Button>
                            </form>
                        ) : (
                            <div className="text-center text-gray-400 text-sm">
                                <Sparkles className="h-6 w-6 text-blue-400 mx-auto mb-3" />
                                Didn't receive it? Check spam, or{" "}
                                <button
                                    onClick={() => setSent(false)}
                                    className="text-blue-400 hover:text-blue-300 underline"
                                >
                                    try again
                                </button>
                                .
                            </div>
                        )}

                        <div className="mt-6 text-center">
                            <Link
                                to="/login"
                                className="text-sm text-gray-400 hover:text-gray-300 inline-flex items-center gap-1"
                            >
                                <ArrowLeft className="h-4 w-4" /> Back to Login
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

export default ForgotPassword;