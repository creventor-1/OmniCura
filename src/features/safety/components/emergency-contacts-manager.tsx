"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PhoneCall, Plus, Trash2, UsersRound, Siren, Lock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/features/authentication/context/auth-context";
import { createClient } from "@/services/database/supabase/client";
import { EmergencyContact } from "@/types/database";
import { requestAuth } from "@/components/shell/nav-config";
import { DEFAULT_EMERGENCY_NUMBER } from "@/lib/constants";

const ContactSchema = z.object({
  name: z.string().min(1, "Contact name is required."),
  relationship: z.string().optional(),
  phone_number: z.string().min(3, "Valid phone number is required."),
});

type ContactFormData = z.infer<typeof ContactSchema>;

function initialsOf(name: string) {
  return name
    .replace(/^(dr|mr|mrs|ms)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function EmergencyServicesCard() {
  return (
    <section className="flex flex-col gap-4 rounded-[20px] border border-danger/25 bg-surface p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-danger text-white dark:text-[#2a0605]">
          <Siren className="size-6" aria-hidden="true" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-foreground">Emergency services</h2>
            <span className="rounded-full bg-danger-muted px-2 py-0.5 text-[11px] font-semibold text-danger">Always available</span>
          </div>
          <p className="text-[13px] text-text-secondary">Ambulance, fire and police · dial {DEFAULT_EMERGENCY_NUMBER}</p>
        </div>
      </div>
      <a
        href={`tel:${DEFAULT_EMERGENCY_NUMBER}`}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-danger px-5 text-sm font-semibold text-white transition-colors hover:bg-danger-strong dark:text-[#2a0605]"
      >
        <PhoneCall className="size-4" aria-hidden="true" />
        Call {DEFAULT_EMERGENCY_NUMBER}
      </a>
    </section>
  );
}

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
      <div className="space-y-6">
        <EmergencyServicesCard />
        <EmptyState
          icon={UsersRound}
          title="Sign in to manage emergency contacts"
          description="Save trusted family members, caregivers or your physician for one-tap calling during an urgent health event. Contacts sync securely to your account."
          actionLabel="Sign in or create account"
          onAction={() => requestAuth("signin")}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-[88px] w-full rounded-[20px]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-[20px]" />
          ))}
        </div>
      </div>
    );
  }

  const targetContact = contacts.find((c) => c.id === contactToDelete);

  return (
    <div className="space-y-6">
      <ConfirmDialog
        isOpen={!!contactToDelete}
        onClose={() => setContactToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Remove this contact?"
        description={
          targetContact
            ? `${targetContact.name} will be removed from your emergency contacts. You can add them again at any time.`
            : "This contact will be removed from your emergency contacts. You can add them again at any time."
        }
        confirmLabel="Remove contact"
      />

      <Dialog
        open={isAdding}
        onOpenChange={(open) => {
          setIsAdding(open);
          if (!open) reset();
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader className="gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-brand/15 bg-brand-muted text-accent">
              <Phone className="size-5" aria-hidden="true" />
            </span>
            <DialogTitle>Add emergency contact</DialogTitle>
            <DialogDescription>They&apos;ll be available for one-tap calling from anywhere in Omnicura.</DialogDescription>
          </DialogHeader>

          <form id="add-contact-form" onSubmit={handleSubmit(onAddContact)} className="space-y-4">
            <Input id="contact-name" label="Full name" placeholder="e.g. Dr. Adaeze Okafor" autoComplete="name" error={errors.name?.message} {...register("name")} />
            <Input id="contact-relationship" label="Relationship" placeholder="e.g. Spouse, Physician, Parent" {...register("relationship")} />
            <Input
              id="contact-phone"
              label="Phone number"
              type="tel"
              autoComplete="tel"
              placeholder="e.g. +234 803 123 4567"
              className="tabular-nums"
              error={errors.phone_number?.message}
              {...register("phone_number")}
            />
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-contact-form" isLoading={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmergencyServicesCard />

      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="type-heading text-foreground">Your contacts</h2>
          <p className="text-[13px] text-text-tertiary">
            {contacts.length} {contacts.length === 1 ? "person" : "people"} ready for one-tap calling
          </p>
        </div>
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="stroke-[2.5]" />
          Add contact
        </Button>
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          icon={PhoneCall}
          title="No contacts added yet"
          description="Add a family member, caregiver or your primary care physician so help is one tap away."
          actionLabel="Add emergency contact"
          onAction={() => setIsAdding(true)}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {contacts.map((contact, i) => (
            <li
              key={contact.id}
              className="group flex flex-col rounded-[20px] border border-border-subtle bg-surface p-5 shadow-xs transition-all hover:border-border-strong hover:shadow-card-hover animate-rise"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft font-heading text-base font-bold text-accent-text">
                  {initialsOf(contact.name) || <UsersRound className="size-5" aria-hidden="true" />}
                </span>
                <button
                  type="button"
                  onClick={() => setContactToDelete(contact.id)}
                  className="flex size-9 items-center justify-center rounded-lg text-text-tertiary opacity-100 transition-all hover:bg-danger-muted hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer"
                  title="Remove contact"
                  aria-label={`Delete emergency contact ${contact.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-4 min-w-0">
                <h3 className="truncate text-[15px] font-semibold text-foreground">{contact.name}</h3>
                <p className="mt-0.5 text-[13px] text-text-tertiary">{contact.relationship || "Emergency contact"}</p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
                <span className="truncate text-sm font-medium tabular-nums text-text-secondary">{contact.phone_number}</span>
                <a
                  href={`tel:${contact.phone_number}`}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-brand-hover"
                  title={`Call ${contact.name}`}
                  aria-label={`Call ${contact.name} at ${contact.phone_number}`}
                >
                  <PhoneCall className="size-3.5" />
                  Call
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-center gap-2 text-xs text-text-tertiary">
        <Lock className="size-3.5" aria-hidden="true" />
        Contacts are stored in your account with row-level security.
      </p>
    </div>
  );
}
