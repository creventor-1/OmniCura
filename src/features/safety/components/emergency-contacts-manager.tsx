"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, PhoneCall, Plus, Trash2, Users, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuth } from "@/features/authentication/context/auth-context";
import { createClient } from "@/services/database/supabase/client";
import { EmergencyContact } from "@/types/database";

const ContactSchema = z.object({
  name: z.string().min(1, "Contact name is required."),
  relationship: z.string().optional(),
  phone_number: z.string().min(3, "Valid phone number is required."),
});

type ContactFormData = z.infer<typeof ContactSchema>;

export function EmergencyContactsManager() {
  const { user } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [contacts, setContacts] = React.useState<EmergencyContact[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAdding, setIsAdding] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(ContactSchema),
  });

  React.useEffect(() => {
    let active = true;

    async function fetchContacts() {
      if (!user) {
        if (active) setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("emergency_contacts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (active && !error && data) {
          setContacts(data as EmergencyContact[]);
        }
      } catch (e) {
        console.warn("Failed to load contacts:", e);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchContacts();
    return () => {
      active = false;
    };
  }, [user, supabase]);

  const onAddContact = async (data: ContactFormData) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const { data: inserted, error } = await supabase
        .from("emergency_contacts")
        .insert({
          user_id: user.id,
          name: data.name,
          relationship: data.relationship || null,
          phone_number: data.phone_number,
        })
        .select()
        .single();

      if (!error && inserted) {
        setContacts((prev) => [...prev, inserted as EmergencyContact]);
        setIsAdding(false);
        reset();
      }
    } catch (e) {
      console.error("Failed to add contact:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDeleteContact = async (id: string) => {
    if (!confirm("Are you sure you want to remove this emergency contact?")) return;

    try {
      await supabase.from("emergency_contacts").delete().eq("id", id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error("Failed to delete contact:", e);
    }
  };

  if (!user) {
    return (
      <EmptyState
        icon={Users}
        title="Sign In to Manage Emergency Contacts"
        description="Register or sign in to configure trusted family members, physicians, or emergency responders for instant one-tap dialing during critical events."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <span>Emergency Contacts</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Designated responders surfaced during red-flag events and available for one-tap calling.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsAdding(!isAdding)}
          className="rounded-xl text-xs font-semibold gap-1.5 self-start sm:self-auto h-9"
        >
          {isAdding ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          <span>{isAdding ? "Cancel" : "Add Contact"}</span>
        </Button>
      </div>

      {/* Add Contact Card Form */}
      {isAdding && (
        <Card className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 shadow-xs animate-in fade-in-50 duration-150">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-bold text-foreground">
              Add New Emergency Contact
            </CardTitle>
            <CardDescription className="text-xs">
              Provide contact name and direct phone number.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <form onSubmit={handleSubmit(onAddContact)} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Full Name</label>
                  <Input
                    placeholder="e.g. Dr. Adaeze Okafor"
                    className="rounded-xl h-9 text-xs"
                    {...register("name")}
                  />
                  {errors.name && (
                    <span className="text-[11px] text-destructive">{errors.name.message}</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Relationship</label>
                  <Input
                    placeholder="e.g. Spouse, Physician, Parent"
                    className="rounded-xl h-9 text-xs"
                    {...register("relationship")}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Phone Number</label>
                  <Input
                    type="tel"
                    placeholder="e.g. +234 803 123 4567"
                    className="rounded-xl h-9 text-xs"
                    {...register("phone_number")}
                  />
                  {errors.phone_number && (
                    <span className="text-[11px] text-destructive">
                      {errors.phone_number.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="rounded-xl text-xs font-bold h-9 px-4 gap-1.5"
                >
                  <Plus className="size-3.5" />
                  <span>{isSubmitting ? "Saving Contact..." : "Save Contact"}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAdding(false)}
                  className="rounded-xl text-xs h-9 px-3"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {contacts.length === 0 && !isAdding && (
        <EmptyState
          icon={PhoneCall}
          title="No Emergency Contacts Configured"
          description="Add trusted family members or your primary care physician to enable rapid one-tap dialing during urgent health events."
          actionLabel="Add Emergency Contact"
          onAction={() => setIsAdding(true)}
        />
      )}

      {/* Contact Cards Grid */}
      {contacts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="rounded-2xl border border-border/80 bg-card p-4 flex items-center justify-between gap-3 shadow-xs hover:border-primary/40 transition-all group"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground truncate">{contact.name}</h4>
                  {contact.relationship && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    >
                      {contact.relationship}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Phone className="size-3 text-primary" />
                  <span className="truncate">{contact.phone_number}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`tel:${contact.phone_number}`}
                  className="inline-flex items-center justify-center size-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-colors"
                  title={`Call ${contact.name}`}
                >
                  <PhoneCall className="size-3.5" />
                </a>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeleteContact(contact.id)}
                  className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Remove contact"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
