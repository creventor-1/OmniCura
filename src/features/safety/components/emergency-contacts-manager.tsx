"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, PhoneCall, Plus, Trash2, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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
    try {
      await supabase.from("emergency_contacts").delete().eq("id", id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error("Failed to delete contact:", e);
    }
  };

  if (!user) {
    return (
      <Card className="max-w-xl mx-auto my-6 text-center p-6">
        <Users className="size-10 text-muted-foreground mx-auto mb-2" />
        <CardTitle className="text-lg">Sign in to manage Emergency Contacts</CardTitle>
        <CardDescription className="text-xs mt-1">
          Registered users can save emergency contacts for one-tap calling during urgent situations.
        </CardDescription>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="size-5 text-red-500" />
            Emergency Contacts
          </CardTitle>
          <CardDescription className="text-xs">
            Quick-dial trusted contacts during emergencies.
          </CardDescription>
        </div>

        {!isAdding && (
          <Button size="sm" onClick={() => setIsAdding(true)} className="gap-1.5 text-xs h-8">
            <Plus className="size-3.5" />
            Add Contact
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {isAdding && (
          <form
            onSubmit={handleSubmit(onAddContact)}
            className="p-4 rounded-lg border bg-muted/30 space-y-3"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              New Emergency Contact
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Full Name</label>
                <Input placeholder="e.g. Jane Doe" {...register("name")} className="text-sm h-9" />
                {errors.name && (
                  <span className="text-[11px] text-destructive">{errors.name.message}</span>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Relationship</label>
                <Input
                  placeholder="e.g. Spouse, Parent, Doctor"
                  {...register("relationship")}
                  className="text-sm h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Phone Number</label>
              <Input
                placeholder="e.g. +1 555-0199 or 08012345678"
                {...register("phone_number")}
                className="text-sm h-9"
              />
              {errors.phone_number && (
                <span className="text-[11px] text-destructive">{errors.phone_number.message}</span>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAdding(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="text-xs h-8 gap-1.5">
                {isSubmitting && <Spinner size="sm" />}
                Save Contact
              </Button>
            </div>
          </form>
        )}

        {contacts.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No emergency contacts saved. Add an emergency contact for quick access during urgent situations.
          </div>
        ) : (
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{contact.name}</span>
                    {contact.relationship && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                        {contact.relationship}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{contact.phone_number}</p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${contact.phone_number}`}
                    className="inline-flex size-8 items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm"
                    title={`Call ${contact.name}`}
                  >
                    <PhoneCall className="size-4" />
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteContact(contact.id)}
                    className="size-8 text-muted-foreground hover:text-destructive"
                    title="Delete contact"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
