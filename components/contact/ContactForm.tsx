"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Send, CheckCircle, AlertCircle } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrors({});

    const form = e.currentTarget;
    const body = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setStatus("success");
        form.reset();
      } else {
        const data = await res.json();
        if (data.error?.fieldErrors) setErrors(data.error.fieldErrors);
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  const fieldClass =
    "w-full border border-divider bg-surface px-4 py-3 font-sans text-sm text-ink placeholder:text-ink-muted/50 outline-none transition-colors focus:border-ink";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <input name="name" type="text" placeholder="Name" required className={fieldClass} aria-label="Name" />
        {errors.name && <p className="mt-1 text-xs text-accent">{errors.name[0]}</p>}
      </div>

      <div>
        <input name="email" type="email" placeholder="Email" required className={fieldClass} aria-label="Email" />
        {errors.email && <p className="mt-1 text-xs text-accent">{errors.email[0]}</p>}
      </div>

      <div>
        <textarea
          name="message"
          placeholder="Message"
          required
          rows={6}
          className={`${fieldClass} resize-none`}
          aria-label="Message"
        />
        {errors.message && <p className="mt-1 text-xs text-accent">{errors.message[0]}</p>}
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" variant="primary" size="md" disabled={status === "loading"}>
          <Send size={13} />
          {status === "loading" ? "Sending..." : "Send Message"}
        </Button>

        {status === "success" && (
          <span className="flex items-center gap-1.5 font-jetbrains text-[0.6875rem] uppercase tracking-widest text-ink-muted">
            <CheckCircle size={13} className="text-green-600" />
            Message sent!
          </span>
        )}

        {status === "error" && !Object.keys(errors).length && (
          <span className="flex items-center gap-1.5 font-jetbrains text-[0.6875rem] uppercase tracking-widest text-accent">
            <AlertCircle size={13} />
            Something went wrong, try again.
          </span>
        )}
      </div>
    </form>
  );
}
