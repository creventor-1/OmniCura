"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, PhoneCall, Plus, Trash2, Users, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
  const [contactToDelete, setContactToDelete] = React.useState<string | null>(
    null
  );

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

  const handleConfirmDelete = async () => {
    if (!contactToDelete) return;

    try {
      await supabase
        .from("emergency_contacts")
        .delete()
        .eq("id", contactToDelete);
      setContacts((prev) => prev.filter((c) => c.id !== contactToDelete));
    } catch (e) {
      console.error("Failed to delete contact:", e);
    } finally {
      setContactToDelete(null);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    );
  }

  const targetContact = contacts.find((c) => c.id === contactToDelete);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Delete Confirmation Accessible Dialog (Replaces native confirm) */}
      <ConfirmDialog
        isOpen={!!contactToDelete}
        onClose={() => setContactToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Emergency Contact"
        description={
          targetContact
            ? `Are you sure you want to remove "${targetContact.name}" from your designated emergency contacts? You can re-add them at any time.`
            : "Are you sure you want to remove this designated emergency contact? You can re-add them at any time."
        }
        confirmLabel="Delete Contact"
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Users className="size-4.5 text-accent" />
            <span>Emergency Contacts</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Designated responders surfaced during red-flag events and available for one-tap calling.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsAdding(!isAdding)}
          className="rounded-lg text-xs font-semibold gap-1.5 self-start sm:self-auto h-9 px-3"
        >
          {isAdding ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          <span>{isAdding ? "Cancel" : "Add Contact"}</span>
        </Button>
      </div>

      {/* Add Contact Card Form */}
      {isAdding && (
        <Card className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-none animate-in fade-in-50 duration-150">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm sm:text-base font-semibold text-foreground">
              Add New Emergency Contact
            </CardTitle>
            <CardDescription className="text-xs">
              Provide contact name and direct phone number.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <form onSubmit={handleSubmit(onAddContact)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-name"
                    className="text-xs font-medium text-foreground cursor-pointer block"
                  >
                    Full Name
                  </label>
                  <Input
                    id="contact-name"
                    placeholder="e.g. Dr. Adaeze Okafor"
                    className="rounded-lg h-9 text-sm"
                    {...register("name")}
                  />
                  {errors.name && (
                    <span className="text-xs font-medium text-destructive">
                      {errors.name.message}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-relationship"
                    className="text-xs font-medium text-foreground cursor-pointer block"
                  >
                    Relationship
                  </label>
                  <Input
                    id="contact-relationship"
                    placeholder="e.g. Spouse, Physician, Parent"
                    className="rounded-lg h-9 text-sm"
                    {...register("relationship")}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-phone"
                    className="text-xs font-medium text-foreground cursor-pointer block"
                  >
                    Phone Number
                  </label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    placeholder="e.g. +234 803 123 4567"
                    className="rounded-lg h-9 text-sm tabular-nums"
                    {...register("phone_number")}
                  />
                  {errors.phone_number && (
                    <span className="text-xs font-medium text-destructive">
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
                  className="rounded-lg text-xs font-semibold h-9 px-4 gap-1.5"
                >
                  <Plus className="size-3.5" />
                  <span>{isSubmitting ? "Saving Contact..." : "Save Contact"}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAdding(false)}
                  className="rounded-lg text-xs h-9 px-3"
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
              className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3 shadow-none hover:border-accent/40 transition-colors group"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {contact.name}
                  </h4>
                  {contact.relationship && (
                    <Badge
                      variant="secondary"
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                    >
                      {contact.relationship}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium tabular-nums">
                  <Phone className="size-3.5 text-accent shrink-0" />
                  <span className="truncate">{contact.phone_number}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`tel:${contact.phone_number}`}
                  className="inline-flex items-center justify-center size-9 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-colors"
                  title={`Call ${contact.name}`}
                  aria-label={`Call ${contact.name} at ${contact.phone_number}`}
                >
                  <PhoneCall className="size-4" />
                </a>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setContactToDelete(contact.id)}
                  className="size-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Remove contact"
                  aria-label={`Delete emergency contact ${contact.name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
