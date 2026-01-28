"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles, Check, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { submitWaitlist } from "./actions";

const benefits = [
  "Early access to all features",
  "Priority support during beta",
  "Influence product roadmap",
  "Exclusive early-adopter pricing",
];

const scaleOptions = [
  { value: "hobby", label: "Hobby / Side Project" },
  { value: "startup", label: "Startup (1-10 employees)" },
  { value: "growth", label: "Growth (11-50 employees)" },
  { value: "scale", label: "Scale (51-200 employees)" },
  { value: "enterprise", label: "Enterprise (200+ employees)" },
];

export function WaitlistContent() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [formData, setFormData] = React.useState({
    fullName: "",
    email: "",
    company: "",
    role: "",
    useCase: "",
    expectedScale: "",
    consent: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.consent) {
      toast({
        title: "Consent Required",
        description: "Please agree to receive updates to join the waitlist.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await submitWaitlist(formData);
      setIsSubmitted(true);
      toast({
        title: "You're on the list!",
        description: "We'll be in touch soon with your early access invite.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto px-6"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            You're on the List!
          </h1>
          <p className="text-gray-600 mb-8">
            Thanks for your interest in Agentic Cloud. We'll send you an invite
            as soon as we're ready for you.
          </p>
          <div className="glass-card rounded-xl p-6 text-left">
            <p className="text-sm text-gray-500 mb-2">What's next?</p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5" />
                <span>Check your email for a confirmation</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5" />
                <span>We'll review your application</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5" />
                <span>Receive your early access invite</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-24 lg:pt-32">
      <section className="py-16 lg:py-24 xl:py-32">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 xl:gap-28 items-center">
            {/* Left: Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:pr-8"
            >
              <Badge variant="gradient" className="mb-6 lg:mb-8">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Early Access
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-6 lg:mb-8 leading-tight">
                <span className="block mb-2 lg:mb-4">Join the</span>
                <span className="block gradient-text">Waitlist</span>
              </h1>

              <p className="text-lg lg:text-xl xl:text-2xl text-gray-600 mb-8 lg:mb-10 leading-relaxed max-w-xl">
                Be among the first to experience the future of cloud
                infrastructure. Sign up now to get early access and exclusive
                benefits.
              </p>

              <div className="space-y-4 lg:space-y-5 mb-8 lg:mb-10">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.1 }}
                    className="flex items-center gap-3 lg:gap-4"
                  >
                    <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Check className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" />
                    </div>
                    <span className="text-gray-700 lg:text-lg">{benefit}</span>
                  </motion.div>
                ))}
              </div>

              <div className="glass-card rounded-xl p-6 lg:p-8 border border-gray-100">
                <p className="text-sm lg:text-base text-gray-500 mb-2">
                  Already have questions?
                </p>
                <a
                  href="/company#contact"
                  className="text-violet-600 font-semibold hover:text-violet-700 transition-colors text-base lg:text-lg inline-flex items-center gap-1"
                >
                  Contact our team
                  <span className="ml-1">→</span>
                </a>
              </div>
            </motion.div>

            {/* Right: Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:sticky lg:top-32"
            >
              <form
                onSubmit={handleSubmit}
                className="glass-card-strong rounded-2xl lg:rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl shadow-violet-500/5 border border-gray-100"
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        placeholder="Jane Smith"
                        required
                        value={formData.fullName}
                        onChange={(e) =>
                          setFormData({ ...formData, fullName: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Work Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="jane@company.com"
                        required
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        placeholder="Acme Inc."
                        value={formData.company}
                        onChange={(e) =>
                          setFormData({ ...formData, company: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Input
                        id="role"
                        placeholder="CTO, Developer, etc."
                        value={formData.role}
                        onChange={(e) =>
                          setFormData({ ...formData, role: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expectedScale">Expected Scale</Label>
                    <Select
                      value={formData.expectedScale}
                      onValueChange={(value) =>
                        setFormData({ ...formData, expectedScale: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your team size" />
                      </SelectTrigger>
                      <SelectContent>
                        {scaleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="useCase">
                      What would you like to build? (Optional)
                    </Label>
                    <Textarea
                      id="useCase"
                      placeholder="Tell us about your use case..."
                      value={formData.useCase}
                      onChange={(e) =>
                        setFormData({ ...formData, useCase: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="consent"
                      checked={formData.consent}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          consent: checked as boolean,
                        })
                      }
                    />
                    <Label
                      htmlFor="consent"
                      className="text-sm text-gray-600 leading-relaxed cursor-pointer"
                    >
                      I agree to receive updates about Agentic Cloud and
                      CallSphere. You can unsubscribe at any time.
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full rounded-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Join Waitlist
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
