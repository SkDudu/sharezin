"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthGate } from "@/components/auth-gate";
import { GroupCreateModal } from "@/components/group-create-modal";
import { GroupInviteSheet } from "@/components/group-invite-sheet";
import { GroupJoinSheet } from "@/components/group-join-sheet";
import { GroupLeaveSheet, GroupConfirmSheet } from "@/components/group-leave-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListCardsSkeleton } from "@/components/ui/skeleton";
import { enter, exit, io } from "@/lib/motion";
import { useExitPresence } from "@/lib/use-exit-presence";
import { cn } from "@/lib/utils";

function initial(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  return source.charAt(0).toUpperCase();
}

function GroupsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const me = useQuery(api.users.me);
  const groups = useQuery(api.groups.listMine);
  const create = useMutation(api.groups.create);
  const rename = useMutation(api.groups.rename);
  const remove = useMutation(api.groups.remove);
  const removeMember = useMutation(api.groups.removeMember);
  const leave = useMutation(api.groups.leave);

  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<Id<"groups"> | null>(null);
  const [mobileCreateOpen, setMobileCreateOpen] = useState(false);
  const [desktopCreateOpen, setDesktopCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [inviteGroupId, setInviteGroupId] = useState<Id<"groups"> | null>(
    null,
  );
  const [leaveGroupId, setLeaveGroupId] = useState<Id<"groups"> | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<Id<"groups"> | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    membershipId: Id<"groupMembers">;
    displayName: string;
  } | null>(null);
  const [renamingId, setRenamingId] = useState<Id<"groups"> | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamePending, setRenamePending] = useState(false);
  const mobileCreateInputRef = useRef<HTMLInputElement>(null);
  const mobileCreate = useExitPresence(mobileCreateOpen);
  const renameSheet = useExitPresence(renamingId !== null);

  function openCreate() {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
      setDesktopCreateOpen(true);
    } else {
      setMobileCreateOpen(true);
    }
  }

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openCreate();
      router.replace("/groups", { scroll: false });
    }
    if (searchParams.get("join") === "1") {
      setJoinOpen(true);
      router.replace("/groups", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once from query
  }, [searchParams, router]);

  useEffect(() => {
    function onOpenCreate() {
      openCreate();
    }
    window.addEventListener("sharezin:focus-create-group", onOpenCreate);
    return () =>
      window.removeEventListener("sharezin:focus-create-group", onOpenCreate);
  }, []);

  useEffect(() => {
    if (mobileCreateOpen) {
      window.setTimeout(() => mobileCreateInputRef.current?.focus(), 50);
    }
  }, [mobileCreateOpen]);

  const inviteGroup =
    inviteGroupId && groups
      ? groups.find((g) => g._id === inviteGroupId)
      : null;
  const leaveGroup =
    leaveGroupId && groups
      ? groups.find((g) => g._id === leaveGroupId)
      : null;
  const deleteGroup =
    deleteGroupId && groups
      ? groups.find((g) => g._id === deleteGroupId)
      : null;

  function afterCreated(groupId: Id<"groups">) {
    setExpandedId(groupId);
    window.setTimeout(() => {
      document
        .getElementById(`group-${groupId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }

  async function onCreateMobile(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error("Nome obrigatório");
      return;
    }
    setCreating(true);
    try {
      const { groupId } = await create({ name: trimmed });
      setNewName("");
      setMobileCreateOpen(false);
      afterCreated(groupId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar");
    } finally {
      setCreating(false);
    }
  }

  async function onRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    setRenamePending(true);
    try {
      await rename({ groupId: renamingId, name: trimmed });
      setRenamingId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao renomear");
    } finally {
      setRenamePending(false);
    }
  }

  async function onDeleteConfirm() {
    if (!deleteGroup) return;
    try {
      await remove({ groupId: deleteGroup._id });
      toast.success(`Grupo “${deleteGroup.name}” excluído`);
      if (expandedId === deleteGroup._id) setExpandedId(null);
      setDeleteGroupId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao excluir");
    }
  }

  async function onRemoveMemberConfirm() {
    if (!removeTarget) return;
    try {
      await removeMember({ membershipId: removeTarget.membershipId });
      toast.success(`${removeTarget.displayName} removido`);
      setRemoveTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover");
    }
  }

  async function onLeaveConfirm() {
    if (!leaveGroup) return;
    try {
      await leave({ groupId: leaveGroup._id });
      toast.success(`Você saiu de ${leaveGroup.name}`);
      if (expandedId === leaveGroup._id) setExpandedId(null);
      setLeaveGroupId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao sair");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-5 pt-2 pb-28 md:gap-7 md:px-12 md:py-10 md:pb-10">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="hidden text-[13px] leading-4 font-medium text-muted-foreground md:block">
            Participantes reutilizáveis
          </p>
          <h1 className="font-display text-2xl leading-[30px] font-extrabold tracking-[-0.03em] text-foreground md:text-[36px] md:leading-[44px]">
            Grupos
          </h1>
        </div>

        <Link
          href="/profile"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-primary-foreground"
          aria-label="Perfil"
        >
          {initial(me?.name, me?.email)}
        </Link>
      </header>

      {groups !== undefined && groups.length > 0 ? (
        <button
          type="button"
          onClick={() => setJoinOpen(true)}
          className="self-start text-[13px] font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline md:hidden"
        >
          Entrar com código
        </button>
      ) : null}

      {groups === undefined ? (
        <ListCardsSkeleton />
      ) : groups.length === 0 ? (
        /* Paper G0 — empty grupos */
        <div
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-7 py-10",
            enter.fade,
          )}
        >          <div className="flex size-[88px] shrink-0 items-center justify-center rounded-full bg-card md:size-[104px]">
            <div className="flex items-center">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted text-sm font-bold text-muted-foreground md:size-[42px] md:text-base">
                ?
              </span>
              <span className="-ml-3 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-background bg-primary text-[15px] font-bold text-primary-foreground md:size-12 md:text-lg">
                +
              </span>
              <span className="-ml-3 flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted text-sm font-bold text-muted-foreground md:size-[42px] md:text-base">
                ?
              </span>
            </div>
          </div>
          <div className="flex w-full max-w-[280px] flex-col items-center gap-2.5 text-center md:max-w-[360px] md:gap-3">
            <h2 className="font-display text-[26px] leading-8 font-extrabold tracking-[-0.03em] text-foreground md:text-[36px] md:leading-[44px]">
              Nenhum grupo ainda
            </h2>
            <p className="text-[15px] leading-[22px] text-muted-foreground md:text-base md:leading-6">
              Turma fixa pra vários recibos. Crie um ou entre com código.
            </p>
          </div>
          <div className="flex w-full max-w-[280px] flex-col gap-3 md:max-w-none md:flex-row md:justify-center">
            <Button
              type="button"
              size="lg"
              onClick={openCreate}
              className="h-[52px] font-bold md:px-7"
            >
              Novo grupo
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setJoinOpen(true)}
              className="h-[52px] border border-border font-semibold md:px-7"
            >
              Entrar com código
            </Button>
          </div>
        </div>
      ) : (
        <ul className={cn("flex flex-col gap-3", enter.fade)}>
          {groups.map((g) => {
            const open = expandedId === g._id;
            return (
              <li
                key={g._id}
                id={`group-${g._id}`}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId((cur) => (cur === g._id ? null : g._id))
                  }
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="font-display truncate text-[17px] leading-[22px] font-bold text-foreground">
                      {g.name}
                    </p>
                    <p className="text-xs leading-4 text-muted-foreground">
                      {g.memberCount}{" "}
                      {g.memberCount === 1 ? "participante" : "participantes"}
                    </p>
                  </div>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background">
                    {open ? (
                      <ChevronDown
                        className="size-3.5 text-foreground"
                        strokeWidth={2.2}
                      />
                    ) : (
                      <ChevronRight
                        className="size-3.5 text-foreground"
                        strokeWidth={2.2}
                      />
                    )}
                  </span>
                </button>

                {open ? (
                  <div className="flex flex-col border-t border-border px-2 pt-1 pb-3">
                    {g.members.map((m) => (
                      <div
                        key={m.membershipId}
                        className="flex w-full items-center gap-3 px-2 py-2.5"
                      >
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                            m.isMe
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground",
                          )}
                        >
                          {m.displayName.charAt(0).toUpperCase()}
                        </span>
                        <p className="min-w-0 flex-1 truncate text-sm leading-[18px] font-medium text-foreground">
                          {m.displayName}
                        </p>
                        {m.isMe ? (
                          <span className="flex h-5 shrink-0 items-center rounded-full bg-primary/15 px-2 text-[10px] leading-3 font-bold tracking-[0.04em] text-primary uppercase">
                            Você
                          </span>
                        ) : g.isCreator ? (
                          <button
                            type="button"
                            aria-label={`Remover ${m.displayName}`}
                            onClick={() =>
                              setRemoveTarget({
                                membershipId: m.membershipId,
                                displayName: m.displayName,
                              })
                            }
                            className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <X className="size-3.5" strokeWidth={2} />
                          </button>
                        ) : (
                          <span className="size-7 shrink-0" />
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => setInviteGroupId(g._id)}
                      className="flex w-full items-center gap-3 px-2 py-2.5 text-left"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-border">
                        <Plus
                          className="size-3.5 text-muted-foreground"
                          strokeWidth={2}
                        />
                      </span>
                      <span className="text-sm leading-[18px] font-medium text-muted-foreground">
                        Adicionar participante
                      </span>
                    </button>

                    {g.isCreator ? (
                      <div className="flex w-full gap-2 px-2 pt-1 pb-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(g._id);
                            setRenameValue(g.name);
                          }}
                          className="flex h-10 flex-1 items-center justify-center rounded-xl border border-border bg-background text-[13px] font-semibold text-foreground"
                        >
                          Renomear
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteGroupId(g._id)}
                          className="flex h-10 flex-1 items-center justify-center rounded-xl bg-destructive/12 text-[13px] font-semibold text-destructive"
                        >
                          Excluir
                        </button>
                      </div>
                    ) : (
                      <div className="flex w-full px-2 pt-1 pb-2">
                        <button
                          type="button"
                          onClick={() => setLeaveGroupId(g._id)}
                          className="flex h-10 flex-1 items-center justify-center rounded-xl bg-destructive/12 text-[13px] font-semibold text-destructive"
                        >
                          Sair do grupo
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {mobileCreate.show ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Fechar"
            className={cn(
              "absolute inset-0 bg-[#0C0C0D]/72 backdrop-blur-[2px]",
              io(mobileCreate.exiting, enter.scrim, exit.scrim),
            )}
            onClick={() => setMobileCreateOpen(false)}
            disabled={mobileCreate.exiting}
          />
          <form
            onSubmit={onCreateMobile}
            className={cn(
              "absolute inset-x-0 bottom-0 flex flex-col gap-5 rounded-t-2xl border-t border-border bg-card px-5 pt-3 pb-7",
              io(mobileCreate.exiting, enter.sheet, exit.sheet),
            )}
          >
            <div className="flex w-full items-center justify-center">
              <div className="h-1 w-9 shrink-0 rounded-full bg-neutral-600" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-[26px] leading-8 font-extrabold tracking-tight text-foreground">
                Novo grupo
              </h2>
              <p className="text-[15px] leading-[22px] text-muted-foreground">
                Turma fixa pra vários recibos.
              </p>
            </div>
            <Input
              ref={mobileCreateInputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do grupo"
              className="h-12 rounded-xl bg-background"
            />
            <Button
              type="submit"
              size="lg"
              disabled={creating}
              className="w-full font-bold"
            >
              {creating ? "Criando…" : "Criar grupo"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setMobileCreateOpen(false);
                setJoinOpen(true);
              }}
              className="text-center text-[13px] font-semibold text-muted-foreground"
            >
              Entrar com código
            </button>
          </form>
        </div>
      ) : null}

      <GroupCreateModal
        open={desktopCreateOpen}
        onClose={() => setDesktopCreateOpen(false)}
        onCreated={afterCreated}
        onJoinInstead={() => setJoinOpen(true)}
      />

      {renameSheet.show ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <button
            type="button"
            aria-label="Fechar"
            className={cn(
              "absolute inset-0 bg-[#0C0C0D]/72 backdrop-blur-[2px]",
              io(renameSheet.exiting, enter.scrim, exit.scrim),
            )}
            onClick={() => setRenamingId(null)}
            disabled={renameSheet.exiting}
          />
          <form
            onSubmit={onRename}
            className={cn(
              "relative flex w-full max-w-[400px] flex-col gap-5 rounded-2xl border border-border bg-card p-6",
              io(renameSheet.exiting, enter.modal, exit.modal),
            )}
          >
            <h2 className="font-display text-xl font-bold text-foreground">
              Renomear grupo
            </h2>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
              className="h-12 rounded-xl bg-background"
            />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => setRenamingId(null)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={renamePending || !renameValue.trim()}
                className="flex-1 font-bold"
              >
                {renamePending ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Paper · FAB — mobile only when list has items */}
      {groups !== undefined && groups.length > 0 ? (
        <button
          type="button"
          aria-label="Novo grupo"
          onClick={openCreate}
          className="fixed right-5 bottom-[108px] z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm md:hidden"
        >
          <Plus className="size-6" strokeWidth={2.5} />
        </button>
      ) : null}

      {inviteGroup ? (
        <GroupInviteSheet
          open
          onClose={() => setInviteGroupId(null)}
          groupId={inviteGroup._id}
          groupName={inviteGroup.name}
          inviteCode={inviteGroup.inviteCode}
        />
      ) : null}

      <GroupJoinSheet
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onViewGroup={afterCreated}
      />

      {leaveGroup ? (
        <GroupLeaveSheet
          open
          groupName={leaveGroup.name}
          onClose={() => setLeaveGroupId(null)}
          onConfirm={onLeaveConfirm}
        />
      ) : null}

      {deleteGroup ? (
        <GroupConfirmSheet
          open
          title="Excluir grupo?"
          description={`“${deleteGroup.name}” some pra todo mundo. Não dá pra desfazer.`}
          confirmLabel="Excluir grupo"
          pendingLabel="Excluindo…"
          onClose={() => setDeleteGroupId(null)}
          onConfirm={onDeleteConfirm}
        />
      ) : null}

      {removeTarget ? (
        <GroupConfirmSheet
          open
          title="Remover participante?"
          description={`${removeTarget.displayName} sai do grupo. Pode ser convidado de novo.`}
          confirmLabel="Remover"
          pendingLabel="Removendo…"
          onClose={() => setRemoveTarget(null)}
          onConfirm={onRemoveMemberConfirm}
        />
      ) : null}
    </div>
  );
}

export default function GroupsPage() {
  return (
    <AuthGate>
      <Suspense
        fallback={
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-5 pt-2 pb-28 md:gap-7 md:px-12 md:py-10 md:pb-10">
            <header className="flex flex-col gap-1">
              <h1 className="font-display text-2xl leading-[30px] font-extrabold tracking-[-0.03em] text-foreground md:text-[36px] md:leading-[44px]">
                Grupos
              </h1>
            </header>
            <ListCardsSkeleton />
          </div>
        }
      >
        <GroupsContent />
      </Suspense>
    </AuthGate>
  );
}
